"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Check, X, Globe, Mail, MessageCircle, ExternalLink, Users,
  HardDrive, ToggleLeft, FileText, Shield, Save, Settings2,
  ChevronDown, ChevronUp, HelpCircle, RotateCcw, Settings,
  Palette, Paintbrush, Image as ImageIcon, LayoutGrid, Type, Sparkles,
} from "lucide-react"
import Header from "@/components/Header"
import { useToast } from "@/components/Toast"
import ConfirmDialog from "@/components/ConfirmDialog"
import SkeletonLoader from "@/components/SkeletonLoader"
import {
  DEFAULT_THEME, FONT_MAP, computeCssVars,
  resolveTheme, themeToDataAttributes,
} from "@/lib/theme"
import type { ThemeConfig } from "@/lib/theme"

const DEFAULT_PRIVACY = `
> [!INFO]
> This is a placeholder privacy policy. Please replace it with your own by editing the **Legal** section in the admin settings.

## 1. Data Controller

The controller responsible for data processing is the operator of this service. Contact information can be found in the imprint.

## 2. Data We Collect

### 2.1 Account Information
When you register, we collect:
- **Email address** – used for identification and account recovery
- **Username** – used to personalize your experience
- **Password** (hashed) – stored securely using bcrypt

### 2.2 Files
When you upload files, we store:
- The file content itself on our servers
- File metadata (name, size, type, upload date)
- Optional password protection (encrypted)

### 2.3 Usage Data
We automatically collect:
- Download counts for shared files
- Timestamps of uploads and downloads

## 3. Legal Basis for Processing

We process your data based on:
- **Consent** (Art. 6(1)(a) GDPR) – for account registration
- **Contract fulfillment** (Art. 6(1)(b) GDPR) – for providing the file sharing service
- **Legitimate interests** (Art. 6(1)(f) GDPR) – for service improvement and security

## 4. Data Storage and Retention

| Data Type | Retention Period |
|-----------|-----------------|
| Account data | Until account deletion |
| Uploaded files | Until file deletion or account deletion |
| Download logs | 30 days |

> [!WARNING]
> Deleted files may remain in backups for up to 30 days before being permanently removed.

## 5. Your Rights

Under GDPR, you have the following rights:

1. **Right to access** – You can request a copy of your data
2. **Right to rectification** – You can correct inaccurate data
3. **Right to erasure** – You can request deletion of your data {color:#ff6b6b}(subject to legal obligations){/color}
4. **Right to restrict processing** – You can limit how we use your data
5. **Right to data portability** – You can receive your data in a machine-readable format
6. **Right to object** – You can object to certain processing activities

## 6. Third-Party Services

This service does not use any third-party analytics, tracking, or advertising services.

{color:#4ade80}✅ This service is fully self-hosted and does not share data with third parties.{/color}

## 7. Contact

If you have any questions about this privacy policy, please contact the service operator.

---

*Last updated: 09.07.2026*
`

const DEFAULT_TOS = `
> [!INFO]
> This is a placeholder terms of service. Please replace it with your own by editing the **Legal** section in the admin settings.

## 1. Acceptance of Terms

By accessing or using this service, you agree to be bound by these Terms of Service. If you do not agree, please do not use the service.

## 2. Description of Service

This service provides file sharing functionality, allowing users to:
- Upload files to our servers
- Share files via unique URLs
- Optionally protect files with passwords
- Track download counts

## 3. User Responsibilities

### 3.1 Account Security
You are responsible for:
- Maintaining the confidentiality of your account credentials
- All activities that occur under your account
- Notifying us immediately of any unauthorized use

### 3.2 Acceptable Use
You agree NOT to use this service for:

> [!DANGER]
> Uploading or sharing illegal content, including but not limited to:
> - Copyrighted material without permission
> - Malware, viruses, or malicious code
> - Child exploitation material
> - Content that violates applicable laws

### 3.3 File Content
- You retain all rights to files you upload
- You represent that you have the legal right to share the files
- You are solely responsible for the content you share

## 4. Service Limitations

| Aspect | Details |
|--------|---------|
| Storage | Subject to your account limit |
| File size | Subject to server configuration |
| Availability | Best effort, no guaranteed uptime |
| Data retention | Files kept until deleted by user |

> [!WARNING]
> This service is provided "as is" without warranty of any kind. We are not responsible for data loss. Always keep backups of important files.

## 5. Termination

We reserve the right to:
- Suspend or terminate accounts that violate these terms
- Remove content that violates applicable laws
- Modify or discontinue the service at any time

## 6. Limitation of Liability

{color:#ff6b6b}To the maximum extent permitted by law, the service provider shall not be liable for any indirect, incidental, or consequential damages arising from the use of this service.{/color}

## 7. Changes to Terms

We may update these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.

## 8. Governing Law

These terms shall be governed by the applicable laws of the service provider's jurisdiction.

---

*Last updated: 09.07.2026*
`

const MARKDOWN_GUIDE = `## Headings
Use \`#\` to \`######\` for headings of different levels.

## Text Formatting
- **Bold** – \`**text**\`
- *Italic* – \`*text*\`
- Colored text – \`{color:#ff0000}red text{/color}\`

## Callout Boxes
Use blockquotes with special markers:

\`\`\`
> [!INFO]
> This is an info box

> [!WARNING]
> This is a warning

> [!DANGER]
> This is a danger alert

> [!SUCCESS]
> This is a success message
\`\`\`

## Tables
\`\`\`
| Column 1 | Column 2 |
|----------|----------|
| Data     | Data     |
\`\`\`

## Lists
- Unordered: Use \`-\` or \`*\`
- Ordered: Use \`1.\`, \`2.\`, etc.

## Links
\`[Link text](https://example.com)\`

## Code
- Inline: \`code\`
- Block: Use triple backticks
`

type Section = "general" | "registration" | "storage" | "support" | "legal" | "appearance"

const SECTIONS: { key: Section; label: string; icon: any }[] = [
  { key: "general", label: "General", icon: Settings2 },
  { key: "registration", label: "Registration", icon: Users },
  { key: "storage", label: "Storage", icon: HardDrive },
  { key: "support", label: "Support", icon: Mail },
  { key: "legal", label: "Legal", icon: Shield },
  { key: "appearance", label: "Appearance", icon: Palette },
]

const PRESET_ACCENTS = [
  "#db2777", "#a855f7", "#8b5cf6", "#3b82f6", "#06b6d4", "#22c55e",
  "#84cc16", "#f59e0b", "#ef4444", "#f97316", "#e11d48", "#14b8a6",
]

// ──────────────────────────────────────────────────────────
// APPEARANCE UI HELPERS
// ──────────────────────────────────────────────────────────
function SegBtn({ options, value, onChange, label }: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
  label?: string
}) {
  return (
    <div>
      {label && <p className="text-xs font-medium text-dark-300 mb-2">{label}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = opt.value === value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                active
                  ? "bg-primary-500/20 text-primary-400 border-primary-500/30"
                  : "bg-dark-800/40 text-dark-400 border-dark-600/20 hover:border-dark-500/40 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const colorValue = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ec4899"
  return (
    <div>
      <p className="text-xs font-medium text-dark-300 mb-2">{label}</p>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={colorValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-dark-600/30 bg-dark-800/40 cursor-pointer shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 bg-dark-800/30 border border-dark-500/20 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500/40 focus:ring-2 focus:ring-primary-500/5"
        />
      </div>
    </div>
  )
}

function SelectField({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <p className="text-xs font-medium text-dark-300 mb-2">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-dark-800/30 border border-dark-500/20 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500/40"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-dark-800 text-white">{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

function DirectionSlider({ label, value, onChange }: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const isRadial = value === "radial"
  const deg = isRadial ? 135 : parseInt(value) || 135
  return (
    <div>
      <p className="text-xs font-medium text-dark-300 mb-2">{label}</p>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={0}
          max={360}
          step={5}
          value={deg}
          onChange={(e) => onChange(`${e.target.value}deg`)}
          className="flex-1 min-w-0 accent-primary-500"
          aria-label={label}
        />
        <span className="text-sm text-white font-mono w-12 text-right tabular-nums">{deg}°</span>
        <button
          type="button"
          onClick={() => onChange(isRadial ? `${deg}deg` : "radial")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all shrink-0 ${
            isRadial
              ? "bg-primary-500/20 text-primary-400 border-primary-500/30"
              : "bg-dark-800/40 text-dark-400 border-dark-600/20 hover:border-dark-500/40 hover:text-white"
          }`}
        >
          Radial
        </button>
      </div>
    </div>
  )
}

export default function AdminSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { success: toastSuccess, error: toastError } = useToast()
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<Section>("general")
  const [showMarkdownGuide, setShowMarkdownGuide] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [appearance, setAppearance] = useState<ThemeConfig>({ ...DEFAULT_THEME })
  const [savingAppearance, setSavingAppearance] = useState(false)
  const [showResetAppearanceConfirm, setShowResetAppearanceConfirm] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
    if (status === "authenticated" && (session?.user as any)?.role !== "ADMIN") router.push("/dashboard")
    if (status === "authenticated") loadSettings()
  }, [status])

  async function loadSettings() {
    const res = await fetch("/api/admin/settings")
    const data = await res.json()
    setSettings(data.settings || {})
    setAppearance(resolveTheme(data.settings || {}))
    previewReadyRef.current = true
    setLoading(false)
  }

  // ── Appearance: Live-Vorschau ──
  const previewReadyRef = useRef(false)

  function applyAppearancePreview(theme: ThemeConfig) {
    const root = document.documentElement
    const vars = computeCssVars(theme)
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
    const attrs = themeToDataAttributes(theme)
    for (const [k, v] of Object.entries(attrs)) root.setAttribute(k, v)
  }

  // Vorschau anwenden, sobald sich das Appearance-State ändert (nach dem Laden)
  useEffect(() => {
    if (previewReadyRef.current) applyAppearancePreview(appearance)
  }, [appearance])

  function updateAppearance(patch: Partial<ThemeConfig>) {
    setAppearance((prev) => ({ ...prev, ...patch }))
  }

  async function handleSaveAppearance() {
    setSavingAppearance(true)
    try {
      const payload = Object.entries(appearance).map(([key, value]) => ({
        key: `theme.${key}`,
        value: String(value),
      }))
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: payload }),
      })
      if (!res.ok) {
        const data = await res.json()
        toastError(data.error || "Failed to save appearance")
        return
      }
      toastSuccess("Appearance saved")
    } catch {
      toastError("Failed to save appearance")
    } finally {
      setSavingAppearance(false)
    }
  }

  async function handleResetAppearance() {
    setShowResetAppearanceConfirm(false)
    setAppearance({ ...DEFAULT_THEME })
    applyAppearancePreview({ ...DEFAULT_THEME })
    try {
      const payload = Object.entries(DEFAULT_THEME).map(([key, value]) => ({
        key: `theme.${key}`,
        value: String(value),
      }))
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: payload }),
      })
      if (!res.ok) {
        const data = await res.json()
        toastError(data.error || "Reset failed")
        return
      }
      toastSuccess("Appearance reset to defaults")
    } catch {
      toastError("Failed to reset appearance")
    }
  }

  async function handleSave(key: string, value: string) {
    setSaving(key)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      })
      if (!res.ok) {
        const data = await res.json()
        toastError(data.error || "Failed to save")
        return
      }
      toastSuccess(`"${key}" saved successfully`)
      loadSettings()
    } catch {
      toastError("Failed to save setting")
    } finally {
      setSaving(null)
    }
  }

  async function handleReset() {
    setShowResetConfirm(false)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json()
        toastError(data.error || "Reset failed")
        return
      }
      toastSuccess("All settings have been reset to defaults")
      loadSettings()
    } catch {
      toastError("Failed to reset settings")
    }
  }

  function handleSaveWithInput(key: string, inputId: string) {
    const el = document.getElementById(inputId) as HTMLInputElement | HTMLTextAreaElement
    if (el) handleSave(key, el.value)
  }

  function getSetting(key: string, fallback = "") {
    return settings[key] || fallback
  }

  function bytesToMiB(bytes: string): string {
    const num = parseInt(bytes)
    if (isNaN(num)) return "500"
    return String(Math.round(num / (1024 * 1024)))
  }

  function miBToBytes(mib: string): string {
    const num = parseInt(mib)
    if (isNaN(num) || num < 0) return "524288000"
    return String(num * 1024 * 1024)
  }

  const navItems = (
    <nav className="flex flex-wrap gap-2 mb-6 sm:mb-8">
      {SECTIONS.map((sec) => {
        const Icon = sec.icon
        return (
          <button
            key={sec.key}
            onClick={() => setActiveSection(sec.key)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              activeSection === sec.key
                ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                : "bg-dark-800/40 text-dark-400 border border-dark-600/20 hover:border-dark-500/40 hover:text-white"
            }`}
          >
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {sec.label}
          </button>
        )
      })}
    </nav>
  )

  function InputField({ id, placeholder, type = "text", defaultValue }: {
    id: string; placeholder?: string; type?: string; defaultValue?: string
  }) {
    return (
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <input
          type={type}
          defaultValue={defaultValue || ""}
          className="input-field flex-1"
          id={id}
          placeholder={placeholder}
        />
        <button
          onClick={() => handleSaveWithInput(id.replace("input-", ""), id)}
          disabled={saving !== null}
          className="btn-primary w-full sm:w-auto"
        >
          {saving === id.replace("input-", "") ? "Saving..." : "Save"}
        </button>
      </div>
    )
  }

  function TextAreaField({ id, placeholder, defaultValue }: {
    id: string; placeholder?: string; defaultValue?: string
  }) {
    return (
      <div className="space-y-3">
        <textarea
          defaultValue={defaultValue || ""}
          className="input-field w-full min-h-[200px] font-mono text-sm"
          id={id}
          placeholder={placeholder}
        />
        <button
          onClick={() => handleSaveWithInput(id.replace("input-", ""), id)}
          disabled={saving !== null}
          className="btn-primary flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving === id.replace("input-", "") ? "Saving..." : "Save Markdown"}
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header title="LinyaShare Admin" showAdminNav={true} adminNavItem="settings" showDashboardLink />

      <main className="max-w-4xl mx-auto px-4 py-4 sm:py-8">
        <h1 className="text-xl sm:text-2xl font-bold gradient-text flex items-center gap-2">
          <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-primary-400" /> Settings
        </h1>
        <p className="text-dark-400 text-xs sm:text-sm mb-4 sm:mb-6">Configure your service</p>

        {loading ? (
          <SkeletonLoader variant="settings" count={3} />
        ) : (
          <>
            {navItems}

            <motion.div key={activeSection} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* ──────────────── GENERAL ──────────────── */}
              {activeSection === "general" && (
                <>
                  {/* Site Name */}
                  <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Globe className="w-5 h-5 text-primary-400" /> Service Name
                    </h2>
                    <p className="text-dark-400 text-sm mb-4">Change the name shown in the header (footer stays unchanged)</p>
                    <InputField
                      id="input-siteName"
                      defaultValue={getSetting("siteName", "LinyaShare")}
                      placeholder="LinyaShare"
                    />
                  </div>

                  {/* ──────────────── DANGER ZONE ──────────────── */}
                  <div className="glass-card p-6 border-red-500/20">
                    <h2 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                      <RotateCcw className="w-5 h-5" /> Danger Zone
                    </h2>
                    <p className="text-dark-400 text-sm mb-4">
                      Reset all settings to their default values. This cannot be undone.
                    </p>
                    <button
                      onClick={() => setShowResetConfirm(true)}
                      className="btn-danger flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" /> Reset All Settings
                    </button>
                  </div>
                </>
              )}

              {/* ──────────────── REGISTRATION ──────────────── */}
              {activeSection === "registration" && (
                <>
                  <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <ToggleLeft className="w-5 h-5 text-primary-400" /> Registration
                    </h2>
                    <p className="text-dark-400 text-sm mb-6">Allow new users to register themselves</p>

                    {/* Toggle Switch */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={getSetting("allowRegistration", "true") !== "false"}
                        onChange={() => handleSave("allowRegistration", getSetting("allowRegistration", "true") === "false" ? "true" : "false")}
                      />
                      <div className="w-14 h-7 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500/60"></div>
                      <span className="ms-3 text-sm font-medium text-white">
                        {getSetting("allowRegistration", "true") !== "false" ? "Enabled" : "Disabled"}
                      </span>
                    </label>
                  </div>

                  {/* Max Users */}
                  <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary-400" /> Maximum Users
                    </h2>
                    <p className="text-dark-400 text-sm mb-4">
                      Control how many users can register. Use <code className="text-primary-400">-1</code> for <strong>unlimited</strong> users.
                      Set to <code className="text-primary-400">0</code> to <strong>prevent any new user</strong> from registering (effectively disabling registration).
                      Any positive number (e.g. <code className="text-primary-400">100</code>) sets a <strong>hard limit</strong> on total user count.
                    </p>
                    <InputField
                      id="input-maxUsers"
                      type="number"
                      defaultValue={getSetting("maxUsers", "-1")}
                      placeholder="-1"
                    />
                  </div>
                </>
              )}

              {/* ──────────────── STORAGE ──────────────── */}
              {activeSection === "storage" && (
                <div className="glass-card p-6">
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-primary-400" /> Default Storage Limit
                  </h2>
                  <p className="text-dark-400 text-sm mb-4">Maximum storage space for new users (in MiB)</p>
                  <InputField
                    defaultValue={bytesToMiB(getSetting("defaultMaxSize", "524288000"))}
                    id="input-defaultMaxSize"
                    placeholder="500"
                    type="number"
                  />
                  <p className="text-dark-500 text-xs mt-2">
                    Current: <span className="text-dark-400">{bytesToMiB(getSetting("defaultMaxSize", "524288000"))} MiB</span>
                    {" | "}1 MiB = 1,048,576 bytes
                  </p>
                </div>
              )}

              {/* ──────────────── SUPPORT ──────────────── */}
              {activeSection === "support" && (
                <>
                  <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Mail className="w-5 h-5 text-primary-400" /> Support Email
                    </h2>
                    <p className="text-dark-400 text-sm mb-4">Optional email shown on register/login pages for support requests</p>
                    <InputField
                      id="input-supportEmail"
                      type="email"
                      defaultValue={getSetting("supportEmail")}
                      placeholder="support@example.com"
                    />
                  </div>

                  <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-primary-400" /> Discord Server
                    </h2>
                    <p className="text-dark-400 text-sm mb-4">Optional Discord invite link shown on register/login pages</p>
                    <InputField
                      id="input-discordUrl"
                      defaultValue={getSetting("discordUrl")}
                      placeholder="https://discord.gg/your-invite"
                    />
                  </div>
                </>
              )}

              {/* ──────────────── LEGAL ──────────────── */}
              {activeSection === "legal" && (
                <>
                  <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <ExternalLink className="w-5 h-5 text-primary-400" /> Imprint / Legal Notice
                    </h2>
                    <p className="text-dark-400 text-sm mb-4">External link shown in the footer</p>
                    <InputField
                      id="input-imprintUrl"
                      defaultValue={getSetting("imprintUrl")}
                      placeholder="https://example.com/imprint"
                    />
                  </div>

                  <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary-400" /> Privacy Policy (Markdown)
                    </h2>
                    <p className="text-dark-400 text-sm mb-4">Markdown content shown at <code className="text-primary-400">/privacy</code></p>
                    <TextAreaField
                      id="input-privacyContent"
                      defaultValue={getSetting("privacyContent", DEFAULT_PRIVACY)}
                      placeholder="# Privacy Policy..."
                    />
                  </div>

                  <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary-400" /> Terms of Service (Markdown)
                    </h2>
                    <p className="text-dark-400 text-sm mb-4">Markdown content shown at <code className="text-primary-400">/tos</code></p>
                    <TextAreaField
                      id="input-tosContent"
                      defaultValue={getSetting("tosContent", DEFAULT_TOS)}
                      placeholder="# Terms of Service..."
                    />
                  </div>

                  {/* Markdown Guide */}
                  <div className="glass-card p-6">
                    <button
                      onClick={() => setShowMarkdownGuide(!showMarkdownGuide)}
                      className="flex items-center gap-2 text-dark-300 hover:text-white transition-colors w-full text-left"
                    >
                      <HelpCircle className="w-5 h-5 text-primary-400" />
                      <span className="text-sm font-medium">Markdown & Formatting Guide</span>
                      {showMarkdownGuide ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                    </button>
                    <AnimatePresence>
                      {showMarkdownGuide && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <pre className="mt-4 bg-dark-900/60 border border-dark-600/20 rounded-xl p-4 text-xs font-mono text-dark-300 whitespace-pre-wrap leading-relaxed">
                            {MARKDOWN_GUIDE}
                          </pre>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}

              {/* ──────────────── APPEARANCE ──────────────── */}
              {activeSection === "appearance" && (
                <>
                  {/* Live Preview */}
                  <div className="glass-card p-6 border-primary-500/20">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary-400" /> Live Preview
                    </h2>
                    <p className="text-dark-400 text-sm mb-5">
                      Changes are applied instantly. Save to make them permanent for all visitors.
                    </p>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
                      <span className="gradient-text font-heading text-2xl font-bold">LinyaShare</span>
                      <button type="button" className="btn-primary !py-2 !px-4 text-sm">Example Button</button>
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg" style={{ background: "var(--accent-gradient)" }} />
                        <div className="w-10 h-10 rounded-lg" style={{ background: "rgb(var(--primary-400))" }} />
                        <div className="w-10 h-10 rounded-lg" style={{ background: "rgb(var(--primary-500))" }} />
                        <div className="w-10 h-10 rounded-lg" style={{ background: "rgb(var(--primary-600))" }} />
                      </div>
                    </div>
                  </div>

                  {/* Accent Color & Gradient */}
                  <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Paintbrush className="w-5 h-5 text-primary-400" /> Accent Color & Gradient
                    </h2>
                    <div className="space-y-4">
                      <SegBtn
                        label="Mode"
                        options={[
                          { value: "single", label: "Single Color" },
                          { value: "gradient", label: "Gradient" },
                        ]}
                        value={appearance.accentMode}
                        onChange={(v) => updateAppearance({ accentMode: v as ThemeConfig["accentMode"] })}
                      />

                      {appearance.accentMode === "single" ? (
                        <>
                          <ColorField
                            label="Accent color"
                            value={appearance.accentColor}
                            onChange={(v) => updateAppearance({ accentColor: v })}
                          />
                          <div>
                            <p className="text-xs font-medium text-dark-300 mb-2">Presets</p>
                            <div className="flex flex-wrap gap-2">
                              {PRESET_ACCENTS.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => updateAppearance({ accentColor: c })}
                                  className={`w-8 h-8 rounded-lg border transition-transform hover:scale-110 ${
                                    appearance.accentColor.toLowerCase() === c
                                      ? "border-white ring-2 ring-primary-500/40"
                                      : "border-white/10"
                                  }`}
                                  style={{ background: c }}
                                  aria-label={c}
                                />
                              ))}
                            </div>
                          </div>
                          <DirectionSlider
                            label="Gradient direction"
                            value={appearance.gradientDirection}
                            onChange={(v) => updateAppearance({ gradientDirection: v })}
                          />
                        </>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <ColorField
                            label="From"
                            value={appearance.accentFrom}
                            onChange={(v) => updateAppearance({ accentFrom: v })}
                          />
                          <ColorField
                            label="To"
                            value={appearance.accentTo}
                            onChange={(v) => updateAppearance({ accentTo: v })}
                          />
                          <div className="sm:col-span-2">
                            <DirectionSlider
                              label="Direction"
                              value={appearance.gradientDirection}
                              onChange={(v) => updateAppearance({ gradientDirection: v })}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Background */}
                  <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-primary-400" /> Background
                    </h2>
                    <div className="space-y-4">
                      <SegBtn
                        label="Type"
                        options={[
                          { value: "particles", label: "Particles" },
                          { value: "solid", label: "Solid" },
                          { value: "gradient", label: "Gradient" },
                          { value: "none", label: "None" },
                        ]}
                        value={appearance.backgroundType}
                        onChange={(v) => updateAppearance({ backgroundType: v as ThemeConfig["backgroundType"] })}
                      />

                      {appearance.backgroundType === "solid" && (
                        <ColorField
                          label="Background color"
                          value={appearance.backgroundColor}
                          onChange={(v) => updateAppearance({ backgroundColor: v })}
                        />
                      )}

                      {appearance.backgroundType === "gradient" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <ColorField
                            label="From"
                            value={appearance.backgroundFrom}
                            onChange={(v) => updateAppearance({ backgroundFrom: v })}
                          />
                          <ColorField
                            label="To"
                            value={appearance.backgroundTo}
                            onChange={(v) => updateAppearance({ backgroundTo: v })}
                          />
                          <div className="sm:col-span-2">
                            <DirectionSlider
                              label="Direction"
                              value={appearance.backgroundDirection}
                              onChange={(v) => updateAppearance({ backgroundDirection: v })}
                            />
                          </div>
                        </div>
                      )}

                      {appearance.backgroundType === "none" && (
                        <p className="text-dark-400 text-sm">No decorative background. The page stays dark.</p>
                      )}
                    </div>
                  </div>

                  {/* Header */}
                  <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <LayoutGrid className="w-5 h-5 text-primary-400" /> Header
                    </h2>
                    <div className="space-y-4">
                      <SegBtn
                        label="Behavior"
                        options={[
                          { value: "sticky", label: "Sticky" },
                          { value: "static", label: "Normal" },
                        ]}
                        value={appearance.headerSticky ? "sticky" : "static"}
                        onChange={(v) => updateAppearance({ headerSticky: v === "sticky" })}
                      />
                      <SegBtn
                        label="Style"
                        options={[
                          { value: "blur", label: "Blur" },
                          { value: "solid", label: "Solid" },
                          { value: "transparent", label: "Transparent" },
                        ]}
                        value={appearance.headerStyle}
                        onChange={(v) => updateAppearance({ headerStyle: v as ThemeConfig["headerStyle"] })}
                      />
                    </div>
                  </div>

                  {/* Fonts */}
                  <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Type className="w-5 h-5 text-primary-400" /> Fonts
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <SelectField
                        label="Body font"
                        value={appearance.fontBody}
                        onChange={(v) => updateAppearance({ fontBody: v })}
                        options={Object.entries(FONT_MAP).map(([k, f]) => ({ value: k, label: f.label }))}
                      />
                      <SelectField
                        label="Heading font"
                        value={appearance.fontHeading}
                        onChange={(v) => updateAppearance({ fontHeading: v })}
                        options={Object.entries(FONT_MAP).map(([k, f]) => ({ value: k, label: f.label }))}
                      />
                    </div>
                    <p className="text-dark-500 text-xs mt-3">
                      Fonts are loaded from Google Fonts and applied globally. Headings and the logo use the heading font.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={handleSaveAppearance}
                      disabled={savingAppearance}
                      className="btn-primary flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" /> {savingAppearance ? "Saving..." : "Save Appearance"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResetAppearanceConfirm(true)}
                      className="btn-danger flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" /> Reset Appearance
                    </button>
                  </div>
                </>
              )}

            </motion.div>
          </>
        )}

        {/* Reset Confirm Dialog */}
        <ConfirmDialog
          isOpen={showResetConfirm}
          onClose={() => setShowResetConfirm(false)}
          onConfirm={handleReset}
          title="Reset all settings?"
          message="This will permanently delete all settings and restore defaults. This action cannot be undone."
          confirmText="Reset"
          cancelText="Cancel"
          variant="danger"
        />

        {/* Reset Appearance Confirm Dialog */}
        <ConfirmDialog
          isOpen={showResetAppearanceConfirm}
          onClose={() => setShowResetAppearanceConfirm(false)}
          onConfirm={handleResetAppearance}
          title="Reset appearance?"
          message="This will restore the default theme. All other settings stay unchanged."
          confirmText="Reset"
          cancelText="Cancel"
          variant="warning"
        />
      </main>
    </div>
  )
}