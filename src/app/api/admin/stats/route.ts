import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const pad = (n: number) => n.toString().padStart(2, "0")

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const daysParam = parseInt(request.nextUrl.searchParams.get("days") || "30")
  const days = Math.min(Math.max(daysParam || 30, 1), 90)

  // Recent activity: pagination, type filter & search
  const activityPage = Math.max(parseInt(request.nextUrl.searchParams.get("activityPage") || "1") || 1, 1)
  const activityPerPage = Math.min(Math.max(parseInt(request.nextUrl.searchParams.get("activityPerPage") || "10") || 10, 5), 100)
  const activityType = (request.nextUrl.searchParams.get("activityType") || "all").trim().toUpperCase()
  const activitySearch = (request.nextUrl.searchParams.get("activitySearch") || "").trim().toLowerCase()

  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  start.setDate(start.getDate() - (days - 1))

  const events = await prisma.statEvent.findMany({
    where: { createdAt: { gte: start } },
    select: {
      type: true,
      size: true,
      createdAt: true,
      file: { select: { originalName: true } },
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  // Create daily buckets (fill gaps with 0)
  const buckets: Record<string, { downloads: number; views: number; uploads: number; registrations: number }> = {}
  const series: { date: string; downloads: number; views: number; uploads: number; registrations: number }[] = []

  let bandwidthBytes = 0
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = dayKey(d)
    buckets[key] = { downloads: 0, views: 0, uploads: 0, registrations: 0 }
    series.push({ date: key, downloads: 0, views: 0, uploads: 0, registrations: 0 })
  }

  for (const ev of events) {
    if (!buckets[dayKey(ev.createdAt)]) continue
    if (ev.type === "DOWNLOAD") {
      buckets[dayKey(ev.createdAt)].downloads++
      if (ev.size) bandwidthBytes += ev.size
    } else if (ev.type === "VIEW") {
      buckets[dayKey(ev.createdAt)].views++
    } else if (ev.type === "UPLOAD") {
      buckets[dayKey(ev.createdAt)].uploads++
      if (ev.size) bandwidthBytes += ev.size
    } else if (ev.type === "REGISTER") {
      buckets[dayKey(ev.createdAt)].registrations++
    }
  }

  for (let i = 0; i < days; i++) {
    const key = series[i].date
    series[i] = { ...series[i], ...buckets[key] }
  }

  const sum = (fn: (s: typeof series[number]) => number) => series.reduce((acc, s) => acc + fn(s), 0)

  // Apply filter + search to the activity events
  let activityEvents = events
  if (activityType !== "ALL") {
    activityEvents = activityEvents.filter((ev) => ev.type === activityType)
  }
  if (activitySearch) {
    activityEvents = activityEvents.filter((ev) =>
      (ev.file?.originalName || "").toLowerCase().includes(activitySearch) ||
      (ev.user?.name || "").toLowerCase().includes(activitySearch)
    )
  }

  const activityTotal = activityEvents.length
  const activity = activityEvents
    .slice((activityPage - 1) * activityPerPage, activityPage * activityPerPage)
    .map((ev) => ({
      type: ev.type,
      size: ev.size,
      createdAt: ev.createdAt,
      fileName: ev.file?.originalName || null,
      userName: ev.user?.name || null,
    }))

  return NextResponse.json({
    days,
    cards: {
      downloads: sum((s) => s.downloads),
      views: sum((s) => s.views),
      uploads: sum((s) => s.uploads),
      registrations: sum((s) => s.registrations),
      bandwidthBytes,
    },
    series,
    activity,
    activityTotal,
    activityPage,
    activityPerPage,
  })
}