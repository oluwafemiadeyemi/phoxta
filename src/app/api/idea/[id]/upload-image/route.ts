import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer'

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

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const section = formData.get('section') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF, SVG' },
        { status: 400 },
      )
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max 10MB.' }, { status: 400 })
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${user.id}/${ideaId}/${Date.now()}-${section || 'asset'}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Use service-role client for storage to bypass RLS
    const adminClient = createServiceRoleClient()

    const { error: uploadError } = await adminClient.storage
      .from('landing-assets')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('[upload-image] storage error:', uploadError)
      return NextResponse.json(
        { error: 'Upload failed: ' + uploadError.message },
        { status: 500 },
      )
    }

    const {
      data: { publicUrl },
    } = adminClient.storage.from('landing-assets').getPublicUrl(fileName)

    return NextResponse.json({
      url: publicUrl,
      fileName,
      section: section || 'asset',
    })
  } catch (err) {
    console.error('[upload-image]', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
