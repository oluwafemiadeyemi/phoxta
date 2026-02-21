/* ─────────────────────────────────────────────────────────────────────────────
   Designer – Export Modal
   Export canvas as PNG, JPG, SVG, or PDF
   ───────────────────────────────────────────────────────────────────────────── */
"use client";

import { useState, useCallback } from "react";
import { Download, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@crm/components/ui/dialog";
import { Button } from "@crm/components/ui/button";
import { Label } from "@crm/components/ui/label";
import { Input } from "@crm/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/components/ui/select";
import { Slider } from "@crm/components/ui/slider";
import { useDocumentStore } from "@/stores/designer/documentStore";
import { useUIStore } from "@/stores/designer/uiStore";
import type { ExportFormat } from "@/types/designer";

export default function ExportModal() {
  const open = useUIStore((s) => s.exportModalOpen);
  const setOpen = useUIStore((s) => s.setExportModalOpen);
  const canvas = useDocumentStore((s) => s.canvas);
  const project = useDocumentStore((s) => s.project);

  const [format, setFormat] = useState<ExportFormat>("png");
  const [quality, setQuality] = useState(90);
  const [scale, setScale] = useState(1);
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!canvas) return;
    setExporting(true);

    try {
      // Temporarily reset zoom for export
      const currentZoom = canvas.getZoom();
      canvas.setZoom(1);
      canvas.requestRenderAll();

      const fileName =
        (project?.name || "design").replace(/[^a-zA-Z0-9_-]/g, "_") +
        `.${format}`;

      if (format === "svg") {
        const svg = canvas.toSVG();
        const blob = new Blob([svg], { type: "image/svg+xml" });
        downloadBlob(blob, fileName);
      } else if (format === "pdf") {
        // Use jsPDF for PDF export
        const { default: jsPDF } = await import("jspdf");
        const w = canvas.getWidth();
        const h = canvas.getHeight();
        const orientation = w > h ? "landscape" : "portrait";
        const pdf = new jsPDF({
          orientation,
          unit: "px",
          format: [w * scale, h * scale],
        });

        const dataUrl = canvas.toDataURL({
          format: "png",
          multiplier: scale,
        });
        pdf.addImage(dataUrl, "PNG", 0, 0, w * scale, h * scale);
        pdf.save(fileName);
      } else {
        const dataUrl = canvas.toDataURL({
          format: format === "jpg" ? "jpeg" : "png",
          quality: quality / 100,
          multiplier: scale,
        });
        const blob = await (await fetch(dataUrl)).blob();
        downloadBlob(blob, fileName);
      }

      // Restore zoom
      canvas.setZoom(currentZoom);
      canvas.requestRenderAll();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [canvas, format, quality, scale, project]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Design</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Format */}
          <div className="space-y-1.5">
            <Label className="text-xs">Format</Label>
            <Select
              value={format}
              onValueChange={(v: ExportFormat) => setFormat(v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png">PNG (transparent)</SelectItem>
                <SelectItem value="jpg">JPG</SelectItem>
                <SelectItem value="svg">SVG (vector)</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quality (JPG only) */}
          {format === "jpg" && (
            <div className="space-y-1.5">
              <Label className="text-xs">
                Quality: {quality}%
              </Label>
              <Slider
                min={10}
                max={100}
                step={5}
                value={[quality]}
                onValueChange={([v]) => setQuality(v)}
              />
            </div>
          )}

          {/* Scale */}
          <div className="space-y-1.5">
            <Label className="text-xs">Scale: {scale}x</Label>
            <Select
              value={String(scale)}
              onValueChange={(v) => setScale(Number(v))}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">0.5x (Half)</SelectItem>
                <SelectItem value="1">1x (Original)</SelectItem>
                <SelectItem value="2">2x (Double)</SelectItem>
                <SelectItem value="3">3x (Triple)</SelectItem>
                <SelectItem value="4">4x (Ultra)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Export size preview */}
          {canvas && (
            <p className="text-xs text-muted-foreground">
              Output: {Math.round(canvas.getWidth() * scale)} ×{" "}
              {Math.round(canvas.getHeight() * scale)} px
            </p>
          )}

          <Button
            onClick={handleExport}
            disabled={exporting}
            className="w-full gap-2"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {exporting ? "Exporting…" : "Download"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
