import { LayoutGrid } from "lucide-react";
import { Button } from "@crm/components/ui/button";
import { Badge } from "@crm/components/ui/badge";
import { ScrollArea, ScrollBar } from "@crm/components/ui/scroll-area";
import type { ICategory } from "@crm/types/finefoods";

interface StorefrontCategoryBarProps {
  categories: ICategory[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
  productCounts: Record<string, number>;
  totalCount: number;
}

export function StorefrontCategoryBar({
  categories,
  activeCategory,
  onCategoryChange,
  productCounts,
  totalCount,
}: StorefrontCategoryBarProps) {
  if (categories.length === 0) return null;

  return (
    <div id="products" className="mb-4 sm:mb-6 md:hidden">
      <ScrollArea className="w-full">
        <div className="flex items-center gap-1.5 pb-3">
          <Button
            variant={activeCategory === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => onCategoryChange("all")}
            className="shrink-0 rounded-full gap-1.5 h-8 text-xs px-3 border-border/50"
          >
            <LayoutGrid className="h-3 w-3" />
            All
            <Badge
              variant="secondary"
              className={`ml-0.5 text-[9px] px-1 py-0 h-4 min-w-4 flex items-center justify-center rounded-full ${
                activeCategory === "all"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : ""
              }`}
            >
              {totalCount}
            </Badge>
          </Button>

          {categories.map((category) => (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => onCategoryChange(category.id)}
              className="shrink-0 rounded-full gap-1.5 h-8 text-xs px-3 border-border/50"
            >
              {category.title}
              {(productCounts[category.id] ?? 0) > 0 && (
                <Badge
                  variant="secondary"
                  className={`ml-0.5 text-[9px] px-1 py-0 h-4 min-w-4 flex items-center justify-center rounded-full ${
                    activeCategory === category.id
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : ""
                  }`}
                >
                  {productCounts[category.id]}
                </Badge>
              )}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="h-1" />
      </ScrollArea>
    </div>
  );
}
