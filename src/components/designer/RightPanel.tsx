/* ─────────────────────────────────────────────────────────────────────────────
   Designer – Right Panel (Properties Inspector)
   Shows fill, stroke, font, position, size controls for the selected object
   ───────────────────────────────────────────────────────────────────────────── */
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Copy,
  Trash2,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  Lock,
  Unlock,
  X,
} from "lucide-react";
import { Input } from "@crm/components/ui/input";
import { Label } from "@crm/components/ui/label";
import { Button } from "@crm/components/ui/button";
import { Slider } from "@crm/components/ui/slider";
import { ScrollArea } from "@crm/components/ui/scroll-area";
import { Separator } from "@crm/components/ui/separator";
import { useDocumentStore } from "@/stores/designer/documentStore";
import { useUIStore } from "@/stores/designer/uiStore";
import { FABRIC_CUSTOM_PROPS } from "@/types/designer";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";

interface ObjectProps {
  left: number;
  top: number;
  width: number;
  height: number;
  angle: number;
  opacity: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  // Text-specific
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: string;
  underline?: boolean;
  linethrough?: boolean;
  // Flags
  isText: boolean;
  locked: boolean;
}

export default function RightPanel() {
  const canvas = useDocumentStore((s) => s.canvas);
  const pushSnapshot = useDocumentStore((s) => s.pushSnapshot);
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  const selectedObjectIds = useUIStore((s) => s.selectedObjectIds);
  const isMobile = useUIStore((s) => s.isMobile);
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel);

  const [props, setProps] = useState<ObjectProps | null>(null);

  // Refresh properties from selected object
  const refreshProps = useCallback(() => {
    if (!canvas) return;
    const active = canvas.getActiveObject() as any;
    if (!active) {
      setProps(null);
      return;
    }

    const isText =
      active.type === "IText" ||
      active.type === "Textbox" ||
      active.type === "Text";

    setProps({
      left: Math.round(active.left ?? 0),
      top: Math.round(active.top ?? 0),
      width: Math.round((active.width ?? 0) * (active.scaleX ?? 1)),
      height: Math.round((active.height ?? 0) * (active.scaleY ?? 1)),
      angle: Math.round(active.angle ?? 0),
      opacity: Math.round((active.opacity ?? 1) * 100),
      fill: typeof active.fill === "string" ? active.fill : "#000000",
      stroke: active.stroke || "",
      strokeWidth: active.strokeWidth ?? 0,
      fontFamily: active.fontFamily,
      fontSize: active.fontSize,
      fontWeight: active.fontWeight,
      fontStyle: active.fontStyle,
      textAlign: active.textAlign,
      underline: active.underline,
      linethrough: active.linethrough,
      isText,
      locked: !!active.locked,
    });
  }, [canvas]);

  useEffect(() => {
    refreshProps();
  }, [selectedObjectIds, refreshProps]);

  useEffect(() => {
    if (!canvas) return;
    const handler = () => refreshProps();
    canvas.on("object:modified", handler);
    canvas.on("object:scaling", handler);
    canvas.on("object:moving", handler);
    canvas.on("object:rotating", handler);
    return () => {
      canvas.off("object:modified", handler);
      canvas.off("object:scaling", handler);
      canvas.off("object:moving", handler);
      canvas.off("object:rotating", handler);
    };
  }, [canvas, refreshProps]);

  const updateObject = useCallback(
    (key: string, value: any) => {
      if (!canvas) return;
      const active = canvas.getActiveObject() as any;
      if (!active) return;

      // Handle width/height via scale
      if (key === "width") {
        const scaleX = value / (active.width ?? 1);
        active.set("scaleX", scaleX);
      } else if (key === "height") {
        const scaleY = value / (active.height ?? 1);
        active.set("scaleY", scaleY);
      } else {
        active.set(key, value);
      }

      active.setCoords();
      canvas.requestRenderAll();
      refreshProps();
    },
    [canvas, refreshProps],
  );

  const commitChange = useCallback(() => {
    if (!canvas) return;
    pushSnapshot(canvas.toJSON([...FABRIC_CUSTOM_PROPS]));
  }, [canvas, pushSnapshot]);

  const handleDuplicate = useCallback(() => {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    active.clone().then((cloned: any) => {
      cloned.set({
        left: (cloned.left || 0) + 20,
        top: (cloned.top || 0) + 20,
        id: nanoid(8),
        customName: `${(active as any).customName || "Object"} Copy`,
      });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.requestRenderAll();
      pushSnapshot(canvas.toJSON([...FABRIC_CUSTOM_PROPS]));
    });
  }, [canvas, pushSnapshot]);

  const handleDelete = useCallback(() => {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    canvas.remove(active);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    pushSnapshot(canvas.toJSON([...FABRIC_CUSTOM_PROPS]));
  }, [canvas, pushSnapshot]);

  const handleFlip = useCallback(
    (axis: "x" | "y") => {
      if (!canvas) return;
      const active = canvas.getActiveObject() as any;
      if (!active) return;
      if (axis === "x") active.set("flipX", !active.flipX);
      else active.set("flipY", !active.flipY);
      canvas.requestRenderAll();
      commitChange();
    },
    [canvas, commitChange],
  );

  if (!rightPanelOpen) return null;

  const panelContent = (
    <>
      <div className="h-10 border-b flex items-center justify-between px-3 shrink-0">
        <h2 className="text-sm font-semibold">Properties</h2>
        {isMobile && (
          <button
            onClick={toggleRightPanel}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <ScrollArea className="flex-1">
        {!props ? (
          <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Select an object to edit its properties
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-4">
            {/* Position & Size */}
            <section>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                Transform
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">X</Label>
                  <Input
                    type="number"
                    value={props.left}
                    onChange={(e) =>
                      updateObject("left", Number(e.target.value))
                    }
                    onBlur={commitChange}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Y</Label>
                  <Input
                    type="number"
                    value={props.top}
                    onChange={(e) =>
                      updateObject("top", Number(e.target.value))
                    }
                    onBlur={commitChange}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">W</Label>
                  <Input
                    type="number"
                    value={props.width}
                    onChange={(e) =>
                      updateObject("width", Number(e.target.value))
                    }
                    onBlur={commitChange}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">H</Label>
                  <Input
                    type="number"
                    value={props.height}
                    onChange={(e) =>
                      updateObject("height", Number(e.target.value))
                    }
                    onBlur={commitChange}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Rotation</Label>
                  <Input
                    type="number"
                    value={props.angle}
                    onChange={(e) =>
                      updateObject("angle", Number(e.target.value))
                    }
                    onBlur={commitChange}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Opacity</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={props.opacity}
                    onChange={(e) =>
                      updateObject("opacity", Number(e.target.value) / 100)
                    }
                    onBlur={commitChange}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* Fill & Stroke */}
            <section>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                Fill & Stroke
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] w-12">Fill</Label>
                  <Input
                    type="color"
                    value={props.fill}
                    onChange={(e) => updateObject("fill", e.target.value)}
                    onBlur={commitChange}
                    className="w-8 h-8 p-0.5 cursor-pointer"
                  />
                  <Input
                    value={props.fill}
                    onChange={(e) => updateObject("fill", e.target.value)}
                    onBlur={commitChange}
                    className="h-8 text-xs flex-1 font-mono"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] w-12">Stroke</Label>
                  <Input
                    type="color"
                    value={props.stroke || "#000000"}
                    onChange={(e) => updateObject("stroke", e.target.value)}
                    onBlur={commitChange}
                    className="w-8 h-8 p-0.5 cursor-pointer"
                  />
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    value={props.strokeWidth}
                    onChange={(e) =>
                      updateObject("strokeWidth", Number(e.target.value))
                    }
                    onBlur={commitChange}
                    className="h-8 text-xs w-16"
                    placeholder="Width"
                  />
                </div>
              </div>
            </section>

            {/* Text-specific properties */}
            {props.isText && (
              <>
                <Separator />
                <section>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                    Typography
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-[10px]">Font</Label>
                      <select
                        value={props.fontFamily || "Inter"}
                        onChange={(e) => {
                          updateObject("fontFamily", e.target.value);
                          commitChange();
                        }}
                        className="w-full h-8 text-xs border rounded px-2 bg-background"
                      >
                        {[
                          "Inter",
                          "Georgia",
                          "Arial",
                          "Courier New",
                          "Times New Roman",
                          "Verdana",
                          "Trebuchet MS",
                          "Impact",
                          "Comic Sans MS",
                        ].map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px]">Size</Label>
                        <Input
                          type="number"
                          min={8}
                          max={400}
                          value={props.fontSize || 24}
                          onChange={(e) =>
                            updateObject("fontSize", Number(e.target.value))
                          }
                          onBlur={commitChange}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Weight</Label>
                        <select
                          value={props.fontWeight || "400"}
                          onChange={(e) => {
                            updateObject("fontWeight", e.target.value);
                            commitChange();
                          }}
                          className="w-full h-8 text-xs border rounded px-2 bg-background"
                        >
                          {["100", "200", "300", "400", "500", "600", "700", "800", "900"].map(
                            (w) => (
                              <option key={w} value={w}>
                                {w}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    </div>
                    {/* Text formatting buttons */}
                    <div className="flex gap-1">
                      <Button
                        variant={
                          props.fontWeight === "700" ||
                          props.fontWeight === "800" ||
                          props.fontWeight === "900"
                            ? "default"
                            : "outline"
                        }
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          updateObject(
                            "fontWeight",
                            props.fontWeight === "700" ? "400" : "700",
                          );
                          commitChange();
                        }}
                      >
                        <Bold className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant={
                          props.fontStyle === "italic" ? "default" : "outline"
                        }
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          updateObject(
                            "fontStyle",
                            props.fontStyle === "italic" ? "normal" : "italic",
                          );
                          commitChange();
                        }}
                      >
                        <Italic className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant={props.underline ? "default" : "outline"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          updateObject("underline", !props.underline);
                          commitChange();
                        }}
                      >
                        <Underline className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant={props.linethrough ? "default" : "outline"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          updateObject("linethrough", !props.linethrough);
                          commitChange();
                        }}
                      >
                        <Strikethrough className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {/* Text alignment */}
                    <div className="flex gap-1">
                      {(["left", "center", "right"] as const).map((align) => {
                        const Icon =
                          align === "left"
                            ? AlignLeft
                            : align === "center"
                              ? AlignCenter
                              : AlignRight;
                        return (
                          <Button
                            key={align}
                            variant={
                              props.textAlign === align ? "default" : "outline"
                            }
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              updateObject("textAlign", align);
                              commitChange();
                            }}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </section>
              </>
            )}

            <Separator />

            {/* Actions */}
            <section>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                Actions
              </h4>
              <div className="flex flex-wrap gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={handleDuplicate}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={() => handleFlip("x")}
                >
                  <FlipHorizontal className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={() => handleFlip("y")}
                >
                  <FlipVertical className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </section>
          </div>
        )}
      </ScrollArea>
    </>
  );

  // Mobile: fullscreen overlay from right
  if (isMobile) {
    return (
      <>
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={toggleRightPanel}
        />
        <aside className="fixed inset-y-0 right-0 z-50 w-[85vw] max-w-[320px] bg-white dark:bg-neutral-950 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          {panelContent}
        </aside>
      </>
    );
  }

  // Desktop: inline side panel
  return (
    <aside className="w-[260px] border-l bg-white dark:bg-neutral-950 shrink-0 flex flex-col">
      {panelContent}
    </aside>
  );
}
