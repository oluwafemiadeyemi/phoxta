import { useEffect, useState } from "react";
import { useGetIdentity } from "@refinedev/core";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@crm/components/ui/card";
import { Button } from "@crm/components/ui/button";
import { Input } from "@crm/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@crm/components/ui/dialog";
import { useNotification } from "@refinedev/core";
import { Key, Lock, RotateCw, Trash2, Plus, Copy, Eye, EyeOff } from "lucide-react";
import { ApiKeyManager, ApiKey, DEFAULT_RATE_LIMITS, API_PERMISSIONS } from "@crm/lib/api-management";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@crm/components/ui/select";

export default function ApiManagementPage() {
  const { data: identity } = useGetIdentity() as { data?: { id: string } };
  const { open: notificationOpen } = useNotification();
  const userId = identity?.id;

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [rateLimit, setRateLimit] = useState<string>("1000");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(["read:all"]);
  const [loading, setLoading] = useState(false);
  const [newKeyData, setNewKeyData] = useState<{ id: string; key: string; key_prefix: string } | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    loadApiKeys();
  }, [userId]);

  const loadApiKeys = async () => {
    try {
      if (!userId) return;
      const keys = await ApiKeyManager.getApiKeys(userId);
      const normalized = keys.map((key) => ({
        ...key,
        permissions: Array.isArray(key.permissions) ? key.permissions : [],
        key_prefix: key.key_prefix || "",
        rate_limit: Number.isFinite(key.rate_limit) ? key.rate_limit : 0,
      }));
      setApiKeys(normalized);
    } catch (error) {
      notificationOpen?.({
        type: "error",
        message: "Failed to load API keys",
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleCreateKey = async () => {
    try {
      if (!userId || !keyName) return;
      setLoading(true);

      const response = await ApiKeyManager.createApiKey(
        userId,
        keyName,
        selectedPermissions,
        parseInt(rateLimit)
      );

      setNewKeyData({
        id: response.id,
        key: response.key,
        key_prefix: response.key_prefix,
      });
      setShowNewKey(true);
      setKeyName("");
      setRateLimit("1000");
      setSelectedPermissions(["read:all"]);
      setShowCreateDialog(false);

      // Reload keys
      await loadApiKeys();

      notificationOpen?.({
        type: "success",
        message: "API key created successfully. Save it somewhere safe!",
      });
    } catch (error) {
      notificationOpen?.({
        type: "error",
        message: "Failed to create API key",
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKey = async (key: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKeyId(keyId);
      setTimeout(() => setCopiedKeyId(null), 2000);
      notificationOpen?.({
        type: "success",
        message: "Key copied to clipboard",
      });
    } catch {
      notificationOpen?.({
        type: "error",
        message: "Failed to copy key",
      });
    }
  };

  const handleRotateKey = async (keyId: string) => {
    try {
      if (!userId) return;
      setLoading(true);
      const response = await ApiKeyManager.rotateApiKey(userId, keyId);
      setNewKeyData({
        id: response.id,
        key: response.key,
        key_prefix: response.key_prefix,
      });
      setShowNewKey(true);
      await loadApiKeys();
      notificationOpen?.({
        type: "success",
        message: "API key rotated. Save the new key!",
      });
    } catch (error) {
      notificationOpen?.({
        type: "error",
        message: "Failed to rotate API key",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    try {
      await ApiKeyManager.revokeApiKey(keyId);
      setApiKeys(apiKeys.map((k) => (k.id === keyId ? { ...k, is_active: false } : k)));
      notificationOpen?.({
        type: "success",
        message: "API key revoked",
      });
    } catch (error) {
      notificationOpen?.({
        type: "error",
        message: "Failed to revoke API key",
      });
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    try {
      await ApiKeyManager.deleteApiKey(keyId);
      setApiKeys(apiKeys.filter((k) => k.id !== keyId));
      notificationOpen?.({
        type: "success",
        message: "API key deleted",
      });
    } catch (error) {
      notificationOpen?.({
        type: "error",
        message: "Failed to delete API key",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Keys
              </CardTitle>
              <CardDescription>Manage API keys for programmatic access</CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {apiKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground">No API keys yet. Create one to get started.</p>
            ) : (
              apiKeys.map((key) => (
                <div key={key.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        {key.name}
                        {!key.is_active && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                            Revoked
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground font-mono">
                        {key.key_prefix}****
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Rate Limit</p>
                      <p className="font-semibold">{key.rate_limit} req/min</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Permissions</p>
                      <p className="text-xs">{key.permissions?.length ?? 0} permission(s)</p>
                    </div>
                    {key.last_used_at && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Last Used</p>
                        <p className="text-xs">
                          {new Date(key.last_used_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {key.expires_at && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Expires</p>
                        <p className="text-xs">
                          {new Date(key.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {key.is_active && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRotateKey(key.id)}
                          disabled={loading}
                        >
                          <RotateCw className="w-4 h-4 mr-2" />
                          Rotate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevokeKey(key.id)}
                        >
                          <Lock className="w-4 h-4 mr-2" />
                          Revoke
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteKey(key.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create API Key Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>Generate a new API key for programmatic access</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Key name (e.g., Mobile App, Integration)"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
            />

            <Select value={rateLimit} onValueChange={setRateLimit}>
              <SelectTrigger>
                <SelectValue placeholder="Select rate limit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">Free (100 req/min)</SelectItem>
                <SelectItem value="1000">Pro (1,000 req/min)</SelectItem>
                <SelectItem value="10000">Enterprise (10,000 req/min)</SelectItem>
              </SelectContent>
            </Select>

            <div>
              <p className="text-sm font-semibold mb-2">Permissions</p>
              <div className="space-y-2">
                {Object.entries(API_PERMISSIONS).map(([key, perms]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(perms[0])}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPermissions([...selectedPermissions, perms[0]]);
                        } else {
                          setSelectedPermissions(
                            selectedPermissions.filter((p) => p !== perms[0])
                          );
                        }
                      }}
                      className="rounded"
                    />
                    {key.replace(/_/g, " ")}
                  </label>
                ))}
              </div>
            </div>

            <Button
              onClick={handleCreateKey}
              disabled={!keyName || loading}
              className="w-full"
            >
              Create API Key
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Key Display Dialog */}
      <Dialog open={showNewKey} onOpenChange={setShowNewKey}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your API Key</DialogTitle>
            <DialogDescription>Save this key somewhere safe. You won't be able to see it again!</DialogDescription>
          </DialogHeader>
          {newKeyData && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">Full Key</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono break-all flex-1">
                    {newKeyData.key}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyKey(newKeyData.key, newKeyData.id)}
                  >
                    {copiedKeyId === newKeyData.id ? (
                      <span className="text-xs text-green-600">Copied!</span>
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              <Button
                onClick={() => setShowNewKey(false)}
                className="w-full"
              >
                Got it!
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
