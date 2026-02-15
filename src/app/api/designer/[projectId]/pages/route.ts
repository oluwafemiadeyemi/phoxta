// ===========================================================================
// POST /api/designer/[projectId]/pages – add a new page
// PATCH /api/designer/[projectId]/pages – reorder / update pages
// DELETE /api/designer/[projectId]/pages?pageId=xxx – remove a page
// ===========================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { v4 as uuid } from 'uuid'

interface Params { params: Promise<{ projectId: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { projectId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { width, height, page_index, background, duplicateFromPageId } = body

  const pageId = uuid()

  // If duplicating — copy fabric JSON
  let fabricJsonPath: string | null = null
  if (duplicateFromPageId) {
    const { data: srcPage } = await supabase
      .from('design_pages')
      .select('fabric_json_path')
      .eq('id', duplicateFromPageId)
      .single()
    if (srcPage?.fabric_json_path) {
      const newPath = `${user.id}/${projectId}/pages/${pageId}/canvas.json`
      await supabase.storage.from('design-projects').copy(srcPage.fabric_json_path, newPath)
      fabricJsonPath = newPath
    }
  }

  const { data: page, error } = await supabase
    .from('design_pages')
    .insert({
      id: pageId,
      project_id: projectId,
      page_index: page_index ?? 0,
      width: width ?? 1080,
      height: height ?? 1080,
      background: background ?? { type: 'color', value: '#ffffff' },
      fabric_json_path: fabricJsonPath,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update page count
  const { count } = await supabase
    .from('design_pages')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
  await supabase.from('design_documents').update({ pages_count: count ?? 1 }).eq('project_id', projectId)

  return NextResponse.json(page, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { projectId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pageId = req.nextUrl.searchParams.get('pageId')
  if (!pageId) return NextResponse.json({ error: 'Missing pageId' }, { status: 400 })

  await supabase.from('design_pages').delete().eq('id', pageId)

  // Re-index remaining pages
  const { data: remaining } = await supabase
    .from('design_pages')
    .select('id')
    .eq('project_id', projectId)
    .order('page_index')

  for (let i = 0; i < (remaining ?? []).length; i++) {
    await supabase.from('design_pages').update({ page_index: i }).eq('id', remaining![i].id)
  }

  // Update page count
  await supabase
    .from('design_documents')
    .update({ pages_count: (remaining ?? []).length })
    .eq('project_id', projectId)

  return NextResponse.json({ ok: true })
}
