import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import OpenAI from 'openai'

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

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
    const { data: idea, error: fetchErr } = await supabase
      .from('ideas')
      .select('id, user_id')
      .eq('id', ideaId)
      .eq('user_id', user.id)
      .single()

    if (fetchErr || !idea)
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })

    const body = await req.json()
    const { prompt, section } = body

    if (!prompt || typeof prompt !== 'string')
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })

    // Dev mode — return placeholder
    if (process.env.PHOXTA_DEV_MODE === 'true') {
      return NextResponse.json({
        url: `https://placehold.co/1200x800/1a1a2e/ffffff?text=${encodeURIComponent(section || 'Image')}`,
        section,
      })
    }

    const response = await getOpenAI().images.generate({
      model: 'dall-e-3',
      prompt: `${prompt}. Style: Urban, modern, professional, clean composition, high contrast, no text overlays, photorealistic, contemporary design aesthetic.`,
      n: 1,
      size: '1792x1024',
      quality: 'hd',
    })

    const imageUrl = response.data?.[0]?.url
    if (!imageUrl)
      return NextResponse.json({ error: 'Image generation failed' }, { status: 502 })

    return NextResponse.json({ url: imageUrl, section })
  } catch (err) {
    console.error('[generate-image]', err)
    return NextResponse.json({ error: 'Image generation failed' }, { status: 500 })
  }
}
