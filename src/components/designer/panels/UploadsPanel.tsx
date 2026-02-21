/* ─────────────────────────────────────────────────────────────────────────────
   Designer – Uploads Panel
   Upload images from the user's device and add them to the canvas
   ───────────────────────────────────────────────────────────────────────────── */
"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@crm/components/ui/button";
import { ScrollArea } from "@crm/components/ui/scroll-area";
import { useDocumentStore } from "@/stores/designer/documentStore";
import { nanoid } from "nanoid";

interface UploadedImage {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
}

export default function UploadsPanel() {
  const [uploads, setUploads] = useState<UploadedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvas = useDocumentStore((s) => s.canvas);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      setIsLoading(true);
      const newUploads: UploadedImage[] = [];

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;

        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        const dims = await new Promise<{ width: number; height: number }>(
          (resolve) => {
            const img = new Image();
            img.onload = () =>
              resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.src = dataUrl;
          },
        );

        newUploads.push({
          id: nanoid(8),
          name: file.name,
          dataUrl,
          width: dims.width,
          height: dims.height,
        });
      }

      setUploads((prev) => [...newUploads, ...prev]);
      setIsLoading(false);
      // Reset input
      if (inputRef.current) inputRef.current.value = "";
    },
    [],
  );

  const addToCanvas = useCallback(
    async (img: UploadedImage) => {
      if (!canvas) return;
      const fabric = await import("fabric");

      fabric.FabricImage.fromURL(img.dataUrl, {
        crossOrigin: "anonymous",
      }).then((fabricImg) => {
        // Scale to fit within canvas
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
          customName: img.name,
        } as any);

        canvas.add(fabricImg);
        canvas.setActiveObject(fabricImg);
        canvas.requestRenderAll();
      });
    },
    [canvas],
  );

  const removeUpload = useCallback((id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Upload button */}
      <div className="p-3 border-b">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          onClick={() => inputRef.current?.click()}
          className="w-full gap-2"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Upload Images
        </Button>
      </div>

      {/* Upload grid */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {uploads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ImagePlus className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Upload images to add to your design
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports PNG, JPG, SVG, WebP
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {uploads.map((img) => (
                <div
                  key={img.id}
                  className="group relative rounded-lg border overflow-hidden bg-muted cursor-pointer hover:border-primary transition-colors"
                  onClick={() => addToCanvas(img)}
                >
                  <img
                    src={img.dataUrl}
                    alt={img.name}
                    className="w-full aspect-square object-cover"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeUpload(img.id);
                    }}
                    className="absolute top-1 right-1 p-1 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <p className="text-[10px] truncate p-1.5">{img.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
