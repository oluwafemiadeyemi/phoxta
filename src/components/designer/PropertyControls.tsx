'use client'

// ===========================================================================
// Shared sub-components for property panels (Page & Item inspectors)
// ===========================================================================
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronDown } from 'lucide-react'

export function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/[0.04] transition-colors"
      >
        <Label className="text-[10px] text-muted-foreground uppercase tracking-wide cursor-pointer">
          {title}
        </Label>
        <ChevronDown
          className={`h-3 w-3 text-muted-foreground transition-transform ${open ? '' : '-rotate-90'}`}
        />
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}

export function NumInput({
  label, value, onChange, min, max, suffix,
}: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; suffix?: string
}) {
  return (
    <div className="flex items-center gap-1">
      <Label className="text-[10px] text-muted-foreground w-5 shrink-0">{label}</Label>
      <Input
        type="number"
        value={value ?? 0}
        onChange={e => {
          let v = parseFloat(e.target.value)
          if (isNaN(v)) v = 0
          if (min !== undefined) v = Math.max(min, v)
          if (max !== undefined) v = Math.min(max, v)
          onChange(v)
        }}
        className="h-7 text-xs px-1.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      {suffix && <span className="text-[10px] text-muted-foreground shrink-0">{suffix}</span>}
    </div>
  )
}

export function ColorInput({
  label, value, onChange,
}: {
  label: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label className="text-[10px] text-muted-foreground w-12 shrink-0">{label}</Label>
      <input
        type="color"
        value={value || '#000000'}
        onChange={e => onChange(e.target.value)}
        className="w-6 h-6 rounded border border-white/[0.08] cursor-pointer p-0"
      />
      <Input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-7 flex-1 text-xs font-mono px-1.5"
      />
    </div>
  )
}
