/* ─────────────────────────────────────────────────────────────────────────────
   Designer – Brand Panel
   Manage colors, fonts, and logos for consistent branding
   ───────────────────────────────────────────────────────────────────────────── */
"use client";

import { useState } from "react";
import { Palette, Plus, Check } from "lucide-react";
import { Input } from "@crm/components/ui/input";
import { Button } from "@crm/components/ui/button";
import { ScrollArea } from "@crm/components/ui/scroll-area";
import { useToolStore } from "@/stores/designer/toolStore";
import { cn } from "@/lib/utils";

const DEFAULT_BRAND_COLORS = [
  "#4f46e5",
  "#2563eb",
  "#0891b2",
  "#059669",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#db2777",
  "#000000",
  "#ffffff",
  "#f1f5f9",
  "#334155",
];

export default function BrandPanel() {
  const [brandColors, setBrandColors] = useState<string[]>(DEFAULT_BRAND_COLORS);
  const [newColor, setNewColor] = useState("#4f46e5");
  const fillColor = useToolStore((s) => s.fillColor);
  const setFillColor = useToolStore((s) => s.setFillColor);
  const fontColor = useToolStore((s) => s.fontColor);
  const setFontColor = useToolStore((s) => s.setFontColor);

  const addColor = () => {
    if (!brandColors.includes(newColor)) {
      setBrandColors((prev) => [...prev, newColor]);
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-6">
        {/* Brand Colors */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            Brand Colors
          </h3>
          <div className="grid grid-cols-6 gap-2">
            {brandColors.map((color) => (
              <button
                key={color}
                onClick={() => {
                  setFillColor(color);
                  setFontColor(color);
                }}
                className={cn(
                  "w-full aspect-square rounded-lg border-2 transition-all hover:scale-110",
                  fillColor === color
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-transparent",
                )}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <Input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-10 h-9 p-0.5 cursor-pointer"
            />
            <Input
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-9 flex-1 text-xs font-mono"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={addColor}
              className="h-9"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </section>

        {/* Quick Color Palettes */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            Color Palettes
          </h3>
          {[
            {
              name: "Ocean",
              colors: ["#0f172a", "#1e40af", "#3b82f6", "#93c5fd", "#dbeafe"],
            },
            {
              name: "Sunset",
              colors: ["#7c2d12", "#ea580c", "#fb923c", "#fed7aa", "#fff7ed"],
            },
            {
              name: "Forest",
              colors: ["#14532d", "#15803d", "#22c55e", "#86efac", "#dcfce7"],
            },
            {
              name: "Luxury",
              colors: ["#0a0a0a", "#1c1917", "#a16207", "#fbbf24", "#fef3c7"],
            },
          ].map((palette) => (
            <div key={palette.name} className="mb-3">
              <p className="text-[11px] text-muted-foreground mb-1.5">
                {palette.name}
              </p>
              <div className="flex rounded-lg overflow-hidden border">
                {palette.colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setFillColor(c);
                      setFontColor(c);
                    }}
                    className="flex-1 h-8 hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </ScrollArea>
  );
}
