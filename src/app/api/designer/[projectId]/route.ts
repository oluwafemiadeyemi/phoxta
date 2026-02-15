// ===========================================================================
// GET/PATCH/DELETE /api/designer/[projectId]
// ===========================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { logAudit } from '@/lib/designer/audit'

interface Params { params: Promise<{ projectId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { projectId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: project } = await supabase
    .from('design_projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fetch pages
  const { data: pages } = await supabase
    .from('design_pages')
    .select('*')
    .eq('project_id', projectId)
    .order('page_index')

  // Attach signed URLs for each page's fabric JSON and preview
  const pagesWithUrls = await Promise.all(
    (pages ?? []).map(async (p: any) => {
      let fabricUrl: string | null = null
      let previewUrl: string | null = null
      if (p.fabric_json_path) {
        const { data: s } = await supabase.storage
          .from('design-projects')
          .createSignedUrl(p.fabric_json_path, 3600)
        fabricUrl = s?.signedUrl ?? null
      }
      if (p.preview_path) {
        const { data: s } = await supabase.storage
          .from('design-projects')
          .createSignedUrl(p.preview_path, 3600)
        previewUrl = s?.signedUrl ?? null
      }
      return { ...p, fabricUrl, previewUrl }
    })
  )

  // Fetch document
  const { data: doc } = await supabase
    .from('design_documents')
    .select('*')
    .eq('project_id', projectId)
    .single()

  return NextResponse.json({ project, pages: pagesWithUrls, document: doc })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { projectId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.name !== undefined) updates.name = body.name
  if (body.width !== undefined) updates.width = body.width
  if (body.height !== undefined) updates.height = body.height
  if (body.deleted_at !== undefined) updates.deleted_at = body.deleted_at

  const { data, error } = await supabase
    .from('design_projects')
    .update(updates)
    .eq('id', projectId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (body.name !== undefined) {
    await logAudit(supabase, projectId, user.id, 'project.rename', { name: body.name })
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { projectId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Soft delete
  const { error } = await supabase
    .from('design_projects')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit(supabase, projectId, user.id, 'project.delete', {})

  return NextResponse.json({ ok: true })
}
