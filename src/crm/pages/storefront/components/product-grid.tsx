import { useState, useMemo } from "react";
import { ShoppingCart, Eye, Package, ImageOff, ArrowUpDown, Grid3X3, LayoutGrid, Check } from "lucide-react";
import { Button } from "@crm/components/ui/button";
import { Card, CardContent } from "@crm/components/ui/card";
import { Badge } from "@crm/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@crm/components/ui/dropdown-menu";
import type { IProduct } from "@crm/types/finefoods";

interface StorefrontProductGridProps {
  products: IProduct[];
  loading: boolean;
  onProductClick: (product: IProduct) => void;
  onAddToCart: (product: IProduct) => void;
  activeCategoryName?: string;
}

type SortOption = "newest" | "price-asc" | "price-desc" | "name-asc";

const sortLabels: Record<SortOption, string> = {
  "newest": "Newest First",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  "name-asc": "Name: A to Z",
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(price);
}

export function StorefrontProductGrid({
  products,
  loading,
  onProductClick,
  onAddToCart,
  activeCategoryName,
}: StorefrontProductGridProps) {
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const sortedProducts = useMemo(() => {
    const sorted = [...products];
    switch (sortBy) {
      case "price-asc":
        return sorted.sort((a, b) => a.price - b.price);
      case "price-desc":
        return sorted.sort((a, b) => b.price - a.price);
      case "name-asc":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case "newest":
      default:
        return sorted; // already sorted by created_at desc from query
    }
  }, [products, sortBy]);

  if (loading) {
    return (
      <div>
        {/* Skeleton header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="h-6 w-40 bg-muted rounded animate-pulse" />
          <div className="h-9 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div id="products" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4 lg:gap-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Card key={i} className="overflow-hidden animate-pulse !p-0 !gap-0 rounded-xl">
              <div className="aspect-square bg-muted" />
              <CardContent className="!px-2 sm:!px-4 !py-2 sm:!py-4 space-y-2 sm:space-y-3">
                <div className="h-3 sm:h-4 bg-muted rounded w-3/4" />
                <div className="h-2 sm:h-3 bg-muted rounded w-1/2" />
                <div className="h-7 sm:h-8 bg-muted rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Package className="h-10 w-10 text-muted-foreground/30" />
        </div>
        <h3 className="text-lg font-semibold mb-1">No products found</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Try adjusting your search or filter to find what you're looking for.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header bar with count + sort */}
      <div id="products" className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-base sm:text-lg font-semibold truncate">
            {activeCategoryName || "All Products"}
          </h2>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {products.length} {products.length === 1 ? "item" : "items"}
          </Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 shrink-0">
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{sortLabels[sortBy]}</span>
              <span className="sm:hidden">Sort</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(Object.entries(sortLabels) as [SortOption, string][]).map(([key, label]) => (
              <DropdownMenuItem key={key} onClick={() => setSortBy(key)} className="gap-2">
                {sortBy === key && <Check className="h-3.5 w-3.5" />}
                <span className={sortBy !== key ? "pl-5" : ""}>{label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4 lg:gap-5">
        {sortedProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onClick={() => onProductClick(product)}
            onAddToCart={() => onAddToCart(product)}
          />
        ))}
      </div>
    </div>
  );
}

function ProductCard({
  product,
  onClick,
  onAddToCart,
}: {
  product: IProduct;
  onClick: () => void;
  onAddToCart: () => void;
}) {
  const outOfStock = product.stock <= 0;

  return (
    <Card className="group overflow-hidden border border-border/50 hover:shadow-lg transition-all duration-300 bg-card !p-0 !gap-0 rounded-xl sm:rounded-xl">
      {/* Image */}
      <div
        className="relative aspect-square bg-muted/30 cursor-pointer overflow-hidden"
        onClick={onClick}
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground/30" />
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Button variant="secondary" size="sm" className="gap-2 shadow-lg">
            <Eye className="h-3.5 w-3.5" />
            Quick View
          </Button>
        </div>

        {/* Badges */}
        <div className="absolute top-1.5 left-1.5 sm:top-3 sm:left-3 flex flex-col gap-1">
          {outOfStock && (
            <Badge variant="destructive" className="text-[8px] sm:text-[10px] font-semibold px-1.5 py-0.5">
              Sold Out
            </Badge>
          )}
          {product.stock > 0 && product.stock <= 5 && (
            <Badge variant="secondary" className="text-[8px] sm:text-[10px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.5">
              {product.stock} left
            </Badge>
          )}
        </div>

        {product.categoryName && (
          <Badge
            variant="secondary"
            className="absolute top-1.5 right-1.5 sm:top-3 sm:right-3 text-[7px] sm:text-[10px] font-medium bg-background/80 backdrop-blur-sm px-1.5 py-0.5 hidden sm:inline-flex"
          >
            {product.categoryName}
          </Badge>
        )}
      </div>

      {/* Details */}
      <CardContent className="!px-2 sm:!px-4 !py-2 sm:!py-4">
        <h3
          className="font-semibold text-[11px] sm:text-sm line-clamp-1 cursor-pointer hover:text-primary transition-colors mb-0.5 sm:mb-1"
          onClick={onClick}
        >
          {product.name}
        </h3>

        {product.description && (
          <p className="text-[9px] sm:text-xs text-muted-foreground line-clamp-1 sm:line-clamp-2 mb-1.5 sm:mb-3 leading-relaxed hidden sm:block">
            {product.description}
          </p>
        )}

        <div className="flex items-center justify-between gap-1.5 sm:flex-row sm:gap-2">
          <span className="text-sm sm:text-lg font-bold text-foreground">
            {formatPrice(product.price)}
          </span>

          <Button
            size="sm"
            disabled={outOfStock}
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart();
            }}
            className="gap-1 text-[9px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 rounded-lg shrink-0"
          >
            <ShoppingCart className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="hidden sm:inline">{outOfStock ? "Sold Out" : "Add"}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
