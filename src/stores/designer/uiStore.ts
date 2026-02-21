/* ─────────────────────────────────────────────────────────────────────────────
   Designer – UI Store  (panel visibility, zoom, modals, selection)
   ───────────────────────────────────────────────────────────────────────────── */
"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { PanelTab } from "@/types/designer";

export interface UIState {
  // Panel
  leftPanelOpen: boolean;
  activePanel: PanelTab | null;
  rightPanelOpen: boolean;

  // Zoom & viewport
  zoom: number;
  minZoom: number;
  maxZoom: number;

  // Selection info
  selectedObjectIds: string[];

  // Modals
  exportModalOpen: boolean;
  resizeModalOpen: boolean;
  createProjectModalOpen: boolean;

  // Preview mode (hides all UI chrome)
  previewMode: boolean;

  // Grid / snapping
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

export interface UIActions {
  // Panel
  toggleLeftPanel: () => void;
  setActivePanel: (panel: PanelTab | null) => void;
  toggleRightPanel: () => void;

  // Zoom
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;

  // Selection
  setSelectedObjectIds: (ids: string[]) => void;

  // Modals
  setExportModalOpen: (open: boolean) => void;
  setResizeModalOpen: (open: boolean) => void;
  setCreateProjectModalOpen: (open: boolean) => void;

  // Preview
  togglePreview: () => void;

  // Grid
  toggleGrid: () => void;
  toggleSnap: () => void;
  setGridSize: (size: number) => void;

  // Reset
  resetUI: () => void;
}

const initialState: UIState = {
  leftPanelOpen: true,
  activePanel: "templates",
  rightPanelOpen: true,
  zoom: 1,
  minZoom: 0.1,
  maxZoom: 5,
  selectedObjectIds: [],
  exportModalOpen: false,
  resizeModalOpen: false,
  createProjectModalOpen: false,
  previewMode: false,
  showGrid: false,
  snapToGrid: true,
  gridSize: 10,
};

export const useUIStore = create<UIState & UIActions>()(
  immer((set) => ({
    ...initialState,

    toggleLeftPanel: () =>
      set((s) => {
        s.leftPanelOpen = !s.leftPanelOpen;
      }),

    setActivePanel: (panel) =>
      set((s) => {
        if (panel === null) {
          s.leftPanelOpen = false;
          s.activePanel = null;
        } else if (s.activePanel === panel && s.leftPanelOpen) {
          // clicking the same tab toggles the panel shut
          s.leftPanelOpen = false;
          s.activePanel = null;
        } else {
          s.activePanel = panel;
          s.leftPanelOpen = true;
        }
      }),

    toggleRightPanel: () =>
      set((s) => {
        s.rightPanelOpen = !s.rightPanelOpen;
      }),

    setZoom: (zoom) =>
      set((s) => {
        s.zoom = Math.min(s.maxZoom, Math.max(s.minZoom, zoom));
      }),

    zoomIn: () =>
      set((s) => {
        s.zoom = Math.min(s.maxZoom, s.zoom * 1.2);
      }),

    zoomOut: () =>
      set((s) => {
        s.zoom = Math.max(s.minZoom, s.zoom / 1.2);
      }),

    zoomToFit: () =>
      set((s) => {
        // Reset to 1 — CanvasStage will re-centre at this zoom level.
        // A more precise fit-to-viewport calculation happens inside
        // CanvasStage on init and on container resize.
        s.zoom = 1;
      }),

    setSelectedObjectIds: (ids) =>
      set((s) => {
        s.selectedObjectIds = ids;
      }),

    setExportModalOpen: (open) =>
      set((s) => {
        s.exportModalOpen = open;
      }),

    setResizeModalOpen: (open) =>
      set((s) => {
        s.resizeModalOpen = open;
      }),

    setCreateProjectModalOpen: (open) =>
      set((s) => {
        s.createProjectModalOpen = open;
      }),

    togglePreview: () =>
      set((s) => {
        s.previewMode = !s.previewMode;
      }),

    toggleGrid: () =>
      set((s) => {
        s.showGrid = !s.showGrid;
      }),

    toggleSnap: () =>
      set((s) => {
        s.snapToGrid = !s.snapToGrid;
      }),

    setGridSize: (size) =>
      set((s) => {
        s.gridSize = size;
      }),

    resetUI: () => set(() => ({ ...initialState })),
  })),
);
