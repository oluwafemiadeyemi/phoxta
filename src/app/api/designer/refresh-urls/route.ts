// ===========================================================================
// POST /api/designer/refresh-urls – batch-refresh signed URLs for storage paths
//
// Accepts: { paths: string[] }
// Returns: { urls: Record<string, string> }  (path → fresh signed URL)
//
// Used when loading saved canvas JSON whose embedded image `src` URLs
// (Supabase signed URLs) have expired.  The client sends the `_storagePath`
// values stored on each image object and receives fresh 1-hour signed URLs.
// ===========================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { paths } = (await req.json()) as { paths: string[] }

  if (!Array.isArray(paths) || paths.length === 0) {
    return NextResponse.json({ urls: {} })
  }

  // Only allow paths that belong to this user (security check)
  const validPaths = paths.filter((p) => typeof p === 'string' && p.startsWith(`${user.id}/`))

  // Batch sign: Supabase supports createSignedUrls (plural) for efficiency
  const { data, error } = await supabase.storage
    .from('design-projects')
    .createSignedUrls(validPaths, 3600)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const urls: Record<string, string> = {}
  if (data) {
    for (let i = 0; i < data.length; i++) {
      const item = data[i]
      if (item.signedUrl) {
        // Use the original input path as key (item.path may differ)
        const key = validPaths[i] ?? item.path
        if (key) urls[key] = item.signedUrl
      }
    }
  }

  return NextResponse.json({ urls })
}
