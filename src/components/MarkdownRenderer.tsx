"use client"

import React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import type { Components } from "react-markdown"
import {
  Info, AlertTriangle, AlertOctagon, CheckCircle, ChevronRight,
} from "lucide-react"

// ── Color text parser ──
function parseColorText(text: string): React.ReactNode {
  const regex = /\{color:(#[0-9a-fA-F]{3,8})\}(.*?)\{\/color\}/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push(
      <span key={key++} style={{ color: match[1] }}>{match[2]}</span>
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }
  return parts.length > 0 ? parts : text
}

// ── Custom components (no blockquote override – callouts handled via preprocessor) ──
const components: Partial<Components> = {
  h1: ({ children }) => (
    <h1 className="text-3xl md:text-4xl font-bold gradient-text mt-8 mb-4 pb-2 border-b border-dark-600/20">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-2xl font-bold text-white mt-8 mb-3 pb-1.5 border-b border-dark-600/10 flex items-center gap-2">
      <ChevronRight className="w-5 h-5 text-primary-400 shrink-0" />
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-xl font-semibold text-white mt-6 mb-2 flex items-center gap-2">
      <span className="w-1.5 h-5 bg-primary-500/60 rounded-full shrink-0" />
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-lg font-medium text-dark-200 mt-4 mb-2">{children}</h4>
  ),
  p: ({ children }) => {
    const processed = processParagraphChildren(children)
    return <p className="text-dark-300 leading-relaxed mb-4 last:mb-0">{processed}</p>
  },
  ul: ({ children }) => (
    <ul className="space-y-1.5 mb-4">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="space-y-1.5 mb-4 list-decimal list-inside">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-dark-300 flex items-start gap-2">
      <span className="text-primary-400 mt-1.5 shrink-0">•</span>
      <span>{processParagraphChildren(children)}</span>
    </li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-primary-500/40 pl-4 py-2 mb-4 text-dark-400 italic">
      {children}
    </blockquote>
  ),
  code: ({ className, children, ...props }) => {
    const isInline = !className
    if (isInline) {
      return (
        <code className="bg-dark-700/60 text-primary-300 px-1.5 py-0.5 rounded-md text-sm font-mono" {...props}>
          {children}
        </code>
      )
    }
    return (
      <pre className="bg-dark-900/80 border border-dark-600/20 rounded-xl p-4 mb-4 overflow-x-auto">
        <code className={`text-sm font-mono text-dark-200 ${className}`} {...props}>
          {children}
        </code>
      </pre>
    )
  },
  table: ({ children }) => (
    <div className="overflow-x-auto mb-4">
      <table className="w-full border-collapse rounded-xl overflow-hidden">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-dark-700/40">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-dark-600/10">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="even:bg-dark-700/20 hover:bg-dark-700/30 transition-colors">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="text-left text-sm font-semibold text-dark-200 px-4 py-3 border-b border-dark-600/20">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="text-sm text-dark-300 px-4 py-3">
      {processParagraphChildren(children)}
    </td>
  ),
  hr: () => (
    <hr className="border-dark-600/20 my-8" />
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary-400 hover:text-primary-300 underline decoration-primary-500/30 hover:decoration-primary-500/60 transition-all"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-dark-200">{children}</em>
  ),
  // Catch our preprocessed callout divs
  div: ({ className, children }) => {
    if (!className || !className.startsWith("callout-")) {
      return <div className={className}>{children}</div>
    }

    const type = className.replace("callout-", "") as "info" | "warning" | "danger" | "success"
    const icons = { info: Info, warning: AlertTriangle, danger: AlertOctagon, success: CheckCircle }
    const colors = {
      info: "border-blue-500/30 bg-blue-500/5",
      warning: "border-yellow-500/30 bg-yellow-500/5",
      danger: "border-red-500/30 bg-red-500/5",
      success: "border-green-500/30 bg-green-500/5",
    }
    const iconColors = { info: "text-blue-400", warning: "text-yellow-400", danger: "text-red-400", success: "text-green-400" }
    const labels = { info: "Info", warning: "Warning", danger: "Danger", success: "Success" }
    const Icon = icons[type]

    return (
      <div className={`flex items-start gap-3 p-4 rounded-xl border ${colors[type]} mb-4`}>
        <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconColors[type]}`} />
        <div className="text-sm text-dark-200 flex-1">
          <span className={`font-semibold ${iconColors[type]}`}>{labels[type]}</span>
          <div className="mt-1">{children}</div>
        </div>
      </div>
    )
  },
}

function processParagraphChildren(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === "string") return parseColorText(child)
    return child
  })
}

/**
 * Pre-process markdown string:
 * - Converts `> [!TYPE]\n> content` into raw `<div class="callout-{type}">content</div>`
 *   so it becomes a single HTML node that our custom div component can intercept.
 * - Uses inline styles on the <div> so Tailwind class scanning works (classes are in source).
 */
function preprocess(md: string): string {
  const types = ["INFO", "WARNING", "DANGER", "SUCCESS"]
  let result = md

  for (const type of types) {
    const lower = type.toLowerCase()
    // Pattern: lines starting with >, first line has [!TYPE], capture following > lines
    const regex = new RegExp(
      `^> \\[!${type}\\]\\s*\\n((?:> [^\\n]*\\n?)*)`,
      "gm"
    )
    result = result.replace(regex, (_match, contentBlock: string) => {
      // Extract all > lines and join the content
      const lines = contentBlock
        .split("\n")
        .map((l: string) => l.replace(/^> /, "").trim())
        .filter(Boolean)

      const innerText = lines.join("\n")

      // Return raw HTML – react-markdown will parse the <div> as an HTML node
      // We use a class that our custom `div` component will recognize
      return `<div class="callout-${lower}">\n\n${innerText}\n\n</div>\n\n`
    })
  }

  // Also handle single-line callouts: `> [!TYPE] text`
  for (const type of types) {
    const lower = type.toLowerCase()
    const regex = new RegExp(`^> \\[!${type}\\] (.*)$`, "gm")
    result = result.replace(regex, (_match, text: string) => {
      return `<div class="callout-${lower}">\n\n${text}\n\n</div>`
    })
  }

  return result
}

export default function MarkdownRenderer({ content }: { content: string }) {
  const processed = preprocess(content)

  return (
    <div className="markdown-content">
      <ReactMarkdown
        components={components}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
      >
        {processed}
      </ReactMarkdown>
    </div>
  )
}
