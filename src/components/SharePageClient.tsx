"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import { Lock, AlertCircle, Download, Eye, FileVideo, FileAudio, FileArchive, File, Shield, HardDrive, User, Share2, Music, Image, Film, Package, Code, Binary, Box, Database, Type, FileBadge, FileSpreadsheet, Presentation, BookOpen, Captions, Palette, Table, FileKey } from "lucide-react"
import { formatSize, getFileTypeCategory } from "@/lib/utils"

// ──────────────────────────────────────────────────────────
// FILE TYPE DETECTION
// ──────────────────────────────────────────────────────────
function getFileTypeInfo(type: string, name: string) {
  const category = getFileTypeCategory(type, name)
  
  switch (category) {
    case "video":
      return { icon: Film, label: "Video File", color: "text-purple-400", bgClass: "bg-purple-500/10" }
    case "audio":
      return { icon: Music, label: "Audio File", color: "text-green-400", bgClass: "bg-green-500/10" }
    case "image":
      return { icon: Image, label: "Image", color: "text-blue-400", bgClass: "bg-blue-500/10" }
    case "archive":
      return { icon: Package, label: "Archive", color: "text-yellow-400", bgClass: "bg-yellow-500/10" }
    case "code":
      return { icon: Code, label: "Code", color: "text-cyan-400", bgClass: "bg-cyan-500/10" }
    case "executable":
      return { icon: Binary, label: "Program", color: "text-amber-400", bgClass: "bg-amber-500/10" }
    case "model":
      return { icon: Box, label: "3D Model", color: "text-indigo-400", bgClass: "bg-indigo-500/10" }
    case "data":
      return { icon: Database, label: "Data & Config", color: "text-emerald-400", bgClass: "bg-emerald-500/10" }
    case "database":
      return { icon: Table, label: "Database", color: "text-teal-400", bgClass: "bg-teal-500/10" }
    case "font":
      return { icon: Type, label: "Font", color: "text-fuchsia-400", bgClass: "bg-fuchsia-500/10" }
    case "pdf":
      return { icon: FileBadge, label: "PDF", color: "text-red-400", bgClass: "bg-red-500/10" }
    case "spreadsheet":
      return { icon: FileSpreadsheet, label: "Spreadsheet", color: "text-green-400", bgClass: "bg-green-500/10" }
    case "presentation":
      return { icon: Presentation, label: "Presentation", color: "text-orange-400", bgClass: "bg-orange-500/10" }
    case "ebook":
      return { icon: BookOpen, label: "E-Book", color: "text-violet-400", bgClass: "bg-violet-500/10" }
    case "subtitle":
      return { icon: Captions, label: "Subtitles", color: "text-sky-400", bgClass: "bg-sky-500/10" }
    case "design":
      return { icon: Palette, label: "Design", color: "text-pink-400", bgClass: "bg-pink-500/10" }
    case "key":
      return { icon: FileKey, label: "Key / Certificate", color: "text-gray-400", bgClass: "bg-gray-500/10" }
    default:
      return { icon: File, label: "File", color: "text-primary-400", bgClass: "bg-primary-500/10" }
  }
}


type SharePageClientProps = {
  shareId: string
}

export default function SharePageClient({ shareId }: SharePageClientProps) {
  const [fileInfo, setFileInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState("")
  const [needsPassword, setNeedsPassword] = useState(false)
  const [error, setError] = useState("")
  const [downloading, setDownloading] = useState(false)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

  // Streaming-Preview: Verwende die GET-Route statt blob()
  const [hasPassword, setHasPassword] = useState(false)
  const [passwordVerified, setPasswordVerified] = useState(false)

  // Verhindert, dass der View mehrfach gezählt wird (StrictMode, Re-Render etc.)
  const viewCountedRef = useRef(false)

  // View zählen: öffentliche Dateien direkt nach erfolgreichem Laden,
  // passwortgeschützte erst nach erfolgreicher Freigabe (siehe handleVerifyPassword)
  const countView = useCallback(() => {
    if (viewCountedRef.current) return
    viewCountedRef.current = true
    fetch(`/api/files/view/${shareId}`, { method: "POST" }).catch(() => {})
  }, [shareId])

  useEffect(() => {
    async function loadInfo() {
      try {
        const res = await fetch(`/api/files/info/${shareId}`)
        const data = await res.json()
        if (data.exists) {
          setFileInfo(data)
          const pwRequired = data.hasPassword
          setNeedsPassword(pwRequired)
          setHasPassword(pwRequired)
          // Öffentliche Dateien zählen den View sofort
          if (!pwRequired) countView()
        } else {
          setError("File not found")
        }
      } catch { setError("Failed to load file info") }
      setLoading(false)
    }
    loadInfo()
  }, [shareId, countView])

  // Berechne die Streaming-URL basierend auf Passwort-Status
  const streamingUrl = useMemo(() => {
    if (!shareId) return null
    // Wenn kein Passwort nötig → direkter Stream
    if (!needsPassword || passwordVerified) {
      return `/api/files/stream/${shareId}${password ? `?password=${encodeURIComponent(password)}` : ''}`
    }
    return null
  }, [shareId, needsPassword, passwordVerified, password])

  // Streaming-Preview aktivieren
  useEffect(() => {
    if (!needsPassword && fileInfo && canPreview && !isPreviewLoading) {
      setPasswordVerified(true)
    }
  }, [fileInfo, needsPassword])

  const fileType = fileInfo?.type || ""
  const fileName = fileInfo?.name || ""
  const fileTypeInfo = useMemo(() => getFileTypeInfo(fileType, fileName), [fileType, fileName])
  const FileIcon = fileTypeInfo.icon

  const isVideo = useMemo(() => {
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    return fileType.startsWith("video/") || ['mp4', 'webm', 'avi', 'mov', 'mkv', 'wmv'].includes(ext)
  }, [fileType, fileName])

  const isAudio = useMemo(() => {
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    return fileType.startsWith("audio/") || ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)
  }, [fileType, fileName])

  const isImage = useMemo(() => {
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    return fileType.startsWith("image/") || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)
  }, [fileType, fileName])

  const canPreview = isVideo || isAudio || isImage

  async function handleVerifyPassword() {
    setIsPreviewLoading(true)
    setError("")

    try {
      // Passwort verifizieren (ohne den Download-Counter zu erhöhen)
      const res = await fetch("/api/files/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareId, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        if (data.needsPassword) {
          setNeedsPassword(true)
          setPasswordVerified(false)
        }
        setError(data.error || "Invalid password")
        return
      }

      // Passwort korrekt → Streaming-Vorschau aktivieren
      // und den View zählen (nur nach erfolgreicher Freigabe)
      countView()
      setPasswordVerified(true)
      setNeedsPassword(false) // Streaming braucht kein Passwort mehr
    } catch {
      setError("Verification failed")
    } finally {
      setIsPreviewLoading(false)
    }
  }

  async function handleDownload() {
    setDownloading(true)
    setError("")

    try {
      // Bei passwortgeschützten Dateien: erst Passwort verifizieren falls nötig
      if (needsPassword && !passwordVerified) {
        const verifyRes = await fetch("/api/files/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shareId, password }),
        })
        if (!verifyRes.ok) {
          const data = await verifyRes.json()
          if (data.needsPassword) setNeedsPassword(true)
          setError(data.error || "Invalid password")
          return
        }
        setPasswordVerified(true)
        countView()
      }

      // Download-URL bauen (Stream-Endpunkt mit ?download=1)
      const pwParam = password ? `&password=${encodeURIComponent(password)}` : ""
      const downloadUrl = `/api/files/stream/${shareId}?download=1${pwParam}`

      // Nativen Browser-Download verwenden → kein RAM-Verbrauch!
      const a = document.createElement("a")
      a.href = downloadUrl
      a.download = fileInfo?.originalName || "download"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      setError("Download failed")
    } finally {
      setDownloading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="loading-spinner"></div>
    </div>
  )

  if (error && !fileInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12 max-w-md w-full text-center">
          <AlertCircle className="w-20 h-20 text-dark-400 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-2">File not found</h1>
          <p className="text-dark-400">This link is invalid or the file was deleted.</p>
        </motion.div>
      </div>
    )
  }

  const showLockedContent = needsPassword && !passwordVerified
  const showUnlockedContent = !needsPassword || passwordVerified

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 max-w-lg w-full relative">
        
        {/* Header with file icon */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200 }}
            className={`w-24 h-24 ${fileTypeInfo.bgClass} rounded-3xl flex items-center justify-center mx-auto mb-6`}
          >
            <FileIcon className={`w-12 h-12 ${fileTypeInfo.color}`} />
          </motion.div>

          <h1 className="text-xl md:text-2xl font-bold text-white mb-1 break-words px-2">{fileInfo?.originalName || fileInfo?.name}</h1>
          <p className={`${fileTypeInfo.color} text-xs sm:text-sm font-medium mb-4`}>{fileTypeInfo.label}</p>
        </div>

        {/* Locked content - password prompt */}
        {showLockedContent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-8">
            <div className="bg-dark-800/30 rounded-xl p-8 mb-6">
              <Shield className="w-16 h-16 text-primary-400 mx-auto mb-4" />
              <p className="text-white text-lg font-medium mb-2">This content is password protected</p>
              <p className="text-dark-400 text-sm">Enter the password to view file information and download</p>
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyPassword()}
                placeholder="Enter password"
                className="input-field pl-11 mb-4" />
            </div>

            <button onClick={handleVerifyPassword} disabled={downloading || isPreviewLoading}
              className="btn-primary w-full flex items-center justify-center gap-2">
              {isPreviewLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Verifying...
                </span>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Unlock content
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* Unlocked content - file info and streaming preview */}
        {showUnlockedContent && (
          <>
            {/* File details */}
            <div className="space-y-2.5 mb-6">
              <div className="flex items-center gap-3 bg-dark-800/30 rounded-xl px-4 py-3 hover:bg-dark-800/50 transition-colors">
                <HardDrive className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-dark-500 text-xs uppercase tracking-wider">Size</p>
                  <p className="text-white font-medium">{formatSize(fileInfo?.size || 0)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-dark-800/30 rounded-xl px-4 py-3 hover:bg-dark-800/50 transition-colors">
                <Download className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-dark-500 text-xs uppercase tracking-wider">Downloads</p>
                  <p className="text-white font-medium">{fileInfo?.downloads || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-dark-800/30 rounded-xl px-4 py-3 hover:bg-dark-800/50 transition-colors">
                <Eye className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-dark-500 text-xs uppercase tracking-wider">Views</p>
                  <p className="text-white font-medium">{fileInfo?.views || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-dark-800/30 rounded-xl px-4 py-3 hover:bg-dark-800/50 transition-colors">
                <User className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-dark-500 text-xs uppercase tracking-wider">Shared by</p>
                  <p className="text-white font-medium truncate">{fileInfo?.uploader || "Unknown"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-dark-800/30 rounded-xl px-4 py-3 hover:bg-dark-800/50 transition-colors">
                {hasPassword ? (
                  <Lock className="w-4 h-4 text-primary-400 flex-shrink-0" />
                ) : (
                  <Share2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-dark-500 text-xs uppercase tracking-wider">Protection</p>
                  <p className="text-white font-medium">{hasPassword ? "Password protected" : "Publicly shared"}</p>
                </div>
              </div>
            </div>

            {/* Streaming Preview via GET-Route mit Range-Request-Support */}
            {canPreview && streamingUrl && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="mb-6 rounded-xl overflow-hidden border border-dark-600/30">
                {isVideo && (
                  <video controls className="w-full max-h-96 bg-black" autoPlay preload="metadata">
                    <source src={streamingUrl} type={fileType} />
                  </video>
                )}
                {isAudio && (
                  <div className="p-6 bg-dark-800/50">
                    <div className="flex items-center gap-4 mb-4">
                      <FileAudio className="w-12 h-12 text-primary-400" />
                      <div>
                        <p className="text-white font-medium">Audio Preview</p>
                        <p className="text-dark-400 text-sm">{fileInfo?.originalName}</p>
                      </div>
                    </div>
                    <audio controls className="w-full" preload="metadata">
                      <source src={streamingUrl} type={fileType} />
                    </audio>
                  </div>
                )}
                {isImage && (
                  <img src={streamingUrl} alt={fileInfo?.originalName} className="w-full max-h-96 object-contain bg-dark-900" loading="lazy" />
                )}
              </motion.div>
            )}
          </>
        )}

        {/* Error */}
        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-red-400 text-sm mb-4 text-center bg-red-500/10 rounded-lg p-3">
            {error}
          </motion.p>
        )}

        {/* Download button */}
        <div className="flex gap-3">
          <button onClick={handleDownload}
            disabled={downloading || isPreviewLoading}
            className="btn-primary flex-1 flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform">
            {downloading ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Loading...
              </span>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Download file
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}