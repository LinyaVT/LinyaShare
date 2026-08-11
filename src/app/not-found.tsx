import type { Metadata } from "next"
import Link from "next/link"
import { FileQuestion, Home, LayoutDashboard } from "lucide-react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { getSiteName } from "@/lib/settings"

export async function generateMetadata(): Promise<Metadata> {
  const siteName = await getSiteName()
  return {
    title: `404 - Page Not Found - ${siteName}`,
  }
}

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header showHomeLink />
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-20">
        <div className="glass-card p-10 sm:p-14 max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-primary-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <FileQuestion className="w-10 h-10 text-primary-400" />
          </div>

          <p className="text-7xl font-bold gradient-text mb-2">404</p>
          <h1 className="text-xl md:text-2xl font-bold text-white mb-2">Page not found</h1>
          <p className="text-dark-400 text-sm mb-8">
            This link is invalid or the page has been moved or deleted.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/" className="btn-primary flex items-center gap-2">
              <Home className="w-5 h-5" /> Back to home
            </Link>
            <Link href="/dashboard" className="btn-secondary flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5" /> Dashboard
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
