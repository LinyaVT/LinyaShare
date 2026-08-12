"use client"

import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Download, Eye, Upload, UserPlus, Activity, ArrowDownUp } from "lucide-react"
import { BarChart, LineChart, type ChartPoint } from "./charts"
import { formatSize } from "@/lib/utils"

const RANGES = [7, 30, 90] as const

interface StatsData {
  days: number
  cards: {
    downloads: number
    views: number
    uploads: number
    registrations: number
    bandwidthBytes: number
  }
  series: { date: string; downloads: number; views: number; uploads: number; registrations: number }[]
  activity: {
    type: string
    size: number | null
    createdAt: string
    fileName: string | null
    userName: string | null
  }[]
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString("en-US")
}

const ACTIVITY_ICONS: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  DOWNLOAD: { icon: Download, label: "Downloaded", color: "text-sky-400", bg: "bg-sky-500/10" },
  VIEW: { icon: Eye, label: "Viewed", color: "text-purple-400", bg: "bg-purple-500/10" },
  UPLOAD: { icon: Upload, label: "Uploaded", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  REGISTER: { icon: UserPlus, label: "Registered", color: "text-amber-400", bg: "bg-amber-500/10" },
}

export default function StatsPanel() {
  const [days, setDays] = useState<number>(30)
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (scope: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/stats?days=${scope}`)
      const json = await res.json()
      if (res.ok) setData(json as StatsData)
    } catch {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(days)
  }, [days, load])

  const barData: ChartPoint[] = (data?.series || []).map((p) => ({
    label: p.date,
    values: [p.downloads, p.views],
  }))

  const lineData: ChartPoint[] = (data?.series || []).map((p) => ({
    label: p.date,
    values: [p.uploads, p.registrations],
  }))

  const totalEvents = data
    ? data.cards.downloads + data.cards.views + data.cards.uploads + data.cards.registrations
    : 0

  const cards = [
    { icon: Download, label: "Downloads", value: data?.cards.downloads ?? 0, delay: 0 },
    { icon: Eye, label: "Views", value: data?.cards.views ?? 0, delay: 0.05 },
    { icon: Upload, label: "Uploads", value: data?.cards.uploads ?? 0, delay: 0.1 },
    { icon: UserPlus, label: "New users", value: data?.cards.registrations ?? 0, delay: 0.15 },
    { icon: ArrowDownUp, label: "Bandwidth", value: formatSize(data?.cards.bandwidthBytes ?? 0), delay: 0.2 },
  ]

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="section-title flex items-center gap-2 mb-0">
          <Activity className="w-6 h-6 text-primary-400" /> Statistics
        </h2>
        <div className="flex items-center gap-1 bg-dark-800/60 border border-dark-600/30 rounded-xl p-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setDays(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                days === r
                  ? "bg-primary-500/20 text-primary-400 shadow-[0_0_10px_rgb(var(--primary-500)/0.1)]"
                  : "text-dark-400 hover:text-white hover:bg-dark-700/50"
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="glass-card p-12 flex items-center justify-center">
          <div className="loading-spinner"></div>
        </div>
      ) : (
        <>
          {totalEvents === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4 mb-4 text-sm text-dark-300">
              <Activity className="w-4 h-4 text-primary-400 inline mr-2 align-middle" />
              Statistics are collected from now on — this panel will fill up as soon as downloads, views, uploads and registrations happen.
            </motion.div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
            {cards.map((c) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: c.delay }}
                className="glass-card p-4"
              >
                <c.icon className="w-5 h-5 text-primary-400 mb-2" />
                <p className="text-lg sm:text-xl font-bold text-white truncate">{c.value}</p>
                <p className="text-dark-400 text-xs">{c.label} ({days}d)</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
            <div className="glass-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h3 className="text-sm font-semibold text-white">Downloads &amp; Views per day</h3>
                <div className="flex items-center gap-3 ml-auto">
                  <span className="flex items-center gap-1 text-xs text-dark-300">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#38bdf8]" /> Downloads
                  </span>
                  <span className="flex items-center gap-1 text-xs text-dark-300">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#a78bfa]" /> Views
                  </span>
                </div>
              </div>
              <BarChart data={barData} keys={[{ name: "Downloads", color: "#38bdf8" }, { name: "Views", color: "#a78bfa" }]} />
            </div>

            <div className="glass-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h3 className="text-sm font-semibold text-white">Uploads &amp; Registrations per day</h3>
                <div className="flex items-center gap-3 ml-auto">
                  <span className="flex items-center gap-1 text-xs text-dark-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#34d399]" /> Uploads
                  </span>
                  <span className="flex items-center gap-1 text-xs text-dark-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#fbbf24]" /> New users
                  </span>
                </div>
              </div>
              <LineChart data={lineData} keys={[{ name: "Uploads", color: "#34d399" }, { name: "Registrations", color: "#fbbf24" }]} />
            </div>
          </div>

          <div className="glass-card p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary-400" /> Recent activity
            </h3>
            {data && data.activity.length === 0 ? (
              <p className="text-dark-400 text-sm py-6 text-center">No activity in the selected period yet.</p>
            ) : (
              <ul className="divide-y divide-dark-600/20">
                {data?.activity.map((ev, i) => {
                  const meta = ACTIVITY_ICONS[ev.type] || ACTIVITY_ICONS.DOWNLOAD
                  const Icon = meta.icon
                  return (
                    <li key={i} className="flex items-center gap-3 py-2.5">
                      <span className={`w-9 h-9 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-4 h-4 ${meta.color}`} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">
                          <span className={meta.color}>{meta.label}</span>{" "}
                          <span className="font-medium">{ev.fileName || ev.userName || "—"}</span>
                        </p>
                        <p className="text-xs text-dark-400 truncate">
                          {ev.userName && ev.fileName ? `by ${ev.userName}` : ""}
                          {ev.size ? ` · ${formatSize(ev.size)}` : ""}
                        </p>
                      </div>
                      <span className="text-xs text-dark-500 shrink-0">{timeAgo(ev.createdAt)}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  )
}