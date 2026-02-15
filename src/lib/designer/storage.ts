// ===========================================================================
// Designer – Supabase storage helpers
// ===========================================================================
import { SupabaseClient } from '@supabase/supabase-js'

const BUCKET_PROJECTS = 'design-projects'
const BUCKET_EXPORTS = 'design-exports'

/** Build a storage path scoped to user + project */
export function storagePath(userId: string, projectId: string, ...rest: string[]) {
  return [userId, projectId, ...rest].join('/')
}

/** Upload JSON content */
export async function uploadJson(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  data: unknown
) {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  return supabase.storage.from(bucket).upload(path, blob, {
    contentType: 'application/json',
    upsert: true,
  })
}

/** Upload a base64 data URL as binary */
export async function uploadDataUrl(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  dataUrl: string
) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) throw new Error('Invalid data URL')
  const contentType = match[1]
  const buffer = Buffer.from(match[2], 'base64')
  return supabase.storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert: true,
  })
}

/** Get a signed URL (1 hour) */
export async function getSignedUrl(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  expiresIn = 3600
) {
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
  return data?.signedUrl ?? null
}

/** List files in a folder */
export async function listFiles(
  supabase: SupabaseClient,
  bucket: string,
  folder: string
) {
  const { data } = await supabase.storage.from(bucket).list(folder)
  return data ?? []
}

/** Delete files by paths */
export async function deleteFiles(
  supabase: SupabaseClient,
  bucket: string,
  paths: string[]
) {
  if (paths.length === 0) return
  return supabase.storage.from(bucket).remove(paths)
}

export { BUCKET_PROJECTS, BUCKET_EXPORTS }
