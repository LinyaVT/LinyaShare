import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveTheme } from "@/lib/theme"

export async function GET() {
  try {
    const settings = await prisma.setting.findMany()

    const settingsMap: Record<string, string> = {}
    settings.forEach((s) => {
      settingsMap[s.key] = s.value
    })

    const theme = resolveTheme(settingsMap)

    return NextResponse.json({
      allowRegistration: settingsMap.allowRegistration !== "false",
      siteName: settingsMap.siteName || "LinyaShare",
      supportEmail: settingsMap.supportEmail || "",
      discordUrl: settingsMap.discordUrl || "",
      imprintUrl: settingsMap.imprintUrl || "",
      maxUsers: parseInt(settingsMap.maxUsers || "-1"),
      privacyContent: settingsMap.privacyContent || "",
      tosContent: settingsMap.tosContent || "",
      theme,
    })
  } catch (error) {
    console.error("Error fetching public settings:", error)
    return NextResponse.json(
      {
        allowRegistration: true,
        siteName: "LinyaShare",
        supportEmail: "",
        discordUrl: "",
        imprintUrl: "",
        maxUsers: -1,
        privacyContent: "",
        tosContent: "",
        theme: resolveTheme(undefined),
      },
      { status: 500 }
    )
  }
}