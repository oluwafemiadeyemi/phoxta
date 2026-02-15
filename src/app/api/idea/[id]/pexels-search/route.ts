import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || ''

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

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('query') || 'business urban modern'
    const page = searchParams.get('page') || '1'
    const perPage = searchParams.get('per_page') || '30'

    if (!PEXELS_API_KEY) {
      return NextResponse.json({ error: 'Pexels API key not configured' }, { status: 500 })
    }

    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&orientation=landscape`,
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      },
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch from Pexels' },
        { status: response.status },
      )
    }

    const data = await response.json()

    // Transform to a simpler format the client needs
    const photos = (data.photos || []).map(
      (photo: {
        id: number
        width: number
        height: number
        photographer: string
        photographer_url: string
        alt: string
        src: {
          original: string
          large2x: string
          large: string
          medium: string
          small: string
          portrait: string
          landscape: string
          tiny: string
        }
      }) => ({
        id: photo.id,
        width: photo.width,
        height: photo.height,
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        alt: photo.alt || '',
        src: {
          original: photo.src.original,
          large: photo.src.large2x || photo.src.large,
          medium: photo.src.medium,
          small: photo.src.small,
          tiny: photo.src.tiny,
        },
      }),
    )

    return NextResponse.json({
      photos,
      totalResults: data.total_results || 0,
      page: data.page || 1,
      perPage: data.per_page || 30,
      hasMore: !!data.next_page,
    })
  } catch (err) {
    console.error('[pexels-search]', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
