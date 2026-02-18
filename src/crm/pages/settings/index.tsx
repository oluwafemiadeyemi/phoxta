import { useState } from "react";
import { cn } from "@crm/lib/utils";
import {
  Settings,
  Tag,
  Building2,
  GitBranch,
  Bell,
  Download,
  User,
  Layers,
  Sparkles,
  Calendar,
  Mail,
  Paintbrush,
  KeyRound,
  ShieldCheck,
  BarChart3,
  LayoutDashboard,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@crm/components/ui/button";
import { Badge } from "@crm/components/ui/badge";
import { Separator } from "@crm/components/ui/separator";
import { ScrollArea } from "@crm/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@crm/components/ui/sheet";

import { TagManagement } from "./tag-management";
import { CompanySettingsPage } from "./company-settings";
import { PipelineStagesSettings } from "./pipeline-stages";
import { NotificationPreferences } from "./notification-preferences";
import { DataExport } from "./data-export";
import { ChangePasswordSettings } from "./change-password";
import { DataSeedingControls } from "@crm/components/data-seeding-controls";
import { CustomFieldsSettings } from "./custom-fields";
import { EmailAccountSettings } from "@crm/components/email/account-settings";
import { AiInsightsSettings } from "./ai-insights";
import { CalendarIntegrationSettings } from "./calendar-integrations";
import { ThemeSettingsPage } from "./theme-settings";
import ApiManagement from "./api-management";
import AuditCompliancePage from "./audit-compliance";
import AnalyticsPage from "./analytics";
import DashboardReportingPage from "./dashboard-reporting";
import { UserForm } from "@crm/pages/users/form";

/* ------------------------------------------------------------------ */
/* Settings nav group & item definitions                               */
/* ------------------------------------------------------------------ */
interface NavItem {
  key: string;
  label: string;
  icon: typeof Settings;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "General",
    items: [
      { key: "company", label: "Company", icon: Building2 },
      { key: "theme", label: "Branding & Theme", icon: Paintbrush },
      { key: "account", label: "Account & Security", icon: User },
    ],
  },
  {
    title: "CRM Configuration",
    items: [
      { key: "pipeline", label: "Pipeline Stages", icon: GitBranch },
      { key: "tags", label: "Tags", icon: Tag },
      { key: "custom-fields", label: "Custom Fields", icon: Layers },
    ],
  },
  {
    title: "Communication",
    items: [
      { key: "email-accounts", label: "Email Accounts", icon: Mail },
      { key: "notifications", label: "Notifications", icon: Bell },
      { key: "calendar", label: "Calendar", icon: Calendar },
    ],
  },
  {
    title: "Data & Analytics",
    items: [
      { key: "export", label: "Import & Export", icon: Download },
      { key: "analytics", label: "Analytics", icon: BarChart3 },
      { key: "dashboards", label: "Dashboards & Reports", icon: LayoutDashboard },
    ],
  },
  {
    title: "Advanced",
    items: [
      { key: "api", label: "API Management", icon: KeyRound },
      { key: "audit", label: "Audit & Compliance", icon: ShieldCheck },
      { key: "ai-insights", label: "AI Insights", icon: Sparkles, badge: "Beta" },
    ],
  },
];

/* Flat map for quick lookup */
const allItems = navGroups.flatMap((g) => g.items);

/* ------------------------------------------------------------------ */
/* Sidebar contents (shared between desktop inline and mobile sheet)  */
/* ------------------------------------------------------------------ */
function SidebarNav({
  activeKey,
  onSelect,
}: {
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  return (
    <ScrollArea className="h-full">
      <nav className="p-3 space-y-5">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeKey === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => onSelect(item.key)}
                    className={cn(
                      "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-all text-left group",
                      isActive
                        ? "bg-primary text-primary-foreground font-medium shadow-sm"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] px-1.5 py-0 h-5 shrink-0",
                          isActive ? "bg-primary-foreground/20 text-primary-foreground" : ""
                        )}
                      >
                        {item.badge}
                      </Badge>
                    )}
                    {isActive && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </ScrollArea>
  );
}

/* ------------------------------------------------------------------ */
/* Main Settings page                                                 */
/* ------------------------------------------------------------------ */
export const SettingsPage = () => {
  const [activeKey, setActiveKey] = useState("company");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const activeItem = allItems.find((i) => i.key === activeKey);
  const ActiveIcon = activeItem?.icon || Settings;

  const handleSelect = (key: string) => {
    setActiveKey(key);
    setMobileNavOpen(false);
  };

  const renderContent = () => {
    switch (activeKey) {
      case "company":
        return <CompanySettingsPage />;
      case "theme":
        return <ThemeSettingsPage />;
      case "account":
        return (
          <div className="space-y-6">
            <UserForm action="edit" id="me" />
            <ChangePasswordSettings />
            <DataSeedingControls />
          </div>
        );
      case "pipeline":
        return <PipelineStagesSettings />;
      case "tags":
        return <TagManagement />;
      case "custom-fields":
        return <CustomFieldsSettings />;
      case "email-accounts":
        return <EmailAccountSettings />;
      case "notifications":
        return <NotificationPreferences />;
      case "calendar":
        return <CalendarIntegrationSettings />;
      case "export":
        return <DataExport />;
      case "analytics":
        return <AnalyticsPage />;
      case "dashboards":
        return <DashboardReportingPage />;
      case "api":
        return <ApiManagement />;
      case "audit":
        return <AuditCompliancePage />;
      case "ai-insights":
        return <AiInsightsSettings />;
      default:
        return <CompanySettingsPage />;
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="w-8 h-8" />
              Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your CRM settings and preferences
            </p>
          </div>
          {/* Mobile nav toggle */}
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden gap-2"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="h-4 w-4" />
            Navigate
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-20 rounded-xl border bg-card shadow-sm overflow-hidden">
            <SidebarNav activeKey={activeKey} onSelect={handleSelect} />
          </div>
        </aside>

        {/* Content area */}
        <main className="flex-1 min-w-0">
          {/* Breadcrumb / active page header */}
          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
            <Settings className="h-4 w-4" />
            <ChevronRight className="h-3 w-3" />
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <ActiveIcon className="h-4 w-4" />
              {activeItem?.label || "Settings"}
            </span>
          </div>
          {renderContent()}
        </main>
      </div>

      {/* Mobile navigation sheet */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <Settings className="h-5 w-5" />
              Settings
            </SheetTitle>
            <SheetDescription className="text-xs">
              Choose a settings section
            </SheetDescription>
          </SheetHeader>
          <Separator />
          <SidebarNav activeKey={activeKey} onSelect={handleSelect} />
        </SheetContent>
      </Sheet>
    </div>
  );
};
