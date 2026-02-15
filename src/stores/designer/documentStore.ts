// ===========================================================================
// Designer – Zustand document store (canvas, pages, layers, history)
// ===========================================================================
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Canvas as FabricCanvas } from 'fabric'
import type {
  DesignProject,
  DesignPage,
  LayerInfo,
  DesignVersion,
} from '@/types/designer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface HistoryEntry {
  label: string
  pagesJson: Record<string, string> // pageId -> JSON string
  timestamp: number
}

export interface DocumentState {
  /* Canvas ref */
  canvas: FabricCanvas | null
  setCanvas: (c: FabricCanvas | null) => void

  /* Project metadata */
  project: DesignProject | null
  setProject: (p: DesignProject | null) => void

  /* Pages */
  pages: DesignPage[]
  currentPageId: string | null
  setPages: (pages: DesignPage[]) => void
  setCurrentPage: (id: string) => void
  setCurrentPageId: (id: string) => void
  addPage: (page: DesignPage) => void
  removePage: (id: string) => void
  reorderPage: (id: string, newIndex: number) => void
  updatePage: (id: string, updates: Partial<DesignPage>) => void

  /* Layers */
  layers: LayerInfo[]
  refreshLayers: () => void

  /* Active selection */
  activeObjectIds: string[]
  setActiveObjectIds: (ids: string[]) => void

  /* Undo / Redo */
  undoStack: HistoryEntry[]
  redoStack: HistoryEntry[]
  pushUndo: (label?: string) => void
  pushUndoSnapshot: (label: string, json: string) => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  /* Save state */
  isDirty: boolean
  isSaving: boolean
  lastSavedAt: string | null
  markDirty: () => void
  markClean: (at: string) => void
  setIsSaving: (v: boolean) => void

  /* Zoom */
  zoom: number
  setZoom: (z: number) => void

  /* Versions */
  versions: DesignVersion[]
  setVersions: (v: DesignVersion[]) => void
}

const MAX_UNDO = 80

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useDocumentStore = create<DocumentState>()(
  immer((set, get) => ({
    canvas: null,
    setCanvas: (c) => set({ canvas: c }),

    project: null,
    setProject: (p) => set({ project: p }),

    // ----- Pages -----
    pages: [],
    currentPageId: null,
    setPages: (pages) => set({ pages }),
    setCurrentPage: (id) => set({ currentPageId: id }),
    setCurrentPageId: (id) => set({ currentPageId: id }),
    addPage: (page) =>
      set((s) => {
        s.pages.push(page)
        s.currentPageId = page.id
      }),
    removePage: (id) =>
      set((s) => {
        s.pages = s.pages.filter((p) => p.id !== id)
        if (s.currentPageId === id) {
          s.currentPageId = s.pages[0]?.id ?? null
        }
        // Re-index
        s.pages.forEach((p, i) => {
          p.page_index = i
        })
      }),
    reorderPage: (id, newIndex) =>
      set((s) => {
        const idx = s.pages.findIndex((p) => p.id === id)
        if (idx < 0) return
        const [page] = s.pages.splice(idx, 1)
        s.pages.splice(newIndex, 0, page)
        s.pages.forEach((p, i) => {
          p.page_index = i
        })
      }),
    updatePage: (id, updates) =>
      set((s) => {
        const page = s.pages.find((p) => p.id === id)
        if (page) Object.assign(page, updates)
      }),

    // ----- Layers -----
    layers: [],
    refreshLayers: () => {
      const { canvas } = get()
      if (!canvas) return set({ layers: [] })
      const objects = canvas.getObjects()
      const layers: LayerInfo[] = objects.map((obj, i) => ({
        id: (obj as any).id ?? `obj-${i}`,
        name: (obj as any).customName ?? obj.type ?? 'object',
        type: obj.type ?? 'object',
        visible: obj.visible !== false,
        locked: !obj.selectable,
        index: i,
        groupId: (obj as any).groupId ?? null,
      }))
      set({ layers: layers.reverse() })
    },

    // ----- Selection -----
    activeObjectIds: [],
    setActiveObjectIds: (ids) => set({ activeObjectIds: ids }),

    // ----- History -----
    undoStack: [],
    redoStack: [],

    /** Extra properties to include when serializing canvas to JSON for undo */

    pushUndo: (label = 'edit') => {
      const { canvas, undoStack } = get()
      if (!canvas) return
      const json = JSON.stringify((canvas as any).toJSON(['id', 'customName', 'selectable', 'visible', 'groupId', '_storagePath']))
      const entry: HistoryEntry = {
        label,
        pagesJson: { current: json },
        timestamp: Date.now(),
      }
      const next = [...undoStack, entry].slice(-MAX_UNDO)
      set({ undoStack: next, redoStack: [], isDirty: true })
    },

    /** Push a pre-captured JSON snapshot (used when the canvas state has
     *  already changed by the time we want to record the undo entry, e.g.
     *  after an interactive transform captured via before:transform). */
    pushUndoSnapshot: (label, json) => {
      const { undoStack } = get()
      const entry: HistoryEntry = {
        label,
        pagesJson: { current: json },
        timestamp: Date.now(),
      }
      const next = [...undoStack, entry].slice(-MAX_UNDO)
      set({ undoStack: next, redoStack: [], isDirty: true })
    },

    undo: () => {
      const { canvas, undoStack, redoStack } = get()
      if (!canvas || undoStack.length === 0) return
      // Set loading flag so CanvasStage event handlers ignore
      // the object:added / object:removed events from loadFromJSON
      ;(canvas as any).__isUndoRedoLoading = true
      const current = JSON.stringify((canvas as any).toJSON(['id', 'customName', 'selectable', 'visible', 'groupId', '_storagePath']))
      const prev = undoStack[undoStack.length - 1]
      const prevJson = prev.pagesJson.current
      if (!prevJson) {
        ;(canvas as any).__isUndoRedoLoading = false
        return
      }
      canvas.loadFromJSON(prevJson).then(() => {
        // Restore pasteboard background (loadFromJSON may have overwritten it)
        canvas.backgroundColor = '#e5e7eb'
        canvas.renderAll()
        ;(canvas as any).__isUndoRedoLoading = false
        set({
          undoStack: undoStack.slice(0, -1),
          redoStack: [...redoStack, { label: 'redo', pagesJson: { current }, timestamp: Date.now() }],
          isDirty: true,
        })
        get().refreshLayers()
      }).catch(() => {
        ;(canvas as any).__isUndoRedoLoading = false
      })
    },

    redo: () => {
      const { canvas, undoStack, redoStack } = get()
      if (!canvas || redoStack.length === 0) return
      ;(canvas as any).__isUndoRedoLoading = true
      const current = JSON.stringify((canvas as any).toJSON(['id', 'customName', 'selectable', 'visible', 'groupId', '_storagePath']))
      const next = redoStack[redoStack.length - 1]
      const nextJson = next.pagesJson.current
      if (!nextJson) {
        ;(canvas as any).__isUndoRedoLoading = false
        return
      }
      canvas.loadFromJSON(nextJson).then(() => {
        canvas.backgroundColor = '#e5e7eb'
        canvas.renderAll()
        ;(canvas as any).__isUndoRedoLoading = false
        set({
          undoStack: [...undoStack, { label: 'undo', pagesJson: { current }, timestamp: Date.now() }],
          redoStack: redoStack.slice(0, -1),
          isDirty: true,
        })
        get().refreshLayers()
      }).catch(() => {
        ;(canvas as any).__isUndoRedoLoading = false
      })
    },
    canUndo: () => get().undoStack.length > 0,
    canRedo: () => get().redoStack.length > 0,

    // ----- Save -----
    isDirty: false,
    isSaving: false,
    lastSavedAt: null,
    markDirty: () => set({ isDirty: true }),
    markClean: (at) => set({ isDirty: false, lastSavedAt: at }),
    setIsSaving: (v) => set({ isSaving: v }),

    // ----- Zoom -----
    zoom: 1,
    setZoom: (z) => set({ zoom: z }),

    // ----- Versions -----
    versions: [],
    setVersions: (v) => set({ versions: v }),
  }))
)
