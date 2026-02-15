import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { buildInterviewFormPrompt, InterviewGenOutputSchema } from '@/ai/interviewForm'
import { SYSTEM_PROMPT } from '@/ai/system'
import { runPhoxtaAI, PhoxtaQuotaError, quotaErrorBody } from '@/lib/aiClient'
import crypto from 'crypto'

// GET /api/idea/[id]/interview-form — get existing form
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
    const { data: idea, error: ideaErr } = await supabase
      .from('ideas')
      .select('id')
      .eq('id', ideaId)
      .eq('user_id', user.id)
      .single()

    if (ideaErr || !idea)
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })

    // Get interview form
    const { data: form, error: formErr } = await supabase
      .from('interview_forms')
      .select('*')
      .eq('idea_id', ideaId)
      .single()

    if (formErr || !form) {
      return NextResponse.json({ form: null })
    }

    // Get response count
    const { count } = await supabase
      .from('interview_responses')
      .select('*', { count: 'exact', head: true })
      .eq('form_id', form.id)

    return NextResponse.json({
      form: {
        ...form,
        responseCount: count || 0,
      },
    })
  } catch (err) {
    console.error('[interview-form GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/idea/[id]/interview-form — create interview form (AI-generated)
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

    // Verify idea ownership and get data
    const { data: idea, error: ideaErr } = await supabase
      .from('ideas')
      .select('*')
      .eq('id', ideaId)
      .eq('user_id', user.id)
      .single()

    if (ideaErr || !idea)
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })

    // Check if form already exists
    const { data: existingForm } = await supabase
      .from('interview_forms')
      .select('id')
      .eq('idea_id', ideaId)
      .single()

    if (existingForm)
      return NextResponse.json(
        { error: 'Interview form already exists for this idea' },
        { status: 409 },
      )

    const profile = idea.ai_profile || {}
    const day1 = profile.day1 || {}
    const day4 = profile.day4 || {}

    // Generate share token
    const shareToken = crypto.randomBytes(16).toString('hex')

    let formData
    if (process.env.PHOXTA_DEV_MODE === 'true') {
      formData = {
        title: `Customer Validation: ${idea.idea_seed.slice(0, 50)}`,
        description: 'Help us validate this idea by answering a few questions.',
        questions: [
          { id: 'q1', text: 'How do you currently deal with this problem?', type: 'textarea', required: true },
          { id: 'q2', text: 'How often do you encounter this problem?', type: 'select', required: true, options: ['Daily', 'Weekly', 'Monthly', 'Rarely'] },
          { id: 'q3', text: 'How painful is this problem on a scale of 1-10?', type: 'rating', required: true, options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
          { id: 'q4', text: 'What would an ideal solution look like for you?', type: 'textarea', required: true },
          { id: 'q5', text: 'Would you pay for a solution to this problem?', type: 'select', required: true, options: ['Definitely yes', 'Probably yes', 'Not sure', 'Probably not', 'Definitely not'] },
          { id: 'q6', text: 'What tools or workarounds do you currently use?', type: 'text', required: false },
          { id: 'q7', text: 'Any other thoughts?', type: 'textarea', required: false },
        ],
      }
    } else {
      const prompt = buildInterviewFormPrompt(
        idea.idea_seed,
        day1.problemStatement || idea.idea_seed,
        day1.targetCustomer || profile.targetAudience || '',
        day4.hooks || [],
      )

      const aiResult = await runPhoxtaAI(SYSTEM_PROMPT, prompt)
      const parsed = InterviewGenOutputSchema.safeParse(aiResult)
      if (!parsed.success) {
        console.error('[interview-form] Schema validation failed:', parsed.error)
        return NextResponse.json({ error: 'AI output validation failed' }, { status: 500 })
      }
      formData = parsed.data
    }

    // Insert form into DB
    const { data: newForm, error: insertErr } = await supabase
      .from('interview_forms')
      .insert({
        idea_id: ideaId,
        user_id: user.id,
        share_token: shareToken,
        title: formData.title,
        description: formData.description,
        questions: formData.questions,
      })
      .select()
      .single()

    if (insertErr) throw insertErr

    return NextResponse.json({ form: newForm }, { status: 201 })
  } catch (err) {
    if (err instanceof PhoxtaQuotaError) {
      return NextResponse.json(quotaErrorBody(), { status: 429 })
    }
    console.error('[interview-form POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
