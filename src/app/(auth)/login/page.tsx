"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { LogIn, Mail, Lock, ArrowRight, MessageCircle, HelpCircle } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [allowRegistration, setAllowRegistration] = useState(true)
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Invalid credentials")
      setLoading(false)
      return
    }

    router.push("/dashboard")
    router.refresh()
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
            <LogIn className="w-8 h-8 text-primary-400" />
          </motion.div>
          <h1 className="text-3xl font-bold gradient-text">Welcome back</h1>
          <p className="text-dark-400 mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="input-field pl-11"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field pl-11"
                required
              />
            </div>
          </div>

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm text-center">
              {error}
            </motion.p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? "Signing in..." : "Sign in"}
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

        {allowRegistration && (
          <p className="text-center text-dark-400 text-sm mt-6">
            No account yet?{" "}
            <Link href="/register" className="text-primary-400 hover:text-primary-300 transition-colors">
              Register
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  )
}