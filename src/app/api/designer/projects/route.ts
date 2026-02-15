// ===========================================================================
// GET /api/designer/projects – list user's projects (non-deleted)
// POST /api/designer/projects – create a new project
// ===========================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { logAudit } from '@/lib/designer/audit'
import { v4 as uuid } from 'uuid'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const showTrashed = url.searchParams.get('status') === 'trashed'

  let query = supabase
    .from('design_projects')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (showTrashed) {
    query = query.not('deleted_at', 'is', null)
  } else {
    query = query.is('deleted_at', null)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Attach signed preview URLs
  const projects = await Promise.all(
    (data ?? []).map(async (p: any) => {
      let preview_url: string | null = null
      const previewPath = `${user.id}/${p.id}/preview.png`
      const { data: signed } = await supabase.storage
        .from('design-projects')
        .createSignedUrl(previewPath, 3600)
      if (signed?.signedUrl) preview_url = signed.signedUrl
      return { ...p, preview_url }
    })
  )

  return NextResponse.json(projects)
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, width, height, is_template, template_source_id } = body

  if (!width || !height || width < 100 || height < 100 || width > 10000 || height > 10000) {
    return NextResponse.json({ error: 'Invalid dimensions' }, { status: 400 })
  }

  const projectId = uuid()

  // Create project
  const { data: project, error } = await supabase
    .from('design_projects')
    .insert({
      id: projectId,
      user_id: user.id,
      name: name || 'Untitled Design',
      width,
      height,
      is_template: is_template ?? false,
      template_source_id: template_source_id ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Create document
  await supabase.from('design_documents').insert({
    project_id: projectId,
    pages_count: 1,
    meta: {},
  })

  // Create first page
  const pageId = uuid()
  await supabase.from('design_pages').insert({
    id: pageId,
    project_id: projectId,
    page_index: 0,
    width,
    height,
    background: { type: 'color', value: '#ffffff' },
  })

  await logAudit(supabase, projectId, user.id, 'project.create', { name })

  return NextResponse.json({ ...project, firstPageId: pageId }, { status: 201 })
}
