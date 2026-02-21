/* ─────────────────────────────────────────────────────────────────────────────
   Designer – Tool Store  (active tool, shape kind, draw options)
   ───────────────────────────────────────────────────────────────────────────── */
"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { ToolMode, ShapeKind } from "@/types/designer";

export interface ToolState {
  activeTool: ToolMode;
  shapeKind: ShapeKind;

  // Draw / brush options
  brushColor: string;
  brushWidth: number;

  // Fill & stroke for new objects
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;

  // Font defaults for text tool
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontColor: string;
}

export interface ToolActions {
  setTool: (tool: ToolMode) => void;
  setShapeKind: (kind: ShapeKind) => void;
  setBrushColor: (color: string) => void;
  setBrushWidth: (width: number) => void;
  setFillColor: (color: string) => void;
  setStrokeColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setFontFamily: (family: string) => void;
  setFontSize: (size: number) => void;
  setFontWeight: (weight: string) => void;
  setFontColor: (color: string) => void;
  resetTool: () => void;
}

const initialState: ToolState = {
  activeTool: "select",
  shapeKind: "rectangle",
  brushColor: "#000000",
  brushWidth: 4,
  fillColor: "#4f46e5",
  strokeColor: "#000000",
  strokeWidth: 0,
  fontFamily: "Inter",
  fontSize: 24,
  fontWeight: "400",
  fontColor: "#000000",
};

export const useToolStore = create<ToolState & ToolActions>()(
  immer((set) => ({
    ...initialState,

    setTool: (tool) =>
      set((s) => {
        s.activeTool = tool;
      }),

    setShapeKind: (kind) =>
      set((s) => {
        s.shapeKind = kind;
      }),

    setBrushColor: (color) =>
      set((s) => {
        s.brushColor = color;
      }),

    setBrushWidth: (width) =>
      set((s) => {
        s.brushWidth = width;
      }),

    setFillColor: (color) =>
      set((s) => {
        s.fillColor = color;
      }),

    setStrokeColor: (color) =>
      set((s) => {
        s.strokeColor = color;
      }),

    setStrokeWidth: (width) =>
      set((s) => {
        s.strokeWidth = width;
      }),

    setFontFamily: (family) =>
      set((s) => {
        s.fontFamily = family;
      }),

    setFontSize: (size) =>
      set((s) => {
        s.fontSize = size;
      }),

    setFontWeight: (weight) =>
      set((s) => {
        s.fontWeight = weight;
      }),

    setFontColor: (color) =>
      set((s) => {
        s.fontColor = color;
      }),

    resetTool: () => set(() => ({ ...initialState })),
  })),
);
