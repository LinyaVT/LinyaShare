import type { Metadata } from "next"
import "./globals.css"
import SessionProvider from "@/components/SessionProvider"
import { ToastProvider } from "@/components/Toast"
import AnimatedBackground from "@/components/AnimatedBackground"
import { prisma } from "@/lib/prisma"
import { resolveTheme, computeCssVars, cssVarsToString, themeToDataAttributes, FONT_MAP } from "@/lib/theme"

export const metadata: Metadata = {
  title: "LinyaShare - Secure File Sharing",
  description: "Share files securely with password protection. Modern file sharing for everyone.",
}

// Theme muss pro Request aus der Datenbank geladen werden
export const dynamic = "force-dynamic"

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let settings: Record<string, string> = {}
  try {
    const rows = await prisma.setting.findMany()
    rows.forEach((s) => {
      settings[s.key] = s.value
    })
  } catch (error) {
    console.error("Failed to load theme settings:", error)
  }

  const theme = resolveTheme(settings)
  const cssVars = computeCssVars(theme)
  const themeStyle = cssVarsToString(cssVars)
  const dataAttrs = themeToDataAttributes(theme)

  // Google-Fonts Links für die gewählten Schriften
  const fontUrls = [...new Set([theme.fontBody, theme.fontHeading])]
    .map((key) => FONT_MAP[key]?.url)
    .filter(Boolean)

  return (
    <html lang="en" {...dataAttrs}>
      <head>
        <style>{`:root{${themeStyle}}`}</style>
        {fontUrls.map((url) => (
          <link key={url} rel="stylesheet" href={url} />
        ))}
      </head>
      <body>
        <AnimatedBackground theme={theme} />
        <ToastProvider>
          <SessionProvider>
            {children}
          </SessionProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
