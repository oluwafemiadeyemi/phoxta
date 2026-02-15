import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: ideaId } = await params
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify idea ownership
    const { data: idea } = await supabase
      .from('ideas')
      .select('id')
      .eq('id', ideaId)
      .eq('user_id', user.id)
      .single()
    if (!idea)
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })

    // 1) List files uploaded to Supabase Storage (use service-role to bypass storage RLS)
    const adminClient = createServiceRoleClient()
    const folderPath = `${user.id}/${ideaId}`
    const { data: files } = await adminClient.storage
      .from('landing-assets')
      .list(folderPath, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      })

    const imageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg']
    const uploadedImages = (files || [])
      .filter((f) => {
        const ext = f.name.split('.').pop()?.toLowerCase() || ''
        return imageExtensions.includes(ext) && f.name !== '.emptyFolderPlaceholder'
      })
      .map((f) => {
        const filePath = `${folderPath}/${f.name}`
        const {
          data: { publicUrl },
        } = adminClient.storage.from('landing-assets').getPublicUrl(filePath)

        const nameWithoutExt = f.name.replace(/\.[^.]+$/, '')
        const section = nameWithoutExt.replace(/^\d+-/, '') || 'asset'

        return {
          name: f.name,
          url: publicUrl,
          section,
          source: 'upload' as const,
          createdAt: f.created_at,
        }
      })

    // 2) Load saved stock image links from day_inputs (use service-role)
    const { data: savedRow } = await adminClient
      .from('day_inputs')
      .select('content')
      .eq('idea_id', ideaId)
      .eq('input_type', 'library_images')
      .single()

    const savedLinks = ((savedRow?.content as { images?: { url: string; section: string; savedAt: string }[] })?.images ?? []).map((img) => ({
      name: img.section,
      url: img.url,
      section: img.section,
      source: 'stock' as const,
      createdAt: img.savedAt,
    }))

    // Merge: saved links first, then uploads, deduplicate by URL
    const seen = new Set<string>()
    const images = [...savedLinks, ...uploadedImages].filter((img) => {
      if (seen.has(img.url)) return false
      seen.add(img.url)
      return true
    })

    return NextResponse.json({ images })
  } catch (err) {
    console.error('[my-images]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
