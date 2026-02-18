import { useState } from "react";
import { useList, useCreate, useUpdate, useDelete, HttpError } from "@refinedev/core";
import { toast } from "sonner";
import {
  Mail,
  Plus,
  Edit,
  Trash2,
  Check,
  Star,
  Globe,
  Shield,
  Loader2,
  Wifi,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@crm/components/ui/card";
import { Button } from "@crm/components/ui/button";
import { Badge } from "@crm/components/ui/badge";
import { Input } from "@crm/components/ui/input";
import { Label } from "@crm/components/ui/label";
import { Switch } from "@crm/components/ui/switch";
import { Separator } from "@crm/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@crm/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@crm/components/ui/alert-dialog";
import type { EmailAccount } from "@crm/types";

const providerConfig: Record<string, { label: string; color: string; icon: string }> = {
  gmail: { label: "Gmail", color: "bg-red-100 text-red-700", icon: "G" },
  outlook: { label: "Outlook", color: "bg-blue-100 text-blue-700", icon: "O" },
  smtp: { label: "Custom SMTP", color: "bg-gray-100 text-gray-700", icon: "S" },
};

export function EmailAccountSettings() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    provider: "smtp" as EmailAccount["provider"],
    label: "",
    emailAddress: "",
    displayName: "",
    smtpHost: "",
    smtpPort: "587",
    smtpUser: "",
    smtpPass: "",
    smtpSecure: true,
    imapHost: "",
    imapPort: "993",
    imapSecure: true,
    isDefault: false,
  });

  const { result: accountsResult, query: { isLoading } } = useList<EmailAccount, HttpError>({
    resource: "emailAccounts",
    pagination: { currentPage: 1, pageSize: 50 },
    sorters: [{ field: "createdAt", order: "asc" }],
  });
  const accounts = accountsResult?.data ?? [];

  const { mutate: createAccount } = useCreate();
  const { mutate: updateAccount } = useUpdate();
  const { mutate: deleteAccount } = useDelete();

  const openCreate = () => {
    setEditId(null);
    setForm({
      provider: "smtp",
      label: "",
      emailAddress: "",
      displayName: "",
      smtpHost: "",
      smtpPort: "587",
      smtpUser: "",
      smtpPass: "",
      smtpSecure: true,
      imapHost: "",
      imapPort: "993",
      imapSecure: true,
      isDefault: accounts.length === 0,
    });
    setDialogOpen(true);
  };

  const openEdit = (acc: EmailAccount) => {
    setEditId(acc.id);
    setForm({
      provider: acc.provider,
      label: acc.label,
      emailAddress: acc.emailAddress,
      displayName: acc.displayName,
      smtpHost: acc.smtpHost || "",
      smtpPort: String(acc.smtpPort || 587),
      smtpUser: acc.smtpUser || "",
      smtpPass: "", // Don't show existing password
      smtpSecure: acc.smtpSecure ?? true,
      imapHost: acc.imapHost || "",
      imapPort: String(acc.imapPort || 993),
      imapSecure: acc.imapSecure ?? true,
      isDefault: acc.isDefault,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.emailAddress.trim()) return;
    setIsSaving(true);

    const values: Record<string, any> = {
      provider: form.provider,
      label: form.label || form.emailAddress,
      emailAddress: form.emailAddress,
      displayName: form.displayName,
      isDefault: form.isDefault,
      isActive: true,
    };

    if (form.provider === "smtp") {
      values.smtpHost = form.smtpHost;
      values.smtpPort = parseInt(form.smtpPort) || 587;
      values.smtpUser = form.smtpUser || form.emailAddress;
      if (form.smtpPass) values.smtpPass = form.smtpPass;
      values.smtpSecure = form.smtpSecure;
      values.imapHost = form.imapHost;
      values.imapPort = parseInt(form.imapPort) || 993;
      values.imapSecure = form.imapSecure;
    }

    if (form.provider === "gmail") {
      values.smtpHost = "smtp.gmail.com";
      values.smtpPort = 587;
      values.smtpUser = form.emailAddress;
      if (form.smtpPass) values.smtpPass = form.smtpPass;
      values.smtpSecure = true;
      values.imapHost = "imap.gmail.com";
      values.imapPort = 993;
      values.imapSecure = true;
    }

    if (form.provider === "outlook") {
      values.smtpHost = "smtp.office365.com";
      values.smtpPort = 587;
      values.smtpUser = form.emailAddress;
      if (form.smtpPass) values.smtpPass = form.smtpPass;
      values.smtpSecure = true;
      values.imapHost = "outlook.office365.com";
      values.imapPort = 993;
      values.imapSecure = true;
    }

    if (editId) {
      updateAccount(
        { resource: "emailAccounts", id: editId, values },
        {
          onSuccess: () => { setIsSaving(false); setDialogOpen(false); },
          onError: () => setIsSaving(false),
        },
      );
    } else {
      createAccount(
        { resource: "emailAccounts", values },
        {
          onSuccess: () => { setIsSaving(false); setDialogOpen(false); },
          onError: () => setIsSaving(false),
        },
      );
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteAccount(
        { resource: "emailAccounts", id: deleteId },
        { onSuccess: () => setDeleteId(null) },
      );
    }
  };

  const handleSetDefault = (accountId: string) => {
    updateAccount({
      resource: "emailAccounts",
      id: accountId,
      values: { isDefault: true },
    });
    // Unset default on others
    accounts
      .filter((a) => a.id !== accountId && a.isDefault)
      .forEach((a) => {
        updateAccount({
          resource: "emailAccounts",
          id: a.id,
          values: { isDefault: false },
        });
      });
  };

  const handleTestConnection = async (accountId: string) => {
    setTestingId(accountId);
    try {
      const res = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.details || result.error || "Test failed");
        setTestingId(null);
        return;
      }
      const smtpOk = result.smtp?.ok;
      const imapOk = result.imap?.ok;
      if (smtpOk && imapOk) {
        toast.success("Both SMTP and IMAP connections successful!");
      } else if (smtpOk && !imapOk) {
        toast("SMTP OK, but IMAP failed", {
          description: result.imap?.message || "Check IMAP settings",
          icon: <XCircle className="h-4 w-4 text-orange-500" />,
        });
      } else if (!smtpOk && imapOk) {
        toast("IMAP OK, but SMTP failed", {
          description: result.smtp?.message || "Check SMTP settings",
          icon: <XCircle className="h-4 w-4 text-orange-500" />,
        });
      } else {
        toast.error("Both connections failed", {
          description: `SMTP: ${result.smtp?.message || "Error"} | IMAP: ${result.imap?.message || "Error"}`,
        });
      }
    } catch (err: any) {
      toast.error(err?.message || "Connection test failed");
    }
    setTestingId(null);
  };

  const update = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Accounts
            </CardTitle>
            <CardDescription>
              Connect your Gmail, Outlook, or custom SMTP to send emails
            </CardDescription>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Add Account
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed rounded-lg">
            <Mail className="h-10 w-10 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium">No email accounts</p>
            <p className="text-xs text-muted-foreground mb-3">
              Add a Gmail, Outlook, or SMTP account to start sending emails
            </p>
            <Button size="sm" variant="outline" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Add Account
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((acc) => {
              const prov = providerConfig[acc.provider] || providerConfig.smtp;
              return (
                <div
                  key={acc.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-bold text-sm ${prov.color}`}>
                      {prov.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{acc.label || acc.emailAddress}</p>
                        {acc.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 mr-0.5" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{acc.emailAddress}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={testingId === acc.id}
                      onClick={() => handleTestConnection(acc.id)}
                    >
                      {testingId === acc.id ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <Wifi className="h-3.5 w-3.5 mr-1" />
                      )}
                      Test
                    </Button>
                    {!acc.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleSetDefault(acc.id)}
                      >
                        Set Default
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(acc)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(acc.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Email Account" : "Add Email Account"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 overflow-y-auto flex-1 pr-2">
            {/* Provider */}
            <div className="grid gap-2">
              <Label>Provider</Label>
              <Select value={form.provider} onValueChange={(v) => update("provider", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gmail">
                    <span className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold">G</span>
                      Gmail
                    </span>
                  </SelectItem>
                  <SelectItem value="outlook">
                    <span className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">O</span>
                      Outlook / Office 365
                    </span>
                  </SelectItem>
                  <SelectItem value="smtp">
                    <span className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded bg-gray-100 text-gray-700 flex items-center justify-center text-xs font-bold">S</span>
                      Custom SMTP
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Label & Display Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Label</Label>
                <Input placeholder="e.g. Work Email" value={form.label} onChange={(e) => update("label", e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Display Name</Label>
                <Input placeholder="e.g. John Smith" value={form.displayName} onChange={(e) => update("displayName", e.target.value)} />
              </div>
            </div>

            {/* Email Address */}
            <div className="grid gap-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder={form.provider === "gmail" ? "you@gmail.com" : form.provider === "outlook" ? "you@outlook.com" : "you@yourdomain.com"}
                value={form.emailAddress}
                onChange={(e) => update("emailAddress", e.target.value)}
              />
            </div>

            {/* Password / App Password */}
            <div className="grid gap-2">
              <Label>
                {form.provider === "gmail"
                  ? "App Password"
                  : form.provider === "outlook"
                    ? "Password"
                    : "SMTP Password"}
              </Label>
              <Input
                type="password"
                placeholder={editId ? "Leave blank to keep current" : "Enter password"}
                value={form.smtpPass}
                onChange={(e) => update("smtpPass", e.target.value)}
              />
              {form.provider === "gmail" && (
                <p className="text-xs text-muted-foreground">
                  Use a Google App Password. Go to Google Account &gt; Security &gt; 2-Step Verification &gt; App passwords
                </p>
              )}
            </div>

            {/* SMTP Settings (only for custom) */}
            {form.provider === "smtp" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>SMTP Host</Label>
                    <Input placeholder="smtp.yourdomain.com" value={form.smtpHost} onChange={(e) => update("smtpHost", e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>SMTP Port</Label>
                    <Input placeholder="587" value={form.smtpPort} onChange={(e) => update("smtpPort", e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>SMTP Username</Label>
                  <Input placeholder="Same as email by default" value={form.smtpUser} onChange={(e) => update("smtpUser", e.target.value)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Use TLS/SSL (SMTP)</Label>
                    <p className="text-xs text-muted-foreground">Encrypt outgoing connection</p>
                  </div>
                  <Switch checked={form.smtpSecure} onCheckedChange={(v) => update("smtpSecure", v)} />
                </div>

                {/* IMAP settings for inbox fetching */}
                <Separator className="my-1" />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Inbox (IMAP) Settings</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>IMAP Host</Label>
                    <Input placeholder="imap.yourdomain.com" value={form.imapHost} onChange={(e) => update("imapHost", e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>IMAP Port</Label>
                    <Input placeholder="993" value={form.imapPort} onChange={(e) => update("imapPort", e.target.value)} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Use TLS/SSL (IMAP)</Label>
                    <p className="text-xs text-muted-foreground">Encrypt incoming connection</p>
                  </div>
                  <Switch checked={form.imapSecure} onCheckedChange={(v) => update("imapSecure", v)} />
                </div>
              </>
            )}

            {/* Default toggle */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <Label>Set as Default</Label>
                <p className="text-xs text-muted-foreground">Use this account by default when composing</p>
              </div>
              <Switch checked={form.isDefault} onCheckedChange={(v) => update("isDefault", v)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving || !form.emailAddress.trim()}>
              {isSaving ? "Saving..." : editId ? "Update" : "Add Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open: boolean) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Email Account</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this email account. You won't be able to send from it anymore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
