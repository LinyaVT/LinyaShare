"use client"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { Users, Trash2, MoreVertical } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface UnclaimedFileMenuProps {
  file: any
  onAssign: () => void
  onDelete: () => void
}

export default function UnclaimedFileMenu({ file, onAssign, onDelete }: UnclaimedFileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })

  // Berechne die Position des Buttons beim Öffnen
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX - 120, // Ausrichtung angepasst
      })
    }
  }, [isOpen])

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700/50 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="More actions"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {isOpen && createPortal(
        <>
          {/* Backdrop zum Schließen bei Klick außerhalb */}
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={() => setIsOpen(false)} 
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            transition={{ duration: 0.15 }}
            style={{ 
              position: 'absolute',
              top: menuPos.top,
              left: menuPos.left,
              zIndex: 9999
            }}
          >
            <div className="glass-card p-2 min-w-[160px] shadow-xl bg-dark-800/95 backdrop-blur-md border border-dark-600/50">
              <button
                onClick={() => { onAssign(); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-dark-300 hover:text-white hover:bg-dark-700/50 transition-colors"
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Assign</span>
              </button>
              <button
                onClick={() => { onDelete(); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-600/10 transition-colors"
              >
                <Trash2 className="w-4 h-4 shrink-0" />
                <span>Delete</span>
              </button>
            </div>
          </motion.div>
        </>,
        document.body
      )}
    </div>
  )
}