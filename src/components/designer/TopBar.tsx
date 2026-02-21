/* ─────────────────────────────────────────────────────────────────────────────
   Designer – Top Bar
   Provides: project name, undo/redo, zoom, save, export, preview
   ───────────────────────────────────────────────────────────────────────────── */
"use client";

import { useCallback } from "react";
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Download,
  Save,
  Eye,
  Loader2,
  Check,
  ArrowLeft,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@crm/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@crm/components/ui/tooltip";
import { useDocumentStore } from "@/stores/designer/documentStore";
import { useUIStore } from "@/stores/designer/uiStore";
import { FABRIC_CUSTOM_PROPS } from "@/types/designer";

interface TopBarProps {
  onSave?: () => void;
  onBack?: () => void;
}

export default function TopBar({ onSave, onBack }: TopBarProps) {
  const project = useDocumentStore((s) => s.project);
  const canvas = useDocumentStore((s) => s.canvas);
  const isDirty = useDocumentStore((s) => s.isDirty);
  const isSaving = useDocumentStore((s) => s.isSaving);
  const undoStack = useDocumentStore((s) => s.undoStack);
  const redoStack = useDocumentStore((s) => s.redoStack);
  const undo = useDocumentStore((s) => s.undo);
  const redo = useDocumentStore((s) => s.redo);

  const zoom = useUIStore((s) => s.zoom);
  const zoomIn = useUIStore((s) => s.zoomIn);
  const zoomOut = useUIStore((s) => s.zoomOut);
  const zoomToFit = useUIStore((s) => s.zoomToFit);
  const togglePreview = useUIStore((s) => s.togglePreview);
  const setExportModalOpen = useUIStore((s) => s.setExportModalOpen);
  const isMobile = useUIStore((s) => s.isMobile);
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel);

  const handleUndo = useCallback(() => {
    const json = undo();
    if (json && canvas) {
      canvas.loadFromJSON(json).then(() => {
        canvas.requestRenderAll();
      }).catch((err: unknown) => console.warn("Undo load failed:", err));
    }
  }, [undo, canvas]);

  const handleRedo = useCallback(() => {
    const json = redo();
    if (json && canvas) {
      canvas.loadFromJSON(json).then(() => {
        canvas.requestRenderAll();
      }).catch((err: unknown) => console.warn("Redo load failed:", err));
    }
  }, [redo, canvas]);

  return (
    <TooltipProvider delayDuration={300}>
      <header className="h-12 md:h-14 border-b bg-white dark:bg-neutral-950 flex items-center justify-between px-2 md:px-4 shrink-0 z-20">
        {/* Left section */}
        <div className="flex items-center gap-1 md:gap-2 min-w-0">
          {onBack && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 md:h-9 md:w-9" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Back to projects</TooltipContent>
            </Tooltip>
          )}

          <span className="text-xs md:text-sm font-semibold truncate max-w-[100px] md:max-w-[200px]">
            {project?.name || "Untitled Design"}
          </span>

          {isDirty && !isMobile && (
            <span className="text-xs text-muted-foreground">(unsaved)</span>
          )}
        </div>

        {/* Center – undo/redo + zoom (zoom hidden on mobile) */}
        <div className="flex items-center gap-0.5 md:gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 md:h-9 md:w-9"
                onClick={handleUndo}
                disabled={undoStack.length === 0}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 md:h-9 md:w-9"
                onClick={handleRedo}
                disabled={redoStack.length === 0}
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
          </Tooltip>

          {/* Zoom controls — hidden on mobile */}
          {!isMobile && (
            <>
              <div className="w-px h-6 bg-border mx-1" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={zoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom out</TooltipContent>
              </Tooltip>

              <button
                onClick={zoomToFit}
                className="text-xs font-mono w-14 text-center hover:bg-accent rounded py-1"
              >
                {Math.round(zoom * 100)}%
              </button>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={zoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom in</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        {/* Right – save / export / preview / properties toggle (mobile) */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* Properties toggle — mobile only */}
          {isMobile && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={rightPanelOpen ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={toggleRightPanel}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Properties</TooltipContent>
            </Tooltip>
          )}

          {!isMobile && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={togglePreview}>
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Preview (Ctrl+Shift+P)</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 md:h-9 md:w-9"
                onClick={() => setExportModalOpen(true)}
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export</TooltipContent>
          </Tooltip>

          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="gap-1 h-8 px-2 md:px-3 md:gap-1.5"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isDirty ? (
              <Save className="h-3.5 w-3.5" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            <span className="hidden md:inline">
              {isSaving ? "Saving…" : "Save"}
            </span>
          </Button>
        </div>
      </header>
    </TooltipProvider>
  );
}
