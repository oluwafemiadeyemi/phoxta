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
    const {
      sectionName,
      sectionTexts,
      sectionIcons,
      businessInfo,
    } = body as {
      sectionName: string
      sectionTexts: { tag: string; text: string; key: string }[]
      sectionIcons: string[]
      businessInfo?: Record<string, string>
    }

    if (!sectionName || !sectionTexts?.length)
      return NextResponse.json({ error: 'sectionName and sectionTexts are required' }, { status: 400 })

    const profile = (idea.ai_profile as Record<string, unknown>) ?? {}
    const day8 = profile.day8 as Record<string, unknown> | undefined
    const day9 = profile.day9 as Record<string, unknown> | undefined
    const day3 = profile.day3 as Record<string, unknown> | undefined
    const day1 = profile.day1 as Record<string, unknown> | undefined

    // Build rich business context from all available day data
    const contextParts = [
      `Business Idea: ${idea.idea_seed}`,
      day1?.problemStatement ? `Problem: ${day1.problemStatement}` : '',
      day1?.targetAudience ? `Target Audience: ${day1.targetAudience}` : '',
      day3?.valueProposition ? `Value Proposition: ${day3.valueProposition}` : '',
      day3?.uniqueSellingPoint ? `Unique Selling Point: ${day3.uniqueSellingPoint}` : '',
      day8?.companyName ? `Company Name: ${day8.companyName}` : '',
      day8?.elevatorPitch ? `Elevator Pitch: ${day8.elevatorPitch}` : '',
      day8?.uniqueValueProp ? `Value Prop: ${day8.uniqueValueProp}` : '',
      day8?.targetMarket ? `Target Market: ${day8.targetMarket}` : '',
      day9?.brandVoice ? `Brand Voice: ${day9.brandVoice}` : '',
      day9?.brandPersonalityProfile ? `Brand Personality: ${day9.brandPersonalityProfile}` : '',
      day9?.tagline ? `Tagline: ${day9.tagline}` : '',
      businessInfo ? `Business Contact Info: ${JSON.stringify(businessInfo)}` : '',
    ].filter(Boolean).join('\n')

    // Build current section content description with word counts
    const currentContentDesc = sectionTexts.map((t) => {
      const wordCount = t.text.trim().split(/\s+/).filter(Boolean).length
      return `<${t.tag}${t.key ? ` key="${t.key}"` : ''} words="${wordCount}">${t.text}</${t.tag}>`
    }).join('\n')

    // Build icon context if any
    const iconContext = sectionIcons.length > 0
      ? `\nCurrent icons in the section (CSS classes): ${sectionIcons.join(', ')}`
      : ''

    const prompt = `You are writing replacement content for a specific section ("${sectionName}") of a business landing page.

BUSINESS CONTEXT:
${contextParts}

CURRENT SECTION CONTENT (HTML structure):
${currentContentDesc}
${iconContext}

YOUR TASK:
Generate fresh, compelling, conversion-focused content to replace EACH text element in this section.
The content must be specific to THIS business idea — not generic placeholder text.

RULES:
- Return a JSON object with a single key "contents" — an array of objects.
- Each object has: { "key": "<the key from the element>", "text": "<new text content>" }
- Generate one entry for EVERY text element listed above.
- If the element has a key, use that exact key. If no key, use an empty string for key and match by position.
- WORD COUNT IS CRITICAL: Each element has a words="N" attribute showing its current word count. Your replacement text MUST have the same word count within ±5%. For example, if words="20", your text must be 19–21 words. Count carefully before finalizing.
- PRESERVE CONTENT TYPE: You MUST preserve the structural format/type of each element. If the original contains a number or statistic (e.g. "150+", "99%", "$49/mo"), your replacement MUST also contain a number/statistic. If it's a phone number, replace with a phone number. If it's an email, replace with an email. If it's an address, replace with an address. If it's a date, replace with a date. If it's a price, replace with a price. If it's a list of items ("Design, Development, Marketing"), replace with a list of items. The FORMAT stays the same — only the CONTENT adapts to the user's business.
- Match the tone of each element (headings should be short and punchy, paragraphs can be longer).
- Write for a LIVE WEBSITE — this is customer-facing copy, not an internal document.
- Use a modern, professional, conversion-focused copywriting tone.
- ABSOLUTELY NO MARKDOWN. No **bold**, no *italic*, no # headings, no - bullets. Clean plain text only.
- Make headings attention-grabbing and benefit-focused.
- Make descriptions specific to the business — reference the actual product/service, target audience, and value proposition.
- Every word must earn its place. No filler.
${sectionIcons.length > 0 ? `
ICON RULES:
- You may also include icon updates in the "contents" array.
- For icon changes, use: { "iconClass": "<current CSS class>", "newIconClass": "<new CSS class>" }
- Use icon classes from the same icon library as the current icons (e.g., Flaticon, Font Awesome, Lineicons).
- Only suggest icon changes if the new content warrants a different icon.
- Keep icons relevant to the content they accompany.
` : ''}
- Return ONLY valid JSON. No code fences, no markdown.`

    // Dev mode: return mock content
    if (process.env.PHOXTA_DEV_MODE === 'true') {
      const mockContents = sectionTexts.map((t) => ({
        key: t.key,
        text: t.text + ' (AI enhanced)',
      }))
      return NextResponse.json({ contents: mockContents })
    }

    const result = await runPhoxtaAI(SYSTEM_PROMPT, prompt, {
      model: 'gpt-4.1',
      temperature: 0.8,
    })

    const contents = (result as Record<string, unknown>).contents
    if (!contents || !Array.isArray(contents)) {
      return NextResponse.json({ contents: [] })
    }

    return NextResponse.json({ contents })
  } catch (err) {
    console.error('[generate-section-content]', err)
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
  }
}
