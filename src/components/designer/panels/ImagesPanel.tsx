/* ─────────────────────────────────────────────────────────────────────────────
   Designer – Images Panel (stock photos placeholder via Pexels)
   ───────────────────────────────────────────────────────────────────────────── */
"use client";

import { useState, useCallback } from "react";
import { Search, ImagePlus, Loader2 } from "lucide-react";
import { Input } from "@crm/components/ui/input";
import { ScrollArea } from "@crm/components/ui/scroll-area";
import { useDocumentStore } from "@/stores/designer/documentStore";
import { nanoid } from "nanoid";

interface StockImage {
  id: string;
  src: string;
  thumb: string;
  alt: string;
  photographer: string;
}

export default function ImagesPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockImage[]>([]);
  const [loading, setLoading] = useState(false);
  const canvas = useDocumentStore((s) => s.canvas);

  const searchImages = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/designer/pexels-search?q=${encodeURIComponent(query)}&per_page=20`,
      );
      if (res.ok) {
        const data = await res.json();
        setResults(
          (data.photos || []).map((p: any) => ({
            id: String(p.id),
            src: p.src?.large || p.src?.medium,
            thumb: p.src?.tiny || p.src?.small,
            alt: p.alt || query,
            photographer: p.photographer || "",
          })),
        );
      }
    } catch {
      // Silently fail for now
    } finally {
      setLoading(false);
    }
  }, [query]);

  const addToCanvas = useCallback(
    async (img: StockImage) => {
      if (!canvas) return;
      const fabric = await import("fabric");

      fabric.FabricImage.fromURL(img.src, {
        crossOrigin: "anonymous",
      }).then((fabricImg) => {
        const canvasWidth = canvas.getWidth();
        const canvasHeight = canvas.getHeight();
        const scale = Math.min(
          (canvasWidth * 0.6) / fabricImg.width!,
          (canvasHeight * 0.6) / fabricImg.height!,
          1,
        );
        fabricImg.set({
          left: canvasWidth / 2,
          top: canvasHeight / 2,
          originX: "center",
          originY: "center",
          scaleX: scale,
          scaleY: scale,
          id: nanoid(8),
          customName: img.alt,
        } as any);

        canvas.add(fabricImg);
        canvas.setActiveObject(fabricImg);
        canvas.requestRenderAll();
      });
    },
    [canvas],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            searchImages();
          }}
          className="relative"
        >
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search free images…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </form>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          Powered by Pexels
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ImagePlus className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Search for free stock images
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {results.map((img) => (
                <button
                  key={img.id}
                  onClick={() => addToCanvas(img)}
                  className="group relative rounded-lg overflow-hidden border hover:border-primary transition-colors"
                >
                  <img
                    src={img.thumb}
                    alt={img.alt}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[9px] text-white truncate">
                      {img.photographer}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
