'use client'

// ===========================================================================
// MobilePopupPanel — a bottom-sheet style popup for mobile.
// Slides up from the bottom with a dark overlay.
// Used by LeftRail (left panel content) and right-panel tiles on mobile.
// ===========================================================================
import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MobilePopupPanelProps {
  open: boolean
  onClose: () => void
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  /** 'bottom-center' (default), 'beside-left' (anchored beside left rail), or 'below-top' (below top tile bar) */
  placement?: 'bottom-center' | 'beside-left' | 'below-top'
  /** Y offset for beside-left placement (px from top of viewport) */
  anchorY?: number
  /** X offset for below-top placement (px from left of viewport) */
  anchorX?: number
}

export default function MobilePopupPanel({
  open,
  onClose,
  title,
  icon,
  children,
  placement = 'bottom-center',
  anchorY,
  anchorX,
}: MobilePopupPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 animate-in fade-in-0 duration-200"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`absolute bg-[#18181b] border border-white/[0.08] rounded-xl flex flex-col overflow-hidden shadow-2xl ${
          placement === 'beside-left'
            ? 'left-[60px] w-[60vw] max-w-[240px] max-h-[45vh] animate-in slide-in-from-left-4 duration-200'
            : placement === 'below-top'
              ? 'w-[60vw] max-w-[240px] max-h-[45vh] animate-in slide-in-from-top-4 duration-200'
              : 'bottom-3 left-1/2 -translate-x-1/2 w-[70vw] max-w-[280px] max-h-[35vh] animate-in slide-in-from-bottom-4 duration-300'
        }`}
        style={
          placement === 'beside-left' && anchorY != null
            ? { top: anchorY }
            : placement === 'below-top' && anchorX != null
              ? { top: anchorY ?? 0, left: Math.min(anchorX, window.innerWidth - 250) }
              : undefined
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-1.5">
            {icon && <span className="text-zinc-400">{icon}</span>}
            <h3 className="text-xs font-semibold text-zinc-200">{title}</h3>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 h-5 w-5"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden text-xs">
          {children}
        </div>
      </div>
    </div>
  )
}
