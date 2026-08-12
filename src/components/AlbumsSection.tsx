"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Images, Pencil, Trash2, Copy, Check, Eye, Lock, Calendar } from "lucide-react"
import { formatSize, formatDate } from "@/lib/utils"
import { FileTypeIcon } from "@/components/FileTypeIcon"
import type { AlbumData } from "@/components/AlbumModal"

interface AlbumsSectionProps {
  albums: AlbumData[]
  loading: boolean
  onEdit: (album: AlbumData) => void
  onDelete: (album: AlbumData) => void
  onCreateClick: () => void
}

export default function AlbumsSection({
  albums,
  loading,
  onEdit,
  onDelete,
  onCreateClick,
}: AlbumsSectionProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  function copyLink(url: string, id: string) {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title flex items-center gap-2 mb-0">
          <Images className="w-6 h-6 text-primary-400" /> My albums
        </h2>
        <button onClick={onCreateClick} className="btn-primary text-sm flex items-center gap-2">
          <Images className="w-4 h-4" />
          <span className="hidden sm:inline">Create album</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card p-4 space-y-3">
              <div className="h-24 bg-dark-700 rounded-lg animate-pulse" />
              <div className="h-5 bg-dark-700 rounded-lg w-2/3 animate-pulse" />
              <div className="h-4 bg-dark-700 rounded w-1/2 animate-pulse" />
            </div>
          ))}
        </div>
      ) : albums.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Images className="w-10 h-10 text-dark-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-1">No albums yet</h3>
          <p className="text-dark-400 text-sm">
            Select multiple files and share them together as a gallery.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {albums.map((album, index) => {
            const isImageCover = album.cover?.isMedia && album.cover.type.startsWith("image/")
            return (
              <motion.div
                key={album.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card-hover overflow-hidden flex flex-col"
              >
                {/* Cover */}
                <div className="relative h-28 bg-dark-800/60 flex items-center justify-center overflow-hidden">
                  {isImageCover && album.cover ? (
                    <img
                      src={`/api/files/stream/${album.cover.shareId}`}
                      alt={album.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <Images className="w-10 h-10 text-dark-500" />
                  )}
                  {album.hasPassword && (
                    <span className="absolute top-2 right-2 bg-dark-900/70 backdrop-blur p-1.5 rounded-lg">
                      <Lock className="w-3.5 h-3.5 text-primary-400" />
                    </span>
                  )}
                  <span className="absolute bottom-2 left-2 bg-dark-900/70 backdrop-blur text-xs text-white px-2 py-1 rounded-lg">
                    {album.fileCount} {album.fileCount === 1 ? "file" : "files"} · {formatSize(album.totalSize)}
                  </span>
                </div>

                {/* Body */}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-white font-medium text-sm truncate flex-1">{album.name}</h3>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onEdit(album)}
                        className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700/50 transition-colors"
                        title="Edit album"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(album)}
                        className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-600/10 transition-colors"
                        title="Delete album"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-dark-400 mb-3 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {album.views}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formatDate(album.createdAt)}
                    </span>
                  </p>

                  <div className="flex items-center gap-2 mt-auto">
                    <input
                      type="text"
                      value={album.shareUrl}
                      readOnly
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      className="input-field text-xs py-1.5 flex-1"
                    />
                    <button
                      onClick={() => copyLink(album.shareUrl, album.id)}
                      className="btn-secondary text-xs py-1.5 px-2"
                      title="Copy share link"
                    >
                      {copiedId === album.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {album.fileCount > 0 && album.items.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {album.items.slice(0, 5).map((item) => (
                        <span key={item.fileId} className="bg-dark-800/40 border border-dark-600/20 rounded-lg p-1.5">
                          <FileTypeIcon type={item.type} name={item.originalName} className="w-3.5 h-3.5 text-dark-400" />
                        </span>
                      ))}
                      {album.fileCount > 5 && (
                        <span className="text-xs text-dark-500 self-center">+{album.fileCount - 5} more</span>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}