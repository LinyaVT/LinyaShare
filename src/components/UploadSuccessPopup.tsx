"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, Copy, Check, X, Link2, Images } from "lucide-react"
import { formatSize } from "@/lib/utils"
import { FileTypeIcon } from "@/components/FileTypeIcon"
import type { UploadedFileResult } from "@/components/UploadModal"

interface UploadSuccessPopupProps {
  isOpen: boolean
  files: UploadedFileResult[]
  onClose: () => void
  onCreateAlbum: (fileIds: string[]) => void
}

export default function UploadSuccessPopup({ isOpen, files, onClose, onCreateAlbum }: UploadSuccessPopupProps) {
  const [selected, setSelected] = useState<string[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  function toggleSelect(shareId: string) {
    setSelected((prev) => (prev.includes(shareId) ? prev.filter((s) => s !== shareId) : [...prev, shareId]))
  }

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function copyAllLinks() {
    const text = files.map((f) => f.shareUrl).join("\n")
    await navigator.clipboard.writeText(text)
    setCopiedId("all")
    setTimeout(() => setCopiedId(null), 2000)
  }

  const selectedFiles = files.filter((f) => selected.includes(f.shareId))

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="glass-card p-5 sm:p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Upload complete</h3>
                  <p className="text-xs text-dark-400">
                    {files.length} file{files.length !== 1 ? "s" : ""} ready to share
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="text-dark-400 hover:text-white p-2 rounded-lg hover:bg-dark-700/40 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Copy all + select all */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() =>
                  setSelected((prev) => (prev.length === files.length ? [] : files.map((f) => f.shareId)))
                }
                className="text-xs text-primary-400 hover:text-primary-300 font-medium"
              >
                {selected.length === files.length ? "Deselect all" : "Select all"}
              </button>
              <button onClick={copyAllLinks} className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5">
                {copiedId === "all" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                Copy all links
              </button>
            </div>

            {/* File list */}
            <div className="space-y-1.5 mb-4">
              {files.map((file) => {
                const isSelected = selected.includes(file.shareId)
                return (
                  <div
                    key={file.shareId}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                      isSelected
                        ? "bg-primary-500/10 border-primary-500/40"
                        : "bg-dark-800/30 border-dark-600/20 hover:border-dark-500/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(file.shareId)}
                      className="accent-primary-500 w-4 h-4 shrink-0"
                    />
                    <FileTypeIcon type={file.type} name={file.originalName} className="w-4 h-4 text-primary-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{file.originalName}</p>
                      <p className="text-xs text-dark-400">{formatSize(file.size)}</p>
                    </div>
                    <button
                      onClick={() => copyText(file.shareUrl, file.shareId)}
                      className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1.5 min-h-[36px]"
                      title="Copy share link"
                    >
                      {copiedId === file.shareId ? (
                        <Check className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <Link2 className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden sm:inline">{copiedId === file.shareId ? "Copied" : "Copy link"}</span>
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => onCreateAlbum(selectedFiles.map((f) => f.id))}
                disabled={selected.length === 0}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <Images className="w-5 h-5" />
                {selected.length > 0
                  ? `Create album (${selected.length})`
                  : "Select files to create an album"}
              </button>
              <button onClick={onClose} className="btn-secondary flex-1 flex items-center justify-center gap-2">
                Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}