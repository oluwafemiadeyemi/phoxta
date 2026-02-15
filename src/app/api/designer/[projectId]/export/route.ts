// ===========================================================================
// POST /api/designer/[projectId]/export – store exported file, return URL
// ===========================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { logAudit } from '@/lib/designer/audit'

interface Params { params: Promise<{ projectId: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { projectId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { dataUrl, format, fileName } = body

  if (!dataUrl || !format) {
    return NextResponse.json({ error: 'Missing dataUrl or format' }, { status: 400 })
  }

  const safeName = (fileName || 'export').replace(/[^a-zA-Z0-9_-]/g, '_')
  const ts = Date.now()
  const ext = format === 'jpg' ? 'jpeg' : format
  const path = `${user.id}/${projectId}/exports/${safeName}_${ts}.${ext}`

  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return NextResponse.json({ error: 'Invalid data URL' }, { status: 400 })

  const buffer = Buffer.from(match[2], 'base64')
  const { error: uploadErr } = await supabase.storage
    .from('design-exports')
    .upload(path, buffer, { contentType: match[1], upsert: false })

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  const { data: signed } = await supabase.storage
    .from('design-exports')
    .createSignedUrl(path, 3600)

  await logAudit(supabase, projectId, user.id, 'project.export', { format, fileName: safeName })

  return NextResponse.json({ url: signed?.signedUrl ?? null, path })
}
