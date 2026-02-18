import { supabaseClient } from "./supabase";

/**
 * Advanced Notifications System for v2.0.0
 * 
 * Provides:
 * - Multi-channel notifications (Email, In-app, SMS, Push)
 * - Notification preferences
 * - Digest compilation
 * - Scheduling
 * - Templating
 */

export type NotificationChannel = "email" | "in-app" | "sms" | "push";
export type NotificationType =
  | "deal_created"
  | "deal_won"
  | "deal_lost"
  | "task_assigned"
  | "task_due"
  | "comment_mention"
  | "team_invitation"
  | "payment_received";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  channels: NotificationChannel[];
  title: string;
  message: string;
  data: Record<string, any>;
  read_at?: string;
  scheduled_at?: string;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  channels: NotificationChannel[];
  enabled: boolean;
  digest_enabled: boolean;
  digest_frequency?: "daily" | "weekly" | "never";
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

export interface InAppNotification {
  id: string;
  user_id: string;
  type?: NotificationType;
  title: string;
  message: string;
  action_url?: string;
  icon?: string;
  read: boolean;
  created_at: string;
}

export interface NotificationTemplate {
  subject?: string;
  emailTemplate?: string;
  pushTitle?: string;
  pushBody?: string;
  inAppTitle?: string;
  inAppMessage?: string;
}

/**
 * Notification Manager
 */
export class NotificationManager {
  /**
   * Send notification across channels
   */
  async sendNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data: Record<string, any> = {},
    channels?: NotificationChannel[]
  ): Promise<Notification> {
    // Check preferences
    const preference = await this.getPreference(userId, type);

    const activeChannels = channels || preference?.channels || ["email"];
    const isEnabled = preference?.enabled !== false;

    if (!isEnabled) {
      throw new Error("Notification type is disabled for this user");
    }

    // Create notification record
    const notification: Notification = {
      id: createNotificationId(),
      user_id: userId,
      type,
      channels: activeChannels,
      title,
      message,
      data,
      created_at: new Date().toISOString(),
    };

    // Save to database
    await supabaseClient.from("notifications").insert(notification);

    // Send via active channels
    await Promise.all(
      activeChannels.map((channel) =>
        this.sendViaChannel(channel, userId, notification)
      )
    );

    return notification;
  }

  /**
   * Send via specific channel
   */
  private async sendViaChannel(
    channel: NotificationChannel,
    userId: string,
    notification: Notification
  ) {
    try {
      switch (channel) {
        case "email":
          // Email notifications disabled
          console.log("[Notifications] Email notifications are disabled");
          break;
        case "in-app":
          await this.createInAppNotification(userId, notification);
          break;
        case "sms":
          await this.sendSmsNotification(userId, notification);
          break;
        case "push":
          await this.sendPushNotification(userId, notification);
          break;
      }
    } catch (error) {
      console.error(`Failed to send ${channel} notification:`, error);
    }
  }

  /**
   * Send email notification (DISABLED)
   */
  private async sendEmailNotification(userId: string, notification: Notification) {
    // Email functionality has been disabled
    console.log("[Notifications] Email notification skipped - email feature disabled");
  }

  /**
   * Create in-app notification
   */
  private async createInAppNotification(userId: string, notification: Notification) {
    const inAppNotification: InAppNotification = {
      id: createNotificationId(),
      user_id: userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      action_url: notification.data.actionUrl,
      icon: notification.data.icon,
      read: false,
      created_at: new Date().toISOString(),
    };

    await supabaseClient.from("in_app_notifications").insert(inAppNotification);
  }

  /**
   * Send SMS notification
   */
  private async sendSmsNotification(userId: string, notification: Notification) {
    const phoneNumber =
      notification.data.phoneNumber || notification.data.phone || notification.data.smsNumber;

    if (!phoneNumber) return;

    // TODO: Integrate with Twilio or similar
    console.log(`SMS to ${phoneNumber}: ${notification.message}`);
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(userId: string, notification: Notification) {
    // Get user push subscription
    const { data: subscription } = await supabaseClient
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!subscription) return;

    // TODO: Implement Web Push API
    const template = this.getNotificationTemplate(notification.type);
    console.log(`Push: ${template.pushTitle || notification.title}`);
  }

  /**
   * Get user preference
   */
  async getPreference(
    userId: string,
    type: NotificationType
  ): Promise<NotificationPreference | null> {
    const { data } = await supabaseClient
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .eq("notification_type", type)
      .single();

    return data;
  }

  /**
   * Set notification preferences
   */
  async setPreference(
    userId: string,
    type: NotificationType,
    preference: Partial<NotificationPreference>
  ) {
    const id = createNotificationId();

    const { error } = await supabaseClient
      .from("notification_preferences")
      .upsert(
        {
          id,
          user_id: userId,
          notification_type: type,
          ...preference,
        },
        { onConflict: "user_id,notification_type" }
      );

    if (error) throw error;
  }

  /**
   * Get notification template
   */
  private getNotificationTemplate(type: NotificationType): NotificationTemplate {
    const templates: Record<NotificationType, NotificationTemplate> = {
      deal_created: {
        subject: "New Deal Created",
        pushTitle: "New Deal",
        pushBody: "A new deal has been added to your pipeline",
        inAppTitle: "New Deal Created",
        inAppMessage: "A new deal has been created",
      },
      deal_won: {
        subject: "Deal Won!",
        pushTitle: "Deal Won",
        pushBody: "Congratulations! A deal has been won",
        inAppTitle: "Deal Won",
        inAppMessage: "Congratulations on your deal win!",
      },
      deal_lost: {
        subject: "Deal Lost",
        pushTitle: "Deal Lost",
        pushBody: "A deal has been lost",
        inAppTitle: "Deal Lost",
        inAppMessage: "A deal has been marked as lost",
      },
      task_assigned: {
        subject: "New Task Assigned",
        pushTitle: "Task Assigned",
        pushBody: "A new task has been assigned to you",
        inAppTitle: "New Task",
        inAppMessage: "You have been assigned a new task",
      },
      task_due: {
        subject: "Task Due Soon",
        pushTitle: "Task Due",
        pushBody: "A task is due soon",
        inAppTitle: "Task Due",
        inAppMessage: "You have a task due soon",
      },
      comment_mention: {
        subject: "You were mentioned",
        pushTitle: "Mentioned",
        pushBody: "Someone mentioned you in a comment",
        inAppTitle: "You Were Mentioned",
        inAppMessage: "Someone mentioned you in a comment",
      },
      team_invitation: {
        subject: "Team Invitation",
        pushTitle: "Team Invite",
        pushBody: "You have been invited to a team",
        inAppTitle: "Team Invitation",
        inAppMessage: "You have been invited to join a team",
      },
      payment_received: {
        subject: "Payment Received",
        pushTitle: "Payment",
        pushBody: "A payment has been received",
        inAppTitle: "Payment Received",
        inAppMessage: "A payment has been received",
      },
    };

    return templates[type];
  }

  /**
   * Render email template
   */
  private renderEmailTemplate(template: NotificationTemplate, notification: Notification): string {
    return `
      <h1>${template.subject}</h1>
      <p>${notification.message}</p>
      ${notification.data.details ? `<p>${notification.data.details}</p>` : ""}
      ${notification.data.actionUrl ? `<a href="${notification.data.actionUrl}">View Details</a>` : ""}
    `;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string) {
    await supabaseClient
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId);
  }

  /**
   * Get user notifications
   */
  async getNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    const { data } = await supabaseClient
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    return data || [];
  }
}

/**
 * Notification Digest Manager
 */
export class NotificationDigestManager {
  /**
   * Compile daily digest
   */
  async compileDailyDigest(userId: string): Promise<string> {
    // Get all unread notifications from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: notifications } = await supabaseClient
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .is("read_at", null)
      .gte("created_at", oneDayAgo)
      .order("created_at", { ascending: false });

    if (!notifications || notifications.length === 0) {
      return "No new notifications in the last 24 hours.";
    }

    // Group by type
    const grouped = notifications.reduce<Record<NotificationType, Notification[]>>((acc, n) => {
      const key = n.type as NotificationType;
      if (!acc[key]) acc[key] = [];
      acc[key].push(n as Notification);
      return acc;
    }, {} as Record<NotificationType, Notification[]>);

    // Compile digest
    let digest = "<h2>Your Notifications Digest</h2>\n";

    Object.entries(grouped).forEach(([type, notifs]) => {
      digest += `<h3>${type.replace(/_/g, " ")}</h3>\n`;
      digest += `<ul>\n`;
      (notifs as Notification[]).forEach((n) => {
        digest += `<li>${n.title}: ${n.message}</li>\n`;
      });
      digest += `</ul>\n`;
    });

    return digest;
  }

  /**
   * Send digest to user
   */
  async sendDigest(userId: string, frequency: "daily" | "weekly") {
    const { data: user } = await supabaseClient
      .from("users")
      .select("email")
      .eq("id", userId)
      .single();

    if (!user?.email) return;

    const digestContent = await this.compileDailyDigest(userId);

    // Email functionality has been disabled
    console.log("[Notifications] Digest email skipped - email feature disabled");

    // Mark notifications as read
    const { data: notifications } = await supabaseClient
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .is("read_at", null);

    if (notifications) {
      for (const n of notifications) {
        await supabaseClient
          .from("notifications")
          .update({ read_at: new Date().toISOString() })
          .eq("id", n.id);
      }
    }
  }

  /**
   * Schedule digest
   */
  async scheduleDigest(
    userId: string,
    frequency: "daily" | "weekly" = "daily",
    sendTime: string = "09:00"
  ) {
    await supabaseClient.from("notification_digests").insert({
      id: createNotificationId(),
      user_id: userId,
      frequency,
      send_time: sendTime,
      created_at: new Date().toISOString(),
    });
  }
}

function createNotificationId() {
  return crypto.randomUUID();
}

// Export managers
export const notificationManager = new NotificationManager();
export const digestManager = new NotificationDigestManager();
