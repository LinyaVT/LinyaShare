"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Shield } from "lucide-react"
import MarkdownRenderer from "@/components/MarkdownRenderer"
import Header from "@/components/Header"
import Footer from "@/components/Footer"

const DEFAULT_CONTENT = `
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

export default function PrivacyPage() {
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/settings/public")
      .then((res) => res.json())
      .then((data) => {
        setContent(data.privacyContent || DEFAULT_CONTENT)
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
            <Shield className="w-8 h-8 text-primary-400" />
            <h1 className="text-3xl font-bold gradient-text">Privacy Policy</h1>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><div className="loading-spinner"></div></div>
          ) : (
            <div className="glass-card p-8">
              <MarkdownRenderer content={content} />
            </div>
          )}
        </motion.div>
      </main>
      <Footer />
    </div>
  )
}