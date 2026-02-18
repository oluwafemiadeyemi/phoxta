import { useState, useEffect } from "react";
import { useGetIdentity, useNotification } from "@refinedev/core";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@crm/components/ui/card";
import { Button } from "@crm/components/ui/button";
import { Badge } from "@crm/components/ui/badge";
import { Switch } from "@crm/components/ui/switch";
import { Calendar, Unlink, RefreshCw, Bell, Lock, Link as LinkIcon } from "lucide-react";

export function CalendarIntegrationSettings() {
  const { data: identity } = useGetIdentity() as { data?: { id: string } };
  const { open } = useNotification();
  
  const [googleConnected, setGoogleConnected] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [bidirectionalSync, setBidirectionalSync] = useState(false);
  const [autoReminders, setAutoReminders] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadIntegrationStatus();
  }, [identity?.id]);

  const loadIntegrationStatus = async () => {
    // In a real app, fetch from backend
    const stored = localStorage.getItem(`calendar_integration_${identity?.id}`);
    if (stored) {
      const data = JSON.parse(stored);
      setGoogleConnected(data.connected);
      setSyncEnabled(data.syncEnabled);
      setBidirectionalSync(data.bidirectional);
      setAutoReminders(data.autoReminders);
      setLastSyncTime(data.lastSync);
    }
  };

  const handleGoogleConnect = async () => {
    setLoading(true);
    try {
      // Simulate OAuth flow
      // In production: window.location.href = `${API_URL}/auth/google-calendar?userId=${identity?.id}`
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setGoogleConnected(true);
      setSyncEnabled(true);
      setLastSyncTime(new Date().toISOString());
      
      const data = {
        connected: true,
        syncEnabled: true,
        bidirectional: false,
        autoReminders: true,
        lastSync: new Date().toISOString(),
      };
      localStorage.setItem(`calendar_integration_${identity?.id}`, JSON.stringify(data));
      
      open?.({
        type: "success",
        message: "Google Calendar Connected",
        description: "Your calendar has been successfully synced",
      });
    } catch (error) {
      open?.({
        type: "error",
        message: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect Google Calendar",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setGoogleConnected(false);
      setSyncEnabled(false);
      setBidirectionalSync(false);
      localStorage.removeItem(`calendar_integration_${identity?.id}`);
      
      open?.({
        type: "success",
        message: "Disconnected",
        description: "Google Calendar has been disconnected",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setLastSyncTime(new Date().toISOString());
      
      open?.({
        type: "success",
        message: "Sync Complete",
        description: "Your calendars have been synced successfully",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Google Calendar Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar
          </CardTitle>
          <CardDescription>Connect your Google Calendar to sync events and deadlines</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {googleConnected ? (
            <>
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-green-600"></div>
                  <div>
                    <p className="font-medium text-green-900">Connected</p>
                    <p className="text-sm text-green-800">
                      {lastSyncTime ? `Last synced ${new Date(lastSyncTime).toLocaleString()}` : "Syncing..."}
                    </p>
                  </div>
                </div>
                <Badge className="bg-green-600">Active</Badge>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-5 w-5 text-[#1D3A7D]" />
                    <div>
                      <p className="font-medium">Automatic Sync</p>
                      <p className="text-sm text-muted-foreground">Sync changes every 15 minutes</p>
                    </div>
                  </div>
                  <Switch checked={syncEnabled} onCheckedChange={setSyncEnabled} />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <LinkIcon className="h-5 w-5 text-[#1D3A7D]" />
                    <div>
                      <p className="font-medium">Bidirectional Sync</p>
                      <p className="text-sm text-muted-foreground">Changes sync in both directions</p>
                    </div>
                  </div>
                  <Switch checked={bidirectionalSync} onCheckedChange={setBidirectionalSync} />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-[#1D3A7D]" />
                    <div>
                      <p className="font-medium">Auto Reminders</p>
                      <p className="text-sm text-muted-foreground">Get notifications 15 min before</p>
                    </div>
                  </div>
                  <Switch checked={autoReminders} onCheckedChange={setAutoReminders} />
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1 bg-[#1D3A7D] hover:bg-[#152d5f]" onClick={handleSync} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  Sync Now
                </Button>
                <Button variant="destructive" onClick={handleDisconnect} disabled={loading}>
                  <Unlink className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-blue-900 text-sm">
                  Connect Google Calendar to sync your events across platforms. Your data remains private and
                  secure.
                </p>
              </div>

              <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleGoogleConnect} disabled={loading}>
                <Calendar className="h-4 w-4 mr-2" />
                {loading ? "Connecting..." : "Connect Google Calendar"}
              </Button>

              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Privacy & Security
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>We never store your Google credentials</li>
                  <li>Read and write only calendar data</li>
                  <li>OAuth 2.0 authentication</li>
                  <li>Revoke access anytime</li>
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Other Calendar Integrations Coming Soon */}
      <Card>
        <CardHeader>
          <CardTitle>More Integrations Coming Soon</CardTitle>
          <CardDescription>Additional calendar platforms will be available soon</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {["Outlook Calendar", "Apple Calendar", "Slack", "Zoom"].map((app) => (
              <div key={app} className="p-4 border rounded-lg bg-muted/50">
                <p className="font-medium text-sm mb-2">{app}</p>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
