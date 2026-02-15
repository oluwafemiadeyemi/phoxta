// ===========================================================================
// GET/POST /api/designer/assets – user's uploaded assets
// ===========================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { v4 as uuid } from 'uuid'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('design_assets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Attach URLs (signed for uploaded, direct for stock)
  const assets = await Promise.all(
    (data ?? []).map(async (a: any) => {
      // Stock assets use external URL stored in meta
      if (a.meta?.source === 'stock' && a.meta?.externalUrl) {
        return { ...a, url: a.meta.externalUrl }
      }
      const { data: s } = await supabase.storage
        .from('design-projects')
        .createSignedUrl(a.path, 3600)
      return { ...a, url: s?.signedUrl ?? null }
    })
  )

  return NextResponse.json(assets)
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contentType = req.headers.get('content-type') || ''

  // ── Stock photo save (JSON body, no file upload) ──────────
  if (contentType.includes('application/json')) {
    const { externalUrl, name, photographer } = (await req.json()) as {
      externalUrl: string
      name: string
      photographer?: string
    }
    if (!externalUrl || !name) {
      return NextResponse.json({ error: 'Missing externalUrl or name' }, { status: 400 })
    }

    const assetId = uuid()
    const { data: asset, error } = await supabase
      .from('design_assets')
      .insert({
        id: assetId,
        user_id: user.id,
        project_id: null,
        type: 'image',
        name,
        path: `stock:${assetId}`,
        meta: { source: 'stock', externalUrl, photographer: photographer || '' },
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ...asset, url: externalUrl }, { status: 201 })
  }

  // ── File upload (FormData) ────────────────────────────────
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const projectId = formData.get('projectId') as string | null
  const assetType = (formData.get('type') as string) || 'image'

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const assetId = uuid()
  const ext = file.name.split('.').pop() || 'bin'
  const path = `${user.id}/assets/${assetId}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: uploadErr } = await supabase.storage
    .from('design-projects')
    .upload(path, buffer, { contentType: file.type })

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  const { data: asset, error } = await supabase
    .from('design_assets')
    .insert({
      id: assetId,
      user_id: user.id,
      project_id: projectId,
      type: assetType,
      name: file.name,
      path,
      meta: { size: file.size, contentType: file.type },
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Generate signed URL
  const { data: signed } = await supabase.storage
    .from('design-projects')
    .createSignedUrl(path, 3600)

  return NextResponse.json({ ...asset, url: signed?.signedUrl ?? null }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = (await req.json()) as { id: string }
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // Fetch asset to verify ownership and get path
  const { data: asset } = await supabase
    .from('design_assets')
    .select('id, path, meta')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Only delete from storage for non-stock assets
  if (!(asset.meta as any)?.source || (asset.meta as any).source !== 'stock') {
    await supabase.storage.from('design-projects').remove([asset.path])
  }

  // Delete DB row
  await supabase.from('design_assets').delete().eq('id', id)

  return NextResponse.json({ ok: true })
}
