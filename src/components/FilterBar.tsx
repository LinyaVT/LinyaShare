"use client"

import { useState } from "react"
import { Filter, X, ChevronDown } from "lucide-react"

interface FilterOption {
  value: string
  label: string
}

interface FilterBarProps {
  filters: {
    key: string
    label: string
    value: string
    options: FilterOption[]
    onChange: (value: string) => void
  }[]
  onReset?: () => void
  activeCount?: number
}

export default function FilterBar({ filters, onReset, activeCount }: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const hasActiveFilters = activeCount !== undefined ? activeCount > 0 : filters.some(f => f.value !== "all")

  return (
    <div className="space-y-3">
      {/* Filter Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
          hasActiveFilters
            ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
            : "bg-dark-800/40 text-dark-400 border border-dark-600/20 hover:text-white"
        }`}
      >
        <Filter className="w-4 h-4" />
        <span>Filter</span>
        {hasActiveFilters && (
          <span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full">
            {activeCount || filters.filter(f => f.value !== "all").length}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
      </button>

      {/* Filter Dropdown */}
      {isExpanded && (
        <div className="glass-card p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filters.map((filter) => (
              <div key={filter.key}>
                <label className="block text-sm text-dark-300 mb-1.5">{filter.label}</label>
                <select
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                  className="input-field text-sm py-2 w-full"
                >
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {hasActiveFilters && onReset && (
            <button
              onClick={onReset}
              className="flex items-center gap-2 text-sm text-dark-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
              Reset all filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}