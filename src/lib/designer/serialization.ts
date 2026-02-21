/* ─────────────────────────────────────────────────────────────────────────────
   Designer – Serialisation helpers
   Saving / loading Fabric canvas JSON to Supabase Storage
   ───────────────────────────────────────────────────────────────────────────── */

import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import { FABRIC_CUSTOM_PROPS } from "@/types/designer";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricCanvas = any;

const BUCKET = "design-projects";

/**
 * Save the current canvas JSON to Supabase Storage.
 * Path convention: `{userId}/{projectId}/pages/{pageId}.json`
 */
export async function saveFabricJson(
  canvas: FabricCanvas,
  userId: string,
  projectId: string,
  pageId: string,
): Promise<string> {
  const supabase = createBrowserSupabaseClient();
  const json = canvas.toJSON([...FABRIC_CUSTOM_PROPS]);
  const blob = new Blob([JSON.stringify(json)], { type: "application/json" });
  const path = `${userId}/${projectId}/pages/${pageId}.json`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: true });

  if (error) throw new Error(`Failed to save canvas: ${error.message}`);
  return path;
}

/**
 * Load Fabric JSON from storage and apply it to the canvas.
 */
export async function loadFabricJson(
  canvas: FabricCanvas,
  storagePath: string,
): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(storagePath);

  if (error) throw new Error(`Failed to load canvas: ${error.message}`);
  const text = await data.text();
  const json = JSON.parse(text);

  await canvas.loadFromJSON(json);
  canvas.requestRenderAll();
}

/**
 * Save a preview thumbnail to storage.
 * Returns the storage path.
 */
export async function savePreview(
  canvas: FabricCanvas,
  userId: string,
  projectId: string,
  pageId: string,
): Promise<string> {
  const supabase = createBrowserSupabaseClient();
  const dataUrl = canvas.toDataURL({
    format: "png",
    quality: 0.8,
    multiplier: 0.25, // quarter-size preview
  });

  const blob = await (await fetch(dataUrl)).blob();
  const path = `${userId}/${projectId}/previews/${pageId}.png`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: true, contentType: "image/png" });

  if (error) throw new Error(`Failed to save preview: ${error.message}`);
  return path;
}

/**
 * Get a signed URL for a storage path.
 */
export async function getSignedUrl(
  storagePath: string,
  expiresIn = 3600,
): Promise<string> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error) throw new Error(`Failed to get signed URL: ${error.message}`);
  return data.signedUrl;
}
