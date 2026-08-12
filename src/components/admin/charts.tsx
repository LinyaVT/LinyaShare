"use client"

import { useMemo, useState } from "react"

// ──────────────────────────────────────────────────────────
// DEPENDENCY-FREE SVG CHARTS
// Responsive über viewBox + w-full h-auto. Hover auf einem
// Balken/Punkt zeigt einen Tooltip mit Datum + exakten Werten.
// ──────────────────────────────────────────────────────────

export interface ChartKey {
  name: string
  color: string
}

export interface ChartPoint {
  label: string
  values: number[]
}

interface ChartProps {
  data: ChartPoint[]
  keys: ChartKey[]
  height?: number
}

const PAD_LEFT = 34
const PAD_RIGHT = 8
const PAD_TOP = 10
const PAD_BOTTOM = 26

function maxValue(data: ChartPoint[]): number {
  const max = data.reduce((acc, p) => Math.max(acc, ...p.values), 0)
  return Math.max(max, 1)
}

// Zeige nur jeden x-ten Label, damit 90 Tage nicht überlappen
function labelEvery(n: number): number {
  return Math.max(1, Math.ceil(n / 9))
}

// Tooltip horizontal einpassen (nicht über den Rand hinaus)
function clampPct(pct: number): number {
  return Math.min(Math.max(pct, 11), 89)
}

function ChartTooltip({
  label,
  keys,
  values,
  leftPct,
  top = 2,
}: {
  label: string
  keys: ChartKey[]
  values: number[]
  leftPct: number
  top?: number
}) {
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 bg-dark-800/95 border border-dark-600/50 rounded-lg px-2.5 py-2 text-xs shadow-xl shadow-black/40 animate-in fade-in"
      style={{ left: `${clampPct(leftPct)}%`, top }}
    >
      <p className="text-white font-semibold mb-1 whitespace-nowrap">{label}</p>
      <div className="space-y-0.5">
        {keys.map((k, i) => (
          <div key={k.name} className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: k.color }} />
            <span className="text-dark-300">{k.name}:</span>
            <span className="text-white font-medium">{values[i] ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function BarChart({ data, keys, height = 260 }: ChartProps) {
  const width = 1000
  const plotW = width - PAD_LEFT - PAD_RIGHT
  const plotH = height - PAD_TOP - PAD_BOTTOM
  const max = maxValue(data)
  const groupW = plotW / Math.max(data.length, 1)
  const barW = Math.max(groupW * 0.7 / Math.max(keys.length, 1), 2)
  const every = labelEvery(data.length)

  const [hovered, setHovered] = useState<string | null>(null)
  const hoverIndex = data.findIndex((p) => p.label === hovered)

  return (
    <div className="relative">
      {hoverIndex >= 0 && (
        <ChartTooltip
          label={data[hoverIndex].label}
          keys={keys}
          values={data[hoverIndex].values}
          leftPct={((PAD_LEFT + hoverIndex * groupW + groupW / 2) / width) * 100}
        />
      )}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Bar chart">
        {/* Y-Axis gridlines + labels */}
        {[0, 0.5, 1].map((f) => {
          const y = PAD_TOP + plotH * (1 - f)
          return (
            <g key={f}>
              <line x1={PAD_LEFT} x2={width - PAD_RIGHT} y1={y} y2={y} stroke="rgb(30 41 59)" strokeDasharray="3 3" strokeWidth={1} />
              <text x={PAD_LEFT - 6} y={y + 4} textAnchor="end" fontSize={11} fill="#64748b">{Math.round(max * f)}</text>
            </g>
          )
        })}

        {/* Bars */}
        {data.map((pt, i) => {
          const groupX = PAD_LEFT + i * groupW
          return (
            <g key={pt.label}>
              {pt.values.map((v, k) => {
                const barH = (v / max) * plotH
                const x = groupX + (groupW - barW * keys.length) / 2 + k * barW
                const y = PAD_TOP + plotH - barH
                const active = hovered === pt.label
                return (
                  <rect
                    key={k}
                    x={x}
                    y={y}
                    width={barW}
                    height={Math.max(barH, v > 0 ? 1 : 0)}
                    rx={2}
                    fill={keys[k]?.color || "#38bdf8"}
                    opacity={hovered && !active ? 0.4 : 1}
                    className="transition-opacity cursor-pointer"
                    onMouseEnter={() => setHovered(pt.label)}
                    onMouseLeave={() => setHovered(null)}
                  />
                )
              })}
              {i % every === 0 && (
                <text x={groupX + groupW / 2} y={height - PAD_BOTTOM + 16} textAnchor="middle" fontSize={11} fill="#64748b">
                  {pt.label.slice(5)}
                </text>
              )}
            </g>
          )
        })}

        {/* Baseline */}
        <line x1={PAD_LEFT} x2={width - PAD_RIGHT} y1={PAD_TOP + plotH} y2={PAD_TOP + plotH} stroke="#334155" strokeWidth={1} />
      </svg>
    </div>
  )
}

export function LineChart({ data, keys, height = 260 }: ChartProps) {
  const width = 1000
  const plotW = width - PAD_LEFT - PAD_RIGHT
  const plotH = height - PAD_TOP - PAD_BOTTOM
  const max = maxValue(data)
  const every = labelEvery(data.length)

  const n = data.length
  const px = (i: number) => (n <= 1 ? PAD_LEFT + plotW / 2 : PAD_LEFT + (i / (n - 1)) * plotW)
  const py = (v: number) => PAD_TOP + plotH - (v / max) * plotH

  const paths = useMemo(
    () =>
      keys.map((_, k) =>
        data.map((p, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(1)},${py(p.values[k] || 0).toFixed(1)}`).join(" ")
      ),
    [data, keys, max]
  )

  const [hovered, setHovered] = useState<string | null>(null)
  const hoverIndex = data.findIndex((p) => p.label === hovered)

  return (
    <div className="relative">
      {hoverIndex >= 0 && (
        <ChartTooltip
          label={data[hoverIndex].label}
          keys={keys}
          values={data[hoverIndex].values}
          leftPct={(px(hoverIndex) / width) * 100}
        />
      )}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Line chart">
        {/* Y-Axis gridlines + labels */}
        {[0, 0.5, 1].map((f) => {
          const y = PAD_TOP + plotH * (1 - f)
          return (
            <g key={f}>
              <line x1={PAD_LEFT} x2={width - PAD_RIGHT} y1={y} y2={y} stroke="rgb(30 41 59)" strokeDasharray="3 3" strokeWidth={1} />
              <text x={PAD_LEFT - 6} y={y + 4} textAnchor="end" fontSize={11} fill="#64748b">{Math.round(max * f)}</text>
            </g>
          )
        })}

        {/* Lines */}
        {paths.map((d, k) => (
          <g key={k}>
            <path d={d} fill="none" stroke={keys[k]?.color || "#38bdf8"} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          </g>
        ))}

        {/* Points (mit vergrößertem Hover-Target) */}
        {data.map((p, i) => {
          const x = px(i)
          const y = py(p.values[0] || 0)
          const active = hovered === p.label
          return (
            <g key={p.label} onMouseEnter={() => setHovered(p.label)} onMouseLeave={() => setHovered(null)} className="cursor-pointer">
              {/* Unsichtbarer Trefferbereich */}
              <circle cx={x} cy={y} r={12} fill="transparent" />
              {keys.map((k, ki) => (
                <circle
                  key={k.name}
                  cx={x}
                  cy={py(p.values[ki] || 0)}
                  r={active ? 4.5 : 2.5}
                  fill={k.color || "#38bdf8"}
                  className="transition-[r]"
                />
              ))}
            </g>
          )
        })}

        {/* X labels */}
        {data.map((p, i) =>
          i % every === 0 ? (
            <text key={p.label} x={px(i)} y={height - PAD_BOTTOM + 16} textAnchor="middle" fontSize={11} fill="#64748b">
              {p.label.slice(5)}
            </text>
          ) : null
        )}

        {/* Baseline */}
        <line x1={PAD_LEFT} x2={width - PAD_RIGHT} y1={PAD_TOP + plotH} y2={PAD_TOP + plotH} stroke="#334155" strokeWidth={1} />
      </svg>
    </div>
  )
}