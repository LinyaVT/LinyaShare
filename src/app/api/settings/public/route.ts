import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: ["allowRegistration", "siteName", "supportEmail", "discordUrl", "imprintUrl", "maxUsers", "privacyContent", "tosContent"],
        },
      },
    })

    const settingsMap: Record<string, string> = {}
    settings.forEach((s) => {
      settingsMap[s.key] = s.value
    })

    return NextResponse.json({
      allowRegistration: settingsMap.allowRegistration !== "false",
      siteName: settingsMap.siteName || "LinyaShare",
      supportEmail: settingsMap.supportEmail || "",
      discordUrl: settingsMap.discordUrl || "",
      imprintUrl: settingsMap.imprintUrl || "",
      maxUsers: parseInt(settingsMap.maxUsers || "-1"),
      privacyContent: settingsMap.privacyContent || "",
      tosContent: settingsMap.tosContent || "",
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
      },
      { status: 500 }
    )
  }
}