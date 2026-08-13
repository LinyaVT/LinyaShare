"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Lock, Shield, Download, Package, Eye, HardDrive, AlertCircle, X, Images as ImagesIcon, Play, Calendar, Music,
  Copy, Check, Link2,
} from "lucide-react"
import { formatSize, formatDate, getFileTypeCategory } from "@/lib/utils"
import { FileTypeIcon } from "@/components/FileTypeIcon"
import ShareBadges from "@/components/ShareBadges"
import { shouldCountView, markViewCounted } from "@/lib/viewCount"

type AlbumFile = {
  id: string
  shareId: string
  originalName: string
  type: string
  size: number
  downloads: number
  views: number
  hasPassword: boolean
  embedUrl?: string
  streamUrl: string
  shareUrl: string
}

type AlbumInfo = {
  exists: boolean
  shareId: string
  name: string
  description: string | null
  hasPassword: boolean
  uploader: string
  views: number
  downloads: number
  createdAt: string
  fileCount: number
  totalSize: number
  publicFileCount: number
  protectedFileCount: number
  files: AlbumFile[]
}

// ──────────────────────────────────────────────────────────
// GALLERY SKELETON LOADER
// ──────────────────────────────────────────────────────────
function GallerySkeleton() {
  return (
    <div className="min-h-screen p-4 sm:p-6 relative">
      <div className="max-w-6xl mx-auto">
        {/* Header skeleton — deliberately WITHOUT glass-card/backdrop-blur to avoid blur artifacts
            (visible lines/streaks in the viewport center) on first render */}
        <div className="bg-dark-800/40 border border-dark-600/10 rounded-2xl p-6 sm:p-8 mb-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-dark-700 animate-pulse shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-7 bg-dark-700 rounded-lg w-2/3 animate-pulse" />
              <div className="h-4 bg-dark-700 rounded-lg w-1/2 animate-pulse" />
              <div className="flex gap-3">
                <div className="h-4 bg-dark-700 rounded-lg w-16 animate-pulse" />
                <div className="h-4 bg-dark-700 rounded-lg w-24 animate-pulse" />
                <div className="h-4 bg-dark-700 rounded-lg w-20 animate-pulse" />
              </div>
            </div>
          </div>
          <div className="h-11 bg-dark-700 rounded-xl w-full mt-6 animate-pulse" />
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="relative aspect-square rounded-xl overflow-hidden border border-dark-600/20 bg-dark-800/40"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-dark-700/50 via-dark-700/20 to-dark-800/60 animate-pulse" />
              <div className="absolute bottom-2 left-2 right-2">
                <div className="h-3.5 bg-dark-700 rounded-lg w-3/4 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AlbumPageClient({ shareId }: { shareId: string }) {
  const [album, setAlbum] = useState<AlbumInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [password, setPassword] = useState("")
  const [needsPassword, setNeedsPassword] = useState(false)
  const [passwordVerified, setPasswordVerified] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [modalFile, setModalFile] = useState<AlbumFile | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function directDownloadUrl(file: AlbumFile) {
    return `${window.location.origin}${file.streamUrl}?download=1`
  }

  useEffect(() => {
    async function load() {
      try {
        const count = shouldCountView(`a:${shareId}`)
        const res = await fetch(`/api/albums/${shareId}${count ? "" : "?count=0"}`)
        const data = await res.json()
        if (data.exists) {
          setAlbum(data)
          setNeedsPassword(data.hasPassword)
        } else {
          setError("Gallery not found")
        }
        if (count) markViewCounted(`a:${shareId}`)
      } catch {
        setError("Failed to load gallery")
      }
      setLoading(false)
    }
    load()
  }, [shareId])

  async function handleVerify() {
    setVerifying(true)
    setError("")
    try {
      const res = await fetch("/api/albums/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareId, password }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Invalid password")
        return
      }
      setPasswordVerified(true)
      setNeedsPassword(false)
    } catch {
      setError("Verification failed")
    } finally {
      setVerifying(false)
    }
  }

  const isImage = useCallback((f: AlbumFile) => {
    const cat = getFileTypeCategory(f.type, f.originalName)
    return cat === "image" && !f.hasPassword
  }, [])

  const isVideo = useCallback((f: AlbumFile) => {
    const cat = getFileTypeCategory(f.type, f.originalName)
    return cat === "video" && !f.hasPassword
  }, [])

  const isAudio = useCallback((f: AlbumFile) => {
    const cat = getFileTypeCategory(f.type, f.originalName)
    return cat === "audio" && !f.hasPassword
  }, [])

  const modalKind = useCallback((f: AlbumFile) => {
    if (isImage(f)) return "image"
    if (getFileTypeCategory(f.type, f.originalName) === "video") return "video"
    if (getFileTypeCategory(f.type, f.originalName) === "audio") return "audio"
    return "image"
  }, [isImage])

  if (loading) return (
    <>
      <GallerySkeleton />
      <ShareBadges />
    </>
  )

  if (error && !album) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12 max-w-md w-full text-center">
          <AlertCircle className="w-20 h-20 text-dark-400 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-2">Gallery not found</h1>
          <p className="text-dark-400">This link is invalid or the gallery was deleted.</p>
        </motion.div>
        <ShareBadges />
      </div>
    )
  }

  const locked = needsPassword && !passwordVerified
  const unlocked = !needsPassword || passwordVerified
  const pwParam = password ? `?password=${encodeURIComponent(password)}` : ""
  const zipUrl = `/api/albums/${shareId}/download${pwParam}`

  return (
    <div className="min-h-screen p-4 sm:p-6 relative">
      <ShareBadges />
      <div className="max-w-6xl mx-auto">
        {/* Password gate */}
        <AnimatePresence>
          {locked && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md mx-auto mt-24">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-8 text-center"
              >
                <div className="bg-dark-800/30 rounded-xl p-6 mb-5">
                  <Shield className="w-14 h-14 text-primary-400 mx-auto mb-3" />
                  <p className="text-white text-base font-medium mb-1">This gallery is password protected</p>
                  <p className="text-dark-400 text-sm">Enter the password to view and download the files</p>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                    placeholder="Enter password"
                    className="input-field pl-11 mb-4"
                  />
                </div>
                <button onClick={handleVerify} disabled={verifying} className="btn-primary w-full flex items-center justify-center gap-2">
                  {verifying ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Verifying...
                    </span>
                  ) : (
                    <>
                      <Shield className="w-5 h-5" /> Unlock gallery
                    </>
                  )}
                </button>
                {error && (
                  <p className="text-red-400 text-sm mt-4 bg-red-500/10 rounded-lg p-3">{error}</p>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {unlocked && album && (
          <>
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 sm:p-8 mb-6"
            >
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary-500/15 flex items-center justify-center shrink-0">
                  <ImagesIcon className="w-7 h-7 text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl md:text-2xl font-bold text-white break-words">{album.name}</h1>
                  {album.description && <p className="text-dark-300 text-sm mt-1">{album.description}</p>}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-dark-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-6 h-6 rounded-full bg-primary-500/15 text-primary-400 flex items-center justify-center font-semibold text-xs">
                        {album.uploader.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-white/80">{album.uploader}</span>
                    </span>
                    <span className="flex items-center gap-1"><ImagesIcon className="w-3.5 h-3.5" /> {album.fileCount} files</span>
                    <span className="flex items-center gap-1"><HardDrive className="w-3.5 h-3.5" /> {formatSize(album.totalSize)}</span>
                    <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {album.views} views</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDate(album.createdAt)}</span>
                    {album.hasPassword && (
                      <span className="flex items-center gap-1 text-primary-400"><Lock className="w-3.5 h-3.5" /> Protected</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Download all */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-5 pt-5 border-t border-dark-600/20">
                <a
                  href={zipUrl}
                  className={`btn-primary flex items-center justify-center gap-2 flex-1 ${
                    album.publicFileCount === 0 ? "pointer-events-none opacity-40" : ""
                  }`}
                >
                  <Package className="w-5 h-5" />
                  Download all (.zip · {album.publicFileCount} {album.publicFileCount === 1 ? "file" : "files"})
                </a>
              </div>
              {album.protectedFileCount > 0 && (
                <p className="text-xs text-dark-500 mt-2 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-primary-400 shrink-0" />
                  {album.protectedFileCount} {album.protectedFileCount === 1 ? "file is" : "files are"} individually protected and not included in the ZIP — download them separately.
                </p>
              )}
            </motion.div>

            {/* Gallery grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {album.files.map((file, index) => {
                if (isImage(file)) {
                  return (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.04 }}
                      onClick={() => setModalFile(file)}
                      role="button"
                      tabIndex={0}
                      className="group relative aspect-square rounded-xl overflow-hidden border border-dark-600/20 bg-dark-800/40 hover:border-primary-500/40 transition-all hover:scale-[1.02] cursor-pointer"
                    >
                      <img
                        src={file.streamUrl}
                        alt={file.originalName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(directDownloadUrl(file), `dl-${file.id}`) }}
                        className="absolute top-2 right-2 p-2 rounded-lg bg-black/60 backdrop-blur text-white/80 hover:text-white hover:bg-black/80 transition-colors"
                        title="Copy direct download link"
                      >
                        {copiedId === `dl-${file.id}` ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Link2 className="w-3.5 h-3.5" />}
                      </button>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6 pr-10">
                        <p className="text-white text-xs font-medium truncate">{file.originalName}</p>
                      </div>
                    </motion.div>
                  )
                }

                if (isVideo(file)) {
                  return (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.04 }}
                      onClick={() => setModalFile(file)}
                      role="button"
                      tabIndex={0}
                      className="group relative aspect-square rounded-xl overflow-hidden border border-dark-600/20 bg-black hover:border-primary-500/40 transition-all hover:scale-[1.02] cursor-pointer"
                      title="Preview video"
                    >
                      {/* Frame preview: the browser shows the first frame (preload=metadata) */}
                      <video
                        src={file.streamUrl}
                        preload="metadata"
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 pointer-events-none"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <span className="w-11 h-11 rounded-full bg-black/55 backdrop-blur flex items-center justify-center transition-transform group-hover:scale-110">
                          <Play className="w-5 h-5 text-white fill-white" />
                        </span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(directDownloadUrl(file), `dl-${file.id}`) }}
                        className="absolute top-2 right-2 p-2 rounded-lg bg-black/60 backdrop-blur text-white/80 hover:text-white hover:bg-black/80 transition-colors"
                        title="Copy direct download link"
                      >
                        {copiedId === `dl-${file.id}` ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Link2 className="w-3.5 h-3.5" />}
                      </button>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6 pr-10">
                        <p className="text-white text-xs font-medium truncate">{file.originalName}</p>
                      </div>
                    </motion.div>
                  )
                }

                if (isAudio(file)) {
                  return (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.04 }}
                      onClick={() => setModalFile(file)}
                      role="button"
                      tabIndex={0}
                      className="group relative aspect-square rounded-xl overflow-hidden border border-dark-600/20 bg-gradient-to-b from-dark-800/60 to-dark-900/80 hover:border-primary-500/40 transition-all hover:scale-[1.02] flex flex-col items-center justify-center gap-2 p-3 cursor-pointer"
                    >
                      <Music className="w-10 h-10 text-green-400" />
                      <span className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                        <Play className="w-4 h-4 text-white fill-white" />
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(directDownloadUrl(file), `dl-${file.id}`) }}
                        className="absolute top-12 right-2 p-2 rounded-lg bg-black/60 backdrop-blur text-white/80 hover:text-white hover:bg-black/80 transition-colors"
                        title="Copy direct download link"
                      >
                        {copiedId === `dl-${file.id}` ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Link2 className="w-3.5 h-3.5" />}
                      </button>
                      <div className="min-w-0 w-full text-center">
                        <p className="text-white text-xs font-medium truncate px-1">{file.originalName}</p>
                        <p className="text-dark-400 text-[11px] mt-0.5">{formatSize(file.size)}</p>
                      </div>
                    </motion.div>
                  )
                }

                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.04 }}
                    className="relative aspect-square rounded-xl border border-dark-600/20 bg-dark-800/40 flex flex-col items-center justify-center gap-2 p-3 transition-all hover:border-dark-500/40"
                  >
                    <div className="w-12 h-12 rounded-xl bg-dark-700/40 flex items-center justify-center">
                      <FileTypeIcon type={file.type} name={file.originalName} className="w-6 h-6 text-primary-400" />
                    </div>
                    <div className="min-w-0 w-full text-center">
                      <p className="text-white text-xs font-medium truncate px-1">{file.originalName}</p>
                      <p className="text-dark-400 text-[11px] mt-0.5">{formatSize(file.size)}</p>
                    </div>

                    {file.hasPassword ? (
                      <a
                        href={file.shareUrl}
                        className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                        title="Individually password protected — open on single file page"
                      >
                        <Lock className="w-3 h-3 text-primary-400" /> Unlock & download
                      </a>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`${file.streamUrl}?download=1`}
                          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                          title="Download file"
                        >
                          <Download className="w-3 h-3" /> Download
                        </a>
                        <button
                          onClick={(e) => { e.stopPropagation(); copyToClipboard(directDownloadUrl(file), `dl-${file.id}`) }}
                          className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1.5"
                          title="Copy direct download link"
                        >
                          {copiedId === `dl-${file.id}` ? <Check className="w-3 h-3 text-green-400" /> : <Link2 className="w-3 h-3" />}
                        </button>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Media Modal (image / video / audio) */}
      <AnimatePresence>
        {modalFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4"
            onClick={() => setModalFile(null)}
          >
            <button className="absolute top-4 right-4 text-white/70 hover:text-white p-2" onClick={() => setModalFile(null)}>
              <X className="w-7 h-7" />
            </button>
            <motion.div
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              className="max-w-5xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rounded-xl overflow-hidden border border-dark-600/30 bg-dark-900/50 max-h-[80vh] overflow-y-auto">
                {modalKind(modalFile) === "video" && (
                  <video controls autoPlay preload="metadata" className="w-full max-h-[70vh] bg-black">
                    <source src={modalFile.streamUrl} type={modalFile.type} />
                  </video>
                )}
                {modalKind(modalFile) === "audio" && (
                  <div className="p-8 bg-dark-800/50">
                    <div className="flex items-center gap-4 mb-5 justify-center">
                      <Music className="w-12 h-12 text-green-400" />
                      <div>
                        <p className="text-white font-medium">Audio Preview</p>
                        <p className="text-dark-400 text-sm">{modalFile.originalName}</p>
                      </div>
                    </div>
                    <audio controls autoPlay preload="metadata" className="w-full">
                      <source src={modalFile.streamUrl} type={modalFile.type} />
                    </audio>
                  </div>
                )}
                {modalKind(modalFile) === "image" && (
                  <img
                    src={modalFile.streamUrl}
                    alt={modalFile.originalName}
                    className="max-h-[70vh] w-auto mx-auto object-contain bg-dark-900"
                  />
                )}
              </div>
              <div className="flex items-center justify-between mt-4 gap-3">
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">{modalFile.originalName}</p>
                  <p className="text-dark-400 text-sm">{formatSize(modalFile.size)} · {modalFile.downloads} downloads</p>
                </div>
                <a
                  href={`${modalFile.streamUrl}?download=1`}
                  className="btn-primary flex items-center gap-2 shrink-0"
                >
                  <Download className="w-4 h-4" /> Download
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}