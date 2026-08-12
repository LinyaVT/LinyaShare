"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Download, Eye, Upload, UserPlus, Activity, ArrowDownUp, Search, X } from "lucide-react"
import { BarChart, LineChart, type ChartPoint } from "./charts"
import { formatSize } from "@/lib/utils"
import Pagination from "@/components/Pagination"

const RANGES = [7, 30, 90] as const

interface StatsData {
  days: number
  cards: {
    downloads: number
    views: number
    uploads: number
    registrations: number
    bandwidthBytes: number
  }
  series: { date: string; downloads: number; views: number; uploads: number; registrations: number }[]
  activity: {
    type: string
    size: number | null
    createdAt: string
    fileName: string | null
    userName: string | null
  }[]
  activityTotal: number
  activityPage: number
  activityPerPage: number
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString("en-US")
}

const ACTIVITY_ICONS: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  DOWNLOAD: { icon: Download, label: "Downloaded", color: "text-sky-400", bg: "bg-sky-500/10" },
  VIEW: { icon: Eye, label: "Viewed", color: "text-purple-400", bg: "bg-purple-500/10" },
  UPLOAD: { icon: Upload, label: "Uploaded", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  REGISTER: { icon: UserPlus, label: "Registered", color: "text-amber-400", bg: "bg-amber-500/10" },
}

const ACTIVITY_FILTERS = [
  { value: "all", label: "All types" },
  { value: "DOWNLOAD", label: "Downloads" },
  { value: "VIEW", label: "Views" },
  { value: "UPLOAD", label: "Uploads" },
  { value: "REGISTER", label: "Registrations" },
]

const PAGE_SIZES = [10, 25, 50]

export default function StatsPanel() {
  const [days, setDays] = useState<number>(30)
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activityLoading, setActivityLoading] = useState(false)

  // Recent activity: search, filter & pagination
  const [activityPage, setActivityPage] = useState(1)
  const [activityPerPage, setActivityPerPage] = useState(10)
  const [activityType, setActivityType] = useState("all")
  const [activitySearch, setActivitySearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  const daysRef = useRef(days)
  useEffect(() => { daysRef.current = days }, [days])

  // Debounce the search input so we don't hit the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(activitySearch.trim()), 250)
    return () => clearTimeout(t)
  }, [activitySearch])

  // Reset to the first page when the context (range, filter, search) changes
  useEffect(() => {
    setActivityPage(1)
  }, [days, activityType, debouncedSearch])

  const load = useCallback(async (scope: number, activity?: { page: number; perPage: number; type: string; search: string }, silent = false) => {
    if (!silent) setLoading(true)
    else setActivityLoading(true)
    try {
      const params = new URLSearchParams({ days: String(scope) })
      if (activity) {
        if (activity.type !== "all") params.set("activityType", activity.type)
        if (activity.search) params.set("activitySearch", activity.search)
        params.set("activityPage", String(activity.page))
        params.set("activityPerPage", String(activity.perPage))
      }
      const res = await fetch(`/api/admin/stats?${params}`)
      const json = await res.json()
      if (res.ok) setData(json as StatsData)
    } catch {
    } finally {
      setLoading(false)
      setActivityLoading(false)
    }
  }, [])

  // Full reload when the time range changes
  useEffect(() => {
    load(days, { page: activityPage, perPage: activityPerPage, type: activityType, search: debouncedSearch }, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days])

  // Silent reload when filter/search/page changes (charts stay visible)
  useEffect(() => {
    if (!data) return
    load(daysRef.current, { page: activityPage, perPage: activityPerPage, type: activityType, search: debouncedSearch }, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityPage, activityPerPage, activityType, debouncedSearch])

  const barData: ChartPoint[] = (data?.series || []).map((p) => ({
    label: p.date,
    values: [p.downloads, p.views],
  }))

  const lineData: ChartPoint[] = (data?.series || []).map((p) => ({
    label: p.date,
    values: [p.uploads, p.registrations],
  }))

  const totalEvents = data
    ? data.cards.downloads + data.cards.views + data.cards.uploads + data.cards.registrations
    : 0

  const cards = [
    { icon: Download, label: "Downloads", value: data?.cards.downloads ?? 0, delay: 0 },
    { icon: Eye, label: "Views", value: data?.cards.views ?? 0, delay: 0.05 },
    { icon: Upload, label: "Uploads", value: data?.cards.uploads ?? 0, delay: 0.1 },
    { icon: UserPlus, label: "New users", value: data?.cards.registrations ?? 0, delay: 0.15 },
    { icon: ArrowDownUp, label: "Bandwidth", value: formatSize(data?.cards.bandwidthBytes ?? 0), delay: 0.2 },
  ]

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="section-title flex items-center gap-2 mb-0">
          <Activity className="w-6 h-6 text-primary-400" /> Statistics
        </h2>
        <div className="flex items-center gap-1 bg-dark-800/60 border border-dark-600/30 rounded-xl p-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setDays(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                days === r
                  ? "bg-primary-500/20 text-primary-400 shadow-[0_0_10px_rgb(var(--primary-500)/0.1)]"
                  : "text-dark-400 hover:text-white hover:bg-dark-700/50"
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="glass-card p-12 flex items-center justify-center">
          <div className="loading-spinner"></div>
        </div>
      ) : (
        <>
          {totalEvents === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4 mb-4 text-sm text-dark-300">
              <Activity className="w-4 h-4 text-primary-400 inline mr-2 align-middle" />
              Statistics are collected from now on — this panel will fill up as soon as downloads, views, uploads and registrations happen.
            </motion.div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
            {cards.map((c) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: c.delay }}
                className="glass-card p-4"
              >
                <c.icon className="w-5 h-5 text-primary-400 mb-2" />
                <p className="text-lg sm:text-xl font-bold text-white truncate">{c.value}</p>
                <p className="text-dark-400 text-xs">{c.label} ({days}d)</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
            <div className="glass-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h3 className="text-sm font-semibold text-white">Downloads &amp; Views per day</h3>
                <div className="flex items-center gap-3 ml-auto">
                  <span className="flex items-center gap-1 text-xs text-dark-300">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#38bdf8]" /> Downloads
                  </span>
                  <span className="flex items-center gap-1 text-xs text-dark-300">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#a78bfa]" /> Views
                  </span>
                </div>
              </div>
              <BarChart data={barData} keys={[{ name: "Downloads", color: "#38bdf8" }, { name: "Views", color: "#a78bfa" }]} />
            </div>

            <div className="glass-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h3 className="text-sm font-semibold text-white">Uploads &amp; Registrations per day</h3>
                <div className="flex items-center gap-3 ml-auto">
                  <span className="flex items-center gap-1 text-xs text-dark-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#34d399]" /> Uploads
                  </span>
                  <span className="flex items-center gap-1 text-xs text-dark-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#fbbf24]" /> New users
                  </span>
                </div>
              </div>
              <LineChart data={lineData} keys={[{ name: "Uploads", color: "#34d399" }, { name: "Registrations", color: "#fbbf24" }]} />
            </div>
          </div>

          <div className="glass-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-white mb-0 flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary-400" /> Recent activity
              </h3>
              {data && data.activityTotal > 0 && (
                <span className="text-xs text-dark-400">{data.activityTotal} events in the selected period</span>
              )}
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input
                  type="text"
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  placeholder="Search file or user..."
                  className="input-field text-sm py-2 pl-10 pr-10 w-full"
                />
                {activitySearch && (
                  <button
                    onClick={() => setActivitySearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  className="input-field text-sm py-2 w-full md:w-44"
                >
                  {ACTIVITY_FILTERS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <select
                  value={activityPerPage}
                  onChange={(e) => { setActivityPerPage(parseInt(e.target.value, 10)); setActivityPage(1) }}
                  className="input-field text-sm py-2"
                  title="Entries per page"
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>{n} / page</option>
                  ))}
                </select>
              </div>
            </div>

            {activityLoading ? (
              <div className="py-8 flex items-center justify-center">
                <div className="loading-spinner"></div>
              </div>
            ) : data && data.activityTotal === 0 ? (
              <p className="text-dark-400 text-sm py-6 text-center">
                {(activityType !== "all" || activitySearch || activityPage > 1)
                  ? "No activity matches your current filter."
                  : "No activity in the selected period yet."}
              </p>
            ) : (
              <>
                <ul className="divide-y divide-dark-600/20">
                  {data?.activity.map((ev, i) => {
                    const meta = ACTIVITY_ICONS[ev.type] || ACTIVITY_ICONS.DOWNLOAD
                    const Icon = meta.icon
                    return (
                      <li key={`${ev.createdAt}-${i}`} className="flex items-center gap-3 py-2.5">
                        <span className={`w-9 h-9 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-4 h-4 ${meta.color}`} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">
                            <span className={meta.color}>{meta.label}</span>{" "}
                            <span className="font-medium">{ev.fileName || ev.userName || "—"}</span>
                          </p>
                          <p className="text-xs text-dark-400 truncate">
                            {ev.userName && ev.fileName ? `by ${ev.userName}` : ""}
                            {ev.size ? ` · ${formatSize(ev.size)}` : ""}
                          </p>
                        </div>
                        <span className="text-xs text-dark-500 shrink-0">{timeAgo(ev.createdAt)}</span>
                      </li>
                    )
                  })}
                </ul>

                <Pagination
                  currentPage={activityPage}
                  totalPages={data ? Math.ceil(data.activityTotal / activityPerPage) : 1}
                  onPageChange={setActivityPage}
                  itemsPerPage={activityPerPage}
                  totalItems={data?.activityTotal}
                />
              </>
            )}
          </div>
        </>
      )}
    </section>
  )
}