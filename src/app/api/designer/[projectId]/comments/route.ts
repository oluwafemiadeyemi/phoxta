// ===========================================================================
// GET/POST /api/designer/[projectId]/comments
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

  const { data } = await supabase
    .from('design_comments')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest, { params }: Params) {
  const { projectId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { body, pageId, objectId } = await req.json()
  if (!body?.trim()) return NextResponse.json({ error: 'Empty comment' }, { status: 400 })

  const { data: comment, error } = await supabase
    .from('design_comments')
    .insert({
      project_id: projectId,
      page_id: pageId || null,
      object_id: objectId || null,
      author_id: user.id,
      body: body.trim(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit(supabase, projectId, user.id, 'comment.add', { commentId: comment.id })

  return NextResponse.json(comment, { status: 201 })
}
