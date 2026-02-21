/* ─────────────────────────────────────────────────────────────────────────────
   API: GET /api/designer/projects
   Lists design projects for the authenticated user
   POST /api/designer/projects
   Creates a new design project
   ───────────────────────────────────────────────────────────────────────────── */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || "50");
    const offset = Number(searchParams.get("offset") || "0");
    const includeDeleted = searchParams.get("deleted") === "true";

    let query = supabase
      .from("design_projects")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (!includeDeleted) {
      query = query.is("deleted_at", null);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[designer/projects GET]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ projects: data ?? [] });
  } catch (err) {
    console.error("[designer/projects GET] unhandled:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, width, height, is_template, template_source_id } = body;

    // 1) Create project
    const { data: project, error: projErr } = await supabase
      .from("design_projects")
      .insert({
        user_id: user.id,
        name: name || "Untitled Design",
        width: width || 1080,
        height: height || 1080,
        is_template: is_template || false,
        template_source_id: template_source_id || null,
      })
      .select()
      .single();

    if (projErr) {
      console.error("[designer/projects POST] project insert:", projErr);
      return NextResponse.json({ error: projErr.message }, { status: 500 });
    }

    // 2) Create document
    const { error: docErr } = await supabase.from("design_documents").insert({
      project_id: project.id,
      pages_count: 1,
    });
    if (docErr) console.error("[designer/projects POST] document insert:", docErr);

    // 3) Create first page
    const { data: page, error: pageErr } = await supabase
      .from("design_pages")
      .insert({
        project_id: project.id,
        page_index: 0,
        width: project.width,
        height: project.height,
      })
      .select()
      .single();
    if (pageErr) console.error("[designer/projects POST] page insert:", pageErr);

    return NextResponse.json({ project, page }, { status: 201 });
  } catch (err) {
    console.error("[designer/projects POST] unhandled:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}
