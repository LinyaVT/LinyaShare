"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useSession } from "next-auth/react"
import { ArrowRight, Code, UploadCloud, Lock, Link2 } from "lucide-react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import HeroVisual from "@/components/HeroVisual"

const GITHUB_URL = "https://github.com/LinyaVT/LinyaShare"

const FEATURES = [
  {
    icon: UploadCloud,
    title: "Upload in chunks",
    desc: "Files are split into 512 KB chunks, so large uploads survive weak connections and pick up where they left off instead of failing.",
  },
  {
    icon: Lock,
    title: "Password on every link",
    desc: "Protect any share with an optional password. A public URL doesn't have to mean public access.",
  },
  {
    icon: Link2,
    title: "Permanent links, real stats",
    desc: "Links never expire, and every download is counted — so you always know who's actually using your share.",
  },
]

const STEPS = [
  {
    icon: UploadCloud,
    title: "Upload",
    desc: "Drag and drop any file onto your dashboard — no size games, no forms.",
  },
  {
    icon: Lock,
    title: "Protect",
    desc: "Add an optional password. Skip it for the files that can stay public.",
  },
  {
    icon: Link2,
    title: "Share",
    desc: "Send the permanent link. It works today, and it works in five years.",
  },
]

export default function HomePage() {
  const [needsSetup, setNeedsSetup] = useState(false)

  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then((d) => setNeedsSetup(d.needsSetup))
      .catch(() => {})
  }, [])

  const { status } = useSession()
  const isAuthenticated = status === "authenticated"

  const primaryCta = needsSetup
    ? { href: "/setup", label: "Get started" }
    : isAuthenticated
      ? { href: "/dashboard", label: "Start sharing" }
      : { href: "/register", label: "Start sharing" }

  return (
    <div className="min-h-screen flex flex-col">
      <Header showHomeLink />
      <main className="relative z-10 flex-1">
        {/* ────────────── HERO ────────────── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 lg:pt-32 pb-16 sm:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-8 items-center">
            {/* Copy */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="lg:col-span-7 max-w-2xl"
            >
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary-400 mb-5">
                Self-hosted file sharing
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-6">
                Your files. Your server.
                <br />
                <span className="gradient-text">No middleman.</span>
              </h1>
              <p className="text-lg text-dark-300 mb-8 leading-relaxed max-w-xl">
                LinyaShare turns your own server into a private sharing network —
                password-protected links, chunked uploads that survive bad
                connections, and honest download stats. No cloud, no tracking, no ads.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link href={primaryCta.href} className="btn-primary text-base px-7 py-3.5 inline-flex items-center gap-2">
                  {primaryCta.label}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary text-base px-7 py-3.5 inline-flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  View on GitHub
                </a>
              </div>
              <p className="mt-8 text-sm text-dark-500 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span>Open source</span>
                <span className="w-1 h-1 rounded-full bg-dark-600 inline-block" />
                <span>AGPL-3.0</span>
                <span className="w-1 h-1 rounded-full bg-dark-600 inline-block" />
                <span>1-command deploy</span>
              </p>
            </motion.div>

            {/* Visual */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
              className="lg:col-span-5"
            >
              <HeroVisual />
            </motion.div>
          </div>
        </section>

        {/* ────────────── FEATURES ────────────── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
            {/* Sticky heading */}
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-28">
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-80px" }}
                  variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
                >
                  <motion.p
                    variants={{
                      hidden: { opacity: 0, y: 16 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
                    }}
                    className="text-xs font-semibold tracking-[0.2em] uppercase text-primary-400 mb-4"
                  >
                    Why LinyaShare
                  </motion.p>
                  <motion.h2
                    variants={{
                      hidden: { opacity: 0, y: 16 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
                    }}
                    className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4"
                  >
                    Built to be boring. In the best way.
                  </motion.h2>
                  <motion.p
                    variants={{
                      hidden: { opacity: 0, y: 16 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
                    }}
                    className="text-dark-300 leading-relaxed"
                  >
                    No guest accounts, no clever tricks, no vendor lock-in. Just a
                    server that accepts a file and hands back a link that works forever.
                  </motion.p>
                </motion.div>
              </div>
            </div>

            {/* Numbered list */}
            <div className="lg:col-span-8">
              <div className="divide-y divide-dark-700/50 border-y border-dark-700/50">
                {FEATURES.map((feature, i) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                    className="py-7 sm:py-8 flex gap-6 sm:gap-10"
                  >
                    <span className="text-sm font-mono text-dark-500 tabular-nums pt-1.5">0{i + 1}</span>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <feature.icon className="w-5 h-5 text-primary-400" />
                        <h3 className="text-lg sm:text-xl font-semibold text-white">{feature.title}</h3>
                      </div>
                      <p className="text-dark-300 text-sm sm:text-base leading-relaxed max-w-xl">{feature.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ────────────── HOW IT WORKS ────────────── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary-400 text-center mb-4">
            How it works
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight text-center mb-14">
            Three steps. Zero friction.
          </h2>
          <div className="relative">
            <div className="absolute top-6 left-[16%] right-[16%] hidden md:block h-px bg-gradient-to-r from-transparent via-dark-600 to-transparent" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6">
              {STEPS.map((step, i) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="relative text-center"
                >
                  <div className="relative w-12 h-12 mx-auto mb-5 rounded-2xl bg-dark-800/60 border border-primary-500/30 flex items-center justify-center">
                    <step.icon className="w-5 h-5 text-primary-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-dark-300 text-sm leading-relaxed max-w-xs mx-auto">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ────────────── CTA ────────────── */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 sm:pb-28 pt-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="py-16 sm:py-24"
          >
            <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight mb-5">
              Deploy it in one command.
              <br />
              <span className="gradient-text">Keep it forever.</span>
            </h2>
            <p className="text-dark-300 max-w-xl mx-auto mb-10">
              Docker, Node.js, or Pterodactyl — your pick. The setup wizard takes care of the rest.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href={primaryCta.href} className="btn-primary text-base px-8 py-4 inline-flex items-center gap-2">
                {primaryCta.label}
                <ArrowRight className="w-4 h-4" />
              </Link>
              {!isAuthenticated && (
                <Link href="/login" className="btn-secondary text-base px-8 py-4">Sign in</Link>
              )}
            </div>
          </motion.div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
