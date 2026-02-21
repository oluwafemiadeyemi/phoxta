/* ─────────────────────────────────────────────────────────────────────────────
   Designer – Document Store (Zustand + immer)
   Manages: canvas instance, pages, undo/redo, dirty state, project metadata
   ───────────────────────────────────────────────────────────────────────────── */
"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { DesignPage, DesignProject, PageBackground } from "@/types/designer";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricCanvas = any;

// Fabric JSON snapshot for undo/redo
interface CanvasSnapshot {
  json: object;
  timestamp: number;
}

export interface DocumentState {
  // Project metadata
  project: DesignProject | null;
  pages: DesignPage[];
  activePageIndex: number;

  // Canvas reference (populated by CanvasStage)
  canvas: FabricCanvas;

  // Dirty / save tracking
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;

  // Undo / Redo
  undoStack: CanvasSnapshot[];
  redoStack: CanvasSnapshot[];
  maxHistory: number;
}

export interface DocumentActions {
  // Project
  setProject: (project: DesignProject) => void;
  setPages: (pages: DesignPage[]) => void;
  setActivePageIndex: (index: number) => void;
  updatePageBackground: (pageIndex: number, bg: PageBackground) => void;

  // Canvas
  setCanvas: (canvas: FabricCanvas) => void;

  // Dirty
  markDirty: () => void;
  markClean: () => void;
  setIsSaving: (v: boolean) => void;
  setLastSavedAt: (ts: string) => void;

  // Undo / Redo
  pushSnapshot: (json: object) => void;
  undo: () => object | null;
  redo: () => object | null;
  clearHistory: () => void;

  // Reset
  reset: () => void;
}

const initialState: DocumentState = {
  project: null,
  pages: [],
  activePageIndex: 0,
  canvas: null,
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,
  undoStack: [],
  redoStack: [],
  maxHistory: 50,
};

export const useDocumentStore = create<DocumentState & DocumentActions>()(
  immer((set, get) => ({
    ...initialState,

    // ── Project ───────────────────────────────────────────────────────────
    setProject: (project) =>
      set((s) => {
        s.project = project;
      }),

    setPages: (pages) =>
      set((s) => {
        s.pages = pages;
      }),

    setActivePageIndex: (index) =>
      set((s) => {
        s.activePageIndex = index;
      }),

    updatePageBackground: (pageIndex, bg) =>
      set((s) => {
        if (s.pages[pageIndex]) {
          s.pages[pageIndex].background = bg;
        }
      }),

    // ── Canvas ────────────────────────────────────────────────────────────
    setCanvas: (canvas) =>
      set((s) => {
        // cast to any for immer compatibility with fabric.Canvas
        (s as any).canvas = canvas;
      }),

    // ── Dirty tracking ────────────────────────────────────────────────────
    markDirty: () =>
      set((s) => {
        s.isDirty = true;
      }),

    markClean: () =>
      set((s) => {
        s.isDirty = false;
      }),

    setIsSaving: (v) =>
      set((s) => {
        s.isSaving = v;
      }),

    setLastSavedAt: (ts) =>
      set((s) => {
        s.lastSavedAt = ts;
      }),

    // ── Undo / Redo ──────────────────────────────────────────────────────
    pushSnapshot: (json) =>
      set((s) => {
        s.undoStack.push({ json, timestamp: Date.now() });
        if (s.undoStack.length > s.maxHistory) {
          s.undoStack.shift();
        }
        s.redoStack = [];
        s.isDirty = true;
      }),

    undo: () => {
      const state = get();
      if (state.undoStack.length === 0) return null;

      let result: object | null = null;
      set((s) => {
        const snapshot = s.undoStack.pop();
        if (snapshot) {
          result = snapshot.json;
          // Save current state to redo stack
          const canvas = (s as any).canvas;
          if (canvas) {
            const currentJson = (canvas as any).toJSON([
              "id",
              "customName",
              "selectable",
              "visible",
              "groupId",
              "locked",
            ]);
            s.redoStack.push({ json: currentJson, timestamp: Date.now() });
          }
        }
      });
      return result;
    },

    redo: () => {
      const state = get();
      if (state.redoStack.length === 0) return null;

      let result: object | null = null;
      set((s) => {
        const snapshot = s.redoStack.pop();
        if (snapshot) {
          result = snapshot.json;
          const canvas = (s as any).canvas;
          if (canvas) {
            const currentJson = (canvas as any).toJSON([
              "id",
              "customName",
              "selectable",
              "visible",
              "groupId",
              "locked",
            ]);
            s.undoStack.push({ json: currentJson, timestamp: Date.now() });
          }
        }
      });
      return result;
    },

    clearHistory: () =>
      set((s) => {
        s.undoStack = [];
        s.redoStack = [];
      }),

    // ── Reset ─────────────────────────────────────────────────────────────
    reset: () => set(() => ({ ...initialState })),
  })),
);
