/* ─────────────────────────────────────────────────────────────────────────────
   API: GET  /api/designer/projects/[projectId]  – fetch project + pages
   PATCH     /api/designer/projects/[projectId]  – update project
   DELETE    /api/designer/projects/[projectId]  – soft-delete project
   ───────────────────────────────────────────────────────────────────────────── */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

interface Params {
  params: Promise<{ projectId: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { projectId } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: project, error: projErr } = await supabase
      .from("design_projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projErr) {
      console.error("[designer/project GET]", projErr);
      return NextResponse.json({ error: projErr.message }, { status: 404 });
    }

    const { data: pages } = await supabase
      .from("design_pages")
      .select("*")
      .eq("project_id", projectId)
      .order("page_index", { ascending: true });

    return NextResponse.json({ project, pages: pages || [] });
  } catch (err) {
    console.error("[designer/project GET] unhandled:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { projectId } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const allowed = ["name", "width", "height", "folder_id"];
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    const { data, error } = await supabase
      .from("design_projects")
      .update(updates)
      .eq("id", projectId)
      .select()
      .single();

    if (error) {
      console.error("[designer/project PATCH]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ project: data });
  } catch (err) {
    console.error("[designer/project PATCH] unhandled:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { projectId } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Soft delete
    const { error } = await supabase
      .from("design_projects")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", projectId);

    if (error) {
      console.error("[designer/project DELETE]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[designer/project DELETE] unhandled:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}
