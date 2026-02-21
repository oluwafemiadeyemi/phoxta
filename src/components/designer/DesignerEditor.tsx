/* ─────────────────────────────────────────────────────────────────────────────
   Designer – Editor Layout
   Assembles: TopBar, LeftRail, LeftPanel, CanvasStage, RightPanel, Toolbar
   ───────────────────────────────────────────────────────────────────────────── */
"use client";

import { useEffect, useCallback } from "react";
import TopBar from "./TopBar";
import LeftRail from "./LeftRail";
import LeftPanel from "./LeftPanel";
import CanvasStage from "./CanvasStage";
import RightPanel from "./RightPanel";
import Toolbar from "./Toolbar";
import ExportModal from "./modals/ExportModal";
import { useDocumentStore } from "@/stores/designer/documentStore";
import { useToolStore } from "@/stores/designer/toolStore";
import { useUIStore } from "@/stores/designer/uiStore";
import { FABRIC_CUSTOM_PROPS } from "@/types/designer";

interface DesignerEditorProps {
  projectId: string;
  projectName?: string;
  width: number;
  height: number;
  initialJson?: object | null;
  onSave?: (json: object) => Promise<void>;
  onBack?: () => void;
}

export default function DesignerEditor({
  projectId,
  projectName,
  width,
  height,
  initialJson,
  onSave,
  onBack,
}: DesignerEditorProps) {
  const canvas = useDocumentStore((s) => s.canvas);
  const setProject = useDocumentStore((s) => s.setProject);
  const markClean = useDocumentStore((s) => s.markClean);
  const setIsSaving = useDocumentStore((s) => s.setIsSaving);
  const setLastSavedAt = useDocumentStore((s) => s.setLastSavedAt);
  const previewMode = useUIStore((s) => s.previewMode);
  const isMobile = useUIStore((s) => s.isMobile);
  const setIsMobile = useUIStore((s) => s.setIsMobile);
  const setTool = useToolStore((s) => s.setTool);

  // Detect mobile viewport
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(e.matches);
    handler(mq); // initial check
    mq.addEventListener("change", handler as (e: MediaQueryListEvent) => void);
    return () =>
      mq.removeEventListener(
        "change",
        handler as (e: MediaQueryListEvent) => void,
      );
  }, [setIsMobile]);

  // Initialize project in store
  useEffect(() => {
    setProject({
      id: projectId,
      user_id: "",
      name: projectName || "Untitled Design",
      width,
      height,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      folder_id: null,
      is_template: false,
      template_source_id: null,
    });
  }, [projectId, projectName, width, height, setProject]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!canvas || !onSave) return;
    setIsSaving(true);
    try {
      const json = canvas.toJSON([...FABRIC_CUSTOM_PROPS]);
      await onSave(json);
      markClean();
      setLastSavedAt(new Date().toISOString());
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setIsSaving(false);
    }
  }, [canvas, onSave, markClean, setIsSaving, setLastSavedAt]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Tool shortcuts
      if (!e.ctrlKey && !e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "v":
            setTool("select");
            break;
          case "h":
            setTool("hand");
            break;
          case "t":
            setTool("text");
            break;
          case "d":
            setTool("draw");
            break;
          case "delete":
          case "backspace":
            if (canvas) {
              const active = canvas.getActiveObject();
              if (active) {
                canvas.remove(active);
                canvas.discardActiveObject();
                canvas.requestRenderAll();
              }
            }
            break;
        }
      }

      // Ctrl shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "s":
            e.preventDefault();
            handleSave();
            break;
          case "z":
            e.preventDefault();
            if (e.shiftKey) {
              // Redo
              const json = useDocumentStore.getState().redo();
              if (json && canvas) {
                canvas.loadFromJSON(json).then(() => canvas.requestRenderAll());
              }
            } else {
              // Undo
              const json = useDocumentStore.getState().undo();
              if (json && canvas) {
                canvas.loadFromJSON(json).then(() => canvas.requestRenderAll());
              }
            }
            break;
          case "y":
            e.preventDefault();
            const json = useDocumentStore.getState().redo();
            if (json && canvas) {
              canvas.loadFromJSON(json).then(() => canvas.requestRenderAll());
            }
            break;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canvas, handleSave, setTool]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      useDocumentStore.getState().reset();
      useToolStore.getState().resetTool();
      useUIStore.getState().resetUI();
    };
  }, []);

  // Preview mode — just the canvas fullscreen
  if (previewMode) {
    return (
      <div className="fixed inset-0 z-50 bg-neutral-900 flex items-center justify-center">
        <CanvasStage width={width} height={height} initialJson={initialJson} />
        <button
          onClick={() => useUIStore.getState().togglePreview()}
          className="absolute top-4 right-4 text-white bg-black/50 px-4 py-2 rounded-lg hover:bg-black/80 transition-colors"
        >
          Exit Preview (Esc)
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-background">
      <TopBar onSave={handleSave} onBack={onBack} />

      {/* Desktop: horizontal layout | Mobile: canvas fills, panels overlay */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Left rail – hidden on mobile (bottom rail used instead) */}
        {!isMobile && <LeftRail />}
        {!isMobile && <LeftPanel />}

        {/* Canvas area */}
        <div className="flex-1 relative min-w-0">
          <CanvasStage
            width={width}
            height={height}
            initialJson={initialJson}
          />
          <Toolbar />
        </div>

        {!isMobile && <RightPanel />}

        {/* Mobile overlays */}
        {isMobile && <LeftPanel />}
        {isMobile && <RightPanel />}
      </div>

      {/* Mobile bottom rail */}
      {isMobile && <LeftRail />}

      {/* Modals */}
      <ExportModal />
    </div>
  );
}
