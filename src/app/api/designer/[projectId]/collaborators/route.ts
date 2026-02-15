// ===========================================================================
// GET/POST /api/designer/[projectId]/collaborators
// DELETE /api/designer/[projectId]/collaborators?userId=xxx
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
    .from('design_collaborators')
    .select('*')
    .eq('project_id', projectId)

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest, { params }: Params) {
  const { projectId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify project ownership
  const { data: project } = await supabase
    .from('design_projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()
  if (!project) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, role } = await req.json()
  if (!email || !role) {
    return NextResponse.json({ error: 'Missing email or role' }, { status: 400 })
  }

  // Find user by email (using admin/service for lookup)
  const { createServiceRoleClient } = await import('@/lib/supabaseServer')
  const admin = createServiceRoleClient()
  const { data: users } = await admin.auth.admin.listUsers()
  const target = users?.users?.find((u: any) => u.email === email)
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { error } = await supabase
    .from('design_collaborators')
    .upsert({ project_id: projectId, user_id: target.id, role })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit(supabase, projectId, user.id, 'project.share', { email, role })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { projectId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  await supabase
    .from('design_collaborators')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId)

  return NextResponse.json({ ok: true })
}
