'use client'

// ===========================================================================
// MobileRightPanelTiles — horizontal tile bar for mobile that replaces the
// stacked right panels. Tapping a tile opens the corresponding panel content
// in a bottom-sheet popup.
// ===========================================================================
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Layers, Type, SlidersHorizontal, Settings2 } from 'lucide-react'
import { useDocumentStore } from '@/stores/designer/documentStore'
import { useUIStore } from '@/stores/designer/uiStore'
import { useIsMobile } from './useIsMobile'
import MobilePopupPanel from './MobilePopupPanel'
import LayersTree from './LayersTree'
import CharacterPanel from './CharacterPanel'
import AdjustmentsPanel from './AdjustmentsPanel'
import RightPanel from './RightPanel'

type TileId = 'layers' | 'character' | 'adjustments' | 'properties'

interface TileDef {
  id: TileId
  label: string
  icon: React.ReactNode
}

const TILES: TileDef[] = [
  { id: 'layers',      label: 'Layers',      icon: <Layers className="h-3.5 w-3.5" /> },
  { id: 'character',   label: 'Text',         icon: <Type className="h-3.5 w-3.5" /> },
  { id: 'adjustments', label: 'Adjust',       icon: <SlidersHorizontal className="h-3.5 w-3.5" /> },
  { id: 'properties',  label: 'Properties',   icon: <Settings2 className="h-3.5 w-3.5" /> },
]

export default function MobileRightPanelTiles() {
  const [activeTile, setActiveTile] = useState<TileId | null>(null)
  const [popupAnchorX, setPopupAnchorX] = useState<number>(0)
  const [popupAnchorY, setPopupAnchorY] = useState<number>(0)
  const activeObjectIds = useDocumentStore(s => s.activeObjectIds)
  const canvas = useDocumentStore(s => s.canvas)
  const { layerPanelOpen, rightPanelOpen } = useUIStore()
  const isMobile = useIsMobile()
  const textTileRef = useRef<HTMLButtonElement>(null)

  // Determine which tiles should be enabled based on selection
  const active = canvas?.getActiveObject() as any
  const isText = active && (active.type === 'textbox' || active.type === 'i-text' || active.type === 'text')
  const isImage = active && active.type === 'image'

  // Auto-open Text panel when a text object is selected on mobile
  useEffect(() => {
    if (!isMobile) return
    if (isText) {
      setActiveTile('character')
      // Position below the Text tile button
      if (textTileRef.current) {
        const rect = textTileRef.current.getBoundingClientRect()
        setPopupAnchorX(rect.left)
        setPopupAnchorY(rect.bottom + 4)
      }
    } else {
      // Close character popup when deselecting text
      setActiveTile(prev => (prev === 'character' ? null : prev))
    }
  }, [isMobile, isText, activeObjectIds])

  const handleTileTap = (id: TileId, e?: React.MouseEvent) => {
    if (e) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      setPopupAnchorX(rect.left)
      setPopupAnchorY(rect.bottom + 4)
    }
    setActiveTile(prev => (prev === id ? null : id))
  }

  const activeDef = TILES.find(t => t.id === activeTile)

  const getPopupContent = () => {
    switch (activeTile) {
      case 'layers':      return <LayersTree />
      case 'character':   return <CharacterPanel />
      case 'adjustments': return <AdjustmentsPanel />
      case 'properties':  return <RightPanel />
      default: return null
    }
  }

  return (
    <>
      {/* Tile bar */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-[#18181b] border-b border-white/[0.06] overflow-x-auto shrink-0">
        {TILES.map(tile => {
          const isActive = activeTile === tile.id
          // Dim tiles that are contextually irrelevant
          const dimmed =
            (tile.id === 'character' && !isText) ||
            (tile.id === 'adjustments' && !isImage)

          return (
            <button
              key={tile.id}
              ref={tile.id === 'character' ? textTileRef : undefined}
              type="button"
              onClick={(e) => handleTileTap(tile.id, e)}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium
                transition-all shrink-0 cursor-pointer border
                ${isActive
                  ? 'bg-zinc-700 text-zinc-100 border-zinc-600'
                  : dimmed
                    ? 'bg-white/[0.02] text-zinc-600 border-white/[0.04]'
                    : 'bg-white/[0.04] text-zinc-400 border-white/[0.06] hover:bg-white/[0.08] hover:text-zinc-200'
                }
              `}
            >
              {tile.icon}
              {tile.label}
            </button>
          )
        })}
      </div>

      {/* Popup for selected tile */}
      <MobilePopupPanel
        open={activeTile !== null}
        onClose={() => setActiveTile(null)}
        title={activeDef?.label ?? ''}
        icon={activeDef?.icon}
        placement="below-top"
        anchorX={popupAnchorX}
        anchorY={popupAnchorY}
      >
        {getPopupContent()}
      </MobilePopupPanel>
    </>
  )
}
