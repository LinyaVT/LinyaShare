"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import dynamic from "next/dynamic"
const AnimatePresence = dynamic(() => import("framer-motion").then(mod => mod.AnimatePresence), { ssr: false })
import { Lock, FolderOpen, Users, AlertTriangle, X, FileText, HardDrive, Download, Eye, Calendar, CheckCircle, MoreVertical, FolderArchive, Trash2 } from "lucide-react"
import Header from "@/components/Header"
import ConfirmDialog from "@/components/ConfirmDialog"
import SearchBar from "@/components/SearchBar"
import FilterBar from "@/components/FilterBar"
import Pagination from "@/components/Pagination"
import AdminFileMenu from "@/components/AdminFileMenu"
import SkeletonLoader from "@/components/SkeletonLoader"
import { formatSize, formatDate, getFileTypeCategory } from "@/lib/utils"
import UnclaimedFileMenu from "@/components/UnclaimedFileMenu"

type Tab = "assigned" | "unclaimed"

export default function AdminFilesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>("assigned")
  const [files, setFiles] = useState<any[]>([])
  const [unclaimedData, setUnclaimedData] = useState<{ claimed: any[]; orphaned: any[] }>({ claimed: [], orphaned: [] })
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<any>(null)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [assigning, setAssigning] = useState(false)
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    variant?: "danger" | "warning" | "primary"
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    variant: "danger"
  })

  // Pagination & Filter
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [userFilter, setUserFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
    if (status === "authenticated" && (session?.user as any)?.role !== "ADMIN") router.push("/dashboard")
    if (status === "authenticated") {
      loadFiles()
      loadUnclaimed()
      loadUsers()
    }
  }, [status])

  async function loadFiles() {
    const res = await fetch("/api/admin/files")
    const data = await res.json()
    setFiles(data.files || [])
    setLoading(false)
  }

  async function loadUnclaimed() {
    const res = await fetch("/api/admin/import")
    const data = await res.json()
    setUnclaimedData(data)
  }

  async function loadUsers() {
    const res = await fetch("/api/admin/users")
    const data = await res.json()
    setUsers(data.users || [])
  }

  async function handleDelete(fileId: string) {
    setConfirmDialog({
      isOpen: true,
      title: "Delete file permanently?",
      message: "Are you sure you want to delete this file permanently? This action cannot be undone.",
      variant: "danger",
      onConfirm: async () => {
        await fetch("/api/admin/files", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId }),
        })
        loadFiles()
        showMessage("success", "File deleted")
      }
    })
  }

  async function handleDeleteUnclaimed(fileId: string) {
    setConfirmDialog({
      isOpen: true,
      title: "Delete unclaimed file permanently?",
      message: "Are you sure you want to delete this unclaimed file permanently?",
      variant: "danger",
      onConfirm: async () => {
        await fetch("/api/admin/import", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId }),
        })
        loadUnclaimed()
        showMessage("success", "Unclaimed file deleted")
      }
    })
  }

  async function handleDeleteOrphaned(fileName: string) {
    setConfirmDialog({
      isOpen: true,
      title: "Delete orphaned file from disk?",
      message: "Are you sure you want to delete this orphaned file from disk?",
      variant: "danger",
      onConfirm: async () => {
        await fetch("/api/admin/import", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName }),
        })
        loadUnclaimed()
        showMessage("success", "Orphaned file deleted")
      }
    })
  }

  async function handleAssign() {
    if (!selectedFile || !selectedUserId) return

    setAssigning(true)
    try {
      const body: any = { userId: selectedUserId }

      if (selectedFile.id) {
        body.fileId = selectedFile.id
      } else {
        body.fileName = selectedFile.name
      }

      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (data.success) {
        showMessage("success", `File successfully assigned to ${users.find(u => u.id === selectedUserId)?.name || "User"}!`)
        setShowAssignModal(false)
        setSelectedFile(null)
        setSelectedUserId("")
        loadUnclaimed()
        loadFiles()
      } else {
        showMessage("error", data.error || "Assignment failed")
      }
    } catch {
      showMessage("error", "Error assigning file")
    } finally {
      setAssigning(false)
    }
  }

  const openAssignModal = (file: any) => {
    setSelectedFile(file)
    setSelectedUserId("")
    setShowAssignModal(true)
  }

  function showMessage(type: "success" | "error", text: string) {
    setActionMsg({ type, text })
    setTimeout(() => setActionMsg(null), 4000)
  }

  const totalUnclaimed = unclaimedData.claimed.length + unclaimedData.orphaned.length

  function resetFilters() {
    setSearchQuery("")
    setTypeFilter("all")
    setUserFilter("all")
    setDateFilter("all")
    setCurrentPage(1)
  }

  return (
    <div className="min-h-screen">
      <Header title="LinyaShare Admin" showAdminNav={true} adminNavItem="files" showDashboardLink />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <h1 className="text-xl sm:text-2xl font-bold gradient-text flex items-center gap-2">
          <FolderArchive className="w-5 h-5 sm:w-6 sm:h-6 text-primary-400" /> File Management
        </h1>
        <br />

        {/* Action Message */}
        <AnimatePresence>
          {actionMsg && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-6 p-4 rounded-xl ${
                actionMsg.type === "success"
                  ? "bg-green-500/10 border border-green-500/20 text-green-400"
                  : "bg-red-500/10 border border-red-500/20 text-red-400"
              }`}
            >
              {actionMsg.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search & Filters */}
        <div className="space-y-3 mb-6">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search files by name..."
          />
          <FilterBar
            filters={[
              {
                key: "type",
                label: "File type",
                value: typeFilter,
                options: [
                  { value: "all", label: "All types" },
                  { value: "video", label: "Videos" },
                  { value: "audio", label: "Audio" },
                  { value: "image", label: "Images" },
                  { value: "document", label: "Documents" },
                  { value: "pdf", label: "PDFs" },
                  { value: "spreadsheet", label: "Tables" },
                  { value: "presentation", label: "Slides" },
                  { value: "ebook", label: "E-Books" },
                  { value: "subtitle", label: "Subtitles" },
                  { value: "archive", label: "Archives" },
                  { value: "code", label: "Code & Scripts" },
                  { value: "executable", label: "Programs" },
                  { value: "model", label: "3D Models" },
                  { value: "design", label: "Design" },
                  { value: "data", label: "Data & Config" },
                  { value: "database", label: "Databases" },
                  { value: "font", label: "Fonts" },
                  { value: "key", label: "Keys & Certs" },
                  { value: "other", label: "Other" },
                ],
                onChange: setTypeFilter,
              },
              {
                key: "date",
                label: "Upload date",
                value: dateFilter,
                options: [
                  { value: "all", label: "All dates" },
                  { value: "today", label: "Today" },
                  { value: "week", label: "This week" },
                  { value: "month", label: "This month" },
                ],
                onChange: setDateFilter,
              },
              {
                key: "user",
                label: "User",
                value: userFilter,
                options: [
                  { value: "all", label: "All users" },
                  { value: "__none__", label: "Without user" },
                  ...users.map((user) => ({ value: user.id, label: user.name })),
                ],
                onChange: setUserFilter,
              },
            ]}
            onReset={resetFilters}
            activeCount={
              (searchQuery ? 1 : 0) +
              (typeFilter !== "all" ? 1 : 0) +
              (userFilter !== "all" ? 1 : 0) +
              (dateFilter !== "all" ? 1 : 0)
            }
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-dark-700">
          <button
            onClick={() => setActiveTab("assigned")}
            className={`pb-3 px-4 font-medium transition-colors ${
              activeTab === "assigned"
                ? "text-primary-400 border-b-2 border-primary-400"
                : "text-dark-400 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Assigned files ({files.length})
          </button>
          <button
            onClick={() => setActiveTab("unclaimed")}
            className={`pb-3 px-4 font-medium transition-colors ${
              activeTab === "unclaimed"
                ? "text-primary-400 border-b-2 border-primary-400"
                : "text-dark-400 hover:text-white"
            }`}
          >
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            Unclaimed ({totalUnclaimed})
          </button>
        </div>

        {loading ? (
          <SkeletonLoader variant="list" count={5} />
        ) : activeTab === "assigned" ? (
          (() => {
            const filtered = files.filter((file: any) => {
              const query = searchQuery.toLowerCase()
              const matchesSearch = !query || file.originalName.toLowerCase().includes(query)

              const matchesType = typeFilter === "all" || getFileTypeCategory(file.type || "", file.originalName || file.name) === typeFilter

              const matchesUser = (() => {
                if (userFilter === "all") return true
                if (userFilter === "__none__") return !file.userId
                return file.userId === userFilter
              })()

              const matchesDate = (() => {
                if (dateFilter === "all") return true
                const created = new Date(file.createdAt)
                const now = new Date()
                if (dateFilter === "today") {
                  return created.toDateString() === now.toDateString()
                } else if (dateFilter === "week") {
                  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                  return created >= weekAgo
                } else if (dateFilter === "month") {
                  return created.getMonth() === now.getMonth() && 
                         created.getFullYear() === now.getFullYear()
                }
                return true
              })()

              return matchesSearch && matchesType && matchesUser && matchesDate
            })

            const totalPages = Math.ceil(filtered.length / itemsPerPage)
            const start = (currentPage - 1) * itemsPerPage
            const paginated = filtered.slice(start, start + itemsPerPage)

            return filtered.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <FolderOpen className="w-16 h-16 text-dark-400 mx-auto mb-4" />
                <p className="text-dark-400">No assigned files available</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 sm:space-y-3">
                  {paginated.map((file: any) => (
                    <motion.div key={file.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-3 sm:p-5">
                      <div className="flex items-start justify-between gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-medium text-xs sm:text-sm truncate flex items-center gap-1.5 sm:gap-2">
                            <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-primary-400 shrink-0" />
                            {file.originalName}
                          </h3>
                          <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-1.5 sm:mt-2 text-xs text-dark-400">
                            <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" /> {formatSize(file.size)}</span>
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {file.user?.name || "Unknown"}</span>
                            <span className="flex items-center gap-1"><Download className="w-3 h-3" /> {file.downloads} Downloads</span>
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {file.views} Views</span>
                            <span className="hidden sm:flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(file.createdAt)}</span>
                            {file.password && <span className="text-primary-400 flex items-center gap-1"><Lock className="w-3 h-3" /> Password</span>}
                          </div>
                        </div>
                        {/* Desktop: Show delete button inline */}
                        <div className="hidden md:block">
                          <button onClick={() => handleDelete(file.id)} className="btn-danger text-sm py-2 px-3 shrink-0">Delete</button>
                        </div>
                        {/* Mobile: Show "..." menu */}
                        <div className="md:hidden relative">
                          <AdminFileMenu
                            file={file}
                            onDelete={() => handleDelete(file.id)}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filtered.length}
                />
              </>
            )
          })()
        ) : totalUnclaimed === 0 ? (
          <div className="glass-card p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <p className="text-dark-400">No unclaimed files available</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* DB-Import Files (claimed in DB but status=IMPORT) */}
            {unclaimedData.claimed.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary-400" />
                  In database ({unclaimedData.claimed.length})
                </h2>
                <div className="space-y-3">
                  {unclaimedData.claimed.map((file: any) => (
                    <motion.div key={file.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-3 sm:p-5">
                      <div className="flex items-center justify-between gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-medium text-xs sm:text-sm truncate">{file.originalName}</h3>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 sm:mt-2 text-xs text-dark-400">
                            <span>{formatSize(file.size)}</span>
                            <span className="hidden sm:inline">Uploaded: {formatDate(file.createdAt)}</span>
                            <span className="text-yellow-400">Status: Unclaimed</span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <div className="hidden md:flex gap-2 shrink-0">
                            <button onClick={() => openAssignModal(file)} className="btn-primary text-sm py-2 px-3 flex items-center gap-1">
                              <Users className="w-4 h-4" /> <span className="hidden sm:inline">Assign</span>
                            </button>
                            <button onClick={() => handleDeleteUnclaimed(file.id)} className="btn-danger text-sm py-2 px-3 min-w-[44px] min-h-[44px] flex items-center justify-center">
                              <Trash2 className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Delete</span>
                            </button>
                          </div>
                          <div className="md:hidden relative">
                            <UnclaimedFileMenu
                              file={file}
                              onAssign={() => openAssignModal(file)}
                              onDelete={() => handleDeleteUnclaimed(file.id)}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Orphaned Files (on disk, no DB entry) */}
            {unclaimedData.orphaned.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  Orphaned (only on disk) ({unclaimedData.orphaned.length})
                </h2>
                <div className="space-y-3">
                  {unclaimedData.orphaned.map((file: any) => (
                    <motion.div key={file.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-3 sm:p-5 border-yellow-500/20">
                      <div className="flex items-center justify-between gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-medium text-xs sm:text-sm truncate">{file.name}</h3>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 sm:mt-2 text-xs text-dark-400">
                            <span>{formatSize(file.size)}</span>
                            <span className="hidden sm:inline">Created: {formatDate(file.createdAt)}</span>
                            <span className="text-red-400">No database entry</span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <div className="hidden md:flex gap-2 shrink-0">
                            <button onClick={() => openAssignModal(file)} className="btn-primary text-sm py-2 px-3 flex items-center gap-1">
                              <Users className="w-4 h-4" /> <span className="hidden sm:inline">Assign</span>
                            </button>
                            <button onClick={() => handleDeleteOrphaned(file.name)} className="btn-danger text-sm py-2 px-3 min-w-[44px] min-h-[44px] flex items-center justify-center">
                              <Trash2 className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Delete</span>
                            </button>
                          </div>
                          <div className="md:hidden relative">
                            <UnclaimedFileMenu
                              file={file}
                              onAssign={() => openAssignModal(file)}
                              onDelete={() => handleDeleteOrphaned(file.name)}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Confirm"
        cancelText="Cancel"
        variant={confirmDialog.variant}
      />

      {/* Assign Modal */}
      <AnimatePresence>
        {showAssignModal && selectedFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAssignModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="glass-card p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Assign file</h2>
                <button onClick={() => setShowAssignModal(false)} className="text-dark-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-dark-300 text-sm mb-2">File:</p>
                <p className="text-white font-medium break-all">{selectedFile.originalName}</p>
                <p className="text-dark-400 text-sm mt-1">{formatSize(selectedFile.size)}</p>
              </div>

              <div className="mb-6">
                <label className="block text-dark-300 text-sm mb-2">Select user:</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white focus:outline-none focus:border-primary-400"
                >
                  <option value="">-- Please select --</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 btn-secondary py-2"
                  disabled={assigning}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  className="flex-1 btn-primary py-2"
                  disabled={!selectedUserId || assigning}
                >
                  {assigning ? "Assigning..." : "Assign"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}