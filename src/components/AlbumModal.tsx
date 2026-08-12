"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Images, X, Lock, Unlock } from "lucide-react"
import { formatSize } from "@/lib/utils"
import { FileTypeIcon } from "@/components/FileTypeIcon"

export interface AlbumData {
  id: string
  shareId: string
  name: string
  description: string | null
  hasPassword: boolean
  views: number
  downloads: number
  createdAt: string
  updatedAt: string
  fileCount: number
  totalSize: number
  cover: { shareId: string; originalName: string; type: string; isMedia: boolean } | null
  shareUrl: string
  items: { fileId: string; shareId: string; originalName: string; type: string; size: number; hasPassword: boolean }[]
}

interface AlbumPickerFile {
  id: string
  originalName: string
  type: string
  size: number
}

interface AlbumModalProps {
  isOpen: boolean
  mode: "create" | "edit"
  files: AlbumPickerFile[]
  preselectedFileIds?: string[]
  album?: AlbumData
  onClose: () => void
  onSaved: () => void
}

export default function AlbumModal({
  isOpen,
  mode,
  files,
  preselectedFileIds = [],
  album,
  onClose,
  onSaved,
}: AlbumModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [password, setPassword] = useState("")
  const [passwordAction, setPasswordAction] = useState<"keep" | "set" | "clear">("set")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [removeIds, setRemoveIds] = useState<string[]>([])
  const [addIds, setAddIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!isOpen) return
    if (mode === "edit" && album) {
      setName(album.name)
      setDescription(album.description || "")
      setPassword("")
      setPasswordAction(album.hasPassword ? "keep" : "set")
      setRemoveIds([])
      setAddIds([])
    } else {
      setName("")
      setDescription("")
      setPassword("")
      setPasswordAction("set")
      setSelectedIds(preselectedFileIds)
      setRemoveIds([])
      setAddIds([])
    }
    setError("")
  }, [isOpen, mode, album, preselectedFileIds])

  const containedIds = album?.items.map((i) => i.fileId) || []
  const removedSet = new Set(removeIds)
  const addedSet = new Set(addIds)
  const visibleContained = album?.items.filter((i) => !removedSet.has(i.fileId)) || []
  const visibleContainedIds = new Set(visibleContained.map((i) => i.fileId))
  const availableFiles = files.filter((f) => !visibleContainedIds.has(f.id) && !addedSet.has(f.id))

  function toggleSelected(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function toggleAdd(id: string) {
    setAddIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function markForRemoval(fileId: string) {
    setRemoveIds((prev) => [...prev, fileId])
    setAddIds((prev) => prev.filter((x) => x !== fileId))
  }

  function undoRemoval(fileId: string) {
    setRemoveIds((prev) => prev.filter((x) => x !== fileId))
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Album name is required")
      return
    }
    setSaving(true)
    setError("")

    try {
      if (mode === "create") {
        const res = await fetch("/api/albums", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || undefined,
            password: password || undefined,
            fileIds: selectedIds,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to create album")
      } else if (album) {
        const body: Record<string, unknown> = {
          name: name.trim(),
          description: description.trim() || null,
        }
        if (passwordAction === "set") body.password = password || null
        if (passwordAction === "clear") body.password = null
        if (removeIds.length) body.removeFileIds = removeIds
        if (addIds.length) body.addFileIds = addIds

        const res = await fetch(`/api/albums/${album.shareId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to update album")
      }

      onSaved()
      onClose()
    } catch (err: any) {
      setError(err?.message || "Failed to save album")
    } finally {
      setSaving(false)
    }
  }

  const selectionCount = mode === "edit" ? visibleContained.length + addIds.length : selectedIds.length

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]"
          onClick={() => !saving && onClose()}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="glass-card p-5 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Images className="w-5 h-5 text-primary-400" />
                  {mode === "create" ? "Create album" : "Edit album"}
                </h3>
                <p className="text-xs text-dark-400 mt-1">
                  {selectionCount} file{selectionCount !== 1 ? "s" : ""} will be shared together in a gallery
                </p>
              </div>
              <button
                onClick={onClose}
                disabled={saving}
                className="text-dark-400 hover:text-white p-2 rounded-lg hover:bg-dark-700/40 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-dark-300 mb-1.5">Album name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Vacation photos"
                  className="input-field text-sm"
                />
              </div>
              {(mode === "edit" && album?.hasPassword) && (
                <div>
                  <label className="block text-xs font-medium text-dark-300 mb-1.5">
                    Password protection
                  </label>
                  {passwordAction === "keep" ? (
                    <div className="flex items-center gap-2">
                      <span className="flex-1 flex items-center gap-2 text-xs text-primary-400 bg-primary-500/10 border border-primary-500/30 rounded-xl px-3 py-2.5">
                        <Lock className="w-3.5 h-3.5" /> Protected
                      </span>
                      <button
                        onClick={() => setPasswordAction("set")}
                        className="btn-secondary text-xs py-2 px-3"
                      >
                        Change
                      </button>
                      <button
                        onClick={() => setPasswordAction("clear")}
                        className="btn-danger text-xs py-2 px-3"
                        title="Remove password"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={passwordAction === "clear" ? "Password will be removed" : "New password"}
                        disabled={passwordAction === "clear"}
                        className="input-field text-sm"
                      />
                      <button
                        onClick={() => setPasswordAction("keep")}
                        className="btn-secondary text-xs py-2 px-3"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {mode === "create" && (
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-dark-300 mb-1.5">Password protection (optional)</label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Protect the whole gallery"
                    className="input-field text-sm"
                  />
                  <p className="text-[11px] text-dark-500 mt-1">Files with their own password stay protected individually.</p>
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this album about?"
                rows={2}
                className="input-field text-sm resize-none"
              />
            </div>

            {/* Create: file picker */}
            {mode === "create" && (
              <div className="mb-4">
                <p className="text-xs font-medium text-dark-300 mb-2">Files</p>
                <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                  {files.length === 0 && (
                    <p className="text-sm text-dark-500 py-4 text-center">No files available</p>
                  )}
                  {files.map((file) => {
                    const checked = selectedIds.includes(file.id)
                    return (
                      <label
                        key={file.id}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                          checked ? "bg-primary-500/10 border-primary-500/40" : "bg-dark-800/30 border-dark-600/20 hover:border-dark-500/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelected(file.id)}
                          className="accent-primary-500 w-4 h-4"
                        />
                        <FileTypeIcon type={file.type} name={file.originalName} className="w-4 h-4 text-primary-400 shrink-0" />
                        <span className="text-sm text-white truncate flex-1">{file.originalName}</span>
                        <span className="text-xs text-dark-400 shrink-0">{formatSize(file.size)}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Edit: contained files + add picker */}
            {mode === "edit" && (
              <div className="mb-4 space-y-4">
                <div>
                  <p className="text-xs font-medium text-dark-300 mb-2">Files in album ({selectionCount})</p>
                  <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                    {visibleContained.length === 0 && addIds.length === 0 && (
                      <p className="text-sm text-dark-500 py-3 text-center">No files</p>
                    )}
                    {visibleContained.map((item) => (
                      <div key={item.fileId} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-dark-800/30 border border-dark-600/20">
                        <FileTypeIcon type={item.type} name={item.originalName} className="w-4 h-4 text-primary-400 shrink-0" />
                        <span className="text-sm text-white truncate flex-1">{item.originalName}</span>
                        {item.hasPassword && <Lock className="w-3.5 h-3.5 text-primary-400 shrink-0" />}
                        <button
                          onClick={() => markForRemoval(item.fileId)}
                          className="text-dark-400 hover:text-red-400 p-1 rounded"
                          title="Remove from album"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {addIds.map((id) => {
                      const file = files.find((f) => f.id === id)
                      if (!file) return null
                      return (
                        <div key={id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary-500/10 border border-primary-500/40">
                          <FileTypeIcon type={file.type} name={file.originalName} className="w-4 h-4 text-primary-400 shrink-0" />
                          <span className="text-sm text-white truncate flex-1">{file.originalName}</span>
                          <button onClick={() => undoRemoval(id)} className="text-dark-400 hover:text-white p-1 rounded" title="Undo add">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-dark-300 mb-2">Add files</p>
                  <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                    {availableFiles.length === 0 && (
                      <p className="text-sm text-dark-500 py-3 text-center">All your files are already in this album</p>
                    )}
                    {availableFiles.map((file) => {
                      const checked = addIds.includes(file.id)
                      return (
                        <label
                          key={file.id}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                            checked ? "bg-primary-500/10 border-primary-500/40" : "bg-dark-800/30 border-dark-600/20 hover:border-dark-500/40"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAdd(file.id)}
                            className="accent-primary-500 w-4 h-4"
                          />
                          <FileTypeIcon type={file.type} name={file.originalName} className="w-4 h-4 text-primary-400 shrink-0" />
                          <span className="text-sm text-white truncate flex-1">{file.originalName}</span>
                          <span className="text-xs text-dark-400 shrink-0">{formatSize(file.size)}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {error && <p className="text-red-400 text-sm mb-3 bg-red-500/10 rounded-lg p-3">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving || (mode === "create" && selectedIds.length === 0)}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : mode === "create" ? (
                  <>
                    <Images className="w-5 h-5" /> Create album
                  </>
                ) : (
                  <>
                    <Images className="w-5 h-5" /> Save changes
                  </>
                )}
              </button>
              <button onClick={onClose} disabled={saving} className="btn-secondary px-4">
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}