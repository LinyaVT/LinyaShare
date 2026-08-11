import { cache } from "react"
import { prisma } from "@/lib/prisma"

export const DEFAULT_SITE_NAME = "LinyaShare"

// Liest den in den Admin-Settings hinterlegten Service-Namen.
// `cache()` dedupliziert parallele Aufrufe innerhalb eines Requests.
export const getSiteName = cache(async (): Promise<string> => {
  try {
    const row = await prisma.setting.findUnique({
      where: { key: "siteName" },
      select: { value: true },
    })
    return row?.value?.trim() || DEFAULT_SITE_NAME
  } catch {
    return DEFAULT_SITE_NAME
  }
})
