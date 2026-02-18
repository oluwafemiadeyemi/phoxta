import { createClient } from "@supabase/supabase-js";

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Real-Time Data Sync System
 * Handle WebSocket connections, real-time updates, and change tracking
 */

export interface DataChangeEvent {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  action: "create" | "update" | "delete";
  old_values?: Record<string, unknown>;
  new_values: Record<string, unknown>;
  changed_fields: string[];
  change_reason?: string;
  created_by: string;
  created_at: string;
}

export interface RealtimeSubscription {
  id: string;
  user_id: string;
  channel_name: string;
  event_types: string[];
  table_names: string[];
  is_active: boolean;
  created_at: string;
}

export interface SyncQueue {
  id: string;
  user_id: string;
  action: "create" | "update" | "delete";
  entity_type: string;
  entity_id: string;
  data: Record<string, unknown>;
  status: "pending" | "synced" | "failed";
  retry_count: number;
  error_message?: string;
  created_at: string;
  synced_at?: string;
}

export interface ChangeTrackingConfig {
  track_all_changes: boolean;
  exclude_fields: string[];
  include_entities: string[];
  retention_days: number;
}

/**
 * Realtime Data Sync Manager
 * Manage WebSocket subscriptions and real-time updates
 */
export class RealtimeDataSync {
  private static subscriptions = new Map<string, RealtimeSubscription>();

  static async subscribeToChanges(
    userId: string,
    tableNames: string[],
    callback: (change: DataChangeEvent) => void
  ): Promise<string> {
    const subscriptionId = crypto.randomUUID();

    // Subscribe to Supabase realtime
    const channel = supabaseClient
      .channel(`changes:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: tableNames.length === 1 ? tableNames[0] : undefined,
        },
        (payload: { new?: Record<string, unknown>; old?: Record<string, unknown>; eventType?: string }) => {
          const change: DataChangeEvent = {
            id: crypto.randomUUID(),
            user_id: userId,
            entity_type: payload.new?.entity_type as string || "unknown",
            entity_id: (payload.new?.id || payload.old?.id) as string || "",
            action: (payload.eventType?.toLowerCase() as "create" | "update" | "delete") || "update",
            old_values: payload.old as Record<string, unknown> | undefined as any,
            new_values: payload.new as Record<string, unknown> | undefined as any,
            changed_fields: payload.new
              ? Object.keys(payload.new).filter(
                  (key) => payload.old?.[key] !== payload.new?.[key]
                )
              : [],
            created_by: userId,
            created_at: new Date().toISOString(),
          };

          callback(change);
        }
      )
      .subscribe();

    // Store subscription
    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      user_id: userId,
      channel_name: `changes:${userId}`,
      event_types: ["INSERT", "UPDATE", "DELETE"],
      table_names: tableNames,
      is_active: true,
      created_at: new Date().toISOString(),
    });

    return subscriptionId;
  }

  static async unsubscribe(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      await supabaseClient.removeChannel(`${subscription.channel_name}` as any);
      this.subscriptions.delete(subscriptionId);
    }
  }

  static getSubscriptions(): RealtimeSubscription[] {
    return Array.from(this.subscriptions.values());
  }
}

/**
 * Change Tracking Manager
 * Track all data changes with audit trail
 */
export class ChangeTrackingManager {
  static async recordChange(
    userId: string,
    entityType: string,
    entityId: string,
    action: "create" | "update" | "delete",
    newValues: Record<string, unknown>,
    oldValues?: Record<string, unknown>,
    reason?: string
  ): Promise<DataChangeEvent> {
    const changedFields = oldValues
      ? Object.keys(newValues).filter((key) => oldValues[key] !== newValues[key])
      : Object.keys(newValues);

    const event: DataChangeEvent = {
      id: crypto.randomUUID(),
      user_id: userId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      old_values: oldValues,
      new_values: newValues,
      changed_fields: changedFields,
      change_reason: reason,
      created_by: userId,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabaseClient
      .from("data_changes")
      .insert([event]);

    if (error) throw error;
    return event;
  }

  static async getChangeHistory(
    entityId: string,
    entityType: string,
    limit: number = 50
  ): Promise<DataChangeEvent[]> {
    const { data, error } = await supabaseClient
      .from("data_changes")
      .select("*")
      .eq("entity_id", entityId)
      .eq("entity_type", entityType)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async getUserChangeHistory(
    userId: string,
    days: number = 30,
    limit: number = 100
  ): Promise<DataChangeEvent[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const { data, error } = await supabaseClient
      .from("data_changes")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async getChangesByEntity(
    userId: string,
    entityType: string
  ): Promise<DataChangeEvent[]> {
    const { data, error } = await supabaseClient
      .from("data_changes")
      .select("*")
      .eq("user_id", userId)
      .eq("entity_type", entityType)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }
}

/**
 * Sync Queue Manager
 * Manage offline sync queue for offline-first support
 */
export class SyncQueueManager {
  static async addToQueue(
    userId: string,
    action: "create" | "update" | "delete",
    entityType: string,
    entityId: string,
    data: Record<string, unknown>
  ): Promise<SyncQueue> {
    const queueItem: Omit<SyncQueue, "id"> = {
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      data,
      status: "pending",
      retry_count: 0,
      created_at: new Date().toISOString(),
    };

    const { data: inserted, error } = await supabaseClient
      .from("sync_queue")
      .insert([queueItem])
      .select()
      .single();

    if (error) throw error;
    return inserted;
  }

  static async getPendingQueue(userId: string): Promise<SyncQueue[]> {
    const { data, error } = await supabaseClient
      .from("sync_queue")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async markAsSynced(queueId: string): Promise<SyncQueue> {
    const { data, error } = await supabaseClient
      .from("sync_queue")
      .update({
        status: "synced",
        synced_at: new Date().toISOString(),
      })
      .eq("id", queueId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async markAsFailed(
    queueId: string,
    errorMessage: string,
    retryCount: number
  ): Promise<SyncQueue> {
    const { data, error } = await supabaseClient
      .from("sync_queue")
      .update({
        status: retryCount < 3 ? "pending" : "failed",
        error_message: errorMessage,
        retry_count: retryCount + 1,
      })
      .eq("id", queueId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async clearSyncedItems(userId: string, olderThanDays: number = 7): Promise<void> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const { error } = await supabaseClient
      .from("sync_queue")
      .delete()
      .eq("user_id", userId)
      .eq("status", "synced")
      .lt("synced_at", cutoffDate.toISOString());

    if (error) throw error;
  }
}

/**
 * Sync Statistics
 * Track sync health and performance
 */
export class SyncStatistics {
  static async getQueueStats(userId: string): Promise<Record<string, unknown>> {
    const { data, error } = await supabaseClient.rpc("get_sync_queue_stats", {
      p_user_id: userId,
    });

    if (error) throw error;
    return data || {};
  }

  static async getChangeStats(
    userId: string,
    days: number = 7
  ): Promise<Record<string, unknown>> {
    const { data, error } = await supabaseClient.rpc("get_change_stats", {
      p_user_id: userId,
      p_days: days,
    });

    if (error) throw error;
    return data || {};
  }
}
