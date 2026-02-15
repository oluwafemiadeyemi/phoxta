import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'

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
      .select('*')
      .eq('id', ideaId)
      .eq('user_id', user.id)
      .single()

    if (fetchErr || !idea)
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })

    if (idea.is_profile_locked)
      return NextResponse.json({ error: 'Profile already locked' }, { status: 409 })

    const { error: updateErr } = await supabase
      .from('ideas')
      .update({ is_profile_locked: true })
      .eq('id', ideaId)

    if (updateErr) throw updateErr

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[lock-profile]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
