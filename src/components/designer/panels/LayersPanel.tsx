/* ─────────────────────────────────────────────────────────────────────────────
   Designer – Layers Panel
   Shows all objects on the canvas as layers; reorder, visibility, lock
   ───────────────────────────────────────────────────────────────────────────── */
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Type,
  Image,
  Square,
} from "lucide-react";
import { ScrollArea } from "@crm/components/ui/scroll-area";
import { Button } from "@crm/components/ui/button";
import { useDocumentStore } from "@/stores/designer/documentStore";
import { useUIStore } from "@/stores/designer/uiStore";
import { FABRIC_CUSTOM_PROPS } from "@/types/designer";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";

interface LayerItem {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  index: number;
}

function getLayerIcon(type: string) {
  if (type.toLowerCase().includes("text") || type.toLowerCase().includes("itext")) {
    return Type;
  }
  if (type.toLowerCase().includes("image")) {
    return Image;
  }
  return Square;
}

export default function LayersPanel() {
  const canvas = useDocumentStore((s) => s.canvas);
  const pushSnapshot = useDocumentStore((s) => s.pushSnapshot);
  const selectedObjectIds = useUIStore((s) => s.selectedObjectIds);
  const [layers, setLayers] = useState<LayerItem[]>([]);

  // Sync layers from canvas
  const refreshLayers = useCallback(() => {
    if (!canvas) return;
    const objects = canvas.getObjects();
    const items: LayerItem[] = objects.map((obj: any, i: number) => ({
      id: obj.id || `layer-${i}`,
      name: obj.customName || obj.type || `Object ${i + 1}`,
      type: obj.type || "unknown",
      visible: obj.visible !== false,
      locked: !!obj.locked,
      index: i,
    }));
    // Reverse so top layer is first in list
    setLayers(items.reverse());
  }, [canvas]);

  useEffect(() => {
    refreshLayers();
    if (!canvas) return;

    const handler = () => refreshLayers();
    canvas.on("object:added", handler);
    canvas.on("object:removed", handler);
    canvas.on("object:modified", handler);

    return () => {
      canvas.off("object:added", handler);
      canvas.off("object:removed", handler);
      canvas.off("object:modified", handler);
    };
  }, [canvas, refreshLayers]);

  const selectLayer = useCallback(
    (layer: LayerItem) => {
      if (!canvas) return;
      const obj = canvas.getObjects().find((o: any) => o.id === layer.id);
      if (obj) {
        canvas.setActiveObject(obj);
        canvas.requestRenderAll();
      }
    },
    [canvas],
  );

  const toggleVisibility = useCallback(
    (layer: LayerItem) => {
      if (!canvas) return;
      const obj = canvas.getObjects().find((o: any) => o.id === layer.id);
      if (obj) {
        obj.set("visible", !obj.visible);
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        refreshLayers();
      }
    },
    [canvas, refreshLayers],
  );

  const toggleLock = useCallback(
    (layer: LayerItem) => {
      if (!canvas) return;
      const obj = canvas.getObjects().find((o: any) => o.id === layer.id) as any;
      if (obj) {
        const isLocked = !obj.locked;
        obj.locked = isLocked;
        obj.selectable = !isLocked;
        obj.evented = !isLocked;
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        refreshLayers();
      }
    },
    [canvas, refreshLayers],
  );

  const deleteLayer = useCallback(
    (layer: LayerItem) => {
      if (!canvas) return;
      const obj = canvas.getObjects().find((o: any) => o.id === layer.id);
      if (obj) {
        canvas.remove(obj);
        canvas.requestRenderAll();
        pushSnapshot(canvas.toJSON([...FABRIC_CUSTOM_PROPS]));
        refreshLayers();
      }
    },
    [canvas, pushSnapshot, refreshLayers],
  );

  const duplicateLayer = useCallback(
    (layer: LayerItem) => {
      if (!canvas) return;
      const obj = canvas.getObjects().find((o: any) => o.id === layer.id);
      if (obj) {
        obj.clone().then((cloned: any) => {
          cloned.set({
            left: (cloned.left || 0) + 20,
            top: (cloned.top || 0) + 20,
            id: nanoid(8),
            customName: `${layer.name} Copy`,
          });
          canvas.add(cloned);
          canvas.setActiveObject(cloned);
          canvas.requestRenderAll();
          pushSnapshot(canvas.toJSON([...FABRIC_CUSTOM_PROPS]));
          refreshLayers();
        });
      }
    },
    [canvas, pushSnapshot, refreshLayers],
  );

  const moveLayer = useCallback(
    (layer: LayerItem, direction: "up" | "down") => {
      if (!canvas) return;
      const obj = canvas.getObjects().find((o: any) => o.id === layer.id);
      if (!obj) return;
      if (direction === "up") {
        canvas.bringObjectForward(obj);
      } else {
        canvas.sendObjectBackwards(obj);
      }
      canvas.requestRenderAll();
      pushSnapshot(canvas.toJSON([...FABRIC_CUSTOM_PROPS]));
      refreshLayers();
    },
    [canvas, pushSnapshot, refreshLayers],
  );

  return (
    <ScrollArea className="h-full">
      <div className="p-3">
        <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          Layers ({layers.length})
        </h3>

        {layers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No objects on canvas
          </p>
        ) : (
          <div className="space-y-1">
            {layers.map((layer) => {
              const Icon = getLayerIcon(layer.type);
              const isSelected = selectedObjectIds.includes(layer.id);

              return (
                <div
                  key={layer.id}
                  className={cn(
                    "group flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer",
                    isSelected
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-accent border border-transparent",
                    !layer.visible && "opacity-50",
                  )}
                  onClick={() => selectLayer(layer)}
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs flex-1 truncate">{layer.name}</span>

                  {/* Actions — visible on hover */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayer(layer, "up");
                      }}
                      className="p-0.5 rounded hover:bg-background"
                      title="Move up"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayer(layer, "down");
                      }}
                      className="p-0.5 rounded hover:bg-background"
                      title="Move down"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVisibility(layer);
                      }}
                      className="p-0.5 rounded hover:bg-background"
                      title={layer.visible ? "Hide" : "Show"}
                    >
                      {layer.visible ? (
                        <Eye className="h-3 w-3" />
                      ) : (
                        <EyeOff className="h-3 w-3" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLock(layer);
                      }}
                      className="p-0.5 rounded hover:bg-background"
                      title={layer.locked ? "Unlock" : "Lock"}
                    >
                      {layer.locked ? (
                        <Lock className="h-3 w-3" />
                      ) : (
                        <Unlock className="h-3 w-3" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateLayer(layer);
                      }}
                      className="p-0.5 rounded hover:bg-background"
                      title="Duplicate"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLayer(layer);
                      }}
                      className="p-0.5 rounded hover:bg-background text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
