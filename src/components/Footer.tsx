"use client"

import { useState, useEffect } from "react"
import { ExternalLink, Code, Shield, FileText } from "lucide-react"
import Link from "next/link"

export default function Footer() {
  const [imprintUrl, setImprintUrl] = useState("")

  useEffect(() => {
    fetch("/api/settings/public")
      .then((res) => res.json())
      .then((data) => {
        if (data.imprintUrl) setImprintUrl(data.imprintUrl)
      })
      .catch(() => {})
  }, [])

  return (
    <footer className="border-t border-dark-600/30 bg-dark-800/30 backdrop-blur-xl py-8 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-dark-400">
            &copy; {new Date().getFullYear()} LinyaShare &mdash; Private file sharing
          </p>
          <div className="flex items-center gap-4 text-sm">
            <Link href="https://github.com/shyskyfox/LinyaShare" target="_blank" className="text-dark-400 hover:text-primary-400 transition-colors flex items-center gap-1">
              <Code className="w-3 h-3" /> Source code
            </Link>
            <Link href="/privacy" className="text-dark-400 hover:text-primary-400 transition-colors flex items-center gap-1">
              <Shield className="w-3 h-3" /> Privacy
            </Link>
            <Link href="/tos" className="text-dark-400 hover:text-primary-400 transition-colors flex items-center gap-1">
              <FileText className="w-3 h-3" /> TOS
            </Link>
            {imprintUrl && (
              <a
                href={imprintUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-dark-400 hover:text-primary-400 transition-colors flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" /> Imprint
              </a>
            )}
          </div>
          <p className="text-xs text-dark-500">
            Built with ❤️ by <span className="font-semibold"><a href="https://github.com/shyskyfox" target="_blank" rel="noopener noreferrer" className="hover:text-primary-400 transition-colors">Lina</a></span>
          </p>
        </div>
      </div>
    </footer>
  )
}