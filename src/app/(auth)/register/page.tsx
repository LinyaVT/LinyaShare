"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { UserPlus, Mail, Lock, User, ArrowRight, MessageCircle, HelpCircle } from "lucide-react"
import Link from "next/link"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [allowRegistration, setAllowRegistration] = useState<boolean | null>(null)
  const [supportEmail, setSupportEmail] = useState("")
  const [discordUrl, setDiscordUrl] = useState("")

  useEffect(() => {
    fetch("/api/settings/public")
      .then((res) => res.json())
      .then((data) => {
        setAllowRegistration(data.allowRegistration)
        setSupportEmail(data.supportEmail || "")
        setDiscordUrl(data.discordUrl || "")
      })
      .catch(() => setAllowRegistration(true))
  }, [])

  useEffect(() => {
    if (allowRegistration === false) {
      router.push("/login?registration=disabled")
    }
  }, [allowRegistration, router])

  if (allowRegistration === false) {
    return null
  }

  if (allowRegistration === null) {
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Registration failed")
        return
      }

      router.push("/login?registered=true")
    } catch {
      setError("Registration failed")
    } finally {
      setLoading(false)
    }
  }

  const hasSupport = supportEmail || discordUrl

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 max-w-md w-full"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 bg-primary-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4"
          >
            <UserPlus className="w-8 h-8 text-primary-400" />
          </motion.div>
          <h1 className="text-3xl font-bold gradient-text">Create account</h1>
          <p className="text-dark-400 mt-2">Get started with a free account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="input-field pl-11" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="input-field pl-11" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="•••••••• (min. 8 chars)" className="input-field pl-11" required minLength={8} />
            </div>
          </div>

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm text-center">{error}</motion.p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? "Creating account..." : "Create account"}
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        {hasSupport && (
          <div className="mt-6 pt-4 border-t border-dark-600/20">
            <p className="text-xs text-dark-400 text-center mb-2 flex items-center justify-center gap-1">
              <HelpCircle className="w-3 h-3" /> Need help?
            </p>
            <div className="flex items-center justify-center gap-3 text-xs">
              {supportEmail && (
                <a
                  href={`mailto:${supportEmail}`}
                  className="text-dark-400 hover:text-primary-400 transition-colors flex items-center gap-1"
                >
                  <Mail className="w-3 h-3" /> {supportEmail}
                </a>
              )}
              {discordUrl && (
                <a
                  href={discordUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-dark-400 hover:text-primary-400 transition-colors flex items-center gap-1"
                >
                  <MessageCircle className="w-3 h-3" /> Discord
                </a>
              )}
            </div>
          </div>
        )}

        <p className="text-center text-dark-400 text-sm mt-6">
          Already registered?{" "}
          <Link href="/login" className="text-primary-400 hover:text-primary-300 transition-colors">Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}