/* ─────────────────────────────────────────────────────────────────────────────
   Designer – Left Panel
   Sliding panel that renders the active side-panel content
   ───────────────────────────────────────────────────────────────────────────── */
"use client";

import { useUIStore } from "@/stores/designer/uiStore";
import TemplatesPanel from "./panels/TemplatesPanel";
import ElementsPanel from "./panels/ElementsPanel";
import TextPanel from "./panels/TextPanel";
import UploadsPanel from "./panels/UploadsPanel";
import ImagesPanel from "./panels/ImagesPanel";
import BrandPanel from "./panels/BrandPanel";
import LayersPanel from "./panels/LayersPanel";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const PANEL_WIDTH = 300;

export default function LeftPanel() {
  const leftPanelOpen = useUIStore((s) => s.leftPanelOpen);
  const activePanel = useUIStore((s) => s.activePanel);
  const isMobile = useUIStore((s) => s.isMobile);
  const setActivePanel = useUIStore((s) => s.setActivePanel);

  const renderPanel = () => {
    switch (activePanel) {
      case "templates":
        return <TemplatesPanel />;
      case "elements":
        return <ElementsPanel />;
      case "text":
        return <TextPanel />;
      case "uploads":
        return <UploadsPanel />;
      case "images":
        return <ImagesPanel />;
      case "brand":
        return <BrandPanel />;
      case "layers":
        return <LayersPanel />;
      default:
        return null;
    }
  };

  const panelTitle = () => {
    switch (activePanel) {
      case "templates":
        return "Templates";
      case "elements":
        return "Elements";
      case "text":
        return "Text";
      case "uploads":
        return "Uploads";
      case "images":
        return "Stock Images";
      case "brand":
        return "Brand Kit";
      case "layers":
        return "Layers";
      default:
        return "";
    }
  };

  // Mobile: fullscreen overlay panel sliding up from bottom
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        {leftPanelOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 transition-opacity"
            onClick={() => setActivePanel(null)}
          />
        )}
        <div
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-neutral-950 rounded-t-2xl shadow-2xl flex flex-col transition-transform duration-300 ease-in-out",
            leftPanelOpen
              ? "translate-y-0"
              : "translate-y-full pointer-events-none",
          )}
          style={{ height: "75vh", maxHeight: "75vh" }}
        >
          {/* Drag handle + header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-1 rounded-full bg-muted-foreground/30 mx-auto" />
              <h2 className="text-sm font-semibold">{panelTitle()}</h2>
            </div>
            <button
              onClick={() => setActivePanel(null)}
              className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">{renderPanel()}</div>
        </div>
      </>
    );
  }

  // Desktop: inline side panel
  return (
    <aside
      className={cn(
        "border-r bg-white dark:bg-neutral-950 shrink-0 overflow-hidden transition-all duration-200 flex flex-col",
        leftPanelOpen ? "w-[300px]" : "w-0",
      )}
      style={{ minWidth: leftPanelOpen ? PANEL_WIDTH : 0 }}
    >
      {leftPanelOpen && (
        <>
          <div className="h-10 border-b flex items-center px-3 shrink-0">
            <h2 className="text-sm font-semibold">{panelTitle()}</h2>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">{renderPanel()}</div>
        </>
      )}
    </aside>
  );
}
