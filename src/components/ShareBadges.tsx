"use client"

import { useState, useEffect } from "react"

export default function ShareBadges() {
  const [siteName, setSiteName] = useState("LinyaShare")

  useEffect(() => {
    fetch("/api/settings/public")
      .then((res) => res.json())
      .then((data) => {
        if (data.siteName) setSiteName(data.siteName)
      })
      .catch(() => {})
  }, [])

  return (
    <>
      <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-40 pointer-events-none select-none">
        <span className="text-xs font-medium text-white/80 bg-dark-800/60 border border-dark-600/30 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2">
          {siteName}
          {process.env.NEXT_PUBLIC_APP_VERSION && (
            <span className="text-xs font-medium text-dark-400 bg-dark-800/40 border border-dark-600/30 px-2 py-0.5 rounded-full">
              v{process.env.NEXT_PUBLIC_APP_VERSION}
            </span>
          )}
        </span>
      </div>

      <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 pointer-events-none select-none">
        <p className="text-[11px] text-white/50 bg-black/25 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
          Build by{" "}
          <a
            href="https://github.com/LinyaVT"
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto font-semibold text-white/70 hover:text-primary-400 transition-colors"
          >
            Lina
          </a>
        </p>
      </div>
    </>
  )
}