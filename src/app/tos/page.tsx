"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { FileText } from "lucide-react"
import MarkdownRenderer from "@/components/MarkdownRenderer"
import Header from "@/components/Header"
import Footer from "@/components/Footer"

const DEFAULT_CONTENT = `
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

export default function TosPage() {
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/settings/public")
      .then((res) => res.json())
      .then((data) => {
        setContent(data.tosContent || DEFAULT_CONTENT)
        setLoading(false)
      })
      .catch(() => {
        setContent(DEFAULT_CONTENT)
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Header showHomeLink />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-12 w-full">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-8 h-8 text-primary-400" />
            <h1 className="text-3xl font-bold gradient-text">Terms of Service</h1>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><div className="loading-spinner"></div></div>
          ) : (
            <div className="glass-card p-8">
              <span>
                <MarkdownRenderer content={content} />
              </span>
            </div>
          )}
        </motion.div>
      </main>
      <Footer />
    </div>
  )
}