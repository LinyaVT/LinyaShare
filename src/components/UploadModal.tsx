"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, X, Check, AlertCircle, UploadCloud, Lock } from "lucide-react"
import { formatSize, formatSpeed, formatTime, uuidV4 } from "@/lib/utils"
import { CHUNK_SIZE } from "@/lib/constants"
import { FileTypeIcon } from "@/components/FileTypeIcon"

export type FileStatus = "pending" | "uploading" | "done" | "error"

export interface UploadedFileResult {
  id: string
  shareId: string
  originalName: string
  type: string
  size: number
  shareUrl: string
  hasPassword: boolean | null
}

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  maxUploadBytes: number
  onCompleted: (results: UploadedFileResult[]) => void
}

export default function UploadModal({ isOpen, onClose, maxUploadBytes, onCompleted }: UploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [password, setPassword] = useState("")
  const [uploading, setUploading] = useState(false)
  const [fileStatus, setFileStatus] = useState<Record<number, FileStatus>>({})
  const [error, setError] = useState("")
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Aggregate progress
  const [uploadPercent, setUploadPercent] = useState(0)
  const [uploadedBytes, setUploadedBytes] = useState(0)
  const [uploadTotalBytes, setUploadTotalBytes] = useState(0)
  const [uploadSpeed, setUploadSpeed] = useState(0)
  const [estimatedTime, setEstimatedTime] = useState(0)

  const uploadedBytesRef = useRef(0)
  const totalBytesRef = useRef(0)
  const speedSamplesRef = useRef<{ time: number; bytes: number }[]>([])
  const uploadStartRef = useRef(0)
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopTicker = useCallback(() => {
    if (tickerRef.current) {
      clearInterval(tickerRef.current)
      tickerRef.current = null
    }
  }, [])

  useEffect(() => stopTicker, [stopTicker])

  useEffect(() => {
    if (isOpen) {
      setSelectedFiles([])
      setPassword("")
      setUploading(false)
      setFileStatus({})
      setError("")
      setDragActive(false)
    }
  }, [isOpen])

  function startTicker(totalBytes: number) {
    stopTicker()
    totalBytesRef.current = totalBytes
    uploadedBytesRef.current = 0
    speedSamplesRef.current = [{ time: Date.now(), bytes: 0 }]
    uploadStartRef.current = Date.now()

    setUploadTotalBytes(totalBytes)
    setUploadedBytes(0)
    setUploadSpeed(0)
    setEstimatedTime(0)
    setUploadPercent(0)

    tickerRef.current = setInterval(() => {
      const now = Date.now()
      const bytesNow = uploadedBytesRef.current
      const total = totalBytesRef.current
      const percent = total > 0 ? Math.round((bytesNow / total) * 100) : 0

      const cutoff = now - 5000
      while (speedSamplesRef.current.length > 1 && speedSamplesRef.current[0].time < cutoff) {
        speedSamplesRef.current.shift()
      }
      const first = speedSamplesRef.current[0]
      const windowSecs = (now - first.time) / 1000
      const windowSpeed = windowSecs > 0 ? (bytesNow - first.bytes) / windowSecs : 0

      const elapsed = (now - uploadStartRef.current) / 1000
      const avgSpeed = elapsed > 0 ? bytesNow / elapsed : 0
      const speed = windowSpeed > 0 ? windowSpeed : avgSpeed
      const remaining = total - bytesNow
      const eta = speed > 0 && remaining > 0 ? remaining / speed : 0

      setUploadedBytes(bytesNow)
      setUploadPercent(percent)
      setUploadSpeed(speed)
      setEstimatedTime(eta)

      if (total > 0 && bytesNow >= total) stopTicker()
    }, 200)
  }

  function addFiles(list: FileList | File[]) {
    const arr = Array.from(list)
    setSelectedFiles((prev) => [...prev, ...arr])
  }

  async function uploadOneFile(file: File): Promise<UploadedFileResult> {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
    const uploadId = uuidV4()
    let data: any = null

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, file.size)
      const chunk = file.slice(start, end)
      const isFinal = i === totalChunks - 1

      const headers: Record<string, string> = {
        "x-upload-id": uploadId,
        "x-chunk-index": i.toString(),
        "x-is-final": isFinal ? "true" : "false",
        "x-filename": file.name,
        "x-mime-type": file.type,
      }
      if (password) headers["x-password"] = password

      const res = await fetch("/api/upload", {
        method: "POST",
        headers,
        body: chunk,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData?.error || `Chunk ${i} failed with status ${res.status}`)
      }

      const json = await res.json().catch(() => null)
      if (isFinal) data = json

      uploadedBytesRef.current += end - start
      speedSamplesRef.current.push({ time: Date.now(), bytes: uploadedBytesRef.current })
    }

    if (!data?.file?.shareId) {
      throw new Error("Upload incomplete: no file record returned")
    }

    return {
      id: data.file.id,
      shareId: data.file.shareId,
      originalName: file.name,
      type: data.file.type || file.type,
      size: file.size,
      shareUrl: `${window.location.origin}/s/${data.file.shareId}`,
      hasPassword: data.file.password ? true : null,
    }
  }

  async function handleUpload() {
    if (selectedFiles.length === 0 || uploading) return

    setUploading(true)
    setError("")

    const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0)
    startTicker(totalSize)

    const initialStatus: Record<number, FileStatus> = {}
    selectedFiles.forEach((_, i) => (initialStatus[i] = "pending"))
    setFileStatus(initialStatus)

    const done: UploadedFileResult[] = []

    for (let i = 0; i < selectedFiles.length; i++) {
      setFileStatus((prev) => ({ ...prev, [i]: "uploading" }))
      try {
        const record = await uploadOneFile(selectedFiles[i])
        done.push(record)
        setFileStatus((prev) => ({ ...prev, [i]: "done" }))
      } catch (err: any) {
        setFileStatus((prev) => ({ ...prev, [i]: "error" }))
        setError(err?.message || `Upload failed for ${selectedFiles[i].name}`)
      }
    }

    stopTicker()
    setUploading(false)

    if (done.length > 0) {
      onCompleted(done)
    }
  }

  const totalSelected = selectedFiles.reduce((sum, f) => sum + f.size, 0)
  const overLimit = maxUploadBytes > 0 && totalSelected > maxUploadBytes
  const doneCount = Object.values(fileStatus).filter((s) => s === "done").length
  const errorCount = Object.values(fileStatus).filter((s) => s === "error").length

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => !uploading && onClose()}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="glass-card p-5 sm:p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary-400" /> Upload files
                </h3>
                <p className="text-xs text-dark-400 mt-1">
                  Select multiple files or drag &amp; drop them here
                </p>
              </div>
              <button
                onClick={onClose}
                disabled={uploading}
                className="text-dark-400 hover:text-white p-2 rounded-lg hover:bg-dark-700/40 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drop zone */}
            {!uploading && (
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragActive(true)
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragActive(false)
                  if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-8 mb-4 text-center transition-all ${
                  dragActive
                    ? "border-primary-400 bg-primary-500/10"
                    : "border-dark-600/40 bg-dark-800/20 hover:border-primary-500/40 hover:bg-dark-800/40"
                }`}
              >
                <UploadCloud className="w-10 h-10 text-primary-400 mx-auto mb-3" />
                <p className="text-white font-medium">Click to select files</p>
                <p className="text-dark-400 text-sm">or drop them here</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) addFiles(e.target.files)
                    e.target.value = ""
                  }}
                />
              </div>
            )}

            {/* Selected files */}
            {selectedFiles.length > 0 && !uploading && (
              <div className="mb-4 max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {selectedFiles.map((file, i) => {
                  const status = fileStatus[i]
                  return (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-800/30 border border-dark-600/20">
                      <FileTypeIcon type={file.type} name={file.name} className="w-4 h-4 text-primary-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{file.name}</p>
                        <p className="text-xs text-dark-400">{formatSize(file.size)}</p>
                      </div>
                      {status === "done" && <Check className="w-4 h-4 text-green-400 shrink-0" />}
                      {status === "error" && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
                      {!status && (
                        <button
                          onClick={() => setSelectedFiles((prev) => prev.filter((_, idx) => idx !== i))}
                          className="text-dark-400 hover:text-red-400 p-1 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Password (optional, empty by default) */}
            {!uploading && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-dark-300 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-primary-400" /> Password protection (optional)
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Optional — applies to all uploaded files"
                  className="input-field text-sm"
                />
                <p className="text-[11px] text-dark-500 mt-1">Leave empty to share without a password.</p>
              </div>
            )}

            {/* Progress */}
            {uploading && (
              <div className="space-y-3 mb-4">
                <div className="w-full bg-dark-700 rounded-full h-3 overflow-hidden">
                  <motion.div
                    animate={{ width: `${Math.min(uploadPercent, 100)}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400 shadow-[0_0_10px_rgb(var(--primary-500)/0.3)]"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-dark-400">
                  <span className="text-white/80 font-medium">
                    {formatSize(uploadedBytes)} / {formatSize(uploadTotalBytes)} ({uploadPercent}%)
                  </span>
                  <span className="text-primary-400 font-medium">{formatSpeed(uploadSpeed)}</span>
                  <span className="text-dark-300">ETA: {formatTime(estimatedTime)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-dark-400">
                  <span>
                    {doneCount}/{selectedFiles.length} complete
                  </span>
                  {errorCount > 0 && <span className="text-red-400">{errorCount} failed</span>}
                </div>
              </div>
            )}

            {error && (
              <p className="text-red-400 text-sm mb-3 bg-red-500/10 rounded-lg p-3">{error}</p>
            )}

            {overLimit && (
              <p className="text-yellow-400 text-xs mb-3 bg-yellow-500/10 rounded-lg p-3">
                Warning: {formatSize(totalSelected)} exceeds your available storage ({formatSize(maxUploadBytes)}).
                Files beyond the limit will fail.
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleUpload}
                disabled={uploading || selectedFiles.length === 0}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Uploading {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""}...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" /> Upload {selectedFiles.length > 0 ? `${selectedFiles.length} files` : ""}
                  </>
                )}
              </button>
              <button onClick={() => !uploading && setSelectedFiles([])} disabled={uploading} className="btn-secondary px-4">
                Clear
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}