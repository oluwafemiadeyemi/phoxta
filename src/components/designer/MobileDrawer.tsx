'use client'

// ===========================================================================
// MobileDrawer — slide-over drawer for panels on mobile devices.
// Slides from left or right with a semi-transparent backdrop.
// ===========================================================================
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
  side: 'left' | 'right'
  title?: string
  children: React.ReactNode
  /** Width class, e.g. 'w-72' or 'w-80'. Default: 'w-[85vw] max-w-sm' */
  className?: string
}

export default function MobileDrawer({
  open,
  onClose,
  side,
  title,
  children,
  className = 'w-[85vw] max-w-sm',
}: MobileDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const translateClass = side === 'left'
    ? (open ? 'translate-x-0' : '-translate-x-full')
    : (open ? 'translate-x-0' : 'translate-x-full')

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className={`
          fixed top-0 ${side === 'left' ? 'left-0' : 'right-0'} bottom-0
          ${className}
          bg-white z-50 md:hidden
          flex flex-col
          transform transition-transform duration-200 ease-out
          ${translateClass}
          shadow-2xl
        `}
      >
        {/* Header */}
        {title && (
          <div className="h-12 flex items-center justify-between px-3 border-b border-gray-200 shrink-0">
            <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
            <Button variant="ghost" size="icon-xs" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </>
  )
}
