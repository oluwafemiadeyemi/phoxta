// ===========================================================================
// Designer – Tool store (global active-tool state)
// ===========================================================================
import { create } from 'zustand'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type ToolId =
  | 'move'
  | 'text'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'frame'
  | 'crop'
  | 'eyedropper'
  | 'hand'
  | 'zoom'

export interface ToolState {
  activeTool: ToolId
  previousTool: ToolId
  setActiveTool: (tool: ToolId) => void
  temporarilyActivateTool: (tool: ToolId) => void
  restorePreviousTool: () => void
}

// ---------------------------------------------------------------------------
// Keyboard shortcut map (letter → tool)
// ---------------------------------------------------------------------------
export const TOOL_SHORTCUTS: Record<string, ToolId> = {
  v: 'move',
  t: 'text',
  r: 'rectangle',
  o: 'circle',
  l: 'line',
  f: 'frame',
  c: 'crop',
  i: 'eyedropper',
  h: 'hand',
  z: 'zoom',
}

// ---------------------------------------------------------------------------
// Cursor per tool
// ---------------------------------------------------------------------------
export const TOOL_CURSORS: Record<ToolId, string> = {
  move: 'default',
  text: 'text',
  rectangle: 'crosshair',
  circle: 'crosshair',
  line: 'crosshair',
  frame: 'crosshair',
  crop: 'crosshair',
  eyedropper: 'crosshair',
  hand: 'grab',
  zoom: 'zoom-in',
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useToolStore = create<ToolState>((set) => ({
  activeTool: 'move',
  previousTool: 'move',

  setActiveTool: (tool) =>
    set((s) => ({
      previousTool: s.activeTool,
      activeTool: tool,
    })),

  temporarilyActivateTool: (tool) =>
    set((s) => ({
      previousTool: s.activeTool,
      activeTool: tool,
    })),

  restorePreviousTool: () =>
    set((s) => ({
      activeTool: s.previousTool,
      previousTool: s.previousTool,
    })),
}))
