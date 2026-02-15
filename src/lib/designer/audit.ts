// ===========================================================================
// Designer – audit logging helper
// ===========================================================================
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AuditAction } from '@/types/designer'

export async function logAudit(
  supabase: SupabaseClient,
  projectId: string,
  actorId: string,
  action: AuditAction,
  meta: Record<string, unknown> = {}
) {
  return supabase.from('design_audit_logs').insert({
    project_id: projectId,
    actor_id: actorId,
    action,
    meta,
  })
}
