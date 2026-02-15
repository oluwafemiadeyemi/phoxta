import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer'

// Helper: load current saved-images list from day_inputs using service-role
async function getSavedImages(adminClient: ReturnType<typeof createServiceRoleClient>, ideaId: string) {
  const { data } = await adminClient
    .from('day_inputs')
    .select('id, content')
    .eq('idea_id', ideaId)
    .eq('input_type', 'library_images')
    .single()
  return data as { id: string; content: { images: { url: string; section: string; savedAt: string }[] } } | null
}

// POST — save a stock image link to the user's library
export async function POST(
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

    const { data: idea } = await supabase
      .from('ideas')
      .select('id')
      .eq('id', ideaId)
      .eq('user_id', user.id)
      .single()
    if (!idea)
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })

    const body = await req.json()
    const { url, section } = body as { url?: string; section?: string }

    if (!url || typeof url !== 'string')
      return NextResponse.json({ error: 'url is required' }, { status: 400 })

    // Use service-role client for DB writes to bypass RLS
    const adminClient = createServiceRoleClient()
    const existing = await getSavedImages(adminClient, ideaId)
    const images = existing?.content?.images ?? []

    // Avoid duplicates
    if (images.some((img) => img.url === url)) {
      return NextResponse.json({ url, section: section || 'stock' })
    }

    const newEntry = { url, section: section || 'stock', savedAt: new Date().toISOString() }
    const updatedImages = [newEntry, ...images]

    if (existing) {
      const { error } = await adminClient
        .from('day_inputs')
        .update({ content: { images: updatedImages }, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await adminClient
        .from('day_inputs')
        .insert({
          idea_id: ideaId,
          user_id: user.id,
          day_number: 0,
          input_type: 'library_images',
          content: { images: updatedImages },
        })
      if (error) throw error
    }

    return NextResponse.json({ url, section: section || 'stock' })
  } catch (err) {
    console.error('[save-image]', err)
    return NextResponse.json({ error: 'Failed to save image' }, { status: 500 })
  }
}

// DELETE — remove a saved image link from the user's library
export async function DELETE(
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

    const { data: idea } = await supabase
      .from('ideas')
      .select('id')
      .eq('id', ideaId)
      .eq('user_id', user.id)
      .single()
    if (!idea)
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })

    const body = await req.json()
    const { url } = body as { url?: string }
    if (!url)
      return NextResponse.json({ error: 'url is required' }, { status: 400 })

    // Use service-role client for DB writes to bypass RLS
    const adminClient = createServiceRoleClient()
    const existing = await getSavedImages(adminClient, ideaId)
    if (!existing) return NextResponse.json({ success: true })

    const filtered = (existing.content?.images ?? []).filter((img) => img.url !== url)

    const { error } = await adminClient
      .from('day_inputs')
      .update({ content: { images: filtered }, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[save-image DELETE]', err)
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 })
  }
}
