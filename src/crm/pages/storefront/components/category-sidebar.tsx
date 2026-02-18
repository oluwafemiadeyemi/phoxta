import { LayoutGrid, ChevronRight, FolderOpen } from "lucide-react";
import { Button } from "@crm/components/ui/button";
import { Badge } from "@crm/components/ui/badge";
import { ScrollArea } from "@crm/components/ui/scroll-area";
import { cn } from "@crm/lib/utils";
import type { ICategory } from "@crm/types/finefoods";

interface StorefrontCategorySidebarProps {
  categories: ICategory[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
  productCounts: Record<string, number>;
  totalCount: number;
}

export function StorefrontCategorySidebar({
  categories,
  activeCategory,
  onCategoryChange,
  productCounts,
  totalCount,
}: StorefrontCategorySidebarProps) {
  if (categories.length === 0) return null;

  return (
    <aside className="hidden md:block w-56 lg:w-64 shrink-0">
      <div className="sticky top-20 rounded-xl border bg-card shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b bg-muted/30">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-primary" />
            Categories
          </h3>
        </div>

        {/* Category List */}
        <ScrollArea className="max-h-[calc(100vh-12rem)]">
          <nav className="flex flex-col p-2 gap-0.5">
            {/* All */}
            <button
              onClick={() => onCategoryChange("all")}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors text-left group",
                activeCategory === "all"
                  ? "bg-primary text-primary-foreground font-medium"
                  : "hover:bg-muted text-foreground"
              )}
            >
              <LayoutGrid
                className={cn(
                  "h-4 w-4 shrink-0",
                  activeCategory === "all"
                    ? "text-primary-foreground"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              <span className="flex-1 truncate">All Products</span>
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] px-1.5 py-0 h-5 shrink-0",
                  activeCategory === "all"
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : ""
                )}
              >
                {totalCount}
              </Badge>
            </button>

            {/* Category items */}
            {categories.map((category) => {
              const count = productCounts[category.id] ?? 0;
              const isActive = activeCategory === category.id;

              return (
                <button
                  key={category.id}
                  onClick={() => onCategoryChange(category.id)}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors text-left group",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  {category.cover ? (
                    <img
                      src={category.cover}
                      alt={category.title}
                      className="h-5 w-5 rounded object-cover shrink-0"
                    />
                  ) : (
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform",
                        isActive
                          ? "text-primary-foreground rotate-90"
                          : "text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5"
                      )}
                    />
                  )}
                  <span className="flex-1 truncate">{category.title}</span>
                  {count > 0 && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px] px-1.5 py-0 h-5 shrink-0",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : ""
                      )}
                    >
                      {count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </nav>
        </ScrollArea>
      </div>
    </aside>
  );
}
