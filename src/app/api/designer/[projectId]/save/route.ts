// ===========================================================================
// POST /api/designer/[projectId]/save – save canvas JSON + preview per page
// ===========================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'

interface Params { params: Promise<{ projectId: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { projectId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership
  const { data: project } = await supabase
    .from('design_projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { pageId, canvasJson, previewDataUrl, name } = body

  if (!pageId || !canvasJson) {
    return NextResponse.json({ error: 'Missing pageId or canvasJson' }, { status: 400 })
  }

  const basePath = `${user.id}/${projectId}`

  // Upload canvas JSON
  const jsonPath = `${basePath}/pages/${pageId}/canvas.json`
  const jsonBlob = new Blob([JSON.stringify(canvasJson)], { type: 'application/json' })
  await supabase.storage.from('design-projects').upload(jsonPath, jsonBlob, {
    contentType: 'application/json',
    upsert: true,
  })

  // Upload preview PNG
  let previewPath: string | null = null
  if (previewDataUrl) {
    previewPath = `${basePath}/pages/${pageId}/preview.png`
    const match = previewDataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (match) {
      const buffer = Buffer.from(match[2], 'base64')
      await supabase.storage.from('design-projects').upload(previewPath, buffer, {
        contentType: 'image/png',
        upsert: true,
      })
    }
  }

  // Also upload project-level preview (from first page)
  const projectPreviewPath = `${basePath}/preview.png`
  if (previewDataUrl) {
    const match = previewDataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (match) {
      const buffer = Buffer.from(match[2], 'base64')
      await supabase.storage.from('design-projects').upload(projectPreviewPath, buffer, {
        contentType: 'image/png',
        upsert: true,
      })
    }
  }

  // Update page record
  await supabase
    .from('design_pages')
    .update({
      fabric_json_path: jsonPath,
      preview_path: previewPath,
    })
    .eq('id', pageId)

  // Update project timestamp, name, and preview_url if provided
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (name) updates.name = name

  // Generate a signed URL for the project preview and store it
  if (previewDataUrl) {
    const { data: signedData } = await supabase.storage
      .from('design-projects')
      .createSignedUrl(projectPreviewPath, 60 * 60 * 24 * 365) // 1 year
    if (signedData?.signedUrl) {
      updates.preview_url = signedData.signedUrl
    }
  }

  await supabase.from('design_projects').update(updates).eq('id', projectId)

  return NextResponse.json({ saved: true, jsonPath, previewPath })
}
