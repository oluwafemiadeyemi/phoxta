import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { SubmitInterviewResponseSchema } from '@/schemas/interviewForm.schema'

// GET /api/interview/[token] — public endpoint to load interview form
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params

    // Use service role to bypass RLS for public access
    const supabase = await createServerSupabaseClient()

    const { data: form, error } = await supabase
      .from('interview_forms')
      .select('id, title, description, questions, share_token')
      .eq('share_token', token)
      .single()

    if (error || !form)
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })

    return NextResponse.json({ form })
  } catch (err) {
    console.error('[interview GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/interview/[token] — public endpoint to submit response
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params
    const body = await req.json()

    const parsed = SubmitInterviewResponseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid response data', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const supabase = await createServerSupabaseClient()

    // Find the form
    const { data: form, error: formErr } = await supabase
      .from('interview_forms')
      .select('id')
      .eq('share_token', token)
      .single()

    if (formErr || !form)
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })

    // Insert response
    const { error: insertErr } = await supabase
      .from('interview_responses')
      .insert({
        form_id: form.id,
        answers: parsed.data.answers,
        respondent_name: parsed.data.respondentName || null,
        respondent_email: parsed.data.respondentEmail || null,
      })

    if (insertErr) throw insertErr

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('[interview POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
