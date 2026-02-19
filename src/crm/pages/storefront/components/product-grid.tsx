import { useState, useMemo } from "react";
import {
  ShoppingCart,
  Package,
  ImageOff,
  ArrowUpDown,
  Check,
  Heart,
  LayoutGrid,
  List,
  Sparkles,
  Plus,
} from "lucide-react";
import { Button } from "@crm/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@crm/components/ui/dropdown-menu";
import { ScrollArea, ScrollBar } from "@crm/components/ui/scroll-area";
import { cn } from "@crm/lib/utils";
import type { IProduct, ICategory } from "@crm/types/finefoods";

interface StorefrontProductGridProps {
  products: IProduct[];
  loading: boolean;
  onProductClick: (product: IProduct) => void;
  onAddToCart: (product: IProduct) => void;
  activeCategoryName?: string;
  categories?: ICategory[];
  activeCategory?: string;
  onCategoryChange?: (categoryId: string) => void;
  productCounts?: Record<string, number>;
  totalCount?: number;
}

type SortOption = "newest" | "price-asc" | "price-desc" | "name-asc";
type ViewMode = "grid" | "list";

const sortLabels: Record<SortOption, string> = {
  newest: "Newest First",
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

/** Check if product was created within the last 14 days */
function isNew(createdAt: string): boolean {
  const created = new Date(createdAt);
  const now = new Date();
  const diffDays =
    (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 14;
}

export function StorefrontProductGrid({
  products,
  loading,
  onProductClick,
  onAddToCart,
  activeCategoryName,
  categories = [],
  activeCategory = "all",
  onCategoryChange,
  productCounts = {},
  totalCount = 0,
}: StorefrontProductGridProps) {
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [addedToCart, setAddedToCart] = useState<string | null>(null);

  const toggleWishlist = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWishlist((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const handleAddToCart = (product: IProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product);
    setAddedToCart(product.id);
    setTimeout(() => setAddedToCart(null), 1500);
  };

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
        return sorted;
    }
  }, [products, sortBy]);

  /* ─── Loading skeleton ─────────────────────────────────── */
  if (loading) {
    return (
      <section className="w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-10">
            <div className="h-8 w-48 bg-muted rounded-lg mx-auto mb-3 animate-pulse" />
            <div className="h-4 w-72 bg-muted rounded mx-auto animate-pulse" />
          </div>
          <div className="flex justify-center gap-2 mb-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-9 w-24 bg-muted rounded-full animate-pulse"
              />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/5] bg-muted rounded-2xl mb-3" />
                <div className="space-y-2 px-1">
                  <div className="h-3 w-16 bg-muted rounded" />
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-5 w-20 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* ─── Empty state ──────────────────────────────────────── */
  if (products.length === 0) {
    return (
      <section id="products" className="w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-6">
              <Package className="h-12 w-12 text-muted-foreground/30" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No products found</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Try adjusting your search or filter to find what you&apos;re
              looking for.
            </p>
            {activeCategory !== "all" && onCategoryChange && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => onCategoryChange("all")}
              >
                View all products
              </Button>
            )}
          </div>
        </div>
      </section>
    );
  }

  /* ─── Main render ──────────────────────────────────────── */
  return (
    <section id="products" className="w-full relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 -z-10">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
        {/* Soft radial blobs */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/[0.04] blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-violet-500/[0.04] blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-sky-500/[0.03] blur-[140px]" />
        {/* Subtle dot grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle, hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Top & bottom fade */}
        <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-background to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        {/* ── Category tabs ──────────────────────────────── */}
        {categories.length > 0 && onCategoryChange && (
          <div className="mb-8 sm:mb-10">
            <ScrollArea className="w-full">
              <div className="flex items-center justify-center gap-2 pb-2">
                <button
                  onClick={() => onCategoryChange("all")}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap",
                    activeCategory === "all"
                      ? "bg-gray-900 text-white shadow-lg"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  All Products
                  <span
                    className={cn(
                      "ml-1.5 text-xs",
                      activeCategory === "all"
                        ? "text-white/70"
                        : "text-muted-foreground/60"
                    )}
                  >
                    {totalCount}
                  </span>
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => onCategoryChange(cat.id)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap",
                      activeCategory === cat.id
                        ? "bg-gray-900 text-white shadow-lg"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {cat.title}
                    {(productCounts[cat.id] ?? 0) > 0 && (
                      <span
                        className={cn(
                          "ml-1.5 text-xs",
                          activeCategory === cat.id
                            ? "text-white/70"
                            : "text-muted-foreground/60"
                        )}
                      >
                        {productCounts[cat.id]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="h-0" />
            </ScrollArea>
          </div>
        )}

        {/* ── Toolbar ────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-semibold text-foreground">
              {products.length}
            </span>{" "}
            {products.length === 1 ? "product" : "products"}
          </p>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 h-9 rounded-lg"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {sortLabels[sortBy]}
                  </span>
                  <span className="sm:hidden">Sort</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {(
                  Object.entries(sortLabels) as [SortOption, string][]
                ).map(([key, label]) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => setSortBy(key)}
                    className="gap-2"
                  >
                    {sortBy === key && <Check className="h-3.5 w-3.5" />}
                    <span className={sortBy !== key ? "pl-5" : ""}>
                      {label}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View toggle (desktop only) */}
            <div className="hidden sm:flex items-center border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === "grid"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === "list"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Product grid / list ────────────────────────── */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 lg:gap-6">
            {sortedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => onProductClick(product)}
                onAddToCart={(e) => handleAddToCart(product, e)}
                isWishlisted={wishlist.has(product.id)}
                onToggleWishlist={(e) => toggleWishlist(product.id, e)}
                justAdded={addedToCart === product.id}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {sortedProducts.map((product) => (
              <ProductListItem
                key={product.id}
                product={product}
                onClick={() => onProductClick(product)}
                onAddToCart={(e) => handleAddToCart(product, e)}
                isWishlisted={wishlist.has(product.id)}
                onToggleWishlist={(e) => toggleWishlist(product.id, e)}
                justAdded={addedToCart === product.id}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Product Card — Grid View
   ═══════════════════════════════════════════════════════════════ */
function ProductCard({
  product,
  onClick,
  onAddToCart,
  isWishlisted,
  onToggleWishlist,
  justAdded,
}: {
  product: IProduct;
  onClick: () => void;
  onAddToCart: (e: React.MouseEvent) => void;
  isWishlisted: boolean;
  onToggleWishlist: (e: React.MouseEvent) => void;
  justAdded: boolean;
}) {
  const outOfStock = product.stock <= 0;

  return (
    <div className="group cursor-pointer" onClick={onClick}>
      {/* Image */}
      <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-muted/30 mb-3">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted">
            <ImageOff className="h-10 w-10 sm:h-14 sm:w-14 text-muted-foreground/20" />
          </div>
        )}

        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Wishlist button */}
        <button
          onClick={onToggleWishlist}
          className={cn(
            "absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all duration-200 z-10",
            isWishlisted
              ? "bg-red-500 text-white shadow-lg"
              : "bg-white/80 backdrop-blur-sm text-gray-500 opacity-0 group-hover:opacity-100 hover:bg-white hover:text-red-500 hover:scale-110"
          )}
          aria-label={
            isWishlisted ? "Remove from wishlist" : "Add to wishlist"
          }
        >
          <Heart
            className={cn("h-4 w-4", isWishlisted && "fill-current")}
          />
        </button>

        {/* Status badges */}
        <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 flex flex-col gap-1.5 z-10">
          {outOfStock && (
            <span className="px-2.5 py-1 rounded-lg bg-gray-900/80 text-white text-[10px] sm:text-xs font-semibold backdrop-blur-sm">
              Sold Out
            </span>
          )}
          {product.stock > 0 && product.stock <= 5 && (
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/90 text-white text-[10px] sm:text-xs font-semibold backdrop-blur-sm">
              Only {product.stock} left
            </span>
          )}
        </div>

        {/* Quick-add — slides up from bottom on hover */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-10">
          <button
            onClick={onAddToCart}
            disabled={outOfStock}
            className={cn(
              "w-full py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2",
              outOfStock
                ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                : justAdded
                  ? "bg-primary text-primary-foreground"
                  : "bg-white text-gray-900 hover:bg-gray-100 shadow-lg"
            )}
          >
            {justAdded ? (
              <>
                <Check className="h-4 w-4" />
                Added!
              </>
            ) : outOfStock ? (
              "Sold Out"
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Add to Cart
              </>
            )}
          </button>
        </div>
      </div>

      {/* Product info */}
      <div className="px-0.5">
        {product.categoryName && (
          <p className="text-[10px] sm:text-xs text-muted-foreground/80 uppercase tracking-wider mb-0.5 sm:mb-1">
            {product.categoryName}
          </p>
        )}
        <h3 className="font-bold text-sm sm:text-base text-primary line-clamp-1 group-hover:text-primary/80 transition-colors duration-200 mb-0.5 sm:mb-1">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1 mb-1 sm:mb-1.5 hidden sm:block">
            {product.description}
          </p>
        )}
        <p className="text-sm sm:text-base font-bold tracking-tight">
          {formatPrice(product.price)}
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Product List Item — List View
   ═══════════════════════════════════════════════════════════════ */
function ProductListItem({
  product,
  onClick,
  onAddToCart,
  isWishlisted,
  onToggleWishlist,
  justAdded,
}: {
  product: IProduct;
  onClick: () => void;
  onAddToCart: (e: React.MouseEvent) => void;
  isWishlisted: boolean;
  onToggleWishlist: (e: React.MouseEvent) => void;
  justAdded: boolean;
}) {
  const outOfStock = product.stock <= 0;

  return (
    <div
      className="group flex gap-4 sm:gap-6 p-3 sm:p-4 rounded-2xl border border-border/50 hover:border-border hover:shadow-md transition-all duration-200 cursor-pointer bg-card"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-xl overflow-hidden bg-muted/30 shrink-0">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="h-8 w-8 text-muted-foreground/20" />
          </div>
        )}
        {outOfStock && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-gray-900/80 text-white text-[10px] font-semibold backdrop-blur-sm">
            Sold Out
          </span>
        )}
        {product.stock > 0 && product.stock <= 5 && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-amber-500/90 text-white text-[10px] font-semibold backdrop-blur-sm">
            Only {product.stock} left
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          {product.categoryName && (
            <p className="text-[10px] sm:text-xs text-muted-foreground/80 uppercase tracking-wider mb-1">
              {product.categoryName}
            </p>
          )}
          <h3 className="font-bold text-sm sm:text-lg text-primary line-clamp-1 group-hover:text-primary/80 transition-colors mb-1">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 mt-2">
          <p className="text-base sm:text-lg font-bold tracking-tight">
            {formatPrice(product.price)}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleWishlist}
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center transition-all border",
                isWishlisted
                  ? "bg-red-50 border-red-200 text-red-500"
                  : "border-border text-muted-foreground hover:text-red-500 hover:border-red-200"
              )}
              aria-label={
                isWishlisted ? "Remove from wishlist" : "Add to wishlist"
              }
            >
              <Heart
                className={cn("h-4 w-4", isWishlisted && "fill-current")}
              />
            </button>
            <Button
              size="sm"
              disabled={outOfStock}
              onClick={onAddToCart}
              className={cn(
                "gap-1.5 rounded-xl h-9 px-4",
                justAdded && "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {justAdded ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Added
                </>
              ) : (
                <>
                  <ShoppingCart className="h-3.5 w-3.5" />
                  {outOfStock ? "Sold Out" : "Add to Bag"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
