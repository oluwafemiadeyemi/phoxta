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

const PANEL_WIDTH = 300;

export default function LeftPanel() {
  const leftPanelOpen = useUIStore((s) => s.leftPanelOpen);
  const activePanel = useUIStore((s) => s.activePanel);

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
