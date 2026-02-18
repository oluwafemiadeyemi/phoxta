import { useState, useEffect } from "react";
import { useCreate, useList, HttpError } from "@refinedev/core";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@crm/components/ui/dialog";
import { Button } from "@crm/components/ui/button";
import { Input } from "@crm/components/ui/input";
import { Label } from "@crm/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/components/ui/select";
import { Badge } from "@crm/components/ui/badge";
import { HtmlEmailEditor } from "@crm/components/email/html-email-editor";
import {
  Loader2,
  Send,
  X,
  FileText,
  Plus,
  User,
  Reply,
  ReplyAll,
  Forward,
  Save,
  AlertCircle,
} from "lucide-react";
import type { EmailAccount, EmailTemplate, Email } from "@crm/types";

type ComposeMode = "compose" | "reply" | "replyAll" | "forward";

interface EmailComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Compose mode: new email, reply, reply-all, or forward */
  mode?: ComposeMode;
  /** Original email for reply / forward context */
  originalEmail?: Email | null;
  /** Pre-fill fields when composing from orders, contacts, etc. */
  prefill?: {
    to?: string;
    subject?: string;
    body?: string;
    category?: Email["category"];
    contactId?: string;
    customerId?: string;
    orderId?: string;
    dealId?: string;
  };
}

const CATEGORIES: { value: Email["category"]; label: string }[] = [
  { value: "general", label: "General" },
  { value: "order", label: "Order" },
  { value: "support", label: "Support" },
  { value: "marketing", label: "Marketing" },
];

export function EmailComposeDialog({ open, onOpenChange, mode = "compose", originalEmail, prefill }: EmailComposeDialogProps) {
  const [form, setForm] = useState({
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    body: "",
    category: "general" as Email["category"],
    accountId: "",
    templateId: "",
  });

  const [isSending, setIsSending] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Load user's email accounts
  const { result: accountsResult } = useList<EmailAccount, HttpError>({
    resource: "emailAccounts",
    pagination: { currentPage: 1, pageSize: 50 },
    filters: [{ field: "isActive", operator: "eq", value: true }],
  });
  const accounts = accountsResult?.data ?? [];

  // Load email templates
  const { result: templatesResult } = useList<EmailTemplate, HttpError>({
    resource: "emailTemplates",
    pagination: { currentPage: 1, pageSize: 50 },
    filters: [{ field: "isActive", operator: "eq", value: true }],
  });
  const templates = templatesResult?.data ?? [];

  const { mutate: createEmail } = useCreate();

  // Reset form when dialog opens – populate based on mode
  useEffect(() => {
    if (open) {
      let to = prefill?.to || "";
      let cc = "";
      let subject = prefill?.subject || "";
      let body = prefill?.body || "";
      let category: Email["category"] = prefill?.category || "general";
      let showCcNow = false;

      if (originalEmail && mode !== "compose") {
        const quotedDate = originalEmail.sentAt || originalEmail.createdAt;
        const quotedHeader = `<br/><br/><hr/><p>On ${new Date(quotedDate).toLocaleString()}, ${originalEmail.fromName || originalEmail.fromAddress} wrote:</p>`;
        const quotedBody = `${quotedHeader}<blockquote style="border-left:2px solid #ccc;padding-left:12px;margin-left:0;color:#555">${originalEmail.body || ""}</blockquote>`;

        if (mode === "reply") {
          to = originalEmail.fromAddress;
          subject = originalEmail.subject?.startsWith("Re:") ? originalEmail.subject : `Re: ${originalEmail.subject}`;
          body = quotedBody;
          category = originalEmail.category;
        } else if (mode === "replyAll") {
          to = originalEmail.fromAddress;
          // Add all original To/CC minus the current sender account
          const otherRecipients = [
            ...(originalEmail.toAddresses || []),
            ...(originalEmail.ccAddresses || []),
          ].filter((addr) => addr !== originalEmail.fromAddress);
          cc = otherRecipients.join(", ");
          showCcNow = otherRecipients.length > 0;
          subject = originalEmail.subject?.startsWith("Re:") ? originalEmail.subject : `Re: ${originalEmail.subject}`;
          body = quotedBody;
          category = originalEmail.category;
        } else if (mode === "forward") {
          to = "";
          subject = originalEmail.subject?.startsWith("Fwd:") ? originalEmail.subject : `Fwd: ${originalEmail.subject}`;
          body = `<br/><br/><hr/><p>---------- Forwarded message ----------</p><p>From: ${originalEmail.fromName || ""} &lt;${originalEmail.fromAddress}&gt;<br/>Date: ${new Date(quotedDate).toLocaleString()}<br/>Subject: ${originalEmail.subject}<br/>To: ${(originalEmail.toAddresses || []).join(", ")}</p>${originalEmail.body || ""}`;
          category = originalEmail.category;
        }
      }

      setForm({
        to,
        cc,
        bcc: "",
        subject,
        body,
        category,
        accountId: accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || "",
        templateId: "",
      });
      setShowCc(showCcNow);
      setShowBcc(false);
      setSendError(null);
    }
  }, [open, prefill, mode, originalEmail]);

  // Update default account once accounts load
  useEffect(() => {
    if (accounts.length > 0 && !form.accountId) {
      const defaultAccount = accounts.find((a) => a.isDefault) || accounts[0];
      if (defaultAccount) {
        setForm((f) => ({ ...f, accountId: defaultAccount.id }));
      }
    }
  }, [accounts]);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setForm((f) => ({
        ...f,
        templateId,
        subject: template.subject || f.subject,
        body: template.body || f.body,
        category: template.category || f.category,
      }));
    }
  };

  const parseRecipients = (str: string): string[] =>
    str
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.includes("@"));

  /** Generate a plain-text snippet from HTML body */
  const makeSnippet = (html: string) =>
    html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 200);

  /** Generate an RFC 5322 Message-ID */
  const makeMessageId = () =>
    `<${crypto.randomUUID()}@phoxta.app>`;

  const buildEmailValues = (status: "queued" | "draft", folder: "sent" | "drafts") => {
    const toList = parseRecipients(form.to);
    const selectedAccount = accounts.find((a) => a.id === form.accountId);

    return {
      accountId: form.accountId || null,
      templateId: form.templateId || null,
      // RFC 5322 headers
      messageId: makeMessageId(),
      inReplyTo: (mode === "reply" || mode === "replyAll") ? originalEmail?.messageId || null : null,
      threadId: (mode === "reply" || mode === "replyAll") ? (originalEmail?.threadId || originalEmail?.messageId || null) : null,
      // Addressing
      fromAddress: selectedAccount?.emailAddress || "",
      fromName: selectedAccount?.displayName || "",
      toAddresses: toList,
      ccAddresses: parseRecipients(form.cc),
      bccAddresses: parseRecipients(form.bcc),
      replyTo: selectedAccount?.emailAddress || "",
      // Content
      subject: form.subject,
      body: form.body,
      snippet: makeSnippet(form.body),
      // Classification
      status,
      category: form.category,
      folder,
      // Flags
      isRead: true,
      isStarred: false,
      hasAttachments: false,
      labels: [],
      // Relations
      contactId: prefill?.contactId || null,
      customerId: prefill?.customerId || null,
      orderId: prefill?.orderId || null,
      dealId: prefill?.dealId || null,
      sentAt: status === "queued" ? new Date().toISOString() : null,
    };
  };

  /** Save email as draft without sending */
  const handleSaveDraft = () => {
    setIsSavingDraft(true);
    setSendError(null);
    const values = buildEmailValues("draft", "drafts");

    createEmail(
      { resource: "emails", values },
      {
        onSuccess: () => {
          setIsSavingDraft(false);
          toast.success("Draft saved successfully");
          onOpenChange(false);
        },
        onError: (error) => {
          setIsSavingDraft(false);
          const msg = error?.message || "Failed to save draft";
          toast.error(msg);
          setSendError(msg);
        },
      },
    );
  };

  const handleSend = () => {
    const toList = parseRecipients(form.to);
    if (toList.length === 0) {
      setSendError("Please enter at least one valid recipient.");
      return;
    }
    if (!form.accountId) {
      setSendError("Please select a sending account.");
      return;
    }

    setIsSending(true);
    setSendError(null);
    const selectedAccount = accounts.find((a) => a.id === form.accountId);
    const values = buildEmailValues("queued", "sent");

    createEmail(
      { resource: "emails", values },
      {
        onSuccess: async (data) => {
          // Call Next.js API route to actually send the email via SMTP
          try {
            const emailId = (data as any)?.data?.id;
            const res = await fetch("/api/email/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                emailId,
                to: toList,
                cc: parseRecipients(form.cc),
                bcc: parseRecipients(form.bcc),
                subject: form.subject,
                body: form.body,
                fromAddress: selectedAccount?.emailAddress || "",
                fromName: selectedAccount?.displayName || "",
                accountId: form.accountId,
              }),
            });
            if (!res.ok) {
              const err = await res.json().catch(() => ({ error: "Unknown server error" }));
              const detail = err.details || err.error || "Failed to send email";
              setIsSending(false);
              setSendError(detail);
              toast.error(detail);
              return; // Keep dialog open so user can retry
            }
            setIsSending(false);
            toast.success("Email sent successfully");
            onOpenChange(false);
          } catch (err: any) {
            const msg = err?.message || "Network error — could not reach send API";
            setIsSending(false);
            setSendError(msg);
            toast.error(msg);
            // Keep dialog open
          }
        },
        onError: (error) => {
          setIsSending(false);
          const msg = error?.message || "Failed to create email record";
          setSendError(msg);
          toast.error(msg);
        },
      },
    );
  };

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-5xl h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* ---- Header bar ---- */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            {mode === "reply" && <Reply className="h-5 w-5" />}
            {mode === "replyAll" && <ReplyAll className="h-5 w-5" />}
            {mode === "forward" && <Forward className="h-5 w-5" />}
            {mode === "compose" && <Send className="h-5 w-5" />}
            {mode === "reply" ? "Reply" : mode === "replyAll" ? "Reply All" : mode === "forward" ? "Forward" : "Compose Email"}
          </DialogTitle>
          <div className="flex items-center gap-2">
            {/* Template & Category inline */}
            <Select value={form.templateId} onValueChange={handleTemplateSelect}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="Template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No template</SelectItem>
                {templates.map((tpl) => (
                  <SelectItem key={tpl.id} value={tpl.id}>
                    <span className="flex items-center gap-2">
                      <FileText className="h-3 w-3" />
                      {tpl.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={form.category} onValueChange={(v) => update("category", v)}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ---- Compact addressing fields ---- */}
        <div className="shrink-0 border-b px-5 py-3 space-y-2">
          {/* Error banner */}
          {sendError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive mb-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Send failed</p>
                <p className="text-xs mt-0.5 opacity-90">{sendError}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => setSendError(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {accounts.length === 0 && (
            <div className="rounded-lg border border-dashed p-3 text-center">
              <p className="text-sm text-muted-foreground">
                No email accounts configured. Add one in Settings to send emails.
              </p>
            </div>
          )}

          {/* From */}
          {accounts.length > 0 && (
            <div className="flex items-center gap-3">
              <Label className="text-xs text-muted-foreground w-12 shrink-0 text-right">From</Label>
              <Select value={form.accountId} onValueChange={(v) => update("accountId", v)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {acc.provider.toUpperCase()}
                        </Badge>
                        {acc.displayName || acc.emailAddress}
                        {acc.displayName && (
                          <span className="text-muted-foreground text-xs ml-1">
                            &lt;{acc.emailAddress}&gt;
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* To */}
          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground w-12 shrink-0 text-right">To</Label>
            <Input
              placeholder="recipient@example.com (comma-separated)"
              value={form.to}
              onChange={(e) => update("to", e.target.value)}
              className="h-8 text-sm"
            />
            <div className="flex items-center gap-0.5 shrink-0">
              {!showCc && (
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setShowCc(true)}>
                  Cc
                </Button>
              )}
              {!showBcc && (
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setShowBcc(true)}>
                  Bcc
                </Button>
              )}
            </div>
          </div>

          {/* Cc */}
          {showCc && (
            <div className="flex items-center gap-3">
              <Label className="text-xs text-muted-foreground w-12 shrink-0 text-right">Cc</Label>
              <Input
                placeholder="cc@example.com"
                value={form.cc}
                onChange={(e) => update("cc", e.target.value)}
                className="h-8 text-sm"
              />
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => { setShowCc(false); update("cc", ""); }}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Bcc */}
          {showBcc && (
            <div className="flex items-center gap-3">
              <Label className="text-xs text-muted-foreground w-12 shrink-0 text-right">Bcc</Label>
              <Input
                placeholder="bcc@example.com"
                value={form.bcc}
                onChange={(e) => update("bcc", e.target.value)}
                className="h-8 text-sm"
              />
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => { setShowBcc(false); update("bcc", ""); }}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Subject */}
          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground w-12 shrink-0 text-right">Subject</Label>
            <Input
              placeholder="Email subject"
              value={form.subject}
              onChange={(e) => update("subject", e.target.value)}
              className="h-8 text-sm font-medium"
            />
          </div>
        </div>

        {/* ---- Editor (takes all remaining space) ---- */}
        <div className="flex-1 min-h-0 flex flex-col">
          <HtmlEmailEditor
            value={form.body}
            onChange={(html) => update("body", html)}
            className="flex-1"
          />
        </div>

        {/* ---- Footer actions ---- */}
        <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/30 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || isSending}
            >
              {isSavingDraft ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Save Draft
                </>
              )}
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={isSending || isSavingDraft || !form.to.trim()}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Sending...
                </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-1" />
                {mode === "reply" || mode === "replyAll" ? "Send Reply" : mode === "forward" ? "Forward" : "Send Email"}
              </>
            )}
          </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
