"use client"

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  itemsPerPage?: number
  totalItems?: number
}

export default function Pagination({ currentPage, totalPages, onPageChange, itemsPerPage = 10, totalItems }: PaginationProps) {
  if (totalPages <= 1) return null

  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems || 0)

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    pages.push(1)

    if (currentPage > 3) {
      pages.push("...")
    }

    const start = Math.max(2, currentPage - 1)
    const end = Math.min(totalPages - 1, currentPage + 1)

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    if (currentPage < totalPages - 2) {
      pages.push("...")
    }

    pages.push(totalPages)

    return pages
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
      {/* Info */}
      <div className="text-sm text-dark-400">
        {totalItems ? (
          <>
            Showing {startItem}-{endItem} of {totalItems} items
          </>
        ) : (
          <>Page {currentPage} of {totalPages}</>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-1">
        {/* First Page Button - hidden on mobile */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className={`hidden sm:flex p-2 rounded-lg transition-all ${
            currentPage === 1
              ? "bg-dark-800/40 text-dark-600 cursor-not-allowed"
              : "bg-dark-800/60 text-dark-300 hover:text-white hover:bg-dark-700/50"
          }`}
          title="First page"
        >
          <ChevronsLeft className="w-5 h-5" />
        </button>

        {/* Previous Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`p-2 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center ${
            currentPage === 1
              ? "bg-dark-800/40 text-dark-600 cursor-not-allowed"
              : "bg-dark-800/60 text-dark-300 hover:text-white hover:bg-dark-700/50"
          }`}
          title="Previous page"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Page Numbers */}
        {getPageNumbers().map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === "number" && onPageChange(page)}
            disabled={page === "..."}
            className={`hidden sm:flex min-w-[40px] h-10 rounded-lg text-sm font-medium transition-all items-center justify-center ${
              page === currentPage
                ? "bg-primary-500 text-white shadow-[0_0_10px_rgb(var(--primary-500)/0.3)]"
                : page === "..."
                ? "bg-transparent text-dark-600 cursor-default"
                : "bg-dark-800/60 text-dark-300 hover:text-white hover:bg-dark-700/50"
            }`}
          >
            {page}
          </button>
        ))}

        {/* Current Page Indicator - mobile only */}
        <div className="sm:hidden px-4 py-2 bg-dark-800/60 rounded-lg text-sm text-white font-medium">
          {currentPage} / {totalPages}
        </div>

        {/* Next Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`p-2 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center ${
            currentPage === totalPages
              ? "bg-dark-800/40 text-dark-600 cursor-not-allowed"
              : "bg-dark-800/60 text-dark-300 hover:text-white hover:bg-dark-700/50"
          }`}
          title="Next page"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Last Page Button - hidden on mobile */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={`hidden sm:flex p-2 rounded-lg transition-all ${
            currentPage === totalPages
              ? "bg-dark-800/40 text-dark-600 cursor-not-allowed"
              : "bg-dark-800/60 text-dark-300 hover:text-white hover:bg-dark-700/50"
          }`}
          title="Last page"
        >
          <ChevronsRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}