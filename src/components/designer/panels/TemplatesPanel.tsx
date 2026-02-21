/* ─────────────────────────────────────────────────────────────────────────────
   Designer – Templates Panel
   Shows built-in templates grouped by category; clicking applies to canvas.
   Renders actual Fabric.js thumbnails for each template.
   ───────────────────────────────────────────────────────────────────────────── */
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Search } from "lucide-react";
import { Input } from "@crm/components/ui/input";
import { Badge } from "@crm/components/ui/badge";
import { useDocumentStore } from "@/stores/designer/documentStore";
import {
  BUILTIN_TEMPLATES,
  TEMPLATE_CATEGORIES,
} from "@/lib/designer/templates";
import { CANVAS_PRESETS } from "@/types/designer";
import type { BuiltinTemplate, TemplateCategory } from "@/types/designer";

/* ── Thumbnail renderer component ───────────────────────────────────────── */
function TemplateThumbnail({ template }: { template: BuiltinTemplate }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const fabric = await import("fabric");
        const preset = CANVAS_PRESETS[template.presetKey];
        if (!preset) return;

        // Render at a small size for the thumbnail
        const thumbWidth = 280;
        const scale = thumbWidth / preset.width;
        const thumbHeight = Math.round(preset.height * scale);

        // Create an offscreen canvas element (not attached to DOM)
        const offscreenEl = document.createElement("canvas");
        offscreenEl.width = thumbWidth;
        offscreenEl.height = thumbHeight;

        const staticCanvas = new fabric.StaticCanvas(offscreenEl, {
          width: thumbWidth,
          height: thumbHeight,
        });

        // Apply the scale so all objects fit the thumbnail
        staticCanvas.setZoom(scale);

        await staticCanvas.loadFromJSON(template.fabricJson);
        if (cancelled) {
          staticCanvas.dispose();
          return;
        }
        staticCanvas.requestRenderAll();

        // Small delay to let rendering complete
        await new Promise((r) => requestAnimationFrame(r));
        if (cancelled) {
          staticCanvas.dispose();
          return;
        }

        try {
          const url = staticCanvas.toDataURL({
            format: "png",
            quality: 0.85,
            multiplier: 1,
          });
          setDataUrl(url);
        } catch {
          // ignore — canvas may have been disposed
        }
        staticCanvas.dispose();
      } catch {
        // Fabric failed to load — ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [template]);

  const preset = CANVAS_PRESETS[template.presetKey];
  const aspect = preset ? preset.width / preset.height : 1;

  return (
    <>
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={template.name}
          className="w-full object-cover"
          style={{ aspectRatio: aspect }}
          draggable={false}
        />
      ) : (
        <div
          className="w-full animate-pulse"
          style={{
            aspectRatio: aspect,
            backgroundColor:
              (template.fabricJson as any)?.background || "#f1f5f9",
          }}
        />
      )}
    </>
  );
}

/* ── Main panel ─────────────────────────────────────────────────────────── */
export default function TemplatesPanel() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<TemplateCategory | null>(null);

  const canvas = useDocumentStore((s) => s.canvas);
  const project = useDocumentStore((s) => s.project);
  const setProject = useDocumentStore((s) => s.setProject);
  const pushSnapshot = useDocumentStore((s) => s.pushSnapshot);
  const markDirty = useDocumentStore((s) => s.markDirty);

  const filtered = useMemo(() => {
    let list = BUILTIN_TEMPLATES;
    if (selectedCategory) {
      list = list.filter((t) => t.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q),
      );
    }
    return list;
  }, [search, selectedCategory]);

  const handleApply = useCallback(
    (template: BuiltinTemplate) => {
      if (!canvas) {
        console.warn("[TemplatesPanel] canvas is null — cannot apply template");
        return;
      }

      const preset = CANVAS_PRESETS[template.presetKey];
      if (!preset) {
        console.warn("[TemplatesPanel] preset not found:", template.presetKey);
        return;
      }

      // 1) Update project dimensions in store FIRST — this triggers the
      //    CanvasStage effect that re-centres the viewport for the new size.
      if (project) {
        setProject({ ...project, width: preset.width, height: preset.height });
      }

      // Deep clone the template JSON so loadFromJSON gets a fresh copy
      const jsonClone = JSON.parse(JSON.stringify(template.fabricJson));

      // 2) Load the template JSON onto the canvas
      canvas
        .loadFromJSON(jsonClone)
        .then(() => {
          canvas.requestRenderAll();
          pushSnapshot(
            canvas.toJSON([
              "id",
              "customName",
              "selectable",
              "visible",
              "groupId",
              "locked",
            ]),
          );
          markDirty();
        })
        .catch((err: unknown) =>
          console.error("[TemplatesPanel] loadFromJSON failed:", err),
        );
    },
    [canvas, project, setProject, pushSnapshot, markDirty],
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Search */}
      <div className="p-3 border-b shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-1.5 p-3 border-b shrink-0">
        <Badge
          variant={selectedCategory === null ? "default" : "outline"}
          className="cursor-pointer text-xs"
          onClick={() => setSelectedCategory(null)}
        >
          All
        </Badge>
        {TEMPLATE_CATEGORIES.map((cat) => (
          <Badge
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() =>
              setSelectedCategory(selectedCategory === cat ? null : cat)
            }
          >
            {cat}
          </Badge>
        ))}
      </div>

      {/* Template grid — scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-2 gap-2 p-3">
          {filtered.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => handleApply(tpl)}
              className="group relative rounded-lg border bg-card hover:border-primary hover:shadow-md transition-all overflow-hidden text-left"
            >
              <TemplateThumbnail template={tpl} />
              <div className="p-2">
                <p className="text-xs font-medium truncate">{tpl.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {tpl.category}
                </p>
              </div>
            </button>
          ))}

          {filtered.length === 0 && (
            <p className="col-span-2 text-center text-sm text-muted-foreground py-8">
              No templates found
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
