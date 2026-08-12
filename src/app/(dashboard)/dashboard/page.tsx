"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Upload, Trash2, Copy, Check, FileText, FileArchive, LogOut, Settings, Shield, Lock, Eye, EyeOff,
  HardDrive, Download, Calendar, Search, Filter, X, ChevronDown, ChevronUp, LayoutGrid, List, Play,
  Share2, Music, Film, Link as LinkIcon, Image, MoreVertical, Code, Binary, Box, Database, Type,
  FileBadge, FileSpreadsheet, Presentation, BookOpen, Captions, Palette, Table, FileKey, Images,
  CheckSquare, Square, ListChecks, FileAudio,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import Header from "@/components/Header"
import ConfirmDialog from "@/components/ConfirmDialog"
import { useToast } from "@/components/Toast"
import Pagination from "@/components/Pagination"
import { formatSize, formatDate, getFileTypeCategory, isEmbeddableMedia } from "@/lib/utils"
import { DEFAULT_STORAGE_LIMIT } from "@/lib/constants"
import MobileFileMenu from "@/components/MobileFileMenu"
import { FileTypeIcon } from "@/components/FileTypeIcon"
import UploadModal from "@/components/UploadModal"
import UploadSuccessPopup from "@/components/UploadSuccessPopup"
import type { UploadedFileResult } from "@/components/UploadModal"
import AlbumModal from "@/components/AlbumModal"
import type { AlbumData } from "@/components/AlbumModal"
import AlbumsSection from "@/components/AlbumsSection"

// ──────────────────────────────────────────────────────────
// FILE TYPE FILTER OPTIONS
// ──────────────────────────────────────────────────────────
const FILE_TYPE_OPTIONS = [
  { value: "all", label: "All", icon: "FileText" },
  { value: "video", label: "Videos", icon: "Film" },
  { value: "audio", label: "Music", icon: "Music" },
  { value: "image", label: "Images", icon: "Image" },
  { value: "document", label: "Documents", icon: "FileText" },
  { value: "pdf", label: "PDFs", icon: "FileBadge" },
  { value: "spreadsheet", label: "Tables", icon: "FileSpreadsheet" },
  { value: "presentation", label: "Slides", icon: "Presentation" },
  { value: "ebook", label: "E-Books", icon: "BookOpen" },
  { value: "subtitle", label: "Subtitles", icon: "Captions" },
  { value: "archive", label: "Archives", icon: "FileArchive" },
  { value: "code", label: "Code", icon: "Code" },
  { value: "executable", label: "Programs", icon: "Binary" },
  { value: "model", label: "3D Models", icon: "Box" },
  { value: "design", label: "Design", icon: "Palette" },
  { value: "data", label: "Data & Config", icon: "Database" },
  { value: "database", label: "Databases", icon: "Table" },
  { value: "font", label: "Fonts", icon: "Type" },
  { value: "key", label: "Keys & Certs", icon: "FileKey" },
  { value: "other", label: "Other", icon: "FileIcon" },
] as const

const ICON_MAP: Record<string, LucideIcon> = {
  FileText,
  Film,
  Music,
  Image,
  FileArchive,
  Code,
  Binary,
  Box,
  Database,
  Table,
  Type,
  FileBadge,
  FileSpreadsheet,
  Presentation,
  BookOpen,
  Captions,
  Palette,
  FileKey,
  FileIcon: FileText,
}

// ──────────────────────────────────────────────────────────
// SKELETON LOADER COMPONENT
// ──────────────────────────────────────────────────────────
function SkeletonLoader({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="glass-card p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="h-5 bg-dark-700 rounded-lg w-3/4 animate-pulse" />
              <div className="flex gap-4">
                <div className="h-4 bg-dark-700 rounded w-20 animate-pulse" />
                <div className="h-4 bg-dark-700 rounded w-32 animate-pulse" />
                <div className="h-4 bg-dark-700 rounded w-24 animate-pulse" />
              </div>
              <div className="h-9 bg-dark-700 rounded-lg w-full animate-pulse" />
            </div>
            <div className="h-9 w-9 bg-dark-700 rounded-lg animate-pulse shrink-0" />
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// FILE PREVIEW COMPONENT (Expandable)
// ──────────────────────────────────────────────────────────
function FilePreview({ file, isExpanded, onToggle }: {
  file: any
  isExpanded: boolean
  onToggle: () => void
}) {
  const isVideo = file.type.startsWith("video/")
  const isAudio = file.type.startsWith("audio/")
  const isImage = file.type.startsWith("image/")
  const canPreview = isVideo || isAudio || isImage

  if (!canPreview) return null

  const streamUrl = `/api/files/stream/${file.shareId}`

  return (
    <div className="mt-3">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300 transition-colors"
      >
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {isExpanded ? "Hide preview" : "Show preview"}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-2"
          >
            <div className="rounded-xl overflow-hidden border border-dark-600/30 bg-dark-900/50">
              {isVideo && (
                <video controls className="w-full max-h-80 bg-black" preload="metadata">
                  <source src={streamUrl} type={file.type} />
                </video>
              )}
              {isAudio && (
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <FileAudio className="w-8 h-8 text-primary-400" />
                    <div className="text-sm text-dark-300 truncate">{file.originalName}</div>
                  </div>
                  <audio controls className="w-full" preload="metadata">
                    <source src={streamUrl} type={file.type} />
                  </audio>
                </div>
              )}
              {isImage && (
                <img
                  src={streamUrl}
                  alt={file.originalName}
                  className="w-full max-h-96 object-contain bg-dark-900"
                  loading="lazy"
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// MAIN DASHBOARD PAGE
// ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { success: toastSuccess, error: toastError } = useToast()
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [albums, setAlbums] = useState<AlbumData[]>([])
  const [albumsLoading, setAlbumsLoading] = useState(true)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [successFiles, setSuccessFiles] = useState<UploadedFileResult[] | null>(null)
  const [albumModal, setAlbumModal] = useState<{
    open: boolean
    mode: "create" | "edit"
    preselectedFileIds: string[]
    album: AlbumData | null
  }>({ open: false, mode: "create", preselectedFileIds: [], album: null })
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [storageUsed, setStorageUsed] = useState(0)
  const [storageMax, setStorageMax] = useState(DEFAULT_STORAGE_LIMIT)
  const [editingPasswordId, setEditingPasswordId] = useState<string | null>(null)
  const [editingPassword, setEditingPassword] = useState("")
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"all" | "name" | "date" | "size">("all")
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [expandedFile, setExpandedFile] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])
  const itemsPerPage = 10

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

  const loadFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/files")
      const data = await res.json()
      setFiles(data.files || [])
      setStorageUsed((data.files || []).reduce((sum: number, f: any) => sum + f.size, 0))
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  const loadAlbums = useCallback(async () => {
    setAlbumsLoading(true)
    try {
      const res = await fetch("/api/albums")
      const data = await res.json()
      setAlbums(data.albums || [])
    } catch {} finally {
      setAlbumsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
    else if (status === "authenticated") {
      loadFiles()
      loadAlbums()
      fetch("/api/user/settings").then((r) => r.json()).then((d) => d.maxSize && setStorageMax(d.maxSize)).catch(() => {})
    }
  }, [status, router, loadFiles, loadAlbums])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterType, fileTypeFilter])

  // Exit selection mode when file list changes drastically
  useEffect(() => {
    if (!selectionMode) return
    const currentIds = new Set(files.map((f: any) => f.id))
    setSelectedFileIds((prev) => prev.filter((id) => currentIds.has(id)))
  }, [files, selectionMode])

  async function handleUpdatePassword(fileId: string) {
    if (!editingPassword.trim()) return
    try {
      const res = await fetch("/api/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, password: editingPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update password")
      toastSuccess("Password updated")
      setEditingPasswordId(null)
      setEditingPassword("")
      loadFiles()
    } catch (e: any) {
      toastError(e.message || "Failed to update password")
    }
  }

  async function handleRemovePassword(fileId: string) {
    setConfirmDialog({
      isOpen: true,
      title: "Remove password protection?",
      message: "Are you sure you want to remove the password protection from this file?",
      variant: "warning",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/files", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileId, password: "" }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || "Failed to remove password")
          toastSuccess("Password protection removed")
          loadFiles()
        } catch (e: any) {
          toastError(e.message || "Failed to remove password")
        }
      }
    })
  }

  async function handleDelete(fileId: string) {
    setConfirmDialog({
      isOpen: true,
      title: "Delete file permanently?",
      message: "Are you sure you want to delete this file permanently? This action cannot be undone.",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/files", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileId })
          })
          const data = await res.json()
          if (!res.ok || data.success === false) {
            throw new Error(data.error || "Failed to delete file")
          }
          toastSuccess("File deleted")
          loadFiles()
          loadAlbums()
        } catch (e: any) {
          toastError(e.message || "Failed to delete file")
        }
      }
    })
  }

  async function handleDeleteSelected() {
    const ids = selectedFileIds
    if (ids.length === 0) return

    const names = files
      .filter((f: any) => ids.includes(f.id))
      .map((f: any) => f.originalName)

    const preview = names.slice(0, 3).map((n: string) => `"${n}"`).join(", ")
    const more = names.length > 3 ? ` and ${names.length - 3} more` : ""

    setConfirmDialog({
      isOpen: true,
      title: `Delete ${ids.length} ${ids.length === 1 ? "file" : "files"} permanently?`,
      message: `Are you sure you want to delete ${ids.length === 1 ? "this file" : "these files"} permanently? This action cannot be undone. ${preview}${more}.`,
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/files", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileIds: ids })
          })
          const data = await res.json()
          if (!res.ok || data.success === false) {
            throw new Error(data.error || "Failed to delete selected files")
          }
          toastSuccess(`${data.deleted ?? ids.length} ${(data.deleted ?? ids.length) === 1 ? "file" : "files"} deleted`)
          setSelectionMode(false)
          setSelectedFileIds([])
          loadFiles()
          loadAlbums()
        } catch (e: any) {
          toastError(e.message || "Failed to delete files")
        }
      }
    })
  }

  async function handleDeleteAlbum(album: AlbumData) {
    setConfirmDialog({
      isOpen: true,
      title: "Delete album?",
      message: `Are you sure you want to delete "${album.name}"? The shared gallery link will stop working. Your files are not deleted.`,
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/albums/${album.shareId}`, { method: "DELETE" })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || "Failed to delete album")
          toastSuccess("Album deleted")
          loadAlbums()
        } catch (e: any) {
          toastError(e.message || "Failed to delete album")
        }
      }
    })
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      toastSuccess("Copied to clipboard")
    }).catch(() => {
      toastError("Could not copy to clipboard")
    })
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function directDownloadUrl(file: any) {
    return `${window.location.origin}/api/files/stream/${file.shareId}?download=1`
  }

  function openCreateAlbum(fileIds: string[]) {
    setAlbumModal({ open: true, mode: "create", preselectedFileIds: fileIds, album: null })
  }

  function handleAlbumSaved(mode: "create" | "edit") {
    toastSuccess(mode === "create" ? "Album created" : "Album updated")
    loadAlbums()
    loadFiles()
    setAlbumModal((prev) => ({ ...prev, open: false, preselectedFileIds: [] }))
    setSuccessFiles(null)
    setSelectionMode(false)
    setSelectedFileIds([])
  }

  function toggleSelectFile(id: string) {
    setSelectedFileIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  if (status === "loading") return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="loading-spinner"></div>
    </div>
  )

  const isAdmin = (session?.user as any)?.role === "ADMIN"
  const storagePercent = storageMax > 0 ? (storageUsed / storageMax) * 100 : 0

  // ── Filtered & Sorted Files ──
  const filteredFiles = files.filter((file: any) => {
    const query = searchQuery.toLowerCase()
    const matchesSearch = !query || (() => {
      switch (filterType) {
        case "name": return file.originalName.toLowerCase().includes(query)
        case "date": return new Date(file.createdAt).toLocaleDateString("en-US").includes(query)
        case "size": return formatSize(file.size).toLowerCase().includes(query)
        default: return file.originalName.toLowerCase().includes(query)
      }
    })()

    const matchesFileType = fileTypeFilter === "all" || getFileTypeCategory(file.type, file.originalName || file.name) === fileTypeFilter

    return matchesSearch && matchesFileType
  }).sort((a: any, b: any) => {
    if (filterType === "size") return b.size - a.size
    if (filterType === "date") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    return 0
  })

  // Selection across the whole (filtered) list
  const allFilteredShown = selectionMode && filteredFiles.length > 0
  const allSelected = allFilteredShown && filteredFiles.every((f: any) => selectedFileIds.includes(f.id))

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedFileIds((prev) => prev.filter((id) => !filteredFiles.some((f: any) => f.id === id)))
    } else {
      const ids = filteredFiles.map((f: any) => f.id)
      setSelectedFileIds((prev) => [...new Set([...prev, ...ids])])
    }
  }

  // Pagination
  const totalPages = Math.ceil(filteredFiles.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedFiles = filteredFiles.slice(startIndex, startIndex + itemsPerPage)

  const isNearLimit = storagePercent > 90
  const isMediumUsage = storagePercent > 70

  return (
    <div className="min-h-screen">
      <Header title="LinyaShare" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Title */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl sm:text-2xl font-bold gradient-text flex items-center gap-2">
              <Share2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary-400" /> Dashboard
            </h1>
            <span className="text-sm text-dark-400">
              {filteredFiles.length} {filteredFiles.length === 1 ? 'file' : 'files'} visible
            </span>
          </div>
        </div>

        {/* Storage Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-primary-400" />
              <h2 className="text-base font-semibold text-white">Storage</h2>
            </div>
            <span className="text-xs text-dark-400">{formatSize(storageUsed)} / {formatSize(storageMax)}</span>
          </div>
          <div className="w-full bg-dark-700 rounded-full h-3 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(storagePercent, 100)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full rounded-full ${
                isNearLimit
                  ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                  : isMediumUsage
                  ? "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]"
                  : "bg-gradient-to-r from-primary-600 to-primary-400 shadow-[0_0_10px_rgb(var(--primary-500)/0.3)]"
              }`}
            />
          </div>
        </motion.div>

        {/* Upload Button */}
        <div className="mb-8">
          <button onClick={() => setUploadModalOpen(true)} className="btn-primary flex items-center gap-2">
            <Upload className="w-5 h-5" /> Upload files
          </button>
          <p className="text-xs text-dark-500 mt-2">Upload multiple files at once — share them individually or combine them into an album.</p>
        </div>

        {/* Albums */}
        <AlbumsSection
          albums={albums}
          loading={albumsLoading}
          onEdit={(album) => setAlbumModal({ open: true, mode: "edit", preselectedFileIds: [], album })}
          onDelete={handleDeleteAlbum}
          onCreateClick={() => { setSelectionMode(true); setUploadModalOpen(false) }}
        />

        {/* Search, Filter & View Toggle */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Title Row */}
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title flex items-center gap-2 mb-0">
              <FileText className="w-6 h-6 text-primary-400" /> My files
            </h2>
            <div className="flex items-center gap-2">
              {/* Select mode toggle */}
              <button
                onClick={() => {
                  setSelectionMode(!selectionMode)
                  setSelectedFileIds([])
                }}
                className={`p-2 rounded-lg transition-all flex items-center gap-1.5 ${
                  selectionMode
                    ? "bg-primary-500/20 text-primary-400 shadow-[0_0_10px_rgb(var(--primary-500)/0.1)] border border-primary-500/30"
                    : "bg-dark-800/60 border border-dark-600/30 text-dark-400 hover:text-white hover:bg-dark-700/50"
                }`}
                title={selectionMode ? "Exit selection mode" : "Select files"}
              >
                {selectionMode ? <ListChecks className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                <span className="hidden md:inline text-xs font-medium">{selectionMode ? "Done" : "Select"}</span>
              </button>
              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-dark-800/60 border border-dark-600/30 rounded-xl p-1">
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === "list"
                      ? "bg-primary-500/20 text-primary-400 shadow-[0_0_10px_rgb(var(--primary-500)/0.1)]"
                      : "text-dark-400 hover:text-white hover:bg-dark-700/50"
                  }`}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === "grid"
                      ? "bg-primary-500/20 text-primary-400 shadow-[0_0_10px_rgb(var(--primary-500)/0.1)]"
                      : "text-dark-400 hover:text-white hover:bg-dark-700/50"
                  }`}
                  title="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Selection toolbar */}
          <AnimatePresence>
            {selectionMode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-3 glass-card p-3">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-sm text-dark-300 hover:text-white transition-colors"
                  >
                    {allSelected ? <Square className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                    {allSelected ? "Deselect all" : "Select all"}
                  </button>
                  <span className="text-sm text-dark-400">
                    {selectedFileIds.length} selected
                  </span>
                  <div className="flex-1" />
                  <button
                    onClick={() => openCreateAlbum(selectedFileIds)}
                    disabled={selectedFileIds.length === 0}
                    className="btn-primary text-sm flex items-center gap-2"
                  >
                    <Images className="w-4 h-4" /> Share as album
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    disabled={selectedFileIds.length === 0}
                    className="btn-danger text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                  <button
                    onClick={() => { setSelectionMode(false); setSelectedFileIds([]) }}
                    className="btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search & Sort Row */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="input-field text-sm py-2 pl-10 w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="input-field text-sm py-2 w-full md:w-40"
            >
              <option value="all">All</option>
              <option value="name">Name</option>
              <option value="date">Date</option>
              <option value="size">Size</option>
            </select>
          </div>

          {/* File Type Filter — Desktop: Icon-Buttons, Mobile: Dropdown */}
          <div className="hidden md:flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-dark-400 shrink-0" />
            {FILE_TYPE_OPTIONS.map((opt) => {
              const Icon = ICON_MAP[opt.icon]
              const isActive = fileTypeFilter === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => setFileTypeFilter(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary-500/20 text-primary-400 border border-primary-500/30 shadow-[0_0_10px_rgb(var(--primary-500)/0.1)]"
                      : "bg-dark-800/40 text-dark-400 border border-dark-600/20 hover:border-dark-500/40 hover:text-white"
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {opt.label}
                </button>
              )
            })}
          </div>

          {/* Mobile: File-Type als kompaktes Dropdown */}
          <div className="md:hidden relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400 pointer-events-none" />
            <select
              value={fileTypeFilter}
              onChange={(e) => setFileTypeFilter(e.target.value)}
              className="input-field text-sm py-2 pl-10 w-full"
              aria-label="Filter by file type"
            >
              {FILE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* File List / Grid */}
        {loading ? (
          <SkeletonLoader count={4} />
        ) : files.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-12 text-center">
            <Upload className="w-12 h-12 text-dark-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No files yet</h3>
            <p className="text-dark-400">Upload your first file to start sharing.</p>
          </motion.div>
        ) : filteredFiles.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-12 text-center">
            <Search className="w-12 h-12 text-dark-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No results found</h3>
            <p className="text-dark-400">Try a different search term or filter.</p>
          </motion.div>
        ) : (
          <>
            {viewMode === "list" ? (
              /* ── LIST VIEW ── */
              <div className="grid gap-3">
                {paginatedFiles.map((file: any, index: number) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => selectionMode && toggleSelectFile(file.id)}
                    className={`glass-card-hover p-4 transition-all ${
                      selectionMode
                        ? "cursor-pointer " + (selectedFileIds.includes(file.id)
                            ? "ring-2 ring-primary-500/60 border-primary-500/40 bg-primary-500/5"
                            : "hover:border-primary-500/30")
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium break-all flex items-center gap-2">
                          {selectionMode && (
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleSelectFile(file.id) }}
                              className={`p-1 rounded-md transition-colors ${
                                selectedFileIds.includes(file.id)
                                  ? "bg-primary-500/20 text-primary-400"
                                  : "text-dark-500 hover:text-dark-300"
                              }`}
                            >
                              <CheckSquare className="w-4 h-4" />
                            </button>
                          )}
                          <FileTypeIcon type={file.type} name={file.originalName || file.name} />
                          {file.originalName}
                        </h3>
                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-dark-400">
                          <span className="flex items-center gap-1">
                            <HardDrive className="w-3 h-3" /> {formatSize(file.size)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {formatDate(file.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Download className="w-3 h-3" /> {file.downloads} downloads
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {file.views} views
                          </span>
                          {file.hasPassword ? (
                            <span className="text-primary-400 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setShowPasswords({ ...showPasswords, [file.id]: !showPasswords[file.id] })}
                                className="hover:text-white transition-colors"
                              >
                                {showPasswords[file.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                              <button
                                onClick={() => copyToClipboard(file.password || "", file.id)}
                                className="hover:text-white transition-colors"
                                title="Copy password"
                              >
                                {showPasswords[file.id] ? (file.password || "") : "••••••"}
                              </button>
                            </span>
                          ) : (
                            <span className="text-dark-500">No password</span>
                          )}
                        </div>
                        {/* Share URL - compact on mobile, full on desktop */}
                        <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex-1 min-w-0">
                            <div className="hidden sm:block">
                              <input
                                type="text"
                                value={file.shareUrl}
                                readOnly
                                className="input-field text-sm py-2 w-full"
                                onClick={(e) => (e.target as HTMLInputElement).select()}
                              />
                            </div>
                            <div className="sm:hidden">
                              <input
                                type="text"
                                value={file.shareId}
                                readOnly
                                className="input-field text-sm py-2 w-full font-mono"
                                onClick={(e) => (e.target as HTMLInputElement).select()}
                              />
                            </div>
                          </div>
                          <button
                            onClick={() => copyToClipboard(file.shareUrl, file.id)}
                            className="btn-secondary text-sm py-2 px-3 shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                            title="Copy share link"
                          >
                            {copiedId === file.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(directDownloadUrl(file), `dl-${file.id}`)}
                            className="btn-secondary text-sm py-2 px-3 shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                            title="Copy direct download link"
                          >
                            {copiedId === `dl-${file.id}` ? <Check className="w-4 h-4 text-green-400" /> : <LinkIcon className="w-4 h-4" />}
                          </button>
                          {/* Desktop: Extra Buttons */}
                          <div className="hidden md:flex items-center gap-2">
                            {file.hasPassword && (
                              <>
                                <button
                                  onClick={() => setEditingPasswordId(file.id)}
                                  className="btn-secondary text-sm py-2 px-3"
                                  title="Edit password"
                                >
                                  <Lock className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleRemovePassword(file.id)}
                                  className="btn-danger text-sm py-2 px-3"
                                  title="Remove password"
                                >
                                  <EyeOff className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button onClick={() => handleDelete(file.id)} className="btn-danger text-sm py-2 px-3">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          {/* Mobile: More Actions Menu */}
                          <div className="md:hidden relative">
                            <MobileFileMenu
                              file={file}
                              onCopyShareUrl={() => copyToClipboard(file.shareUrl, file.id)}
                              onEditPassword={() => setEditingPasswordId(file.id)}
                              onRemovePassword={() => handleRemovePassword(file.id)}
                              onDelete={() => handleDelete(file.id)}
                            />
                          </div>
                        </div>

                        {isEmbeddableMedia(file) && file.embedUrl && (
                          <div className="mt-3 hidden sm:flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <LinkIcon className="w-4 h-4 text-primary-400 shrink-0" />
                            <input
                              type="text"
                              value={file.embedUrl}
                              readOnly
                              className="input-field text-sm py-2 flex-1"
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                            />
                            <button
                              onClick={() => copyToClipboard(file.embedUrl, `embed-${file.id}`)}
                              className="btn-secondary text-sm py-2 px-3"
                            >
                              {copiedId === `embed-${file.id}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        )}

                        {/* Expandable Preview */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <FilePreview
                            file={file}
                            isExpanded={expandedFile === file.id}
                            onToggle={() => setExpandedFile(expandedFile === file.id ? null : file.id)}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              /* ── GRID VIEW ── */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {paginatedFiles.map((file: any, index: number) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => selectionMode && toggleSelectFile(file.id)}
                    className={`glass-card-hover p-5 flex flex-col transition-all ${
                      selectionMode
                        ? "cursor-pointer " + (selectedFileIds.includes(file.id)
                            ? "ring-2 ring-primary-500/60 border-primary-500/40 bg-primary-500/5"
                            : "hover:border-primary-500/30")
                        : ""
                    }`}
                  >
                    {/* File Icon & Name */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center shrink-0">
                        <FileTypeIcon type={file.type} name={file.originalName || file.name} className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-white font-medium text-sm truncate flex items-center gap-1.5">
                          {selectionMode && (
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleSelectFile(file.id) }}
                              className={`p-0.5 rounded transition-colors shrink-0 ${
                                selectedFileIds.includes(file.id) ? "text-primary-400" : "text-dark-500"
                              }`}
                            >
                              <CheckSquare className="w-4 h-4" />
                            </button>
                          )}
                          <span className="truncate">{file.originalName}</span>
                        </h3>
                        <p className="text-dark-400 text-xs mt-0.5">{formatSize(file.size)}</p>
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-dark-400 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {formatDate(file.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Download className="w-3 h-3" /> {file.downloads}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {file.views}
                      </span>
                      {file.hasPassword && (
                        <span className="text-primary-400 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Protected
                        </span>
                      )}
                    </div>

                    {/* Share URL (compact) */}
                    <div className="flex items-center gap-1 mb-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={file.shareUrl}
                        readOnly
                        className="input-field text-xs py-1.5 flex-1"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <button
                        onClick={() => copyToClipboard(file.shareUrl, file.id)}
                        className="btn-secondary text-xs py-1.5 px-2"
                        title="Copy share link"
                      >
                        {copiedId === file.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(directDownloadUrl(file), `dl-${file.id}`)}
                        className="btn-secondary text-xs py-1.5 px-2"
                        title="Copy direct download link"
                      >
                        {copiedId === `dl-${file.id}` ? <Check className="w-3 h-3 text-green-400" /> : <LinkIcon className="w-3 h-3" />}
                      </button>
                    </div>

                    {isEmbeddableMedia(file) && file.embedUrl && (
                      <div className="flex items-center gap-1 mb-3" onClick={(e) => e.stopPropagation()}>
                        <LinkIcon className="w-3 h-3 text-primary-400 shrink-0" />
                        <input
                          type="text"
                          value={file.embedUrl}
                          readOnly
                          className="input-field text-xs py-1.5 flex-1"
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                        <button
                          onClick={() => copyToClipboard(file.embedUrl, `embed-${file.id}`)}
                          className="btn-secondary text-xs py-1.5 px-2"
                        >
                          {copiedId === `embed-${file.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    )}

                    {/* Preview Toggle */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <FilePreview
                        file={file}
                        isExpanded={expandedFile === file.id}
                        onToggle={() => setExpandedFile(expandedFile === file.id ? null : file.id)}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-auto pt-3 border-t border-dark-600/20" onClick={(e) => e.stopPropagation()}>
                      {file.hasPassword && (
                        <>
                          <button
                            onClick={() => setEditingPasswordId(file.id)}
                            className="btn-secondary text-xs py-2 px-3 flex-1 min-h-[44px] flex items-center justify-center"
                            title="Edit password"
                          >
                            <Lock className="w-3 h-3 inline mr-1" /> Edit
                          </button>
                          <button
                            onClick={() => handleRemovePassword(file.id)}
                            className="btn-danger text-xs py-2 px-3 flex-1 min-h-[44px] flex items-center justify-center"
                            title="Remove password"
                          >
                            <EyeOff className="w-3 h-3 inline mr-1" /> Remove
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(file.id)}
                        className="btn-danger text-xs py-2 px-3 min-w-[44px] min-h-[44px] flex items-center justify-center"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={filteredFiles.length}
            />
          </>
        )}
      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        maxUploadBytes={Math.max(0, storageMax - storageUsed)}
        onCompleted={(results) => {
          setUploadModalOpen(false)
          setSuccessFiles(results)
          loadFiles()
        }}
      />

      {/* Upload Success Popup */}
      <UploadSuccessPopup
        isOpen={!!successFiles}
        files={successFiles || []}
        onClose={() => setSuccessFiles(null)}
        onCreateAlbum={(fileIds) => {
          setUploadModalOpen(false)
          openCreateAlbum(fileIds)
        }}
      />

      {/* Album Create/Edit Modal */}
      <AlbumModal
        isOpen={albumModal.open}
        mode={albumModal.mode}
        files={files.map((f: any) => ({ id: f.id, originalName: f.originalName, type: f.type, size: f.size }))}
        preselectedFileIds={albumModal.preselectedFileIds}
        album={albumModal.album || undefined}
        onClose={() => setAlbumModal((prev) => ({ ...prev, open: false, preselectedFileIds: [] }))}
        onSaved={handleAlbumSaved}
      />

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

      {/* Edit Password Modal */}
      <AnimatePresence>
        {editingPasswordId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setEditingPasswordId(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="glass-card p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white mb-4">Edit Password</h3>
              <input
                type="text"
                value={editingPassword}
                onChange={(e) => setEditingPassword(e.target.value)}
                placeholder="Enter new password (leave empty to remove)"
                className="input-field mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <button onClick={() => handleUpdatePassword(editingPasswordId)} className="btn-primary flex-1">
                  Save
                </button>
                <button onClick={() => setEditingPasswordId(null)} className="btn-secondary flex-1">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}