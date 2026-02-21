/* ─────────────────────────────────────────────────────────────────────────────
   Designer – Toolbar
   Floating bottom bar with tool mode selectors: select, hand, text, draw, shape
   ───────────────────────────────────────────────────────────────────────────── */
"use client";

import {
  MousePointer2,
  Hand,
  Type,
  Pencil,
  Square,
  Circle,
  Triangle,
  Star,
  Minus,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@crm/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@crm/components/ui/popover";
import { useToolStore } from "@/stores/designer/toolStore";
import { cn } from "@/lib/utils";
import type { ToolMode, ShapeKind } from "@/types/designer";

const TOOLS: { key: ToolMode; icon: React.ElementType; label: string }[] = [
  { key: "select", icon: MousePointer2, label: "Select (V)" },
  { key: "hand", icon: Hand, label: "Hand / Pan (H)" },
  { key: "text", icon: Type, label: "Text (T)" },
  { key: "draw", icon: Pencil, label: "Draw (D)" },
];

const SHAPES: { key: ShapeKind; icon: React.ElementType; label: string }[] = [
  { key: "rectangle", icon: Square, label: "Rectangle" },
  { key: "circle", icon: Circle, label: "Circle" },
  { key: "triangle", icon: Triangle, label: "Triangle" },
  { key: "star", icon: Star, label: "Star" },
  { key: "line", icon: Minus, label: "Line" },
];

export default function Toolbar() {
  const activeTool = useToolStore((s) => s.activeTool);
  const setTool = useToolStore((s) => s.setTool);
  const shapeKind = useToolStore((s) => s.shapeKind);
  const setShapeKind = useToolStore((s) => s.setShapeKind);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center gap-1 bg-white dark:bg-neutral-950 border rounded-xl shadow-lg px-2 py-1.5">
          {TOOLS.map(({ key, icon: Icon, label }) => (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setTool(key)}
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                    activeTool === key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}

          {/* Shape picker with popover */}
          <div className="w-px h-6 bg-border mx-0.5" />
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                      activeTool === "shape"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    {(() => {
                      const shape = SHAPES.find((s) => s.key === shapeKind);
                      const ShapeIcon = shape?.icon || Square;
                      return <ShapeIcon className="h-4 w-4" />;
                    })()}
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Shapes (S)</TooltipContent>
            </Tooltip>
            <PopoverContent
              align="center"
              side="top"
              className="w-auto p-2"
            >
              <div className="flex gap-1">
                {SHAPES.map(({ key, icon: Icon, label }) => (
                  <Tooltip key={key}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          setShapeKind(key);
                          setTool("shape");
                        }}
                        className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                          shapeKind === key && activeTool === "shape"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{label}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </TooltipProvider>
  );
}
