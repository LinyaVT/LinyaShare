"use client"

import { useState, useEffect } from "react"
import { Sun, Moon } from "lucide-react"

const STORAGE_KEY = "linyashare-theme"

export default function ThemeToggle() {
  const [light, setLight] = useState(false)

  useEffect(() => {
    setLight(document.documentElement.dataset.theme === "light")
  }, [])

  function toggle() {
    const next = !light
    setLight(next)
    if (next) {
      document.documentElement.dataset.theme = "light"
      localStorage.setItem(STORAGE_KEY, "light")
    } else {
      delete document.documentElement.dataset.theme
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
      className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700/50 transition-all"
    >
      {light ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  )
}
