"use client"

import { motion } from "framer-motion"

type SkeletonVariant = "list" | "stats" | "cards" | "settings"

export default function SkeletonLoader({
  variant = "list",
  count = 4,
}: {
  variant?: SkeletonVariant
  count?: number
}) {
  if (variant === "stats") {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-3 sm:p-6"
          >
            <div className="w-8 h-8 bg-dark-700 rounded-lg animate-pulse mb-2 sm:mb-3" />
            <div className="h-6 sm:h-8 bg-dark-700 rounded-lg w-16 animate-pulse mb-1 sm:mb-2" />
            <div className="h-3 sm:h-4 bg-dark-700 rounded w-20 animate-pulse" />
          </motion.div>
        ))}
      </div>
    )
  }

  if (variant === "cards") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-4 sm:p-6"
          >
            <div className="w-8 h-8 bg-dark-700 rounded-lg animate-pulse mb-2 sm:mb-3" />
            <div className="h-4 sm:h-5 bg-dark-700 rounded-lg w-3/4 animate-pulse mb-2" />
            <div className="h-3 sm:h-4 bg-dark-700 rounded w-full animate-pulse" />
            <div className="h-3 sm:h-4 bg-dark-700 rounded w-2/3 animate-pulse mt-1" />
          </motion.div>
        ))}
      </div>
    )
  }

  if (variant === "settings") {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="h-9 w-24 bg-dark-700 rounded-xl animate-pulse"
            />
          ))}
        </div>
        {Array.from({ length: count }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-6"
          >
            <div className="h-5 bg-dark-700 rounded-lg w-1/3 animate-pulse mb-3" />
            <div className="h-4 bg-dark-700 rounded w-2/3 animate-pulse mb-4" />
            <div className="h-9 bg-dark-700 rounded-lg w-full animate-pulse" />
          </motion.div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="glass-card p-3 sm:p-5"
        >
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-4 sm:h-5 bg-dark-700 rounded w-3/4 animate-pulse" />
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <div className="h-3 sm:h-4 bg-dark-700 rounded w-20 animate-pulse" />
                <div className="h-3 sm:h-4 bg-dark-700 rounded w-28 animate-pulse" />
                <div className="h-3 sm:h-4 bg-dark-700 rounded w-24 animate-pulse" />
              </div>
            </div>
            <div className="h-8 sm:h-9 w-16 sm:w-24 bg-dark-700 rounded-lg animate-pulse shrink-0" />
          </div>
        </motion.div>
      ))}
    </div>
  )
}
