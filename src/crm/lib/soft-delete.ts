import { supabaseClient } from "./supabase";

export interface SoftDeleteOptions {
  userId: string;
  reason?: string;
}

/**
 * Soft delete a record (mark as deleted instead of removing)
 */
export async function softDeleteRecord(
  table: string,
  recordId: string,
  options: SoftDeleteOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseClient
      .from(table)
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: options.userId,
      })
      .eq("id", recordId);

    if (error) {
      console.error(`[SoftDelete] Error soft deleting from ${table}:`, error);
      return { success: false, error: error.message };
    }

    // Log the deletion
    await logAuditEvent({
      userId: options.userId,
      resourceType: table,
      resourceId: recordId,
      action: "delete",
      details: { reason: options.reason },
    });

    return { success: true };
  } catch (error) {
    console.error("[SoftDelete] Exception:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Permanently delete a record (hard delete - use with caution)
 */
export async function permanentlyDeleteRecord(
  table: string,
  recordId: string,
  userId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Only admins should be able to permanently delete
    const { error } = await supabaseClient.from(table).delete().eq("id", recordId);

    if (error) {
      console.error(`[PermanentDelete] Error permanently deleting from ${table}:`, error);
      return { success: false, error: error.message };
    }

    // Log the permanent deletion
    await logAuditEvent({
      userId,
      resourceType: table,
      resourceId: recordId,
      action: "permanent_delete",
      details: { reason },
    });

    return { success: true };
  } catch (error) {
    console.error("[PermanentDelete] Exception:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Restore a soft-deleted record
 */
export async function restoreRecord(
  table: string,
  recordId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseClient
      .from(table)
      .update({
        deleted_at: null,
        deleted_by: null,
      })
      .eq("id", recordId);

    if (error) {
      console.error(`[Restore] Error restoring ${table}:`, error);
      return { success: false, error: error.message };
    }

    // Log the restoration
    await logAuditEvent({
      userId,
      resourceType: table,
      resourceId: recordId,
      action: "restore",
    });

    return { success: true };
  } catch (error) {
    console.error("[Restore] Exception:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Get deleted records (for admin view)
 */
export async function getDeletedRecords(table: string, userId: string) {
  try {
    const { data, error } = await supabaseClient
      .from(table)
      .select("*")
      .eq("user_id", userId)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (error) {
      console.error(`[SoftDelete] Error fetching deleted records from ${table}:`, error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[SoftDelete] Exception:", error);
    return [];
  }
}

/**
 * Permanently delete old soft-deleted records (data retention policy)
 */
export async function purgeOldDeletedRecords(
  table: string,
  daysToKeep: number = 90
): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
  try {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - daysToKeep);

    const { error, count } = await supabaseClient
      .from(table)
      .delete()
      .lt("deleted_at", retentionDate.toISOString())
      .not("deleted_at", "is", null);

    if (error) {
      console.error(`[Purge] Error purging old records from ${table}:`, error);
      return { success: false, error: error.message };
    }

    console.log(`[Purge] Purged ${count} records from ${table}`);
    return { success: true, deletedCount: count ?? 0 };
  } catch (error) {
    console.error("[Purge] Exception:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Log audit event
 */
export async function logAuditEvent(audit: {
  userId: string;
  resourceType: string;
  resourceId: string;
  action: string;
  details?: Record<string, any>;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
}): Promise<void> {
  try {
    await supabaseClient.from("audit_logs").insert({
      user_id: audit.userId,
      resource_type: audit.resourceType,
      resource_id: audit.resourceId,
      action: audit.action,
      old_values: audit.oldValues,
      new_values: audit.newValues,
      details: audit.details,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Audit] Error logging audit event:", error);
  }
}

/**
 * Get audit logs for a record
 */
export async function getRecordAuditLog(resourceType: string, resourceId: string) {
  try {
    const { data, error } = await supabaseClient
      .from("audit_logs")
      .select("*")
      .eq("resource_type", resourceType)
      .eq("resource_id", resourceId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Audit] Error fetching audit log:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[Audit] Exception:", error);
    return [];
  }
}

/**
 * Get user activity log
 */
export async function getUserActivityLog(userId: string, limit: number = 50) {
  try {
    const { data, error } = await supabaseClient
      .from("user_activity_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[Activity] Error fetching user activity:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[Activity] Exception:", error);
    return [];
  }
}
