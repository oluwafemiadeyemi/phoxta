/* ─────────────────────────────────────────────────────────────────────────────
   API: POST /api/designer/projects/[projectId]/save
   Saves canvas JSON + preview for a specific page
   ───────────────────────────────────────────────────────────────────────────── */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

interface Params {
  params: Promise<{ projectId: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
  const { projectId } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { pageId, fabricJson, previewDataUrl } = body;

  if (!pageId || !fabricJson) {
    return NextResponse.json({ error: "pageId and fabricJson required" }, { status: 400 });
  }

  const storagePath = `${user.id}/${projectId}/pages/${pageId}.json`;

  // Upload fabric JSON
  const jsonBlob = new Blob([JSON.stringify(fabricJson)], {
    type: "application/json",
  });
  const { error: uploadErr } = await supabase.storage
    .from("design-projects")
    .upload(storagePath, jsonBlob, { upsert: true });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  // Upload preview if provided
  let previewPath: string | null = null;
  if (previewDataUrl) {
    previewPath = `${user.id}/${projectId}/previews/${pageId}.png`;
    const previewResponse = await fetch(previewDataUrl);
    const previewBlob = await previewResponse.blob();
    await supabase.storage
      .from("design-projects")
      .upload(previewPath, previewBlob, {
        upsert: true,
        contentType: "image/png",
      });
  }

  // Update page row
  await supabase
    .from("design_pages")
    .update({
      fabric_json_path: storagePath,
      ...(previewPath ? { preview_path: previewPath } : {}),
    })
    .eq("id", pageId);

  // Bump project updated_at
  await supabase
    .from("design_projects")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", projectId);

  return NextResponse.json({ success: true, storagePath, previewPath });
  } catch (err) {
    console.error("[designer/save POST] unhandled:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}
