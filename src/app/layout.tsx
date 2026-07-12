import type { Metadata } from "next"
import { Inter, Orbitron } from "next/font/google"
import "./globals.css"
import SessionProvider from "@/components/SessionProvider"
import { ToastProvider } from "@/components/Toast"
import AnimatedBackground from "@/components/AnimatedBackground"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "LinyaShare - Secure File Sharing",
  description: "Share files securely with password protection. Modern file sharing for everyone.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ fontFamily: "var(--font-inter)" }}>
        <AnimatedBackground />
        <ToastProvider>
          <SessionProvider>
            {children}
          </SessionProvider>
        </ToastProvider>
      </body>
    </html>
  )
}