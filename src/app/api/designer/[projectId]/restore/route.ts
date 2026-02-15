// ===========================================================================
// POST /api/designer/[projectId]/restore – restore a soft-deleted project
// ===========================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { logAudit } from '@/lib/designer/audit'

interface Params { params: Promise<{ projectId: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const { projectId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('design_projects')
    .update({ deleted_at: null, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit(supabase, projectId, user.id, 'project.restore', {})

  return NextResponse.json({ ok: true })
}
