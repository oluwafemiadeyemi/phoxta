import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || ''

interface PexelsPhoto {
  id: number
  src: {
    original: string
    large2x: string
    large: string
    medium: string
    small: string
  }
}

interface PexelsResponse {
  photos: PexelsPhoto[]
  total_results: number
}

/**
 * POST /api/idea/:id/pexels-batch
 *
 * Accepts { queries: Record<string, string> } where keys are section names
 * (e.g. "hero", "product1", "about") and values are Pexels search queries.
 *
 * Returns { images: Record<string, string> } — section → best-match image URL.
 *
 * Each section gets its OWN unique image (no duplicates). Fetches are parallelised.
 */
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

    // Verify idea ownership
    const { data: idea } = await supabase
      .from('ideas')
      .select('id')
      .eq('id', ideaId)
      .eq('user_id', user.id)
      .single()
    if (!idea)
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })

    if (!PEXELS_API_KEY) {
      return NextResponse.json(
        { error: 'Pexels API key not configured' },
        { status: 500 },
      )
    }

    const body = await req.json()
    const queries: Record<string, string> = body.queries || {}
    const sectionKeys = Object.keys(queries)

    if (sectionKeys.length === 0) {
      return NextResponse.json({ images: {} })
    }

    // Track used image IDs to avoid duplicates across sections
    const usedIds = new Set<number>()
    const images: Record<string, string> = {}

    // Fetch in parallel, but limit concurrency to avoid rate-limiting
    const BATCH_SIZE = 5
    for (let i = 0; i < sectionKeys.length; i += BATCH_SIZE) {
      const batch = sectionKeys.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map(async (section) => {
          const query = queries[section]
          if (!query) return { section, url: '' }

          const res = await fetch(
            `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
            { headers: { Authorization: PEXELS_API_KEY } },
          )

          if (!res.ok) return { section, url: '' }

          const data: PexelsResponse = await res.json()
          const photos = data.photos || []

          // Pick the first photo not already used
          for (const photo of photos) {
            if (!usedIds.has(photo.id)) {
              usedIds.add(photo.id)
              // Use large for good quality without being too heavy
              return {
                section,
                url: photo.src.large2x || photo.src.large || photo.src.medium,
              }
            }
          }
          // If all 5 were somehow used, just take the first
          if (photos.length > 0) {
            return {
              section,
              url:
                photos[0].src.large2x ||
                photos[0].src.large ||
                photos[0].src.medium,
            }
          }
          return { section, url: '' }
        }),
      )

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          const { section, url } = result.value
          if (url) images[section] = url
        }
      }
    }

    return NextResponse.json({ images })
  } catch (err) {
    console.error('[pexels-batch]', err)
    return NextResponse.json({ error: 'Batch search failed' }, { status: 500 })
  }
}
