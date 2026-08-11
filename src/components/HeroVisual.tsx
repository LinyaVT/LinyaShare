"use client"

import { motion } from "framer-motion"
import { User, Lock, Download, FileText } from "lucide-react"

export default function HeroVisual() {
  return (
    <div className="relative select-none" aria-hidden="true">
      {/* Floating chip: password */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1, y: [0, -10, 0] }}
        transition={{ y: { duration: 6, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute -top-5 right-0 sm:-right-4 z-20"
      >
        <div className="glass-card px-4 py-2.5 flex items-center gap-2 text-xs font-medium text-white shadow-xl">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500/15 text-green-400">
            <Lock className="w-3 h-3" />
          </span>
          Password protected
        </div>
      </motion.div>

      {/* Floating chip: volume */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1, y: [0, 10, 0] }}
        transition={{ y: { duration: 7, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute -bottom-5 left-0 sm:-left-4 z-20"
      >
        <div className="glass-card px-4 py-2.5 flex items-center gap-2 text-xs font-medium text-white shadow-xl">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary-500/15 text-primary-400">
            <Download className="w-3 h-3" />
          </span>
          +2.4 GB this week
        </div>
      </motion.div>

      {/* Panel */}
      <div className="glass-card p-6 sm:p-8 relative overflow-hidden">
        {/* soft glow behind the transfer line */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-24 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, rgb(var(--primary-500)/0.08), transparent 70%)" }}
        />

        <div className="flex items-center justify-between gap-3 sm:gap-4 relative">
          {/* Node A */}
          <div className="flex flex-col items-center gap-2">
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              <div
                className="absolute inset-0 rounded-2xl blur-md"
                style={{ background: "rgb(var(--primary-500)/0.35)" }}
              />
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-dark-700/70 border border-primary-500/40 flex items-center justify-center">
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-primary-400" />
              </div>
            </motion.div>
            <span className="text-[11px] sm:text-xs text-dark-300">You</span>
          </div>

          {/* Transfer line */}
          <div className="relative flex-1 h-7 mx-1 sm:mx-2">
            <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 bg-dark-600/60" />
            <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 dashed-track" />
            <motion.div
              initial={{ left: "0%" }}
              animate={{ left: ["0%", "100%", "0%"] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
            >
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-dark-800 border border-primary-500/40 shadow-[0_0_14px_rgb(var(--primary-500)/0.35)] flex items-center justify-center">
                <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary-400" />
              </div>
            </motion.div>
          </div>

          {/* Node B */}
          <div className="flex flex-col items-center gap-2">
            <motion.div
              animate={{ y: [0, 4, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              <div
                className="absolute inset-0 rounded-2xl blur-md"
                style={{ background: "rgb(var(--primary-500)/0.2)" }}
              />
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-dark-700/70 border border-dark-500/30 flex items-center justify-center">
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-dark-300" />
              </div>
            </motion.div>
            <span className="text-[11px] sm:text-xs text-dark-300">Friend</span>
          </div>
        </div>

        {/* Status */}
        <div className="mt-6 sm:mt-8 relative">
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-dark-400 mb-2">
            <span className="flex items-center gap-1.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              sending share-128.zip
            </span>
            <span className="tabular-nums">2.4 MB/s</span>
          </div>
          <div className="h-1.5 rounded-full bg-dark-700/60 overflow-hidden">
            <motion.div
              animate={{ width: ["18%", "88%"] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="h-full rounded-full"
              style={{ background: "var(--accent-gradient)" }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
