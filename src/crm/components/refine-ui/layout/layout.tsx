"use client";

import type { PropsWithChildren } from "react";
import { useLink, useMenu } from "@refinedev/core";
import { SidebarProvider, SidebarInset, useSidebar } from "@crm/components/ui/sidebar";
import { Sidebar } from "@crm/components/refine-ui/layout/sidebar";
import { Header } from "@crm/components/refine-ui/layout/header";
import { ThemeProvider } from "@crm/components/refine-ui/theme/theme-provider";
import { cn } from "@crm/lib/utils";
import { Menu } from "lucide-react";
import { FocusOrb } from "@crm/components/focus-orb";

export function Layout({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <Sidebar />
        <SidebarInset>
          <Header />
          <main
            className={cn(
              "@container/main",
              "container",
              "mx-auto",
              "relative",
              "w-full",
              "flex",
              "flex-col",
              "flex-1",
              "px-3",
              "pt-3",
              "pb-24",
              "sm:px-4",
              "sm:pt-4",
              "sm:pb-6",
              "lg:px-6",
              "lg:pt-6",
            )}
          >
            {children}
            <FocusOrb />
          </main>
          <MobileBottomNav />
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  );
}

Layout.displayName = "Layout";

function MobileBottomNav() {
  const { isMobile, toggleSidebar } = useSidebar();
  const { menuItems, selectedKey } = useMenu();
  const Link = useLink();

  if (!isMobile) return null;

  const visibleItems = menuItems
    .filter((item) => !item.meta?.hide && !item.meta?.group && !item.children?.length && item.route)
    .slice(0, 4);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/50 md:hidden safe-area-bottom">
      <div className="mx-auto grid max-w-lg grid-cols-5 px-1 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {visibleItems.map((item) => {
          const isActive = selectedKey === item.key;
          return (
            <Link
              key={item.key || item.name}
              to={item.route || ""}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition-all duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:scale-95",
              )}
            >
              {/* Active indicator pill */}
              {isActive && (
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-[3px] w-5 rounded-full bg-primary" />
              )}
              <span
                className={cn(
                  "flex items-center justify-center h-7 w-7 rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary scale-110"
                    : "text-muted-foreground",
                )}
              >
                {item.meta?.icon ?? item.icon}
              </span>
              <span className="max-w-[64px] truncate leading-tight">
                {item.meta?.label ?? item.label ?? item.name}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={toggleSidebar}
          className="relative flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold text-muted-foreground transition-all duration-200 active:scale-95"
        >
          <span className="flex items-center justify-center h-7 w-7 rounded-xl">
            <Menu className="h-5 w-5" />
          </span>
          <span className="leading-tight">More</span>
        </button>
      </div>
    </nav>
  );
}
