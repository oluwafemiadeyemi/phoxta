import { useState, useCallback, useEffect, useRef } from "react";
import { useTable, useDelete, useUpdate, useUpdateMany, useList, HttpError } from "@refinedev/core";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  Mail,
  Inbox,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertCircle,
  Clock,
  FileEdit,
  Trash2,
  Eye,
  Filter,
  RefreshCw,
  User,
  ShoppingCart,
  Headphones,
  Megaphone,
  MailOpen,
  Loader2,
  Download,
  CheckCheck,
  Star,
  Archive,
  MailX,
  CheckSquare2,
  Square,
  MailMinus,
  Paperclip,
} from "lucide-react";
import { Card } from "@crm/components/ui/card";
import { Button } from "@crm/components/ui/button";
import { Badge } from "@crm/components/ui/badge";
import { Input } from "@crm/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@crm/components/ui/table";
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
import { Tabs, TabsList, TabsTrigger } from "@crm/components/ui/tabs";
import type { Email, EmailAccount } from "@crm/types";
import { EmailComposeDialog } from "@crm/components/email/compose-dialog";
import { EmailShowDrawer } from "@crm/components/email/show-drawer";

dayjs.extend(relativeTime);

/* ---------- status / category config ---------- */

const statusConfig: Record<string, { label: string; color: string; icon: typeof Send }> = {
  sent: { label: "Sent", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: Send },
  received: { label: "Received", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: Inbox },
  draft: { label: "Draft", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", icon: FileEdit },
  failed: { label: "Failed", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: AlertCircle },
  queued: { label: "Queued", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: Clock },
};

const categoryConfig: Record<string, { label: string; color: string; icon: typeof Mail }> = {
  general: { label: "General", color: "bg-slate-100 text-slate-700", icon: Mail },
  order: { label: "Order", color: "bg-amber-100 text-amber-700", icon: ShoppingCart },
  support: { label: "Support", color: "bg-purple-100 text-purple-700", icon: Headphones },
  marketing: { label: "Marketing", color: "bg-pink-100 text-pink-700", icon: Megaphone },
};

type Folder = "inbox" | "sent" | "drafts" | "archive" | "trash" | "starred";

const folderTabs: { value: Folder; label: string; icon: typeof Inbox }[] = [
  { value: "inbox", label: "Inbox", icon: Inbox },
  { value: "sent", label: "Sent", icon: Send },
  { value: "drafts", label: "Drafts", icon: FileEdit },
  { value: "starred", label: "Starred", icon: Star },
  { value: "archive", label: "Archive", icon: Archive },
  { value: "trash", label: "Trash", icon: Trash2 },
];

/* ---------- component ---------- */

export default function EmailList() {
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeMode, setComposeMode] = useState<"compose" | "reply" | "replyAll" | "forward">("compose");
  const [composeOriginal, setComposeOriginal] = useState<Email | null>(null);
  const [showId, setShowId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [activeFolder, setActiveFolder] = useState<Folder>("inbox");
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [syncMessage, setSyncMessage] = useState("");

  /* -- Email accounts (for sync) -- */
  const { result: accountsResult } = useList<EmailAccount, HttpError>({
    resource: "emailAccounts",
    pagination: { currentPage: 1, pageSize: 50 },
    filters: [{ field: "isActive", operator: "eq", value: true }],
  });
  const accounts = accountsResult?.data ?? [];

  /* -- Email table -- */
  const {
    tableQuery: { data, isLoading, refetch },
    currentPage: current,
    setCurrentPage: setCurrent,
    pageCount,
    setFilters,
  } = useTable<Email, HttpError>({
    resource: "emails",
    pagination: { currentPage: 1, pageSize: 25 },
    sorters: { initial: [{ field: "createdAt", order: "desc" }] },
    filters: {
      initial: [{ field: "folder", operator: "eq", value: "inbox" }],
    },
  });

  const { mutate: deleteEmail } = useDelete();
  const { mutate: updateEmail } = useUpdate();
  const { mutate: updateManyEmails } = useUpdateMany();

  const emails = data?.data ?? [];
  const total = data?.total ?? 0;

  /* ---- Folder switching ---- */
  const switchFolder = (folder: Folder) => {
    setActiveFolder(folder);
    setSearchText("");
    setCategoryFilter("all");
    setCurrent(1);
    setSelectedIds(new Set());
    applyFilters("", "all", folder);
  };

  /* ---- Filter logic ---- */
  const applyFilters = useCallback(
    (search: string, category: string, folder: Folder) => {
      const newFilters: any[] = [];

      // "starred" is a virtual folder: filter by isStarred flag across all folders
      if (folder === "starred") {
        newFilters.push({ field: "isStarred", operator: "eq", value: true });
      } else {
        newFilters.push({ field: "folder", operator: "eq", value: folder });
      }

      if (search) {
        newFilters.push({ field: "subject", operator: "contains", value: search });
      }
      if (category !== "all") {
        newFilters.push({ field: "category", operator: "eq", value: category });
      }
      setFilters(newFilters, "replace");
    },
    [setFilters],
  );

  const handleSearch = (value: string) => {
    setSearchText(value);
    applyFilters(value, categoryFilter, activeFolder);
  };

  const handleCategoryFilter = (value: string) => {
    setCategoryFilter(value);
    applyFilters(searchText, value, activeFolder);
  };

  /* ---- Sync inbox ---- */
  const handleSync = async () => {
    if (accounts.length === 0) {
      setSyncMessage("No email accounts connected. Add one in Settings → Email Accounts.");
      setTimeout(() => setSyncMessage(""), 4000);
      return;
    }
    setIsSyncing(true);
    setSyncMessage("");

    let totalFetched = 0;

    for (const account of accounts) {
      try {
        const res = await fetch("/api/email/fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId: account.id }),
        });
        const result = await res.json();
        if (!res.ok) {
          console.warn(`Sync failed for ${account.label}:`, result.error || result.details);
          setSyncMessage(`Sync error: ${result.details || result.error || "Unknown error"}`);
          setTimeout(() => setSyncMessage(""), 6000);
        } else if (result.fetched) {
          totalFetched += result.fetched;
        }
      } catch (err) {
        console.warn(`Sync failed for account ${account.label}:`, err);
      }
    }

    setIsSyncing(false);
    if (!syncMessage) {
      setSyncMessage(
        totalFetched > 0
          ? `Synced ${totalFetched} new email${totalFetched > 1 ? "s" : ""}`
          : "Inbox is up to date",
      );
      setTimeout(() => setSyncMessage(""), 4000);
    }

    // Refresh the table to show new emails
    refetch();
  };

  /* ---- Auto-sync: poll every 60s + initial sync on mount ---- */
  const autoSyncRef = useRef(false);
  useEffect(() => {
    // Silently sync in the background (no UI spinners for auto-sync)
    const silentSync = async () => {
      if (accounts.length === 0) return;
      for (const account of accounts) {
        try {
          await fetch("/api/email/fetch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accountId: account.id }),
          });
        } catch { /* silent */ }
      }
      refetch();
    };

    // Initial sync on first render (once accounts are loaded)
    if (accounts.length > 0 && !autoSyncRef.current) {
      autoSyncRef.current = true;
      silentSync();
    }

    // Poll every 60 seconds
    const interval = setInterval(silentSync, 60_000);
    return () => clearInterval(interval);
  }, [accounts, refetch]);

  /* ---- Mark read ---- */
  const handleMarkRead = (emailId: string) => {
    updateEmail({ resource: "emails", id: emailId, values: { isRead: true } });
  };

  /* ---- Star toggle ---- */
  const handleToggleStar = (e: React.MouseEvent, email: Email) => {
    e.stopPropagation();
    updateEmail(
      { resource: "emails", id: email.id, values: { isStarred: !email.isStarred } },
      { onSuccess: () => refetch() },
    );
  };

  /* ---- Move to folder (archive / trash) ---- */
  const handleMoveToFolder = (emailId: string, folder: Email["folder"]) => {
    updateEmail(
      { resource: "emails", id: emailId, values: { folder } },
      { onSuccess: () => refetch() },
    );
  };

  /* ---- Open email (mark read + show) ---- */
  const handleOpenEmail = (email: Email) => {
    if (!email.isRead && (activeFolder === "inbox" || activeFolder === "starred")) {
      handleMarkRead(email.id);
    }
    setShowId(email.id);
  };

  /* ---- Compose helpers ---- */
  const openCompose = (mode: "compose" | "reply" | "replyAll" | "forward" = "compose", original?: Email) => {
    setComposeMode(mode);
    setComposeOriginal(original || null);
    setComposeOpen(true);
  };

  /* ---- Bulk selection ---- */
  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === emails.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(emails.map((e) => e.id)));
    }
  };

  /* ---- Bulk actions ---- */
  const bulkMarkRead = (read: boolean) => {
    updateManyEmails(
      { resource: "emails", ids: [...selectedIds], values: { isRead: read } },
      { onSuccess: () => { setSelectedIds(new Set()); refetch(); } },
    );
  };

  const bulkToggleStar = (star: boolean) => {
    updateManyEmails(
      { resource: "emails", ids: [...selectedIds], values: { isStarred: star } },
      { onSuccess: () => { setSelectedIds(new Set()); refetch(); } },
    );
  };

  const bulkMoveToFolder = (folder: Email["folder"]) => {
    updateManyEmails(
      { resource: "emails", ids: [...selectedIds], values: { folder } },
      { onSuccess: () => { setSelectedIds(new Set()); refetch(); } },
    );
  };

  /* ---- Delete ---- */
  const handleDelete = () => {
    if (deleteId) {
      deleteEmail(
        { resource: "emails", id: deleteId },
        { onSuccess: () => setDeleteId(null) },
      );
    }
  };

  /* ---- Unread count ---- */
  const unreadCount = activeFolder === "inbox" ? emails.filter((e) => !e.isRead).length : 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Email</h1>
            <p className="text-sm text-muted-foreground">
              Send &amp; receive emails from your connected accounts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1" />
            )}
            {isSyncing ? "Syncing…" : "Sync Inbox"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button onClick={() => openCompose("compose")}>
            <Plus className="h-4 w-4 mr-1" />
            Compose
          </Button>
        </div>
      </div>

      {/* Sync status message */}
      {syncMessage && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/50 text-sm">
          <CheckCheck className="h-4 w-4 text-green-600" />
          {syncMessage}
        </div>
      )}

      {/* Folder Tabs */}
      <Tabs value={activeFolder} onValueChange={(v) => switchFolder(v as Folder)}>
        <TabsList>
          {folderTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.value === "inbox" && unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1 text-[10px]">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by subject…"
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <Select value={categoryFilter} onValueChange={handleCategoryFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="order">Order</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {activeFolder === "inbox" ? (
          <>
            <Card className="p-3 bg-blue-50 dark:bg-blue-900/20">
              <p className="text-xs text-muted-foreground">Inbox</p>
              <p className="text-xl font-bold text-blue-600">{total}</p>
            </Card>
            <Card className="p-3 bg-amber-50 dark:bg-amber-900/20">
              <p className="text-xs text-muted-foreground">Unread</p>
              <p className="text-xl font-bold text-amber-600">{emails.filter((e) => !e.isRead).length}</p>
            </Card>
            <Card className="p-3 bg-purple-50 dark:bg-purple-900/20">
              <p className="text-xs text-muted-foreground">Support</p>
              <p className="text-xl font-bold text-purple-600">{emails.filter((e) => e.category === "support").length}</p>
            </Card>
            <Card className="p-3 bg-green-50 dark:bg-green-900/20">
              <p className="text-xs text-muted-foreground">Orders</p>
              <p className="text-xl font-bold text-green-600">{emails.filter((e) => e.category === "order").length}</p>
            </Card>
          </>
        ) : (
          <>
            <Card className="p-3 bg-blue-50 dark:bg-blue-900/20">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-bold text-blue-600">{total}</p>
            </Card>
            <Card className="p-3 bg-green-50 dark:bg-green-900/20">
              <p className="text-xs text-muted-foreground">
                {activeFolder === "sent" ? "Delivered" : "Saved"}
              </p>
              <p className="text-xl font-bold text-green-600">{emails.length}</p>
            </Card>
            <Card className="p-3 bg-red-50 dark:bg-red-900/20">
              <p className="text-xs text-muted-foreground">Failed</p>
              <p className="text-xl font-bold text-red-600">{emails.filter((e) => e.status === "failed").length}</p>
            </Card>
            <Card className="p-3 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs text-muted-foreground">This Page</p>
              <p className="text-xl font-bold text-gray-600">{emails.length}</p>
            </Card>
          </>
        )}
      </div>

      {/* Email Table */}
      <Card>
        {/* Bulk Actions Toolbar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/60">
            <span className="text-sm font-medium mr-2">{selectedIds.size} selected</span>
            <Button variant="outline" size="sm" onClick={() => bulkMarkRead(true)}>
              <MailOpen className="h-3.5 w-3.5 mr-1" /> Mark Read
            </Button>
            <Button variant="outline" size="sm" onClick={() => bulkMarkRead(false)}>
              <Mail className="h-3.5 w-3.5 mr-1" /> Mark Unread
            </Button>
            <Button variant="outline" size="sm" onClick={() => bulkToggleStar(true)}>
              <Star className="h-3.5 w-3.5 mr-1" /> Star
            </Button>
            {activeFolder !== "archive" && (
              <Button variant="outline" size="sm" onClick={() => bulkMoveToFolder("archive")}>
                <Archive className="h-3.5 w-3.5 mr-1" /> Archive
              </Button>
            )}
            {activeFolder !== "trash" && (
              <Button variant="outline" size="sm" className="text-destructive" onClick={() => bulkMoveToFolder("trash")}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Trash
              </Button>
            )}
            {activeFolder === "trash" && (
              <Button variant="outline" size="sm" onClick={() => bulkMoveToFolder("inbox")}>
                <Inbox className="h-3.5 w-3.5 mr-1" /> Move to Inbox
              </Button>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <span className="ml-3 text-muted-foreground">Loading emails…</span>
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            {activeFolder === "inbox" ? (
              <>
                <Inbox className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-lg font-medium">Inbox is empty</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {accounts.length === 0
                    ? "Connect an email account in Settings to sync your inbox"
                    : "Hit 'Sync Inbox' to pull in your latest emails"}
                </p>
                {accounts.length === 0 ? (
                  <Button variant="outline" onClick={() => window.location.hash = "/settings"}>
                    Go to Settings
                  </Button>
                ) : (
                  <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
                    <Download className="h-4 w-4 mr-1" />
                    Sync Now
                  </Button>
                )}
              </>
            ) : activeFolder === "starred" ? (
              <>
                <Star className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-lg font-medium">No starred emails</p>
                <p className="text-sm text-muted-foreground">Star important emails to find them here</p>
              </>
            ) : activeFolder === "archive" ? (
              <>
                <Archive className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-lg font-medium">Archive is empty</p>
                <p className="text-sm text-muted-foreground">Archived emails will appear here</p>
              </>
            ) : activeFolder === "trash" ? (
              <>
                <Trash2 className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-lg font-medium">Trash is empty</p>
                <p className="text-sm text-muted-foreground">Deleted emails will appear here for 30 days</p>
              </>
            ) : (
              <>
                <Mail className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-lg font-medium">
                  No {activeFolder === "sent" ? "sent emails" : "drafts"} yet
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Compose your first email to get started
                </p>
                <Button onClick={() => openCompose("compose")}>
                  <Plus className="h-4 w-4 mr-1" />
                  Compose Email
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30px] px-2">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center justify-center"
                    >
                      {selectedIds.size === emails.length && emails.length > 0 ? (
                        <CheckSquare2 className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="w-[30px] px-1" />
                  {(activeFolder === "inbox" || activeFolder === "starred") && <TableHead className="w-[30px] px-1" />}
                  <TableHead className="w-[50px]">Status</TableHead>
                  <TableHead>{activeFolder === "inbox" || activeFolder === "starred" ? "From" : "To"}</TableHead>
                  <TableHead className="min-w-[250px]">Subject</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emails.map((email) => {
                  const st = statusConfig[email.status] || statusConfig.sent;
                  const cat = categoryConfig[email.category] || categoryConfig.general;
                  const StatusIcon = st.icon;
                  const isUnread = !email.isRead;
                  const isSelected = selectedIds.has(email.id);

                  // For inbox / starred show sender, for sent show recipients
                  const showSender = activeFolder === "inbox" || activeFolder === "starred" || activeFolder === "archive" || activeFolder === "trash";
                  const contactDisplay = showSender
                    ? email.fromName || email.fromAddress || "Unknown"
                    : (email.toAddresses || []).join(", ") || "—";

                  // Use snippet if available, otherwise strip HTML from body
                  const preview = email.snippet || email.body?.replace(/<[^>]*>/g, "").slice(0, 120) || "";

                  return (
                    <TableRow
                      key={email.id}
                      className={`cursor-pointer hover:bg-muted/50 ${isUnread ? "bg-blue-50/50 dark:bg-blue-950/20 font-medium" : ""} ${isSelected ? "bg-primary/5" : ""}`}
                      onClick={() => handleOpenEmail(email)}
                    >
                      {/* Checkbox */}
                      <TableCell className="px-2">
                        <button
                          onClick={(e) => toggleSelect(email.id, e)}
                          className="flex items-center justify-center"
                        >
                          {isSelected ? (
                            <CheckSquare2 className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4 text-muted-foreground/50 hover:text-muted-foreground" />
                          )}
                        </button>
                      </TableCell>

                      {/* Star */}
                      <TableCell className="px-1">
                        <button
                          onClick={(e) => handleToggleStar(e, email)}
                          className="flex items-center justify-center"
                        >
                          {email.isStarred ? (
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                          ) : (
                            <Star className="h-4 w-4 text-muted-foreground/30 hover:text-amber-400" />
                          )}
                        </button>
                      </TableCell>

                      {/* Unread indicator (inbox / starred only) */}
                      {(activeFolder === "inbox" || activeFolder === "starred") && (
                        <TableCell className="px-1">
                          {isUnread ? (
                            <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                          ) : (
                            <MailOpen className="h-3.5 w-3.5 text-muted-foreground/50" />
                          )}
                        </TableCell>
                      )}

                      <TableCell>
                        <div
                          className={`inline-flex items-center justify-center rounded-full p-1.5 ${st.color}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className={`text-sm truncate max-w-[180px] ${isUnread ? "font-semibold" : ""}`}>
                            {contactDisplay}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm truncate max-w-[300px] ${isUnread ? "font-semibold" : "font-medium"}`}>
                              {email.subject || "(No subject)"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                              {preview}
                            </p>
                          </div>
                          {email.hasAttachments && (
                            <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cat.color}>
                          {cat.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {email.sentAt
                            ? dayjs(email.sentAt).fromNow()
                            : dayjs(email.createdAt).fromNow()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleOpenEmail(email)}
                            title="View"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {activeFolder !== "archive" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleMoveToFolder(email.id, "archive")}
                              title="Archive"
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {activeFolder !== "trash" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleMoveToFolder(email.id, "trash")}
                              title="Move to Trash"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(email.id)}
                              title="Delete Permanently"
                            >
                              <MailX className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Page {current} of {pageCount} ({total} emails)
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={current <= 1}
                  onClick={() => setCurrent(current - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={current >= pageCount}
                  onClick={() => setCurrent(current + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Compose Dialog */}
      <EmailComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        mode={composeMode}
        originalEmail={composeOriginal}
      />

      {/* Show Drawer */}
      <EmailShowDrawer
        emailId={showId}
        onClose={() => setShowId(null)}
        onReply={(email) => openCompose("reply", email)}
        onReplyAll={(email) => openCompose("replyAll", email)}
        onForward={(email) => openCompose("forward", email)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open: boolean) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Email</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this email. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
