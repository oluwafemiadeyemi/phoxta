// ===========================================================================
// POST /api/designer/ai-design — AI-powered design generation
//
// Pipeline:
//   1. LLM generates structured content plan (AIDesignPlan)
//   2. Pexels supplies images for each slide
//   3. Layout engine positions elements deterministically
//   4. Returns AIPageSpec[] ready for client-side canvas assembly
// ===========================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { runPhoxtaAI, PhoxtaQuotaError, quotaErrorBody } from '@/lib/aiClient'
import { AI_DESIGN_SYSTEM_PROMPT, buildDesignUserPrompt } from '@/lib/designer/aiDesignPrompt'
import { generatePageSpec } from '@/lib/designer/aiLayoutEngine'
import type { AIDesignPlan, AIDesignRequest, AIDesignResponse, AIPageSpec } from '@/types/aiDesign'

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || ''

// ---------------------------------------------------------------------------
// Pexels image search — returns the best photo URL or null
// ---------------------------------------------------------------------------
async function searchPexelsImage(
  query: string,
  orientation: 'landscape' | 'portrait' | 'square' = 'landscape',
): Promise<string | null> {
  if (!PEXELS_API_KEY) {
    console.warn('[ai-design] PEXELS_API_KEY not set — images will be skipped')
    return null
  }

  if (!query || !query.trim()) {
    console.warn('[ai-design] Empty image query — skipping')
    return null
  }

  // Try the original query, then a simplified fallback if no results
  const queries = [query.trim()]
  // Create a fallback by taking just the first 2-3 words (more generic)
  const words = query.trim().split(/\s+/)
  if (words.length > 3) {
    queries.push(words.slice(0, 3).join(' '))
  }

  for (const q of queries) {
    try {
      const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=5&orientation=${orientation}`
      const res = await fetch(url, {
        headers: { Authorization: PEXELS_API_KEY },
      })

      if (!res.ok) {
        console.warn(`[ai-design] Pexels API returned ${res.status} for query "${q}"`)
        continue
      }

      const data = await res.json()
      const photos = data.photos ?? []

      if (photos.length === 0) {
        console.info(`[ai-design] No Pexels results for "${q}", trying next query`)
        continue
      }

      // Pick a random photo from top results for visual variety
      const idx = Math.floor(Math.random() * Math.min(photos.length, 3))
      const photo = photos[idx]
      const imageUrl = photo.src?.large2x || photo.src?.large || photo.src?.original || null

      if (imageUrl) {
        console.info(`[ai-design] Found image for "${q}": ${imageUrl.slice(0, 80)}…`)
        return imageUrl
      }
    } catch (err) {
      console.warn(`[ai-design] Pexels search failed for "${q}":`, err)
    }
  }

  console.warn(`[ai-design] All Pexels queries exhausted for: "${query}"`)
  return null
}

/**
 * Determine Pexels orientation from canvas dimensions.
 */
function getOrientation(w: number, h: number): 'landscape' | 'portrait' | 'square' {
  const ratio = w / h
  if (ratio > 1.1) return 'landscape'
  if (ratio < 0.9) return 'portrait'
  return 'square'
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as AIDesignRequest
    const { prompt, format, designWidth, designHeight } = body
    const pageCount = body.pageCount ?? 1

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Step 1: Generate content plan via LLM
    const userPrompt = buildDesignUserPrompt(prompt, format, pageCount, designWidth, designHeight)
    const raw = await runPhoxtaAI(AI_DESIGN_SYSTEM_PROMPT, userPrompt, {
      temperature: 0.8,
      maxTokens: 2000,
    })

    const plan = raw as unknown as AIDesignPlan

    // Validate plan has pages
    if (!plan.pages || plan.pages.length === 0) {
      return NextResponse.json({ error: 'AI returned an empty design plan' }, { status: 500 })
    }

    console.info(
      `[ai-design] Plan: ${plan.pages.length} pages, style="${plan.style?.mood}",`,
      `queries=[${plan.pages.map((p) => `"${p.imageQuery}"`).join(', ')}]`,
    )

    // Step 2: Fetch images for each page (parallel)
    const orientation = getOrientation(designWidth, designHeight)
    const imagePromises = plan.pages.map((page) =>
      page.imageQuery ? searchPexelsImage(page.imageQuery, orientation) : Promise.resolve(null),
    )
    const images = await Promise.all(imagePromises)

    const foundCount = images.filter(Boolean).length
    console.info(`[ai-design] Pexels: ${foundCount}/${images.length} images found`)

    // Step 3: Run layout engine for each page
    const pageSpecs: AIPageSpec[] = plan.pages.map((page, idx) =>
      generatePageSpec(page, plan.style, images[idx], designWidth, designHeight),
    )

    const totalElements = pageSpecs.reduce((sum, ps) => sum + ps.elements.length, 0)
    console.info(`[ai-design] Layout: ${pageSpecs.length} pages, ${totalElements} total elements`)

    const response: AIDesignResponse = { plan, pageSpecs }

    return NextResponse.json(response)
  } catch (err) {
    if (err instanceof PhoxtaQuotaError) {
      return NextResponse.json(quotaErrorBody(), { status: 429 })
    }
    // Dev mode mock fallback
    if (err instanceof Error && err.message === 'DEV_MODE_NO_MOCK') {
      return NextResponse.json(
        { error: 'AI not available in dev mode. Set OPENAI_API_KEY.' },
        { status: 503 },
      )
    }
    console.error('[ai-design] Error:', err)
    return NextResponse.json({ error: 'Design generation failed' }, { status: 500 })
  }
}
