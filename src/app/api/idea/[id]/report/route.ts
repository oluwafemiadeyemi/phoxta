import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { SYSTEM_PROMPT } from '@/ai/system'
import { runPhoxtaAI, PhoxtaQuotaError, quotaErrorBody } from '@/lib/aiClient'

export async function GET(
  _req: NextRequest,
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

    const { data: idea, error } = await supabase
      .from('ideas')
      .select('*')
      .eq('id', ideaId)
      .eq('user_id', user.id)
      .single()

    if (error || !idea)
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })

    return NextResponse.json({
      report: idea.report || null,
      idea: {
        id: idea.id,
        ideaSeed: idea.idea_seed,
        status: idea.status,
        currentDay: idea.current_day,
      },
    })
  } catch (err) {
    console.error('[report GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  _req: NextRequest,
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
      .select('*')
      .eq('id', ideaId)
      .eq('user_id', user.id)
      .single()

    if (fetchErr || !idea)
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })

    const profile = idea.ai_profile || {}

    // Get all day inputs
    const { data: allInputs } = await supabase
      .from('day_inputs')
      .select('*')
      .eq('idea_id', ideaId)
      .order('day_number')

    if (process.env.PHOXTA_DEV_MODE === 'true') {
      const mockReport = {
        summary: 'This idea shows strong market signals and clear demand. The validation process has revealed consistent evidence that the target audience experiences the stated problem frequently and is willing to pay for a solution. Competitive analysis confirms a defensible market position with identifiable differentiation.',
        strengths: [
          'Clear problem-solution fit validated through multi-phase research',
          'Large addressable market with identifiable entry points and growing demand',
          'Weak existing alternatives create significant competitive opportunity',
          'Strong willingness-to-pay signals from target customer segment',
        ],
        weaknesses: [
          'Market education may be required for early adopter segments',
          'Revenue model assumptions need further real-world validation',
          'Crowded adjacent markets could intensify competitive pressure',
          'Customer acquisition cost estimates remain unproven',
        ],
        recommendations: [
          'Proceed to MVP with the manual/no-code approach to validate core assumptions within 4-6 weeks',
          'Focus on community-led growth and organic channels before paid acquisition',
          'Implement kill condition tracking from day 1 with weekly metric reviews',
          'Secure 10 design partners for early feedback before broader launch',
          'Establish pricing experiments with A/B testing on landing pages',
        ],
        overallScore: 7.5,
        marketScore: 8,
        productScore: 7,
        teamReadiness: 6,
        competitivePosition: 7,
        customerDemand: 8,
        financialViability: 7,
        riskLevel: 'medium',
        marketSize: '£2.4B',
        revenueProjection: '£120K–£280K',
        timeToMvp: '6–8 weeks',
        keyMetrics: [
          { label: 'CAC Estimate', value: '£35–£60', trend: 'neutral' },
          { label: 'LTV Potential', value: '£480+', trend: 'up' },
          { label: 'Win Rate', value: '~18%', trend: 'up' },
          { label: 'Churn Risk', value: 'Medium', trend: 'down' },
        ],
        competitorComparison: [
          { name: 'Incumbent A', score: 6, weakness: 'Legacy UX, slow iteration cycles' },
          { name: 'Startup B', score: 5, weakness: 'Limited market reach, narrow feature set' },
          { name: 'Enterprise C', score: 7, weakness: 'Overpriced for SMBs, complex onboarding' },
        ],
        swot: {
          strengths: ['Validated problem with measurable demand', 'Lean cost structure enables rapid iteration', 'Clear differentiation against incumbent solutions'],
          weaknesses: ['Unproven unit economics', 'Single-founder execution risk', 'Brand awareness starts from zero'],
          opportunities: ['Regulatory tailwinds creating new demand', 'Underserved mid-market segment', 'Platform partnership potential'],
          threats: ['Incumbent response with similar features', 'Market downturn reducing buyer budgets', 'Technology commoditisation over 18 months'],
        },
        generatedAt: new Date().toISOString(),
      }

      const { error: updateErr } = await supabase
        .from('ideas')
        .update({ report: mockReport })
        .eq('id', ideaId)

      if (updateErr) throw updateErr
      return NextResponse.json({ report: mockReport })
    }

    const prompt = `Generate a comprehensive validation dashboard report for this startup idea.

IDEA: "${idea.idea_seed}"
AI PROFILE: ${JSON.stringify(profile, null, 2)}
DAY INPUTS: ${JSON.stringify(allInputs?.map((i: Record<string, unknown>) => ({ day: i.day_number, data: i.content })) || [], null, 2)}

Return a JSON object with these exact fields:
- summary (string): 4-6 sentence executive summary covering problem fit, market opportunity, competitive position, and recommended path forward
- strengths (string[]): 4-5 validated strengths with specific evidence references
- weaknesses (string[]): 4-5 identified risks or gaps with severity indication
- recommendations (string[]): 4-6 specific, actionable next steps prioritised by impact
- overallScore (number): 1-10 validation confidence score (be rigorous — 7+ means strong evidence)
- marketScore (number): 1-10 market opportunity score
- productScore (number): 1-10 product-market fit score
- teamReadiness (number): 1-10 execution readiness score
- competitivePosition (number): 1-10 competitive advantage score
- customerDemand (number): 1-10 validated customer demand score
- financialViability (number): 1-10 financial model viability score
- riskLevel ("low"|"medium"|"high"|"critical"): overall risk assessment
- marketSize (string): TAM estimate, e.g. "£2.4B"
- revenueProjection (string): year 1 revenue range estimate, e.g. "£120K–£280K"
- timeToMvp (string): estimated time to MVP, e.g. "6–8 weeks"
- keyMetrics (array of {label: string, value: string, trend: "up"|"down"|"neutral"}): 4 key business metrics
- competitorComparison (array of {name: string, score: number 1-10, weakness: string}): 3-5 competitors with threat scores
- swot (object with strengths: string[], weaknesses: string[], opportunities: string[], threats: string[]): each array 3-4 items
- generatedAt (string): current ISO timestamp "${new Date().toISOString()}"

Be specific and evidence-based. Use concrete numbers.

FORMATTING (apply to all string values):
- Use **bold** for key terms, metrics, company names, and critical phrases.
- Use bullet points (- ) for lists within string values.
- Use numbered lists (1. 2. 3.) for prioritised or sequential items.
- Use clear paragraph breaks between distinct ideas.
- Write in a polished, investor-grade professional tone.
- Lead every paragraph with the most important insight first.

Return ONLY valid JSON.`

    const result = await runPhoxtaAI(SYSTEM_PROMPT, prompt)

    const { error: updateErr } = await supabase
      .from('ideas')
      .update({ report: result })
      .eq('id', ideaId)

    if (updateErr) throw updateErr

    return NextResponse.json({ report: result })
  } catch (err) {
    if (err instanceof PhoxtaQuotaError) {
      return NextResponse.json(quotaErrorBody(), { status: 429 })
    }
    console.error('[report POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
