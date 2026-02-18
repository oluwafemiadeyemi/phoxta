import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@crm/components/ui/card";
import { Label } from "@crm/components/ui/label";
import { Switch } from "@crm/components/ui/switch";
import { Button } from "@crm/components/ui/button";
import { Checkbox } from "@crm/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@crm/components/ui/select";
import { Bell, Mail, Calendar, Briefcase, FileText, Users, MessageSquare, CreditCard } from "lucide-react";
import { useGetIdentity, useNotification } from "@refinedev/core";
import { supabaseClient } from "@crm/lib/supabase";
import type { NotificationChannel, NotificationPreference, NotificationType } from "@crm/lib/notifications";

type PreferenceState = {
  enabled: boolean;
  channels: NotificationChannel[];
  digest_enabled: boolean;
  digest_frequency: "daily" | "weekly" | "never";
  quiet_hours_start?: string;
  quiet_hours_end?: string;
};

const notificationTypeOptions: Array<{
  type: NotificationType;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    type: "deal_created",
    label: "Deal Created",
    description: "Alerts when a new deal is created",
    icon: <Briefcase className="w-5 h-5" />,
  },
  {
    type: "deal_won",
    label: "Deal Won",
    description: "Notifications when a deal is marked as won",
    icon: <Briefcase className="w-5 h-5" />,
  },
  {
    type: "deal_lost",
    label: "Deal Lost",
    description: "Notifications when a deal is marked as lost",
    icon: <Briefcase className="w-5 h-5" />,
  },
  {
    type: "task_assigned",
    label: "Task Assigned",
    description: "Alerts when you are assigned a task",
    icon: <Users className="w-5 h-5" />,
  },
  {
    type: "task_due",
    label: "Task Due",
    description: "Reminders for upcoming due tasks",
    icon: <Calendar className="w-5 h-5" />,
  },
  {
    type: "comment_mention",
    label: "Comment Mention",
    description: "Notifications when you are mentioned in a comment",
    icon: <MessageSquare className="w-5 h-5" />,
  },
  {
    type: "payment_received",
    label: "Payment Received",
    description: "Notifications when payments are received",
    icon: <CreditCard className="w-5 h-5" />,
  },
];

const channelOptions: Array<{ id: NotificationChannel; label: string; icon: React.ReactNode }> = [
  { id: "email", label: "Email", icon: <Mail className="w-4 h-4" /> },
  { id: "in-app", label: "In-app", icon: <Bell className="w-4 h-4" /> },
  { id: "sms", label: "SMS", icon: <FileText className="w-4 h-4" /> },
  { id: "push", label: "Push", icon: <Users className="w-4 h-4" /> },
];

export const NotificationPreferences = () => {
  const { open } = useNotification();
  const { data: user } = useGetIdentity();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [digestFrequency, setDigestFrequency] = useState<"daily" | "weekly" | "never">("daily");
  const [digestTime, setDigestTime] = useState("09:00");
  const [quietHoursStart, setQuietHoursStart] = useState("22:00");
  const [quietHoursEnd, setQuietHoursEnd] = useState("08:00");

  const defaultPreferences = useMemo<Record<NotificationType, PreferenceState>>(() => {
    return notificationTypeOptions.reduce((acc, option) => {
      acc[option.type] = {
        enabled: true,
        channels: ["email", "in-app"],
        digest_enabled: false,
        digest_frequency: "daily",
        quiet_hours_start: "22:00",
        quiet_hours_end: "08:00",
      };
      return acc;
    }, {} as Record<NotificationType, PreferenceState>);
  }, []);

  const [preferences, setPreferences] = useState<Record<NotificationType, PreferenceState>>(defaultPreferences);

  useEffect(() => {
    if (!user?.id) return;

    const loadPreferences = async () => {
      setIsLoading(true);
      const { data: prefs } = await supabaseClient
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id);

      const merged = { ...defaultPreferences };
      (prefs || []).forEach((pref: NotificationPreference) => {
        merged[pref.notification_type] = {
          enabled: pref.enabled,
          channels: pref.channels || ["email"],
          digest_enabled: pref.digest_enabled,
          digest_frequency: pref.digest_frequency || "daily",
          quiet_hours_start: pref.quiet_hours_start || "22:00",
          quiet_hours_end: pref.quiet_hours_end || "08:00",
        };
      });

      setPreferences(merged);

      const { data: digest } = await supabaseClient
        .from("notification_digests")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (digest?.frequency) {
        setDigestFrequency(digest.frequency);
      }
      if (digest?.send_time) {
        setDigestTime(digest.send_time);
      }

      setIsLoading(false);
    };

    loadPreferences();
  }, [user?.id, defaultPreferences]);

  const handleToggle = (type: NotificationType) => {
    setPreferences((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        enabled: !prev[type].enabled,
      },
    }));
  };

  const handleChannelToggle = (type: NotificationType, channel: NotificationChannel) => {
    setPreferences((prev) => {
      const currentChannels = prev[type].channels;
      const nextChannels = currentChannels.includes(channel)
        ? currentChannels.filter((c) => c !== channel)
        : [...currentChannels, channel];

      return {
        ...prev,
        [type]: {
          ...prev[type],
          channels: nextChannels,
        },
      };
    });
  };

  const handleDigestToggle = (type: NotificationType) => {
    setPreferences((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        digest_enabled: !prev[type].digest_enabled,
      },
    }));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);

    const preferenceRecords = Object.entries(preferences).map(([type, value]) => ({
      user_id: user.id,
      notification_type: type,
      enabled: value.enabled,
      channels: value.channels,
      digest_enabled: value.digest_enabled,
      digest_frequency: value.digest_frequency,
      quiet_hours_start: quietHoursStart,
      quiet_hours_end: quietHoursEnd,
    }));

    const { error } = await supabaseClient
      .from("notification_preferences")
      .upsert(preferenceRecords, { onConflict: "user_id,notification_type" });

    const { error: digestError } = await supabaseClient
      .from("notification_digests")
      .upsert(
        {
          user_id: user.id,
          frequency: digestFrequency,
          send_time: digestTime,
        },
        { onConflict: "user_id" },
      );

    if (error || digestError) {
      open?.({
        type: "error",
        message: "Unable to save preferences",
        description: error?.message || digestError?.message || "Please try again.",
      });
      setIsSaving(false);
      return;
    }

    open?.({
      type: "success",
      message: "Notification preferences saved successfully",
      description: "Your notification settings have been updated",
    });

    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Notification Preferences</h2>
        <p className="text-muted-foreground mt-2">Manage how and when you receive notifications</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Digest Schedule
          </CardTitle>
          <CardDescription>Configure how often you receive digest emails</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Digest Frequency</Label>
            <Select value={digestFrequency} onValueChange={(value) => setDigestFrequency(value as "daily" | "weekly" | "never")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Send Time</Label>
            <input
              type="time"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={digestTime}
              onChange={(event) => setDigestTime(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Quiet Hours</Label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={quietHoursStart}
                onChange={(event) => setQuietHoursStart(event.target.value)}
              />
              <span className="text-muted-foreground">to</span>
              <input
                type="time"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={quietHoursEnd}
                onChange={(event) => setQuietHoursEnd(event.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>Choose which notifications you want to receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading && (
            <div className="text-sm text-muted-foreground">Loading notification preferences...</div>
          )}
          {notificationTypeOptions.map((notification) => (
            <div
              key={notification.type}
              className="flex items-start justify-between gap-4 pb-6 border-b last:border-b-0 last:pb-0">
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-1 text-muted-foreground">{notification.icon}</div>
                <div className="space-y-1 flex-1">
                  <Label htmlFor={notification.type} className="text-base font-medium cursor-pointer">
                    {notification.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{notification.description}</p>
                  <div className="mt-3 flex flex-wrap gap-4">
                    {channelOptions.map((channel) => (
                      <label key={`${notification.type}-${channel.id}`} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={preferences[notification.type]?.channels.includes(channel.id)}
                          onCheckedChange={() => handleChannelToggle(notification.type, channel.id)}
                        />
                        <span className="flex items-center gap-1 text-muted-foreground">
                          {channel.icon}
                          {channel.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <Switch
                      checked={preferences[notification.type]?.digest_enabled}
                      onCheckedChange={() => handleDigestToggle(notification.type)}
                    />
                    <span className="text-sm text-muted-foreground">Include in digest</span>
                  </div>
                </div>
              </div>
              <Switch
                id={notification.type}
                checked={preferences[notification.type]?.enabled}
                onCheckedChange={() => handleToggle(notification.type)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => {
            setPreferences(defaultPreferences);
            setDigestFrequency("daily");
            setDigestTime("09:00");
            setQuietHoursStart("22:00");
            setQuietHoursEnd("08:00");
          }}>
          Reset to Defaults
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
};
