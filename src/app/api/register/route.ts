import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    // Check if registration is allowed (setting might not exist yet)
    const setting = await prisma.setting.findUnique({
      where: { key: "allowRegistration" },
    })

    if (setting && setting.value === "false") {
      return NextResponse.json({ error: "Registration is currently disabled" }, { status: 403 })
    }

    // Check max users limit
    const maxUsersSetting = await prisma.setting.findUnique({
      where: { key: "maxUsers" },
    })
    const maxUsers = parseInt(maxUsersSetting?.value || "-1")
    if (maxUsers > -1) {
      const userCount = await prisma.user.count()
      if (userCount >= maxUsers) {
        return NextResponse.json({ error: "Maximum user limit reached" }, { status: 403 })
      }
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    })

    if (existing) {
      return NextResponse.json({ error: "Email is already in use" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "USER",
      },
    })

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email },
    })
  } catch (error) {
    console.error("Register error:", error)
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}