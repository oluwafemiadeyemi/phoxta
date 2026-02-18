import { supabaseClient } from "./supabase";
import { v4 as uuidv4 } from "uuid";

/**
 * Webhook & Data Synchronization System for v2.0.0
 * 
 * Provides:
 * - Webhook event management
 * - Reliable delivery with retries
 * - Real-time data sync
 * - Event queuing
 * - Webhook debugging tools
 */

export type WebhookEventType =
  | "contact.created"
  | "contact.updated"
  | "contact.deleted"
  | "deal.created"
  | "deal.updated"
  | "deal.won"
  | "deal.lost"
  | "task.created"
  | "task.updated"
  | "task.completed"
  | "comment.created"
  | "user.joined"
  | "user.removed";

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  timestamp: string;
  resource_type: string;
  resource_id: string;
  data: Record<string, any>;
  previous_data?: Record<string, any>;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_id: string;
  status: "pending" | "success" | "failed" | "retrying";
  attempt: number;
  response_status?: number;
  response_body?: string;
  error_message?: string;
  next_retry_at?: string;
  created_at: string;
}

export interface DataSyncQueue {
  id: string;
  user_id: string;
  entity_type: string;
  operation: "create" | "update" | "delete";
  data: Record<string, any>;
  status: "pending" | "synced" | "conflict";
  conflict_resolution?: "local" | "remote" | "merge";
  created_at: string;
  synced_at?: string;
}

/**
 * Webhook Event Manager
 */
export class WebhookEventManager {
  private deliveryQueue: WebhookEvent[] = [];
  private maxRetries = 5;
  private retryDelays = [1000, 2000, 5000, 10000, 30000]; // Exponential backoff in ms

  /**
   * Publish webhook event
   */
  async publishEvent(
    type: WebhookEventType,
    resourceType: string,
    resourceId: string,
    data: Record<string, any>,
    previousData?: Record<string, any>
  ): Promise<WebhookEvent> {
    const event: WebhookEvent = {
      id: uuidv4(),
      type,
      timestamp: new Date().toISOString(),
      resource_type: resourceType,
      resource_id: resourceId,
      data,
      previous_data: previousData,
    };

    // Save event
    await supabaseClient.from("webhook_events").insert(event);

    // Queue for delivery
    this.deliveryQueue.push(event);

    // Get webhooks subscribed to this event type
    const { data: webhooks } = await supabaseClient
      .from("webhooks")
      .select("*")
      .contains("events", [type])
      .eq("is_active", true);

    if (webhooks) {
      for (const webhook of webhooks) {
        await this.queueDelivery(webhook.id, event.id);
      }
    }

    // Process delivery queue
    this.processDeliveryQueue();

    return event;
  }

  /**
   * Queue webhook delivery
   */
  private async queueDelivery(webhookId: string, eventId: string) {
    const { data, error } = await supabaseClient
      .from("webhook_deliveries")
      .insert({
        id: uuidv4(),
        webhook_id: webhookId,
        event_id: eventId,
        status: "pending",
        attempt: 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) console.error("Failed to queue delivery:", error);
  }

  /**
   * Process delivery queue
   */
  private async processDeliveryQueue() {
    for (const event of this.deliveryQueue) {
      // Get pending deliveries
      const { data: deliveries } = await supabaseClient
        .from("webhook_deliveries")
        .select("*")
        .eq("event_id", event.id)
        .eq("status", "pending");

      if (deliveries) {
        for (const delivery of deliveries) {
          await this.deliverWebhook(delivery);
        }
      }
    }

    this.deliveryQueue = [];
  }

  /**
   * Deliver webhook with retries
   */
  private async deliverWebhook(delivery: WebhookDelivery) {
    try {
      // Get webhook details
      const { data: webhook } = await supabaseClient
        .from("webhooks")
        .select("*")
        .eq("id", delivery.webhook_id)
        .single();

      if (!webhook) return;

      // Get event
      const { data: event } = await supabaseClient
        .from("webhook_events")
        .select("*")
        .eq("id", delivery.event_id)
        .single();

      if (!event) return;

      // Send webhook
      const signature = await this.generateSignature(JSON.stringify(event));
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-ID": event.id,
          "X-Webhook-Timestamp": event.timestamp,
          "X-Webhook-Signature": signature,
        },
        body: JSON.stringify(event),
      });

      if (response.ok) {
        // Success
        await supabaseClient
          .from("webhook_deliveries")
          .update({
            status: "success",
            response_status: response.status,
            response_body: await response.text(),
          })
          .eq("id", delivery.id);
      } else {
        // Retry if applicable
        if (delivery.attempt < this.maxRetries) {
          const nextAttempt = delivery.attempt + 1;
          const delay = this.retryDelays[nextAttempt - 1] || 60000;

          await supabaseClient
            .from("webhook_deliveries")
            .update({
              status: "retrying",
              attempt: nextAttempt,
              next_retry_at: new Date(Date.now() + delay).toISOString(),
              response_status: response.status,
              error_message: response.statusText,
            })
            .eq("id", delivery.id);

          // Schedule retry
          setTimeout(() => this.deliverWebhook(delivery), delay);
        } else {
          // Give up
          await supabaseClient
            .from("webhook_deliveries")
            .update({
              status: "failed",
              error_message: "Max retries exceeded",
            })
            .eq("id", delivery.id);
        }
      }
    } catch (error) {
      console.error("Webhook delivery error:", error);

      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Retry logic
      if (delivery.attempt < this.maxRetries) {
        const nextAttempt = delivery.attempt + 1;
        const delay = this.retryDelays[nextAttempt - 1] || 60000;

        await supabaseClient
          .from("webhook_deliveries")
          .update({
            status: "retrying",
            attempt: nextAttempt,
            next_retry_at: new Date(Date.now() + delay).toISOString(),
            error_message: errorMessage,
          })
          .eq("id", delivery.id);

        setTimeout(() => this.deliverWebhook(delivery), delay);
      } else {
        await supabaseClient
          .from("webhook_deliveries")
          .update({
            status: "failed",
            error_message: errorMessage,
          })
          .eq("id", delivery.id);
      }
    }
  }

  /**
   * Generate webhook signature
   */
  private async generateSignature(payload: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Get event history
   */
  async getEventHistory(
    eventType?: WebhookEventType,
    limit: number = 100
  ): Promise<WebhookEvent[]> {
    let query = supabaseClient.from("webhook_events").select("*");

    if (eventType) {
      query = query.eq("type", eventType);
    }

    const { data } = await query
      .order("timestamp", { ascending: false })
      .limit(limit);

    return data || [];
  }

  /**
   * Get delivery history
   */
  async getDeliveryHistory(webhookId: string, limit: number = 50) {
    const { data } = await supabaseClient
      .from("webhook_deliveries")
      .select("*")
      .eq("webhook_id", webhookId)
      .order("created_at", { ascending: false })
      .limit(limit);

    return data || [];
  }

  /**
   * Retry failed delivery
   */
  async retryDelivery(deliveryId: string) {
    const { data: delivery } = await supabaseClient
      .from("webhook_deliveries")
      .select("*")
      .eq("id", deliveryId)
      .single();

    if (delivery) {
      await this.deliverWebhook(delivery);
    }
  }
}

/**
 * Data Sync Manager
 */
export class DataSyncManager {
  /**
   * Queue data change for sync
   */
  async queueDataChange(
    userId: string,
    entityType: string,
    operation: "create" | "update" | "delete",
    data: Record<string, any>
  ): Promise<DataSyncQueue> {
    const { data: item, error } = await supabaseClient
      .from("data_sync_queue")
      .insert({
        id: uuidv4(),
        user_id: userId,
        entity_type: entityType,
        operation,
        data,
        status: "pending",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return item;
  }

  /**
   * Sync queued changes
   */
  async syncQueuedChanges(userId: string): Promise<{ synced: number; conflicts: number }> {
    const { data: changes } = await supabaseClient
      .from("data_sync_queue")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending");

    let syncedCount = 0;
    let conflictCount = 0;

    if (!changes) return { synced: 0, conflicts: 0 };

    for (const change of changes) {
      try {
        // Apply change to server
        const result = await this.applyDataChange(change);

        if (result.success) {
          // Mark as synced
          await supabaseClient
            .from("data_sync_queue")
            .update({
              status: "synced",
              synced_at: new Date().toISOString(),
            })
            .eq("id", change.id);

          syncedCount++;
        } else if (result.conflict) {
          // Mark as conflict
          await supabaseClient
            .from("data_sync_queue")
            .update({
              status: "conflict",
              conflict_resolution: "pending",
            })
            .eq("id", change.id);

          conflictCount++;
        }
      } catch (error) {
        console.error("Sync error:", error);
      }
    }

    return { synced: syncedCount, conflicts: conflictCount };
  }

  /**
   * Apply data change
   */
  private async applyDataChange(
    change: DataSyncQueue
  ): Promise<{ success: boolean; conflict?: boolean }> {
    try {
      switch (change.operation) {
        case "create":
          await supabaseClient.from(change.entity_type).insert(change.data);
          return { success: true };

        case "update":
          const { error: updateError } = await supabaseClient
            .from(change.entity_type)
            .update(change.data)
            .eq("id", change.data.id);

          if (updateError?.code === "409") {
            // Conflict detected
            return { success: false, conflict: true };
          }

          return { success: !updateError };

        case "delete":
          await supabaseClient
            .from(change.entity_type)
            .delete()
            .eq("id", change.data.id);

          return { success: true };

        default:
          return { success: false };
      }
    } catch (error) {
      console.error("Apply data change error:", error);
      return { success: false };
    }
  }

  /**
   * Resolve conflict
   */
  async resolveConflict(
    changeId: string,
    resolution: "local" | "remote" | "merge"
  ) {
    // Get the change
    const { data: change } = await supabaseClient
      .from("data_sync_queue")
      .select("*")
      .eq("id", changeId)
      .single();

    if (!change) return;

    if (resolution === "local") {
      // Apply local change (force update)
      await supabaseClient
        .from(change.entity_type)
        .upsert(change.data, { onConflict: "id" });
    } else if (resolution === "remote") {
      // Discard local change
      // Remove from queue without applying
    } else if (resolution === "merge") {
      // Merge local and remote
      const { data: remote } = await supabaseClient
        .from(change.entity_type)
        .select("*")
        .eq("id", change.data.id)
        .single();

      if (remote) {
        const merged = { ...remote, ...change.data };
        await supabaseClient
          .from(change.entity_type)
          .update(merged)
          .eq("id", change.data.id);
      }
    }

    // Mark as resolved
    await supabaseClient
      .from("data_sync_queue")
      .update({
        status: "synced",
        conflict_resolution: resolution,
        synced_at: new Date().toISOString(),
      })
      .eq("id", changeId);
  }

  /**
   * Get sync status
   */
  async getSyncStatus(userId: string) {
    const { data } = await supabaseClient
      .from("data_sync_queue")
      .select("status")
      .eq("user_id", userId);

    const stats = {
      pending: 0,
      synced: 0,
      conflicts: 0,
    };

    data?.forEach((item: any) => {
      stats[item.status as keyof typeof stats]++;
    });

    return stats;
  }
}

export const webhookEventManager = new WebhookEventManager();
export const dataSyncManager = new DataSyncManager();
