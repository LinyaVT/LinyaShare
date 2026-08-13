import type { Metadata } from "next"
import "./globals.css"
import SessionProvider from "@/components/SessionProvider"
import { ToastProvider } from "@/components/Toast"
import AnimatedBackground from "@/components/AnimatedBackground"
import { prisma } from "@/lib/prisma"
import { resolveTheme, computeCssVars, cssVarsToString, themeToDataAttributes, FONT_MAP, mergeFontMaps, parseCustomFonts, customFontsToMap } from "@/lib/theme"
import { getSiteName } from "@/lib/settings"

export async function generateMetadata(): Promise<Metadata> {
  const siteName = await getSiteName()
  return {
    title: `${siteName} - Secure File Sharing`,
    description: `Share files securely with password protection on ${siteName}. Modern file sharing for everyone.`,
  }
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

  // Self-Hosted + Custom-Fonts: FONT_MAP (lokal) um Admin-Uploads erweitern
  const fontMap = mergeFontMaps(FONT_MAP, customFontsToMap(parseCustomFonts(settings["theme.customFonts"])))

  const theme = resolveTheme(settings, fontMap)
  const cssVars = computeCssVars(theme, fontMap)
  const themeStyle = cssVarsToString(cssVars)
  const dataAttrs = themeToDataAttributes(theme)

  // Lokale Font-Links für die gewählten Schriften
  const fontUrls = [...new Set([theme.fontBody, theme.fontHeading])]
    .map((key) => fontMap[key]?.url)
    .filter(Boolean)

  return (
    <html lang="en" {...dataAttrs} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("linyashare-theme")==="light"){document.documentElement.dataset.theme="light"}}catch(e){}`,
          }}
        />
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
