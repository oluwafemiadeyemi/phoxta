import { useState, useRef, useEffect } from "react";
import { ShoppingCart, Search, Store, X, Sparkles, User, LogOut, Package, ChevronDown, ImageOff, Tag } from "lucide-react";
import { Button } from "@crm/components/ui/button";
import { Input } from "@crm/components/ui/input";
import { Badge } from "@crm/components/ui/badge";
import type { StoreCustomer } from "./auth-modal";
import type { IProduct } from "@crm/types/finefoods";

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(price);
}

interface StorefrontNavbarProps {
  storeName: string;
  cartCount: number;
  onCartClick: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchResults: IProduct[];
  onProductClick: (product: IProduct) => void;
  onAddToCart: (product: IProduct) => void;
  customer: StoreCustomer | null;
  onSignInClick: () => void;
  onAccountClick: () => void;
  onSignOut: () => void;
}

export function StorefrontNavbar({
  storeName,
  cartCount,
  onCartClick,
  searchQuery,
  onSearchChange,
  searchResults,
  onProductClick,
  onAddToCart,
  customer,
  onSignInClick,
  onAccountClick,
  onSignOut,
}: StorefrontNavbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const showResults = searchQuery.trim().length > 0 && searchFocused;

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      {/* Announcement bar */}
      {announcementVisible && (
        <div className="bg-primary text-primary-foreground text-center py-2.5 px-4 text-[11px] sm:text-sm font-medium relative">
          <div className="flex items-center justify-center gap-1.5">
            <Tag className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>Fast shipping on orders over £50 — Shop now!</span>
          </div>
          <button
            onClick={() => setAnnouncementVisible(false)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-primary-foreground/10 rounded-full transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </button>
        </div>
      )}

      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo / Store name */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary text-primary-foreground shrink-0">
                <Store className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight truncate max-w-[120px] sm:max-w-none">
                {storeName}
              </h1>
            </div>

            {/* Desktop search */}
            <div className="hidden md:flex flex-1 max-w-md mx-8 relative" ref={searchContainerRef}>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  className="pl-10 h-10 bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/20"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Search results dropdown */}
              {showResults && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-xl shadow-2xl z-50 max-h-[420px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Results header */}
                  <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {searchResults.length} {searchResults.length === 1 ? "result" : "results"} for &ldquo;{searchQuery}&rdquo;
                    </span>
                    <button
                      onClick={() => { onSearchChange(""); setSearchFocused(false); }}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Clear
                    </button>
                  </div>

                  {searchResults.length > 0 ? (
                    <div className="overflow-y-auto max-h-[360px] divide-y">
                      {searchResults.slice(0, 8).map((product) => (
                        <button
                          key={product.id}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                          onClick={() => { onProductClick(product); setSearchFocused(false); }}
                        >
                          {/* Thumbnail */}
                          <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageOff className="h-4 w-4 text-muted-foreground/40" />
                              </div>
                            )}
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{product.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-sm font-bold text-primary">{formatPrice(product.price)}</span>
                              {product.categoryName && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                                  {product.categoryName}
                                </Badge>
                              )}
                              {product.stock <= 0 && (
                                <Badge variant="destructive" className="text-[10px] h-4 px-1.5">Sold out</Badge>
                              )}
                            </div>
                          </div>
                          {/* Quick add */}
                          {product.stock > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 h-8 text-xs gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddToCart(product);
                              }}
                            >
                              <ShoppingCart className="h-3 w-3" />
                              Add
                            </Button>
                          )}
                        </button>
                      ))}
                      {searchResults.length > 8 && (
                        <div className="px-4 py-2.5 text-center border-t bg-muted/20">
                          <span className="text-xs text-muted-foreground">
                            +{searchResults.length - 8} more {searchResults.length - 8 === 1 ? "result" : "results"} — scroll down to browse
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 px-4">
                      <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                        <Search className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                      <p className="text-sm font-semibold mb-1">No products found</p>
                      <p className="text-xs text-muted-foreground">Try a different search term</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Mobile search toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-9 w-9 rounded-xl"
                onClick={() => setSearchOpen(!searchOpen)}
              >
                {searchOpen ? <X className="h-[18px] w-[18px]" /> : <Search className="h-[18px] w-[18px]" />}
              </Button>

              {/* User / Auth */}
              {customer ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {customer.first_name[0]}{customer.last_name[0]}
                    </div>
                    <span className="hidden sm:block text-sm font-medium max-w-[100px] truncate">
                      {customer.first_name}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
                  </button>

                  {userMenuOpen && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setUserMenuOpen(false)}
                      />
                      {/* Menu */}
                      <div className="absolute right-0 top-full mt-2 w-56 bg-background border rounded-xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-4 py-2 border-b mb-1">
                          <p className="font-semibold text-sm">{customer.first_name} {customer.last_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                        </div>
                        <button
                          onClick={() => { setUserMenuOpen(false); onAccountClick(); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                        >
                          <User className="h-4 w-4 text-muted-foreground" />
                          My Account
                        </button>
                        <button
                          onClick={() => { setUserMenuOpen(false); onAccountClick(); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                        >
                          <Package className="h-4 w-4 text-muted-foreground" />
                          My Orders
                        </button>
                        <div className="border-t mt-1 pt-1">
                          <button
                            onClick={() => {
                              setUserMenuOpen(false);
                              onSignOut();
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted text-destructive transition-colors"
                          >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSignInClick}
                  className="gap-2"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </Button>
              )}

              {/* Cart */}
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 rounded-xl"
                onClick={onCartClick}
              >
                <ShoppingCart className="h-[18px] w-[18px]" />
                {cartCount > 0 && (
                  <Badge className="absolute -top-1.5 -right-1.5 h-[18px] min-w-[18px] flex items-center justify-center p-0 px-1 text-[9px] font-bold bg-primary text-primary-foreground rounded-full animate-in zoom-in duration-200">
                    {cartCount > 99 ? "99+" : cartCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Mobile search bar */}
          {searchOpen && (
            <div className="md:hidden pb-3 animate-in slide-in-from-top-2 duration-200 relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10 pr-10 h-10 rounded-xl bg-muted/50 border-border/50 text-sm"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Mobile search results */}
              {searchQuery.trim().length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-background border rounded-xl shadow-2xl z-50 max-h-[360px] overflow-hidden">
                  <div className="px-4 py-2 border-b bg-muted/30">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {searchResults.length} {searchResults.length === 1 ? "result" : "results"}
                    </span>
                  </div>
                  {searchResults.length > 0 ? (
                    <div className="overflow-y-auto max-h-[310px] divide-y">
                      {searchResults.slice(0, 6).map((product) => (
                        <button
                          key={product.id}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                          onClick={() => { onProductClick(product); setSearchOpen(false); onSearchChange(""); }}
                        >
                          <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageOff className="h-3.5 w-3.5 text-muted-foreground/40" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{product.name}</p>
                            <span className="text-xs font-bold text-primary">{formatPrice(product.price)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Search className="h-5 w-5 text-muted-foreground/40 mb-2" />
                      <p className="text-xs text-muted-foreground">No products found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </header>
    </>
  );
}
