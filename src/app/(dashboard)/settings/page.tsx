"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Save, Trash2, User, Lock, ArrowLeft, Settings } from "lucide-react"
import Header from "@/components/Header"
import Link from "next/link"
import ConfirmDialog from "@/components/ConfirmDialog"

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [name, setName] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    variant?: "danger" | "warning" | "primary"
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    variant: "danger"
  })

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
    if (status === "authenticated") {
      fetch("/api/user/settings")
        .then((r) => r.json())
        .then((d) => setName(d.name || ""))
        .catch(() => {})
    }
  }, [status, router])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")
    setSuccess("")

    try {
      const res = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          ...(currentPassword && newPassword ? { currentPassword, newPassword } : {}),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Error saving settings")
        return
      }

      setSuccess("Settings saved")
      setCurrentPassword("")
      setNewPassword("")
    } catch {
      setError("Error saving settings")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteAccount() {
    setConfirmDialog({
      isOpen: true,
      title: "Delete account?",
      message: "Are you sure you want to delete your account? All files will be permanently deleted!",
      variant: "danger",
      onConfirm: async () => {
        setDeleting(true)
        try {
          await fetch("/api/user/settings", { method: "DELETE" })
          await signOut({ callbackUrl: "/" })
        } catch {
          setError("Delete failed")
          setDeleting(false)
        }
      }
    })
  }

  const isAdmin = (session?.user as any)?.role === "ADMIN"

  return (
    <div className="min-h-screen">
      <Header title="LinyaShare" showDashboardLink />

      <main className="max-w-2xl mx-auto px-4 py-8 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <Link href="/dashboard" className="text-dark-400 hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
            <h1 className="text-xl sm:text-2xl font-bold gradient-text flex items-center gap-2">
              <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-primary-400" /> Settings
            </h1>
          </div>

          <form onSubmit={handleSave} className="glass-card p-5 mb-6 space-y-3">
            <h2 className="text-base font-semibold text-white flex items-center gap-2"><User className="w-4 h-4 text-primary-400" /> Profile</h2>

            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1">Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
            </div>

            <div className="border-t border-dark-600/30 pt-3">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Lock className="w-3.5 h-3.5 text-primary-400" /> Change password</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-dark-300 mb-1">Current password</label>
                  <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input-field" placeholder="Only fill if changing password" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-dark-300 mb-1">New password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field" placeholder="Min. 8 characters" minLength={8} />
                </div>
              </div>
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}
            {success && <p className="text-green-400 text-xs">{success}</p>}

            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
            </button>
          </form>

          <div className="glass-card p-5 border-red-500/20">
            <h2 className="text-base font-semibold text-red-400 mb-1.5 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete account</h2>
            <p className="text-dark-400 text-xs mb-3">Your account and all uploaded files will be permanently deleted.</p>
            <button onClick={handleDeleteAccount} disabled={deleting} className="btn-danger flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> {deleting ? "Deleting..." : "Permanently delete account"}
            </button>
          </div>
        </motion.div>
      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Confirm"
        cancelText="Cancel"
        variant={confirmDialog.variant}
      />
    </main>
    </div>
  )
}
