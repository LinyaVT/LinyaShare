"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Users, FileText, HardDrive, Shield, Settings } from "lucide-react"
import Link from "next/link"
import Header from "@/components/Header"
import SkeletonLoader from "@/components/SkeletonLoader"
import StatsPanel from "@/components/admin/StatsPanel"
import { formatSize } from "@/lib/utils"

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
    else if (status === "authenticated" && (session?.user as any)?.role !== "ADMIN") router.push("/dashboard")
    else if (status === "authenticated") {
      fetch("/api/admin/settings").then((r) => r.json()).then((d) => setStats(d.stats))
    }
  }, [status, session, router])

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center"><div className="loading-spinner"></div></div>

  return (
    <div className="min-h-screen">
      <Header title="LinyaShare Admin" showAdminNav={true} adminNavItem="overview" showDashboardLink />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 relative z-10">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-4 sm:mb-8">Admin Overview</h1>

        {!stats ? (
          <>
            <SkeletonLoader variant="stats" count={4} />
            <div className="mt-6 sm:mt-8">
              <SkeletonLoader variant="cards" count={3} />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
              {[
                { icon: Users, label: "Total users", value: stats.users, delay: 0 },
                { icon: FileText, label: "Total files", value: stats.files, delay: 0.1 },
                { icon: HardDrive, label: "Total storage", value: formatSize(stats.totalSize), delay: 0.2 },
                { icon: Shield, label: "Admins", value: stats.admins, delay: 0.3 },
              ].map((item, i) => (
                <motion.div key={item.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: item.delay }} className="glass-card p-3 sm:p-6">
                  <item.icon className="w-6 h-6 sm:w-8 sm:h-8 text-primary-400 mb-2 sm:mb-3" />
                  <p className="text-xl sm:text-3xl font-bold text-white">{item.value}</p>
                  <p className="text-dark-400 text-xs sm:text-sm">{item.label}</p>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
              {[
                { href: "/admin/users", icon: Users, title: "User management", desc: "Create, edit, delete users and set storage limits" },
                { href: "/admin/files", icon: FileText, title: "File management", desc: "View and manage all uploaded files" },
                { href: "/admin/settings", icon: Settings, title: "Settings", desc: "Toggle registration, set global limits" },
              ].map((item) => (
                <Link key={item.href} href={item.href}>
                  <motion.div whileHover={{ scale: 1.02 }} className="glass-card-hover p-4 sm:p-6 cursor-pointer">
                    <item.icon className="w-6 h-6 sm:w-8 sm:h-8 text-primary-400 mb-2 sm:mb-3" />
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">{item.title}</h3>
                    <p className="text-dark-400 text-xs sm:text-sm">{item.desc}</p>
                  </motion.div>
                </Link>
              ))}
            </div>

            <StatsPanel />
          </>
        )}
      </main>
    </div>
  )
}