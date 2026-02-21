/* ─────────────────────────────────────────────────────────────────────────────
   Designer – Text Panel
   Add heading, subheading, body text, or custom text to the canvas
   ───────────────────────────────────────────────────────────────────────────── */
"use client";

import { useCallback } from "react";
import {
  Heading1,
  Heading2,
  Type,
  AlignLeft,
  ListOrdered,
} from "lucide-react";
import { ScrollArea } from "@crm/components/ui/scroll-area";
import { Button } from "@crm/components/ui/button";
import { useDocumentStore } from "@/stores/designer/documentStore";
import { useToolStore } from "@/stores/designer/toolStore";
import { nanoid } from "nanoid";

interface TextPreset {
  label: string;
  icon: React.ElementType;
  text: string;
  fontSize: number;
  fontWeight: string;
}

const TEXT_PRESETS: TextPreset[] = [
  {
    label: "Add a heading",
    icon: Heading1,
    text: "Add a heading",
    fontSize: 64,
    fontWeight: "800",
  },
  {
    label: "Add a subheading",
    icon: Heading2,
    text: "Add a subheading",
    fontSize: 36,
    fontWeight: "600",
  },
  {
    label: "Add body text",
    icon: Type,
    text: "Add body text",
    fontSize: 20,
    fontWeight: "400",
  },
  {
    label: "Add a long paragraph",
    icon: AlignLeft,
    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    fontSize: 18,
    fontWeight: "400",
  },
  {
    label: "Numbered list",
    icon: ListOrdered,
    text: "1. First item\n2. Second item\n3. Third item",
    fontSize: 20,
    fontWeight: "400",
  },
];

export default function TextPanel() {
  const canvas = useDocumentStore((s) => s.canvas);
  const fontFamily = useToolStore((s) => s.fontFamily);
  const fontColor = useToolStore((s) => s.fontColor);

  const addText = useCallback(
    async (preset: TextPreset) => {
      if (!canvas) return;
      const fabric = await import("fabric");

      const text = new fabric.IText(preset.text, {
        left: 100,
        top: 100,
        fontFamily,
        fontSize: preset.fontSize,
        fontWeight: preset.fontWeight,
        fill: fontColor,
        id: nanoid(8),
        customName: preset.label,
      } as any);

      canvas.add(text);
      canvas.setActiveObject(text);
      canvas.requestRenderAll();
    },
    [canvas, fontFamily, fontColor],
  );

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          Text Styles
        </h3>

        {TEXT_PRESETS.map((preset) => {
          const Icon = preset.icon;
          return (
            <button
              key={preset.label}
              onClick={() => addText(preset)}
              className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:border-primary hover:bg-accent transition-colors text-left"
            >
              <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p
                  className="truncate"
                  style={{
                    fontSize: Math.min(preset.fontSize * 0.5, 24),
                    fontWeight: Number(preset.fontWeight),
                  }}
                >
                  {preset.label}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {preset.fontSize}px · {preset.fontWeight}
                </p>
              </div>
            </button>
          );
        })}

        <div className="pt-4">
          <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            Font Combinations
          </h3>
          {[
            { heading: "Inter", body: "Georgia" },
            { heading: "Georgia", body: "Inter" },
            { heading: "Courier New", body: "Arial" },
          ].map((combo) => (
            <button
              key={`${combo.heading}-${combo.body}`}
              onClick={async () => {
                if (!canvas) return;
                const fabric = await import("fabric");
                const heading = new fabric.IText("Heading Text", {
                  left: 100,
                  top: 100,
                  fontFamily: combo.heading,
                  fontSize: 48,
                  fontWeight: "700",
                  fill: fontColor,
                  id: nanoid(8),
                  customName: "Heading",
                } as any);
                const body = new fabric.IText("Body text goes here", {
                  left: 100,
                  top: 170,
                  fontFamily: combo.body,
                  fontSize: 20,
                  fontWeight: "400",
                  fill: fontColor,
                  id: nanoid(8),
                  customName: "Body",
                } as any);
                canvas.add(heading, body);
                canvas.requestRenderAll();
              }}
              className="w-full flex flex-col gap-1 p-3 rounded-lg border bg-card hover:border-primary hover:bg-accent transition-colors text-left mb-2"
            >
              <span
                style={{ fontFamily: combo.heading }}
                className="text-base font-bold"
              >
                {combo.heading}
              </span>
              <span
                style={{ fontFamily: combo.body }}
                className="text-xs text-muted-foreground"
              >
                {combo.body} body text
              </span>
            </button>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
