"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Settings, Shield, LogOut, Menu, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import ThemeToggle from "@/components/ThemeToggle"

interface HeaderProps {
  title?: string
  showAdminNav?: boolean
  adminNavItem?: string
  showHomeLink?: boolean
  showDashboardLink?: boolean
}

export default function Header({ title = "LinyaShare", showAdminNav = false, adminNavItem = "", showHomeLink = false, showDashboardLink = false }: HeaderProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [siteName, setSiteName] = useState(title)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isAdmin = (session?.user as any)?.role === "ADMIN"
  const isAuthenticated = status === "authenticated"

  useEffect(() => {
    fetch("/api/settings/public")
      .then((res) => res.json())
      .then((data) => {
        if (data.siteName) setSiteName(data.siteName)
      })
      .catch(() => {})
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [router])

  const adminLinks = [
    { href: "/admin", label: "Overview", key: "overview" },
    { href: "/admin/users", label: "Users", key: "users" },
    { href: "/admin/files", label: "Files", key: "files" },
    { href: "/admin/settings", label: "Settings", key: "settings" },
  ]

  return (
    <header className="border-b border-dark-600/15 bg-dark-800/20 backdrop-blur-2xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo + Desktop Nav */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`font-heading text-xl font-bold gradient-text cursor-pointer`}
                onClick={() => router.push("/")}
              >
                {siteName}
              </motion.span>
              {/* Build-Version aus package.json */}
              {process.env.NEXT_PUBLIC_APP_VERSION && (
                <span className="text-xs font-medium text-dark-400 bg-dark-800/40 border border-dark-600/30 px-2 py-0.5 rounded-full">
                  v{process.env.NEXT_PUBLIC_APP_VERSION}
                </span>
              )}
              {showAdminNav && (
                <span className="text-xs font-semibold bg-primary-500/15 text-primary-400 border border-primary-500/30 px-2.5 py-0.5 rounded-full">
                  Admin
                </span>
              )}
            </div>
            {showAdminNav && (
              <nav className="hidden md:flex items-center gap-6">
                {adminLinks.map((link) => (
                  <Link
                    key={link.key}
                    href={link.href}
                    className={`transition-colors ${
                      adminNavItem === link.key ? "text-white font-medium" : "text-dark-400 hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            )}
            {!showAdminNav && isAuthenticated && (
              <nav className="hidden md:flex items-center gap-6">
                {isAdmin && (
                  <Link href="/admin" className="text-dark-400 hover:text-white transition-colors flex items-center gap-1">
                    <Shield className="w-4 h-4" /> Admin
                  </Link>
                )}
              </nav>
            )}
          </div>

          {/* Right: Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />
            {isAuthenticated ? (
              <>
                {showHomeLink && (
                  <Link href="/dashboard" className="text-dark-400 hover:text-white transition-colors text-sm">Dashboard</Link>
                )}
                {showDashboardLink && (
                  <Link href="/dashboard" className="text-dark-400 hover:text-white transition-colors text-sm">Dashboard</Link>
                )}
                {!showAdminNav && (
                  <Link href="/settings" className="text-dark-400 hover:text-white transition-colors">
                    <Settings className="w-5 h-5" />
                  </Link>
                )}
                <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-secondary text-sm py-2 px-4 flex items-center gap-2">
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </>
            ) : (
              <>
                {showDashboardLink && (
                  <Link href="/login" className="text-dark-400 hover:text-white transition-colors text-sm">Login</Link>
                )}
                {showHomeLink && (
                  <Link href="/login" className="text-dark-400 hover:text-white transition-colors text-sm">Login</Link>
                )}
              </>
            )}
          </div>

          {/* Mobile: Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700/50 transition-all"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-dark-600/15 md:hidden"
          >
            <div className="px-4 py-4 space-y-2 bg-dark-800/40 backdrop-blur-2xl">
              {/* Theme Toggle */}
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-dark-300">Theme</span>
                <ThemeToggle />
              </div>

              {/* Admin Navigation */}
              {showAdminNav && (
                <div className="space-y-1 pb-3 border-b border-dark-600/20">
                  <p className="text-xs text-dark-500 font-medium uppercase tracking-wider px-3 mb-2">Admin</p>
                  {adminLinks.map((link) => (
                    <Link
                      key={link.key}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        adminNavItem === link.key
                          ? "bg-primary-500/15 text-primary-400 font-medium"
                          : "text-dark-300 hover:text-white hover:bg-dark-700/50"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}

              {/* Authenticated Links */}
              {isAuthenticated ? (
                <div className="space-y-1">
                  {showHomeLink && (
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2.5 rounded-lg text-sm text-dark-300 hover:text-white hover:bg-dark-700/50 transition-colors"
                    >
                      Dashboard
                    </Link>
                  )}
                  {showDashboardLink && (
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2.5 rounded-lg text-sm text-dark-300 hover:text-white hover:bg-dark-700/50 transition-colors"
                    >
                      Dashboard
                    </Link>
                  )}
                  {!showAdminNav && isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2.5 rounded-lg text-sm text-dark-300 hover:text-white hover:bg-dark-700/50 transition-colors"
                    >
                      <Shield className="w-4 h-4 inline mr-2" />Admin
                    </Link>
                  )}
                  {!showAdminNav && (
                    <Link
                      href="/settings"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2.5 rounded-lg text-sm text-dark-300 hover:text-white hover:bg-dark-700/50 transition-colors"
                    >
                      <Settings className="w-4 h-4 inline mr-2" />Settings
                    </Link>
                  )}
                  <button
                    onClick={() => { setMobileMenuOpen(false); signOut({ callbackUrl: "/" }); }}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-600/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4 inline mr-2" />Sign out
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {showDashboardLink && (
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2.5 rounded-lg text-sm text-dark-300 hover:text-white hover:bg-dark-700/50 transition-colors"
                    >
                      Login
                    </Link>
                  )}
                  {showHomeLink && (
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2.5 rounded-lg text-sm text-dark-300 hover:text-white hover:bg-dark-700/50 transition-colors"
                    >
                      Login
                    </Link>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}