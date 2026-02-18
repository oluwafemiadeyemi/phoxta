import { useRefineOptions, useActiveAuthProvider, useLogout, useLink, useGetIdentity, useOne } from "@refinedev/core";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@crm/components/ui/dropdown-menu";
import { DropdownMenuTrigger } from "@crm/components/ui/dropdown-menu";
import { ThemeToggle } from "@crm/components/refine-ui/theme/theme-toggle";
import { UserAvatar } from "@crm/components/refine-ui/layout/user-avatar";
import { CalendarHeaderButton } from "@crm/components/calendar-header-button";
import { useSidebar, SidebarTrigger } from "@crm/components/ui/sidebar";
import {
  LogOutIcon,
  Search,
  Bell,
  User,
  Settings,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  CreditCard,
  ClipboardCheck,
  Briefcase,
} from "lucide-react";
import { cn } from "@crm/lib/utils";
import { Input } from "@crm/components/ui/input";
import { Badge } from "@crm/components/ui/badge";
import { useEffect, useMemo, useState } from "react";
import { supabaseClient } from "@crm/lib/supabase";
import { Button } from "@crm/components/ui/button";
import type { CompanySettings } from "@crm/types";
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

export const Header = () => {
  const { isMobile } = useSidebar();

  return <>{isMobile ? <MobileHeader /> : <DesktopHeader />}</>;
};

const CompanyLogo = () => {
  const { result, query: { data } } = useOne<CompanySettings>({
    resource: "companySettings",
    id: "00000000-0000-0000-0000-000000000001",
  });

  const logo =
    result?.logo ||
    (result as any)?.companyLogo ||
    data?.data?.logo ||
    (typeof window !== "undefined"
      ? (() => {
          try {
            const raw = window.localStorage.getItem("companySettings");
            return raw ? (JSON.parse(raw) as { logo?: string | null }).logo : null;
          } catch {
            return null;
          }
        })()
      : null);
  if (!logo) return null;

  return (
    <img
      src={logo}
      alt="Company logo"
      className="h-10 w-16 rounded-md object-contain"
    />
  );
};

function DesktopHeader() {
  const { title } = useRefineOptions();
  const Link = useLink();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: user } = useGetIdentity();

  return (
    <header
      className={cn(
        "sticky top-0 flex h-14 shrink-0 items-center gap-4",
        "border-b border-border/50",
        "bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80",
        "px-6 justify-between z-40",
      )}>
      {/* Left: Greeting */}
      <Link to="/dashboard">
        <div className={cn("flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity group")}>
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
            <span className="text-sm font-bold text-primary">{user?.name?.charAt(0)?.toUpperCase() || "P"}</span>
          </div>
          <div>
            <h2 className={cn("text-sm font-semibold leading-tight")}>
              Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
            </h2>
            <p className="text-[10px] text-muted-foreground leading-tight">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </p>
          </div>
        </div>
      </Link>

      {/* Center: Search Bar */}
      <div className={cn("flex-1 max-w-md mx-6")}>
        <div className={cn("relative w-full group")}>
          <Search
            className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60 group-focus-within:text-muted-foreground transition-colors")}
          />
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              console.log("Search query:", e.target.value);
            }}
            className={cn("pl-9 pr-14 h-9 bg-muted/40 border-border/40 rounded-lg text-sm placeholder:text-muted-foreground/50 focus:bg-background focus:border-border transition-colors")}
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-border/60 bg-muted/60 px-1.5 text-[10px] font-medium text-muted-foreground/70">
            <span className="text-[9px]">⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Right: Actions */}
      <div className={cn("flex items-center gap-1.5")}>
        <CalendarHeaderButton />
        <NotificationsDropdown />
        <div className="w-px h-6 bg-border/50 mx-1" />
        <CompanyLogo />
        <UserDropdown />
      </div>
    </header>
  );
}

function MobileHeader() {
  const { open, isMobile } = useSidebar();
  const { title } = useRefineOptions();
  const { data: user } = useGetIdentity();
  const appTitle = (typeof title === "string" ? title : title?.text) ?? "Phoxta CRM";
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState("");

  return (
    <>
      <header
        className={cn(
          "sticky top-0 shrink-0 z-40",
          "bg-background/80 backdrop-blur-xl",
          "border-b border-border/50",
          "px-3",
        )}>
        {/* Main row */}
        <div className="flex h-14 items-center justify-between gap-2">
          {/* Left: Menu trigger + greeting */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <SidebarTrigger
              className={cn("shrink-0 h-9 w-9 rounded-xl text-foreground hover:bg-muted", {
                "opacity-100": !open || isMobile,
                "pointer-events-auto": !open || isMobile,
                "pointer-events-none": open && !isMobile,
              })}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">
                {user?.name ? `Hi, ${user.name.split(" ")[0]}` : appTitle}
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="flex items-center justify-center h-9 w-9 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Search className="h-[18px] w-[18px]" />
            </button>
            <CalendarHeaderButton />
            <NotificationsDropdown />
            <CompanyLogo />
            <UserDropdown />
          </div>
        </div>

        {/* Expandable search bar */}
        {mobileSearchOpen && (
          <div className="pb-2.5 px-0.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search contacts, deals..."
                value={mobileSearchQuery}
                onChange={(e) => setMobileSearchQuery(e.target.value)}
                className="pl-9 h-9 rounded-xl bg-muted/50 border-border/50 text-sm"
                autoFocus
              />
            </div>
          </div>
        )}
      </header>
    </>
  );
}

type InAppNotificationItem = {
  id: string;
  user_id: string;
  type?: string;
  title: string;
  message: string;
  action_url?: string | null;
  icon?: string | null;
  read: boolean;
  created_at: string;
};

const NotificationsDropdown = () => {
  const { data: user } = useGetIdentity();
  const Link = useLink();
  const [notifications, setNotifications] = useState<InAppNotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadNotifications = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from("in_app_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) {
        console.log("Notifications table not available:", error.message);
        setNotifications([]);
      } else {
        setNotifications(data || []);
      }
    } catch (err) {
      console.error("Error loading notifications:", err);
      setNotifications([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadNotifications();
  }, [user?.id]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const handleMarkRead = async (id: string) => {
    await supabaseClient.from("in_app_notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
  };

  const handleMarkAll = async () => {
    if (!user?.id || unreadCount === 0) return;
    await supabaseClient
      .from("in_app_notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn("relative")}>
        <div
          id="header-notification-anchor"
          className={cn("flex items-center justify-center h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors relative")}
        >
          <Bell className={cn("h-[18px] w-[18px]")} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-background">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={cn("w-96 p-0 rounded-xl shadow-xl border-border/60")}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <div>
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <p className="text-[11px] text-muted-foreground">{unreadCount} unread</p>
            )}
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleMarkAll} disabled={unreadCount === 0}>
            Mark all read
          </Button>
        </div>

        {/* Content */}
        <div className="max-h-[380px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Bell className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-0.5">No new notifications</p>
            </div>
          ) : (
            notifications.map((notification, idx) => {
              const notificationBody = (
                <div className={cn("flex gap-3 items-start px-4 py-3 transition-colors", !notification.read && "bg-primary/[0.03]")}> 
                  <div className={cn("mt-0.5 p-1.5 rounded-lg shrink-0", !notification.read ? "bg-primary/10" : "bg-muted")}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className={cn("font-medium text-sm leading-tight", !notification.read && "text-foreground")}>
                        {notification.title}
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                      )}
                    </div>
                    <div className={cn("text-xs text-muted-foreground mt-0.5 line-clamp-2")}>{notification.message}</div>
                    <div className={cn("text-[11px] text-muted-foreground/70 mt-1")}>{formatTimeAgo(notification.created_at)}</div>
                  </div>
                </div>
              );

              if (notification.action_url && notification.action_url.startsWith("/")) {
                return (
                  <DropdownMenuItem key={notification.id} asChild className="p-0 focus:bg-muted/50">
                    <Link to={notification.action_url} className="w-full" onClick={() => handleMarkRead(notification.id)}>
                      {notificationBody}
                    </Link>
                  </DropdownMenuItem>
                );
              }

              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn("p-0 focus:bg-muted/50")}
                  onSelect={(event) => {
                    event.preventDefault();
                    handleMarkRead(notification.id);
                  }}>
                  {notificationBody}
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Helper function to format time ago
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

// Helper function to format activity date
function getNotificationIcon(type?: string) {
  switch (type) {
    case "deal_created":
      return <Briefcase className="h-4 w-4 text-blue-500" />;
    case "deal_won":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "deal_lost":
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case "task_assigned":
    case "task_due":
      return <ClipboardCheck className="h-4 w-4 text-indigo-500" />;
    case "comment_mention":
      return <MessageSquare className="h-4 w-4 text-purple-500" />;
    case "payment_received":
      return <CreditCard className="h-4 w-4 text-emerald-500" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

const UserDropdown = () => {
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const { data: user } = useGetIdentity();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const Link = useLink();

  const authProvider = useActiveAuthProvider();

  if (!authProvider?.getIdentity) {
    return null;
  }

  const handleLogout = () => {
    logout();
    setShowLogoutDialog(false);
  };

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="focus:outline-none">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center hover:bg-primary/15 transition-colors cursor-pointer">
            <span className="text-xs font-bold text-primary">{initials}</span>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 p-0 rounded-xl shadow-xl border-border/60">
          {/* Profile header */}
          <div className="px-4 py-3 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">{initials}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{user?.name || "User"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
              </div>
            </div>
          </div>

          <div className="p-1">
            <DropdownMenuItem asChild className="rounded-lg px-3 py-2 cursor-pointer">
              <Link to="/settings">
                <User className="mr-2.5 h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Profile & Settings</span>
              </Link>
            </DropdownMenuItem>
          </div>

          <div className="border-t border-border/40 p-1">
            <DropdownMenuItem
              onClick={() => setShowLogoutDialog(true)}
              className="rounded-lg px-3 py-2 text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 cursor-pointer">
              <LogOutIcon className="mr-2.5 h-4 w-4" />
              <span className="text-sm">Sign out</span>
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You&apos;ll need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoggingOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} disabled={isLoggingOut} className="bg-red-600 hover:bg-red-700 text-white">
              {isLoggingOut ? "Signing out..." : "Sign out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

Header.displayName = "Header";
MobileHeader.displayName = "MobileHeader";
DesktopHeader.displayName = "DesktopHeader";
