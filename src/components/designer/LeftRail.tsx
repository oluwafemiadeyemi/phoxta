/* ─────────────────────────────────────────────────────────────────────────────
   Designer – Left Rail
   Vertical icon strip that controls which panel is open
   ───────────────────────────────────────────────────────────────────────────── */
"use client";

import {
  LayoutTemplate,
  Shapes,
  Type,
  Upload,
  Image,
  Palette,
  Layers,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@crm/components/ui/tooltip";
import { useUIStore } from "@/stores/designer/uiStore";
import type { PanelTab } from "@/types/designer";
import { cn } from "@/lib/utils";

const tabs: { key: PanelTab; icon: React.ElementType; label: string }[] = [
  { key: "templates", icon: LayoutTemplate, label: "Templates" },
  { key: "elements", icon: Shapes, label: "Elements" },
  { key: "text", icon: Type, label: "Text" },
  { key: "uploads", icon: Upload, label: "Uploads" },
  { key: "images", icon: Image, label: "Images" },
  { key: "brand", icon: Palette, label: "Brand" },
  { key: "layers", icon: Layers, label: "Layers" },
];

export default function LeftRail() {
  const activePanel = useUIStore((s) => s.activePanel);
  const setActivePanel = useUIStore((s) => s.setActivePanel);

  return (
    <TooltipProvider delayDuration={200}>
      <aside className="w-14 border-r bg-white dark:bg-neutral-950 flex flex-col items-center py-2 gap-1 shrink-0 z-10">
        {tabs.map(({ key, icon: Icon, label }) => (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setActivePanel(key)}
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                  activePanel === key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        ))}
      </aside>
    </TooltipProvider>
  );
}
