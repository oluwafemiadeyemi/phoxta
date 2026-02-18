import { useState, useRef, useEffect } from "react";
import { useOne, useUpdate, HttpError } from "@refinedev/core";
import dayjs from "dayjs";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@crm/components/ui/dialog";
import { Badge } from "@crm/components/ui/badge";
import {
  Mail,
  Inbox,
  Send,
  AlertCircle,
  Clock,
  FileEdit,
  User,
  Reply,
  ReplyAll,
  Forward,
  Star,
  Archive,
  Trash2,
  Paperclip,
  ChevronDown,
  ChevronUp,
  X,
  MailOpen,
} from "lucide-react";
import { Button } from "@crm/components/ui/button";
import { Separator } from "@crm/components/ui/separator";
import type { Email } from "@crm/types";

interface EmailShowDrawerProps {
  emailId: string | null;
  onClose: () => void;
  onReply?: (email: Email) => void;
  onReplyAll?: (email: Email) => void;
  onForward?: (email: Email) => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Send }> = {
  sent: { label: "Sent", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: Send },
  received: { label: "Received", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: Inbox },
  draft: { label: "Draft", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", icon: FileEdit },
  failed: { label: "Failed", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: AlertCircle },
  queued: { label: "Queued", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: Clock },
};

const categoryBadgeClass: Record<string, string> = {
  general: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  order: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  support: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  marketing: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
};

/** Render HTML email body inside an iframe for proper isolation */
function EmailBodyFrame({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(300);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    // Build a self-contained HTML document for the iframe
    const isDark = document.documentElement.classList.contains("dark");
    const wrapper = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 16px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: ${isDark ? "#e4e4e7" : "#18181b"};
    background: transparent;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  a { color: #2563eb; }
  img { max-width: 100%; height: auto; }
  table { max-width: 100%; }
  blockquote {
    border-left: 3px solid ${isDark ? "#3f3f46" : "#d4d4d8"};
    margin: 8px 0;
    padding: 4px 12px;
    color: ${isDark ? "#a1a1aa" : "#71717a"};
  }
  pre, code {
    background: ${isDark ? "#27272a" : "#f4f4f5"};
    border-radius: 4px;
    padding: 2px 4px;
    font-size: 13px;
  }
  pre { padding: 12px; overflow-x: auto; }
</style>
</head>
<body>${html}</body>
</html>`;

    doc.open();
    doc.write(wrapper);
    doc.close();

    // Make all links open in a new browser tab instead of inside the sandboxed iframe
    const handleLinkClicks = () => {
      const links = doc.querySelectorAll("a[href]");
      links.forEach((link) => {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          const href = link.getAttribute("href");
          if (href && href !== "#" && !href.startsWith("javascript:")) {
            window.open(href, "_blank", "noopener,noreferrer");
          }
        });
      });
    };

    // Auto-size iframe height
    const resize = () => {
      const body = doc.body;
      if (body) {
        const h = Math.max(100, Math.min(body.scrollHeight + 32, 600));
        setHeight(h);
      }
    };
    // Give content time to render (images, etc.)
    resize();
    handleLinkClicks();
    const timers = [
      setTimeout(() => { resize(); handleLinkClicks(); }, 100),
      setTimeout(resize, 500),
      setTimeout(resize, 1500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [html]);

  return (
    <iframe
      ref={iframeRef}
      title="Email content"
      sandbox="allow-same-origin"
      className="w-full border-0 rounded-lg bg-background"
      style={{ height }}
    />
  );
}

/** Get sender initials */
function getInitials(name?: string, address?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : (parts[0]?.[0] || "?").toUpperCase();
  }
  return (address?.[0] || "?").toUpperCase();
}

export function EmailShowDrawer({ emailId, onClose, onReply, onReplyAll, onForward }: EmailShowDrawerProps) {
  const [showDetails, setShowDetails] = useState(false);

  const { result, query: { isLoading } } = useOne<Email, HttpError>({
    resource: "emails",
    id: emailId || "",
    queryOptions: { enabled: !!emailId },
  });

  const { mutate: updateEmail } = useUpdate();

  const email = result;

  const handleToggleStar = () => {
    if (!email) return;
    updateEmail({ resource: "emails", id: email.id, values: { isStarred: !email.isStarred } });
  };

  const handleMoveToFolder = (folder: Email["folder"]) => {
    if (!email) return;
    updateEmail(
      { resource: "emails", id: email.id, values: { folder } },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Dialog open={!!emailId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Hidden title for accessibility */}
        <DialogTitle className="sr-only">
          {email?.subject || "Email"}
        </DialogTitle>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading email...</p>
            </div>
          </div>
        ) : email ? (
          <>
            {/* ── Top Action Bar ── */}
            <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-1.5">
                {onReply && (
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { onReply(email); onClose(); }}>
                    <Reply className="h-3.5 w-3.5" /> Reply
                  </Button>
                )}
                {onReplyAll && (
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { onReplyAll(email); onClose(); }}>
                    <ReplyAll className="h-3.5 w-3.5" /> Reply All
                  </Button>
                )}
                {onForward && (
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { onForward(email); onClose(); }}>
                    <Forward className="h-3.5 w-3.5" /> Forward
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleToggleStar}
                  title={email.isStarred ? "Unstar" : "Star"}
                >
                  <Star className={`h-4 w-4 ${email.isStarred ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`} />
                </Button>
                {email.folder !== "archive" && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMoveToFolder("archive")} title="Archive">
                    <Archive className="h-4 w-4" />
                  </Button>
                )}
                {email.folder !== "trash" ? (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleMoveToFolder("trash")} title="Trash">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMoveToFolder("inbox")} title="Move to Inbox">
                    <Inbox className="h-4 w-4" />
                  </Button>
                )}
                <Separator orientation="vertical" className="h-5 mx-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} title="Close">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* ── Scrollable content ── */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-5">
                {/* Subject + Badges */}
                <div className="flex items-start gap-3 mb-5">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold leading-tight mb-2">
                      {email.subject || "(No subject)"}
                    </h2>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(() => {
                        const st = statusConfig[email.status] || statusConfig.sent;
                        const StatusIcon = st.icon;
                        return (
                          <Badge className={`${st.color} gap-1`}>
                            <StatusIcon className="h-3 w-3" />
                            {st.label}
                          </Badge>
                        );
                      })()}
                      <Badge className={categoryBadgeClass[email.category] || categoryBadgeClass.general}>
                        {email.category.charAt(0).toUpperCase() + email.category.slice(1)}
                      </Badge>
                      {email.hasAttachments && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Paperclip className="h-3 w-3" />
                          Attachments
                        </Badge>
                      )}
                      {email.isRead === false && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 gap-1 text-xs">
                          <MailOpen className="h-3 w-3" />
                          Unread
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sender card */}
                <div className="rounded-xl border bg-card p-4 mb-5">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                      {getInitials(email.fromName, email.fromAddress)}
                    </div>

                    {/* Sender info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="font-semibold text-sm truncate">
                          {email.fromName || email.fromAddress}
                        </span>
                        {email.fromName && (
                          <span className="text-xs text-muted-foreground truncate">
                            &lt;{email.fromAddress}&gt;
                          </span>
                        )}
                      </div>

                      {/* Compact To line */}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="shrink-0">To:</span>
                        <span className="truncate">
                          {(email.toAddresses || []).join(", ") || "—"}
                        </span>
                      </div>

                      {/* Expandable details */}
                      {showDetails && (
                        <div className="mt-2 space-y-1.5 text-xs text-muted-foreground animate-in slide-in-from-top-2 duration-200">
                          {email.ccAddresses && email.ccAddresses.length > 0 && (
                            <div className="flex gap-1">
                              <span className="shrink-0 font-medium">Cc:</span>
                              <span>{email.ccAddresses.join(", ")}</span>
                            </div>
                          )}
                          {email.bccAddresses && email.bccAddresses.length > 0 && (
                            <div className="flex gap-1">
                              <span className="shrink-0 font-medium">Bcc:</span>
                              <span>{email.bccAddresses.join(", ")}</span>
                            </div>
                          )}
                          {email.messageId && (
                            <div className="flex gap-1">
                              <span className="shrink-0 font-medium">Message-ID:</span>
                              <span className="truncate font-mono">{email.messageId}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Date + expand */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {email.sentAt
                          ? dayjs(email.sentAt).format("MMM D, YYYY h:mm A")
                          : dayjs(email.createdAt).format("MMM D, YYYY h:mm A")}
                      </span>
                      <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
                      >
                        {showDetails ? (
                          <>Less <ChevronUp className="h-3 w-3" /></>
                        ) : (
                          <>Details <ChevronDown className="h-3 w-3" /></>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Error banner */}
                {email.status === "failed" && email.errorMessage && (
                  <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 mb-5">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-destructive">Delivery Failed</p>
                        <p className="text-xs text-destructive/80 mt-0.5">{email.errorMessage}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Email Body ── */}
                <div className="rounded-xl border bg-background overflow-hidden">
                  {email.body ? (
                    email.body.includes("<") ? (
                      // HTML email — render in iframe for proper isolation
                      <EmailBodyFrame html={email.body} />
                    ) : (
                      // Plain text email
                      <div className="p-5 text-sm leading-relaxed whitespace-pre-wrap">
                        {email.body}
                      </div>
                    )
                  ) : (
                    <div className="p-8 text-center text-sm text-muted-foreground italic">
                      No content
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Bottom quick-reply bar ── */}
            {onReply && (
              <div className="px-5 py-3 border-t bg-muted/20">
                <Button
                  variant="outline"
                  className="w-full justify-start text-muted-foreground hover:text-foreground gap-2 h-10"
                  onClick={() => { onReply(email); onClose(); }}
                >
                  <Reply className="h-4 w-4 shrink-0" />
                  <span className="truncate">Reply to {email.fromName || email.fromAddress}</span>
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-2">
            <Mail className="h-8 w-8" />
            <p>Email not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
