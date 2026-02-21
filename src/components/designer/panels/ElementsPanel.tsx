/* ─────────────────────────────────────────────────────────────────────────────
   Designer – Elements Panel
   Provides shapes, lines, and basic elements to drop onto the canvas
   ───────────────────────────────────────────────────────────────────────────── */
"use client";

import { useCallback } from "react";
import {
  Square,
  Circle,
  Triangle,
  Star,
  Minus,
  ArrowRight,
  Hexagon,
  Pentagon,
} from "lucide-react";
import { ScrollArea } from "@crm/components/ui/scroll-area";
import { useDocumentStore } from "@/stores/designer/documentStore";
import { useToolStore } from "@/stores/designer/toolStore";
import { nanoid } from "nanoid";

type ElementEntry = {
  label: string;
  icon: React.ElementType;
  factory: (fillColor: string, strokeColor: string) => object;
};

function makeRect(fill: string, stroke: string) {
  return {
    type: "Rect",
    left: 100,
    top: 100,
    width: 200,
    height: 150,
    fill,
    stroke,
    strokeWidth: 0,
    rx: 0,
    ry: 0,
    id: nanoid(8),
    customName: "Rectangle",
  };
}

function makeCircle(fill: string, stroke: string) {
  return {
    type: "Circle",
    left: 100,
    top: 100,
    radius: 80,
    fill,
    stroke,
    strokeWidth: 0,
    id: nanoid(8),
    customName: "Circle",
  };
}

function makeTriangle(fill: string, stroke: string) {
  return {
    type: "Triangle",
    left: 100,
    top: 100,
    width: 160,
    height: 140,
    fill,
    stroke,
    strokeWidth: 0,
    id: nanoid(8),
    customName: "Triangle",
  };
}

function makeStar(fill: string, _stroke: string) {
  // Fabric doesn't have a native star – use a polygon
  const points = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 80 : 40;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push({
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
    });
  }
  return {
    type: "Polygon",
    left: 100,
    top: 100,
    points,
    fill,
    id: nanoid(8),
    customName: "Star",
  };
}

function makeLine(_fill: string, stroke: string) {
  return {
    type: "Line",
    x1: 0,
    y1: 0,
    x2: 200,
    y2: 0,
    left: 100,
    top: 200,
    stroke: stroke || "#000000",
    strokeWidth: 3,
    id: nanoid(8),
    customName: "Line",
  };
}

function makeArrow(_fill: string, stroke: string) {
  return {
    type: "Line",
    x1: 0,
    y1: 0,
    x2: 200,
    y2: 0,
    left: 100,
    top: 200,
    stroke: stroke || "#000000",
    strokeWidth: 3,
    id: nanoid(8),
    customName: "Arrow",
  };
}

function makeRoundedRect(fill: string, stroke: string) {
  return {
    type: "Rect",
    left: 100,
    top: 100,
    width: 200,
    height: 150,
    rx: 20,
    ry: 20,
    fill,
    stroke,
    strokeWidth: 0,
    id: nanoid(8),
    customName: "Rounded Rect",
  };
}

function makeHexagon(fill: string, _stroke: string) {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    points.push({
      x: Math.cos(angle) * 80,
      y: Math.sin(angle) * 80,
    });
  }
  return {
    type: "Polygon",
    left: 100,
    top: 100,
    points,
    fill,
    id: nanoid(8),
    customName: "Hexagon",
  };
}

const ELEMENTS: ElementEntry[] = [
  { label: "Rectangle", icon: Square, factory: makeRect },
  { label: "Rounded Rect", icon: Square, factory: makeRoundedRect },
  { label: "Circle", icon: Circle, factory: makeCircle },
  { label: "Triangle", icon: Triangle, factory: makeTriangle },
  { label: "Star", icon: Star, factory: makeStar },
  { label: "Hexagon", icon: Hexagon, factory: makeHexagon },
  { label: "Line", icon: Minus, factory: makeLine },
  { label: "Arrow", icon: ArrowRight, factory: makeArrow },
];

export default function ElementsPanel() {
  const canvas = useDocumentStore((s) => s.canvas);
  const fillColor = useToolStore((s) => s.fillColor);
  const strokeColor = useToolStore((s) => s.strokeColor);

  const addElement = useCallback(
    async (entry: ElementEntry) => {
      if (!canvas) return;
      const fabric = await import("fabric");
      const props = entry.factory(fillColor, strokeColor);
      const type = (props as any).type as string;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let obj: any = null;

      switch (type) {
        case "Rect":
          obj = new fabric.Rect(props as any);
          break;
        case "Circle":
          obj = new fabric.Circle(props as any);
          break;
        case "Triangle":
          obj = new fabric.Triangle(props as any);
          break;
        case "Polygon":
          obj = new fabric.Polygon((props as any).points, props as any);
          break;
        case "Line":
          obj = new fabric.Line(
            [
              (props as any).x1,
              (props as any).y1,
              (props as any).x2,
              (props as any).y2,
            ],
            props as any,
          );
          break;
        default:
          break;
      }

      if (obj) {
        canvas.add(obj);
        canvas.setActiveObject(obj);
        canvas.requestRenderAll();
      }
    },
    [canvas, fillColor, strokeColor],
  );

  return (
    <ScrollArea className="h-full">
      <div className="p-3">
        <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          Shapes
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {ELEMENTS.map((el) => {
            const Icon = el.icon;
            return (
              <button
                key={el.label}
                onClick={() => addElement(el)}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-card hover:border-primary hover:bg-accent transition-colors"
              >
                <Icon className="h-8 w-8 text-muted-foreground" />
                <span className="text-xs font-medium">{el.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
