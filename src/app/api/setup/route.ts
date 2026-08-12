import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { logStatEvent } from "@/lib/stats"

export async function GET() {
  try {
    const adminCount = await prisma.user.count({
      where: { role: "ADMIN" },
    })

    return NextResponse.json({
      needsSetup: adminCount === 0,
    })
  } catch {
    return NextResponse.json({ needsSetup: true })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    const adminCount = await prisma.user.count({
      where: { role: "ADMIN" },
    })

    if (adminCount > 0) {
      return NextResponse.json({ error: "Setup already completed" }, { status: 400 })
    }

    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const admin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "ADMIN",
        maxSize: 1073741824,
      },
    })

    // Statistik-Event loggen (fire-and-forget)
    logStatEvent("REGISTER", { userId: admin.id })

    // Initialize settings safely
    const existingReg = await prisma.setting.findUnique({ where: { key: "allowRegistration" } })
    if (!existingReg) {
      await prisma.setting.create({ data: { key: "allowRegistration", value: "true" } })
    }

    const existingSize = await prisma.setting.findUnique({ where: { key: "defaultMaxSize" } })
    if (!existingSize) {
      await prisma.setting.create({ data: { key: "defaultMaxSize", value: "524288000" } })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Setup error:", error)
    return NextResponse.json({ error: "Setup failed. Is the database connected?" }, { status: 500 })
  }
}