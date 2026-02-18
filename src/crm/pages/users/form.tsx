import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { useGetIdentity } from "@refinedev/core";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@crm/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@crm/components/ui/avatar";
import { Button } from "@crm/components/ui/button";
import { Input } from "@crm/components/ui/input";
import { Label } from "@crm/components/ui/label";
import { Slider } from "@crm/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@crm/components/ui/dialog";
import { supabaseClient } from "@crm/lib/supabase";

interface UserFormProps {
  action: "edit" | "create";
  id?: string;
}

export function UserForm({ action }: UserFormProps) {
  const { data: identity } = useGetIdentity() as { data?: { id?: string; name?: string; email?: string } };
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draftImageUrl, setDraftImageUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const resolveAvatarUrl = async (stored: string | null, cacheBuster?: number) => {
    if (!stored) return null;
    if (stored.startsWith("http")) {
      return stored;
    }

    try {
      const { data, error } = await supabaseClient
        .storage
        .from("profile_images")
        .createSignedUrl(stored, 60 * 60);
      if (!error && data?.signedUrl) {
        return cacheBuster ? `${data.signedUrl}&t=${cacheBuster}` : data.signedUrl;
      }
    } catch {
      // ignore and fallback to public URL
    }

    const { data } = supabaseClient.storage.from("profile_images").getPublicUrl(stored);
    if (!data?.publicUrl) return null;
    return cacheBuster ? `${data.publicUrl}?t=${cacheBuster}` : data.publicUrl;
  };

  const extractPathFromUrl = (value: string) => {
    try {
      const url = new URL(value);
      const marker = "/profile_images/";
      const index = url.pathname.indexOf(marker);
      if (index === -1) return null;
      return url.pathname.slice(index + marker.length);
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!identity?.id) return;
    setName(identity?.name || "");
    setEmail(identity?.email || "");

    supabaseClient
      .from("team_members")
      .select("name, email, avatar_url")
      .eq("user_id", identity.id)
      .limit(1)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data) return;
        setName(data.name || identity?.name || "");
        setEmail(data.email || identity?.email || "");
        const storedAvatar = data.avatar_url || null;
        let resolvedPath = storedAvatar;
        if (storedAvatar && storedAvatar.startsWith("http")) {
          const extracted = extractPathFromUrl(storedAvatar);
          if (extracted) {
            resolvedPath = extracted;
          }
        }
        setAvatarPath(resolvedPath);
        const resolvedUrl = await resolveAvatarUrl(resolvedPath || storedAvatar);
        setAvatarUrl(resolvedUrl);
      });
  }, [identity?.id]);

  const uploadAvatarFile = async (file: File) => {
    if (!identity?.id) return { ok: false };
    setIsUploading(true);
    try {
      const cacheBuster = Date.now();
      const path = `avatars/${identity.id}.png`;
      const { error } = await supabaseClient.storage.from("profile_images").upload(path, file, {
        upsert: true,
        contentType: file.type || "image/png",
      });
      if (error) throw error;

      const resolvedUrl = await resolveAvatarUrl(path, cacheBuster);
      setAvatarPath(path);
      setAvatarUrl(resolvedUrl);
      return { ok: true, path, url: resolvedUrl };
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      return { ok: false, reason: (error as { message?: string })?.message };
    } finally {
      setIsUploading(false);
    }
  };

  const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (draftImageUrl) {
      URL.revokeObjectURL(draftImageUrl);
    }
    setDraftImageUrl(url);
    setZoom(1.1);
    setOffsetX(0);
    setOffsetY(0);
    setIsDialogOpen(true);
    event.target.value = "";
  };

  const createCroppedBlob = async (): Promise<Blob | null> => {
    if (!draftImageUrl) return null;
    const image = new Image();
    image.src = draftImageUrl;
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });

    const canvasSize = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const scaledWidth = image.width * zoom;
    const scaledHeight = image.height * zoom;
    const x = (canvasSize - scaledWidth) / 2 + (offsetX / 100) * canvasSize;
    const y = (canvasSize - scaledHeight) / 2 + (offsetY / 100) * canvasSize;

    ctx.clearRect(0, 0, canvasSize, canvasSize);
    ctx.drawImage(image, x, y, scaledWidth, scaledHeight);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png", 0.92);
    });
  };

  const handleAvatarSave = async () => {
    const blob = await createCroppedBlob();
    if (!blob) return;
    const file = new File([blob], "avatar.png", { type: "image/png" });
    const uploadResult = await uploadAvatarFile(file);
    let fallbackDataUrl: string | null = null;
    if (!uploadResult.ok) {
      fallbackDataUrl = await blobToDataUrl(blob);
      setAvatarPath(null);
      setAvatarUrl(fallbackDataUrl);
    }

    if (identity?.id) {
      await supabaseClient
        .from("team_members")
        .upsert(
          {
            user_id: identity.id,
            name: name || identity?.name || "User",
            email: email || identity?.email || "",
            avatar_url: uploadResult.ok ? uploadResult.path : fallbackDataUrl,
          },
          { onConflict: "user_id" },
        );
    }
    setIsDialogOpen(false);
  };

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open && draftImageUrl) {
      URL.revokeObjectURL(draftImageUrl);
      setDraftImageUrl(null);
    }
  };

  const handleSave = async () => {
    if (!identity?.id || action !== "edit") return;
    setIsSaving(true);
    try {
      await supabaseClient
        .from("team_members")
        .upsert(
          {
            user_id: identity.id,
            name: name || identity?.name || "User",
            email: email || identity?.email || "",
            avatar_url: avatarPath || avatarUrl,
          },
          { onConflict: "user_id" },
        );
    } catch (error) {
      console.error("Failed to save profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const initials = (name || email || "U").slice(0, 1).toUpperCase();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your profile picture and details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarUrl || undefined} alt={name || "User"} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Label htmlFor="profile-avatar">Profile photo</Label>
              <input
                ref={fileInputRef}
                id="profile-avatar"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Upload photo
                </Button>
                {avatarUrl && (
                  <Button type="button" variant="ghost" onClick={() => fileInputRef.current?.click()}>
                    Adjust photo
                  </Button>
                )}
              </div>
              {isUploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Name</Label>
              <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input id="profile-email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save profile"}
          </Button>
        </CardContent>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adjust profile photo</DialogTitle>
            <DialogDescription>Zoom and reposition your image before saving.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 md:grid-cols-[240px,1fr]">
            <div className="flex items-center justify-center">
              <div className="h-56 w-56 overflow-hidden rounded-full border bg-muted">
                {draftImageUrl ? (
                  <img
                    src={draftImageUrl}
                    alt="Profile preview"
                    className="h-full w-full object-cover"
                    style={{
                      transform: `translate(${offsetX}%, ${offsetY}%) scale(${zoom})`,
                      transformOrigin: "center",
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                    Select an image
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Zoom</Label>
                <Slider value={[zoom]} min={1} max={2.5} step={0.05} onValueChange={([value]) => setZoom(value)} />
              </div>
              <div className="space-y-2">
                <Label>Horizontal position</Label>
                <Slider value={[offsetX]} min={-50} max={50} step={1} onValueChange={([value]) => setOffsetX(value)} />
              </div>
              <div className="space-y-2">
                <Label>Vertical position</Label>
                <Slider value={[offsetY]} min={-50} max={50} step={1} onValueChange={([value]) => setOffsetY(value)} />
              </div>
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setZoom(1.1);
                    setOffsetX(0);
                    setOffsetY(0);
                  }}
                >
                  Reset adjustments
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleDialogChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleAvatarSave} disabled={!draftImageUrl || isUploading}>
              {isUploading ? "Saving..." : "Save photo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
