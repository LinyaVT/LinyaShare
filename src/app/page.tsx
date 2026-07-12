"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Upload, Lock, Link2, Download, Shield, Zap, HardDrive, Clock, Server, ShieldAlert } from "lucide-react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"

function RocketIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  )
}

export default function HomePage() {
  const [needsSetup, setNeedsSetup] = useState(false)

  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then((d) => setNeedsSetup(d.needsSetup))
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Header showHomeLink />
      <main className="relative z-10 flex-1">
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-4 py-24 md:py-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
              Share files,{" "}
              <span className="gradient-text">instantly</span>
            </h1>
            <p className="text-lg text-dark-400 mb-10 max-w-xl mx-auto">
              Upload, protect with a password, and share with a permanent link. Simple and secure.
            </p>
            <div className="flex items-center justify-center gap-4">
              {needsSetup ? (
                <Link href="/setup" className="btn-primary text-lg px-8 py-4">
                  <RocketIcon className="inline w-5 h-5 mr-2" />
                  Get Started
                </Link>
              ) : (
                <Link href="/register" className="btn-primary text-lg px-8 py-4">
                  Get Started Free
                </Link>
              )}
            </div>
          </motion.div>
        </section>

        {/* Feature Cards */}
        <section className="max-w-5xl mx-auto px-4 pb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Upload, label: "Upload files", desc: "Drag & drop or select" },
              { icon: Lock, label: "Password protect", desc: "Optional encryption" },
              { icon: Link2, label: "Share links", desc: "Permanent URLs" },
              { icon: Download, label: "Track downloads", desc: "View download count" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="glass-card p-4 text-center"
              >
                <item.icon className="w-5 h-5 text-primary-400 mx-auto mb-1.5" />
                <span className="text-xs text-dark-300 font-medium block mb-0.5">{item.label}</span>
                <span className="text-[11px] text-dark-500">{item.desc}</span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Stats / Info Section */}
        <section className="max-w-5xl mx-auto px-4 pb-12">
          <div className="glass-card p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {[
                { icon: Zap, label: "Uploads", value: "Chunked" },
                { icon: ShieldAlert, label: "Security", value: "Basic" },
                { icon: HardDrive, label: "Storage", value: "Self-hosted" },
                { icon: Clock, label: "Status", value: "On-demand" },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                >
                  <item.icon className="w-6 h-6 text-primary-400 mx-auto mb-1.5" />
                  <p className="text-sm font-bold text-white">{item.value}</p>
                  <p className="text-xs text-dark-400">{item.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-3xl mx-auto px-4 pb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-8"
          >
            <Server className="w-8 h-8 text-primary-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-white mb-2">Private file sharing</h2>
            <p className="text-dark-400 text-sm mb-5 max-w-md mx-auto">
              A personal tool for sharing files securely. No tracking, no ads — just simple sharing.
            </p>
            <div className="flex items-center justify-center gap-4">
              {needsSetup ? (
                <Link href="/setup" className="btn-primary">Set up now</Link>
              ) : (
                <Link href="/login" className="btn-primary">Sign in</Link>
              )}
            </div>
          </motion.div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

