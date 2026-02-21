import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createServiceRoleClient()
    const folderPath = `${user.id}/sites`

    const { data: files, error } = await adminClient.storage
      .from('landing-assets')
      .list(folderPath, {
        limit: 200,
        sortBy: { column: 'created_at', order: 'desc' },
      })

    if (error) {
      console.error('[sites/my-images] list error:', error)
      // Folder may not exist yet — return empty
      return NextResponse.json({ images: [] })
    }

    const imageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg']
    const images = (files || [])
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

    return NextResponse.json({ images })
  } catch (err) {
    console.error('[sites/my-images]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
