"use client"

import {
  FileVideo, FileAudio, FileImage, FileArchive, Code, Binary, Box, Database, Table,
  Type as TypeIcon, FileBadge, FileSpreadsheet, Presentation, BookOpen, Captions, Palette, FileKey,
  File as FileIcon, type LucideIcon,
} from "lucide-react"
import { getFileTypeCategory } from "@/lib/utils"

const ICON_MAP: Record<string, LucideIcon> = {
  video: FileVideo,
  audio: FileAudio,
  image: FileImage,
  archive: FileArchive,
  code: Code,
  executable: Binary,
  model: Box,
  data: Database,
  database: Table,
  font: TypeIcon,
  pdf: FileBadge,
  spreadsheet: FileSpreadsheet,
  presentation: Presentation,
  ebook: BookOpen,
  subtitle: Captions,
  design: Palette,
  key: FileKey,
  document: FileIcon,
  other: FileIcon,
}

export function FileTypeIcon({
  type,
  name,
  className = "w-4 h-4 text-primary-400",
}: {
  type: string
  name: string
  className?: string
}) {
  const category = getFileTypeCategory(type, name)
  const Icon = ICON_MAP[category] || FileIcon
  return <Icon className={className} />
}