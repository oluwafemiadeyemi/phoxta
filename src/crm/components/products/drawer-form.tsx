import { useState, useEffect, useRef, useCallback } from "react";
import { useCreate, useUpdate } from "@refinedev/core";
import { supabaseClient } from "@crm/lib/supabase";
import {
  Package,
  X,
  Image as ImageIcon,
  Upload,
  Loader2,
  Link as LinkIcon,
  Camera,
  DollarSign,
  Boxes,
  Tag,
  FileText,
  Eye,
  EyeOff,
  Sparkles,
  Check,
  AlertCircle,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@crm/components/ui/dialog";
import { Button } from "@crm/components/ui/button";
import { Input } from "@crm/components/ui/input";
import { Label } from "@crm/components/ui/label";
import { Textarea } from "@crm/components/ui/textarea";
import { Switch } from "@crm/components/ui/switch";
import { Badge } from "@crm/components/ui/badge";

import type { IProduct } from "@crm/types/finefoods";

interface ProductDrawerFormProps {
  open: boolean;
  onClose: () => void;
  product: IProduct | null;
}

/* ---------- Image compression utility ---------- */
async function compressImage(file: File, maxWidth = 1200, quality = 0.82): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);

      let w = img.width;
      let h = img.height;

      // Only downscale, never upscale
      if (w > maxWidth) {
        h = Math.round((h * maxWidth) / w);
        w = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }

      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            // If compressed version is larger, keep original
            resolve(file);
            return;
          }
          const ext = file.type === "image/png" ? "png" : "jpg";
          const compressed = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, `.${ext}`),
            { type: blob.type, lastModified: Date.now() }
          );
          resolve(compressed);
        },
        file.type === "image/png" ? "image/png" : "image/jpeg",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); }; // fallback to original
    img.src = url;
  });
}

/* ---------- Component ---------- */

export function ProductDrawerForm({ open, onClose, product }: ProductDrawerFormProps) {
  const isEdit = !!product;

  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [stock, setStock] = useState(product ? String(product.stock) : "");
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
  const [categoryName, setCategoryName] = useState(product?.categoryName ?? "");

  const { mutate: createProduct } = useCreate();
  const { mutate: updateProduct } = useUpdate();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [imageMode, setImageMode] = useState<"upload" | "camera" | "url">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Reset form when product changes
  useEffect(() => {
    setName(product?.name ?? "");
    setDescription(product?.description ?? "");
    setPrice(product ? String(product.price) : "");
    setStock(product ? String(product.stock) : "");
    setIsActive(product?.isActive ?? true);
    setImageUrl(product?.imageUrl ?? "");
    setCategoryName(product?.categoryName ?? "");
    setUploadProgress("");
  }, [product]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setUploadProgress("Only image files are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadProgress("File too large (max 10 MB).");
      return;
    }

    setIsUploading(true);
    setUploadProgress("Optimizing image...");

    try {
      // Compress the image client-side
      const optimized = await compressImage(file);
      const savedBytes = file.size - optimized.size;
      const savedPct = file.size > 0 ? Math.round((savedBytes / file.size) * 100) : 0;

      if (savedBytes > 0) {
        setUploadProgress(`Optimized: ${formatBytes(file.size)} → ${formatBytes(optimized.size)} (${savedPct}% smaller). Uploading...`);
      } else {
        setUploadProgress("Uploading...");
      }

      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ext = optimized.name.split(".").pop() || "jpg";
      const fileName = `${user.id}/products/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabaseClient.storage
        .from("product-images")
        .upload(fileName, optimized, { contentType: optimized.type, upsert: false });

      if (uploadError) {
        // Fallback to public bucket
        const { error: fallbackError } = await supabaseClient.storage
          .from("public")
          .upload(`product-images/${fileName}`, optimized, { contentType: optimized.type, upsert: false });

        if (fallbackError) {
          setUploadProgress("Upload failed. Try pasting a URL instead.");
          setIsUploading(false);
          return;
        }

        const { data: urlData } = supabaseClient.storage
          .from("public")
          .getPublicUrl(`product-images/${fileName}`);
        setImageUrl(urlData.publicUrl);
      } else {
        const { data: urlData } = supabaseClient.storage
          .from("product-images")
          .getPublicUrl(fileName);
        setImageUrl(urlData.publicUrl);
      }
      setUploadProgress("Uploaded successfully!");
      setTimeout(() => setUploadProgress(""), 3000);
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadProgress("Upload failed. You can paste a URL instead.");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleSubmit = () => {
    const values = {
      name,
      description,
      price: parseFloat(price) || 0,
      stock: parseInt(stock) || 0,
      isActive,
      imageUrl: imageUrl || null,
      categoryName,
    };

    setIsSaving(true);

    if (isEdit && product) {
      updateProduct(
        { resource: "products", id: product.id, values },
        {
          onSuccess: () => { setIsSaving(false); onClose(); },
          onError: () => setIsSaving(false),
        }
      );
    } else {
      createProduct(
        { resource: "products", values },
        {
          onSuccess: () => { setIsSaving(false); onClose(); },
          onError: () => setIsSaving(false),
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent showCloseButton={false} className="max-w-2xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                {isEdit ? "Edit Product" : "New Product"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEdit ? "Update product details" : "Add a product to your store"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Active toggle in header */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-background">
              {isActive ? (
                <Eye className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="text-xs font-medium">
                {isActive ? "Visible" : "Hidden"}
              </span>
              <Switch checked={isActive} onCheckedChange={setIsActive} className="scale-75" />
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-0 md:divide-x min-h-0">
            {/* ── Left column: Image ── */}
            <div className="md:col-span-2 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  Product Image
                </Label>
              </div>

              {/* Image preview / upload area */}
              {imageUrl ? (
                <div className="relative group rounded-xl overflow-hidden bg-muted border aspect-square">
                  <img
                    src={imageUrl}
                    alt="Product"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setImageUrl("")}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="relative rounded-xl border-2 border-dashed aspect-square flex flex-col items-center justify-center gap-3 text-muted-foreground cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all duration-200"
                  onClick={() => {
                    if (imageMode === "camera") cameraInputRef.current?.click();
                    else fileInputRef.current?.click();
                  }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.type.startsWith("image/")) {
                      await handleFileUpload(file);
                    }
                  }}
                >
                  {isUploading ? (
                    <>
                      <div className="relative">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      </div>
                      <p className="text-sm font-medium text-primary">Optimizing & uploading...</p>
                    </>
                  ) : (
                    <>
                      <div className="h-14 w-14 rounded-2xl bg-muted/80 flex items-center justify-center">
                        <Upload className="h-6 w-6" />
                      </div>
                      <div className="text-center px-4">
                        <p className="text-sm font-medium">Drop image here or click to upload</p>
                        <p className="text-xs mt-1">PNG, JPG, WebP · Max 10 MB · Auto-optimized</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Upload progress / status */}
              {uploadProgress && (
                <div className={`flex items-start gap-2 rounded-lg p-2.5 text-xs ${uploadProgress.includes("failed") || uploadProgress.includes("too large") || uploadProgress.includes("Only") ? "bg-destructive/10 text-destructive" : uploadProgress.includes("success") ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                  {uploadProgress.includes("success") ? (
                    <Check className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  ) : uploadProgress.includes("failed") || uploadProgress.includes("too large") || uploadProgress.includes("Only") ? (
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  )}
                  <span>{uploadProgress}</span>
                </div>
              )}

              {/* Action buttons row */}
              {!imageUrl && (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => { setImageMode("upload"); fileInputRef.current?.click(); }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-colors ${imageMode === "upload" ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted"}`}
                  >
                    <Upload className="h-4 w-4" />
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => { setImageMode("camera"); cameraInputRef.current?.click(); }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-colors ${imageMode === "camera" ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted"}`}
                  >
                    <Camera className="h-4 w-4" />
                    Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageMode("url")}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-colors ${imageMode === "url" ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted"}`}
                  >
                    <LinkIcon className="h-4 w-4" />
                    URL
                  </button>
                </div>
              )}

              {/* URL input */}
              {imageMode === "url" && !imageUrl && (
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="text-sm"
                />
              )}

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) await handleFileUpload(file);
                  e.target.value = "";
                }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) await handleFileUpload(file);
                  e.target.value = "";
                }}
              />
            </div>

            {/* ── Right column: Details ── */}
            <div className="md:col-span-3 p-5 space-y-5">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-semibold flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  Product Name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Premium Wireless Headphones"
                  className="h-10"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm font-semibold flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your product — features, materials, etc."
                  rows={3}
                  className="resize-none"
                />
                <p className="text-[11px] text-muted-foreground text-right">
                  {description.length}/500
                </p>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label htmlFor="categoryName" className="text-sm font-semibold flex items-center gap-1.5">
                  <Boxes className="h-3.5 w-3.5 text-muted-foreground" />
                  Category
                </Label>
                <Input
                  id="categoryName"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. Electronics, Clothing, Accessories"
                  className="h-10"
                />
              </div>

              {/* Price & Stock — side by side */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="price" className="text-sm font-semibold flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                    Price
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">£</span>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      className="pl-7 h-10"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="stock" className="text-sm font-semibold flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    Stock
                  </Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="0"
                    className="h-10"
                  />
                </div>
              </div>

              {/* Quick summary preview */}
              {name && (
                <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preview</p>
                  <div className="flex items-start gap-3">
                    {imageUrl ? (
                      <img src={imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {price && (
                          <span className="text-sm font-bold text-primary">
                            £{parseFloat(price || "0").toFixed(2)}
                          </span>
                        )}
                        {categoryName && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                            {categoryName}
                          </Badge>
                        )}
                        {stock && (
                          <span className="text-[11px] text-muted-foreground">
                            {stock} in stock
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant={isActive ? "default" : "secondary"} className="text-[10px] shrink-0">
                      {isActive ? "Live" : "Draft"}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30 shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !name.trim()} size="sm" className="gap-1.5 min-w-[140px]">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isEdit ? "Saving..." : "Creating..."}
              </>
            ) : (
              <>
                {isEdit ? (
                  <>
                    <Check className="h-4 w-4" />
                    Save Changes
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4" />
                    Create Product
                  </>
                )}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
