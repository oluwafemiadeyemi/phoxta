// ===========================================================================
// GET /api/designer/[projectId]/versions – list versions
// POST /api/designer/[projectId]/versions – create a version snapshot
// ===========================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { logAudit } from '@/lib/designer/audit'
import { v4 as uuid } from 'uuid'

interface Params { params: Promise<{ projectId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { projectId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('design_versions')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Attach signed preview URLs
  const versions = await Promise.all(
    (data ?? []).map(async (v: any) => {
      const previewUrls: string[] = []
      for (const pp of v.preview_paths ?? []) {
        const { data: s } = await supabase.storage
          .from('design-projects')
          .createSignedUrl(pp, 3600)
        if (s?.signedUrl) previewUrls.push(s.signedUrl)
      }
      return { ...v, previewUrls }
    })
  )

  return NextResponse.json(versions)
}

export async function POST(req: NextRequest, { params }: Params) {
  const { projectId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { documentJson, previewDataUrls, label } = body

  if (!documentJson) {
    return NextResponse.json({ error: 'Missing documentJson' }, { status: 400 })
  }

  const versionId = uuid()
  const ts = Date.now()
  const basePath = `${user.id}/${projectId}/versions/${ts}`

  // Upload document JSON
  const docPath = `${basePath}/document.json`
  const jsonBlob = new Blob([JSON.stringify(documentJson)], { type: 'application/json' })
  await supabase.storage.from('design-projects').upload(docPath, jsonBlob, {
    contentType: 'application/json',
    upsert: true,
  })

  // Upload preview PNGs
  const previewPaths: string[] = []
  if (Array.isArray(previewDataUrls)) {
    for (let i = 0; i < previewDataUrls.length; i++) {
      const match = previewDataUrls[i].match(/^data:([^;]+);base64,(.+)$/)
      if (match) {
        const pp = `${basePath}/preview_${i}.png`
        const buffer = Buffer.from(match[2], 'base64')
        await supabase.storage.from('design-projects').upload(pp, buffer, {
          contentType: 'image/png',
          upsert: true,
        })
        previewPaths.push(pp)
      }
    }
  }

  const { data: version, error } = await supabase
    .from('design_versions')
    .insert({
      id: versionId,
      project_id: projectId,
      created_by: user.id,
      label: label || null,
      document_json_path: docPath,
      preview_paths: previewPaths,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update document's current version
  await supabase.from('design_documents').update({ current_version_id: versionId }).eq('project_id', projectId)

  await logAudit(supabase, projectId, user.id, 'version.create', { versionId, label })

  return NextResponse.json(version, { status: 201 })
}
