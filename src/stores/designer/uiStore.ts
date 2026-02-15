// ===========================================================================
// Designer – UI store (panels, modals, tool, left rail, snapping, grid, rulers)
// ===========================================================================
import { create } from 'zustand'
import type { BoundaryMode } from '@/lib/designer/canvasWorkspace'

export type LeftRailTab =
  | 'templates'
  | 'images'
  | 'brand'
  | 'projects'
  | 'psd'

export type ActiveTool =
  | 'select'
  | 'text'
  | 'shape'
  | 'draw'
  | 'crop'
  | 'pan'

export interface UIState {
  /* Left rail */
  leftRailTab: LeftRailTab
  setLeftRailTab: (t: LeftRailTab) => void
  leftPanelOpen: boolean
  setLeftPanelOpen: (v: boolean) => void

  /* Right inspector */
  rightPanelOpen: boolean
  setRightPanelOpen: (v: boolean) => void

  /* Layer panel */
  layerPanelOpen: boolean
  setLayerPanelOpen: (v: boolean) => void

  /* Active tool */
  activeTool: ActiveTool
  setActiveTool: (t: ActiveTool) => void

  /* Mobile drawers */
  mobileLeftDrawerOpen: boolean
  setMobileLeftDrawerOpen: (v: boolean) => void
  mobileRightDrawerOpen: boolean
  setMobileRightDrawerOpen: (v: boolean) => void

  /* Canvas helpers */
  showGrid: boolean
  toggleGrid: () => void
  showRulers: boolean
  toggleRulers: () => void
  showGuides: boolean
  toggleGuides: () => void
  showSafeMargins: boolean
  toggleSafeMargins: () => void
  snapEnabled: boolean
  toggleSnap: () => void

  /* Boundary mode */
  boundaryMode: BoundaryMode
  setBoundaryMode: (m: BoundaryMode) => void
  bleedPx: number
  setBleedPx: (px: number) => void

  /* Modals */
  exportModalOpen: boolean
  setExportModalOpen: (v: boolean) => void
  shareModalOpen: boolean
  setShareModalOpen: (v: boolean) => void
  csvModalOpen: boolean
  setCsvModalOpen: (v: boolean) => void
  aiDesignModalOpen: boolean
  setAiDesignModalOpen: (v: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  leftRailTab: 'templates',
  setLeftRailTab: (t) => set({ leftRailTab: t, leftPanelOpen: true }),
  leftPanelOpen: true,
  setLeftPanelOpen: (v) => set({ leftPanelOpen: v }),

  rightPanelOpen: true,
  setRightPanelOpen: (v) => set({ rightPanelOpen: v }),

  layerPanelOpen: true,
  setLayerPanelOpen: (v) => set({ layerPanelOpen: v }),

  activeTool: 'select',
  setActiveTool: (t) => set({ activeTool: t }),

  mobileLeftDrawerOpen: false,
  setMobileLeftDrawerOpen: (v) => set({ mobileLeftDrawerOpen: v }),
  mobileRightDrawerOpen: false,
  setMobileRightDrawerOpen: (v) => set({ mobileRightDrawerOpen: v }),

  showGrid: false,
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  showRulers: false,
  toggleRulers: () => set((s) => ({ showRulers: !s.showRulers })),
  showGuides: true,
  toggleGuides: () => set((s) => ({ showGuides: !s.showGuides })),
  showSafeMargins: false,
  toggleSafeMargins: () => set((s) => ({ showSafeMargins: !s.showSafeMargins })),
  snapEnabled: true,
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),

  boundaryMode: 'clip' as BoundaryMode,
  setBoundaryMode: (m) => set({ boundaryMode: m }),
  bleedPx: 30,
  setBleedPx: (px) => set({ bleedPx: px }),

  exportModalOpen: false,
  setExportModalOpen: (v) => set({ exportModalOpen: v }),
  shareModalOpen: false,
  setShareModalOpen: (v) => set({ shareModalOpen: v }),
  csvModalOpen: false,
  setCsvModalOpen: (v) => set({ csvModalOpen: v }),
  aiDesignModalOpen: false,
  setAiDesignModalOpen: (v) => set({ aiDesignModalOpen: v }),
}))
