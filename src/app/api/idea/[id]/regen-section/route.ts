import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { runPhoxtaAI } from '@/lib/aiClient'
import { SYSTEM_PROMPT } from '@/ai/system'

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

    const { data: idea, error: fetchErr } = await supabase
      .from('ideas')
      .select('id, user_id, idea_seed, ai_profile')
      .eq('id', ideaId)
      .eq('user_id', user.id)
      .single()

    if (fetchErr || !idea)
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })

    const body = await req.json()
    const { sectionKey, currentContent, feedback, businessInfo, dayNumber } = body

    if (!sectionKey || typeof sectionKey !== 'string')
      return NextResponse.json({ error: 'sectionKey is required' }, { status: 400 })

    const targetDay = typeof dayNumber === 'number' ? dayNumber : 10

    const profile = (idea.ai_profile as Record<string, unknown>) ?? {}
    const day8 = profile.day8 as Record<string, unknown> | undefined
    const day9 = profile.day9 as Record<string, unknown> | undefined
    const day10 = profile.day10 as Record<string, unknown> | undefined

    const context = [
      `Business: ${idea.idea_seed}`,
      day8?.companyName ? `Company Name: ${day8.companyName}` : '',
      day8?.elevatorPitch ? `Elevator Pitch: ${day8.elevatorPitch}` : '',
      day8?.uniqueValueProp ? `Value Proposition: ${day8.uniqueValueProp}` : '',
      day9?.brandVoice ? `Brand Voice: ${day9.brandVoice}` : '',
      day9?.brandPersonalityProfile ? `Brand Personality: ${day9.brandPersonalityProfile}` : '',
      businessInfo ? `Business Contact Info: ${JSON.stringify(businessInfo)}` : '',
    ].filter(Boolean).join('\n')

    const prompt = targetDay === 8
      ? `You are regenerating a specific section of a comprehensive business plan. The section is "${sectionKey}".

BUSINESS CONTEXT:
${context}

CURRENT CONTENT:
${typeof currentContent === 'string' ? currentContent : JSON.stringify(currentContent, null, 2)}

${feedback ? `USER FEEDBACK: ${feedback}` : 'Generate a fresh, improved, more detailed version of this section.'}

RULES:
- Return ONLY a JSON object with a single key "content" containing the regenerated content.
- This is a BUSINESS PLAN section — write with depth, data, and authority.
- Use specific numbers, percentages, and financial figures where relevant.
- For market analysis sections, include TAM/SAM/SOM figures.
- For financial sections, include detailed projections and metrics.
- Be thorough and investor-grade — this will appear on a professional business plan page.
- Write in clean prose with clear paragraphs. Use line breaks between paragraphs.
- NO MARKDOWN FORMATTING. No **bold**, no *italic*, no # headings, no - bullet lists. Write clean plain text only.
- Return ONLY valid JSON. No code fences.`
      : `You are regenerating a specific section of a business landing page. The section is "${sectionKey}".

BUSINESS CONTEXT:
${context}

CURRENT CONTENT:
${typeof currentContent === 'string' ? currentContent : JSON.stringify(currentContent, null, 2)}

${feedback ? `USER FEEDBACK: ${feedback}` : 'Generate a fresh, improved version of this section.'}

RULES:
- Return ONLY a JSON object with a single key "content" containing the regenerated content.
- For string fields, return a string value.
- For array fields (featuresSection, faqSection), return an array of objects matching the original structure.
- Write for CONVERSION — this is a live landing page, not a pitch deck.
- Use an urban, modern, professional tone. Be punchy and compelling.
- Every word must earn its place.
- No placeholder text or brackets like [insert X].
- ABSOLUTELY NO MARKDOWN FORMATTING. No **bold**, no *italic*, no # headings, no - bullet lists. Write clean plain text only — the text is rendered directly on a live website and any markdown syntax will appear as ugly literal characters.
- Return ONLY valid JSON. No code fences.`

    // Dev mode: return slightly modified content
    if (process.env.PHOXTA_DEV_MODE === 'true') {
      return NextResponse.json({
        content: typeof currentContent === 'string'
          ? currentContent + ' (regenerated)'
          : currentContent,
      })
    }

    const result = await runPhoxtaAI(SYSTEM_PROMPT, prompt, {
      model: 'gpt-4.1',
      temperature: 0.8,
    })

    // Save updated section to the appropriate day in ai_profile
    if (result.content !== undefined) {
      const dayKey = `day${targetDay}` as string
      const dayData = (profile[dayKey] as Record<string, unknown>) ?? {}
      const updatedDay = { ...dayData, [sectionKey]: result.content }
      const updatedProfile = { ...profile, [dayKey]: updatedDay }
      await supabase.from('ideas').update({ ai_profile: updatedProfile }).eq('id', ideaId)
    }

    return NextResponse.json({ content: result.content })
  } catch (err) {
    console.error('[regen-section]', err)
    return NextResponse.json({ error: 'Regeneration failed' }, { status: 500 })
  }
}
