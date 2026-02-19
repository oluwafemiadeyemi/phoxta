import { useState, useRef, useEffect } from "react";
import {
  ShoppingCart, Search, Store, X, User, LogOut, Package,
  ChevronDown, ImageOff, Menu, Heart, Phone, Mail, Truck, Home,
  ArrowRight, ChevronRight,
} from "lucide-react";
import { Button } from "@crm/components/ui/button";
import { Input } from "@crm/components/ui/input";
import { Badge } from "@crm/components/ui/badge";
import type { StoreCustomer } from "./auth-modal";
import type { IProduct, ICategory } from "@crm/types/finefoods";

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(price);
}

/** Return white or dark text based on background luminance */
function contrastText(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return L > 0.4 ? "#1e293b" : "#ffffff";
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
  brandPrimary?: string;
  storeLogoLight?: string;
  storeLogoDark?: string;
  storePhone?: string;
  storeEmail?: string;
  categories?: ICategory[];
  onCategoryChange?: (categoryId: string) => void;
}

const navLinks = [
  { label: "Home", href: "#" },
  { label: "Categories", href: "#products" },
  { label: "New Arrivals", href: "#new" },
  { label: "Best Sellers", href: "#bestsellers" },
  { label: "Sale", href: "#sale", highlight: true },
];

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
  brandPrimary,
  storeLogoLight,
  storeLogoDark,
  storePhone,
  storeEmail,
  categories = [],
  onCategoryChange,
}: StorefrontNavbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCatOpen, setMobileCatOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const showResults = searchQuery.trim().length > 0 && searchFocused;

  // Track scroll for header shadow
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  const headerBg = brandPrimary || undefined;
  const headerText = brandPrimary ? contrastText(brandPrimary) : undefined;
  const isHeaderLight = headerText === '#1e293b';
  // Pick logo variant: dark primary → light logo, light primary → dark logo
  const activeLogo = isHeaderLight ? storeLogoDark : storeLogoLight;
  // Drawer always on white bg, use dark logo (fallback to light)
  const drawerLogo = storeLogoDark || storeLogoLight;

  return (
    <>
      {/* ─── Main header ─── */}
      <header
        className={`sticky top-0 z-50 transition-shadow duration-300 ${
          scrolled ? "lg:shadow-md" : ""
        }`}
      >
        {/* Primary row: Logo | Search | Actions */}
        <div
          className={`${headerBg ? (isHeaderLight ? 'lg:border-b lg:border-black/10' : 'lg:border-b lg:border-white/10') : 'lg:border-b lg:border-gray-100'}`}
          style={headerBg ? { backgroundColor: headerBg, color: headerText } : { backgroundColor: '#ffffff' }}
        >
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 lg:h-[72px] gap-4">

              {/* Left: logo */}
              <div className="flex items-center gap-3 shrink-0">
                <a href="#" className="flex items-center gap-2.5">
                  {activeLogo ? (
                    <img src={activeLogo} alt={storeName} className="h-10 sm:h-12 w-auto max-w-[180px] shrink-0 object-contain" />
                  ) : (
                    <>
                      <div className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl shrink-0 ${headerBg ? (isHeaderLight ? 'bg-black/15 text-current' : 'bg-white/20 text-current') : 'bg-gray-900 text-white'}`}>
                        <Store className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <span className={`text-lg sm:text-xl font-bold tracking-tight ${headerBg ? '' : 'text-gray-900'}`}>
                        {storeName}
                      </span>
                    </>
                  )}
                </a>
              </div>

              {/* Center: Search bar (desktop) */}
              <div className="hidden md:flex flex-1 max-w-xl mx-6 relative" ref={searchContainerRef}>
                <div className="relative w-full group">
                  <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${headerBg ? (isHeaderLight ? 'text-black/40 group-focus-within:text-black/60' : 'text-white/50 group-focus-within:text-white/70') : 'text-gray-400 group-focus-within:text-gray-600'}`} />
                  <Input
                    placeholder="Search for products..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    className={`pl-11 pr-12 h-11 rounded-full text-sm transition-all ${headerBg ? (isHeaderLight ? 'bg-black/8 border border-black/15 placeholder:text-black/40 text-black focus-visible:ring-2 focus-visible:ring-black/10 focus-visible:bg-black/5' : 'bg-white/15 border border-white/20 placeholder:text-white/50 text-white focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:bg-white/10') : 'bg-gray-50 border border-gray-200 focus-visible:ring-2 focus-visible:ring-gray-900/10 focus-visible:border-gray-300 focus-visible:bg-white placeholder:text-gray-400'}`}
                  />
                  {searchQuery ? (
                    <button
                      onClick={() => onSearchChange("")}
                      className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${headerBg ? (isHeaderLight ? 'text-black/40 hover:text-black/60' : 'text-white/50 hover:text-white/70') : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <kbd className={`hidden lg:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium ${headerBg ? (isHeaderLight ? 'bg-black/10 text-black/40 border border-black/15' : 'bg-white/15 text-white/50 border border-white/20') : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
                        ⌘K
                      </kbd>
                    </div>
                  )}
                </div>

                {/* Search results dropdown */}
                {showResults && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 max-h-[480px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {searchResults.length} {searchResults.length === 1 ? "result" : "results"}
                      </span>
                      <button
                        onClick={() => { onSearchChange(""); setSearchFocused(false); }}
                        className="text-xs text-gray-900 hover:underline font-medium"
                      >
                        Clear all
                      </button>
                    </div>

                    {searchResults.length > 0 ? (
                      <div className="overflow-y-auto max-h-[400px]">
                        <div className="p-3 grid gap-1">
                          {searchResults.slice(0, 6).map((product) => (
                            <button
                              key={product.id}
                              className="w-full flex items-center gap-4 p-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group"
                              onClick={() => { onProductClick(product); setSearchFocused(false); }}
                            >
                              <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden shrink-0 ring-1 ring-gray-200/50">
                                {product.imageUrl ? (
                                  <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageOff className="h-4 w-4 text-gray-300" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-gray-700">
                                  {product.name}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-sm font-bold text-gray-900">{formatPrice(product.price)}</span>
                                  {product.categoryName && (
                                    <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                      {product.categoryName}
                                    </span>
                                  )}
                                  {product.stock <= 0 && (
                                    <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                      Sold out
                                    </span>
                                  )}
                                </div>
                              </div>
                              {product.stock > 0 && (
                                <div
                                  role="button"
                                  className="shrink-0 h-9 px-4 text-xs font-semibold rounded-lg bg-gray-900 hover:bg-gray-800 text-white inline-flex items-center justify-center"
                                  onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
                                >
                                  Add to bag
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                        {searchResults.length > 6 && (
                          <div className="px-5 py-3 border-t border-gray-100 text-center">
                            <button className="text-sm font-semibold text-gray-900 hover:underline inline-flex items-center gap-1">
                              View all {searchResults.length} results
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 px-6">
                        <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                          <Search className="h-7 w-7 text-gray-300" />
                        </div>
                        <p className="text-sm font-semibold text-gray-900 mb-1">No results found</p>
                        <p className="text-xs text-gray-500">Try searching with different keywords</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right: action icons */}
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {/* Mobile search */}
                <button
                  className={`md:hidden p-2 rounded-lg transition-colors ${headerBg ? (isHeaderLight ? 'hover:bg-black/10' : 'hover:bg-white/10') : 'hover:bg-gray-100'}`}
                  onClick={() => setSearchOpen(!searchOpen)}
                  aria-label="Search"
                >
                  {searchOpen ? <X className={`h-5 w-5 ${headerBg ? '' : 'text-gray-700'}`} /> : <Search className={`h-5 w-5 ${headerBg ? '' : 'text-gray-700'}`} />}
                </button>

                {/* Wishlist (desktop) */}
                <button
                  className={`hidden sm:flex p-2 rounded-lg transition-colors relative ${headerBg ? (isHeaderLight ? 'hover:bg-black/10' : 'hover:bg-white/10') : 'hover:bg-gray-100'}`}
                  aria-label="Wishlist"
                >
                  <Heart className={`h-5 w-5 ${headerBg ? '' : 'text-gray-700'}`} />
                </button>

                {/* Account */}
                {/* Account (desktop only — mobile uses bottom nav) */}
                <div className="hidden lg:block">
                {customer ? (
                  <div className="relative">
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${headerBg ? (isHeaderLight ? 'hover:bg-black/10' : 'hover:bg-white/10') : 'hover:bg-gray-100'}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${headerBg ? (isHeaderLight ? 'bg-black/15 text-current' : 'bg-white/20 text-current') : 'bg-gray-900 text-white'}`}>
                        {customer.first_name[0]}{customer.last_name[0]}
                      </div>
                      <div className="hidden lg:block text-left">
                        <p className={`text-[10px] leading-none ${headerBg ? 'opacity-60' : 'text-gray-500'}`}>Account</p>
                        <p className={`text-xs font-semibold leading-tight mt-0.5 ${headerBg ? '' : 'text-gray-900'}`}>{customer.first_name}</p>
                      </div>
                      <ChevronDown className={`h-3.5 w-3.5 hidden lg:block ${headerBg ? 'opacity-50' : 'text-gray-400'}`} />
                    </button>

                    {userMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="px-5 py-3 border-b border-gray-100">
                            <p className="font-semibold text-sm text-gray-900">{customer.first_name} {customer.last_name}</p>
                            <p className="text-xs text-gray-500 truncate mt-0.5">{customer.email}</p>
                          </div>
                          <div className="py-1">
                            <button
                              onClick={() => { setUserMenuOpen(false); onAccountClick(); }}
                              className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                            >
                              <User className="h-4 w-4 text-gray-400" />
                              My Account
                            </button>
                            <button
                              onClick={() => { setUserMenuOpen(false); onAccountClick(); }}
                              className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                            >
                              <Package className="h-4 w-4 text-gray-400" />
                              My Orders
                            </button>
                            <button
                              onClick={() => { setUserMenuOpen(false); onAccountClick(); }}
                              className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                            >
                              <Heart className="h-4 w-4 text-gray-400" />
                              Wishlist
                            </button>
                          </div>
                          <div className="border-t border-gray-100 pt-1">
                            <button
                              onClick={() => { setUserMenuOpen(false); onSignOut(); }}
                              className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
                  <button
                    onClick={onSignInClick}
                    className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${headerBg ? (isHeaderLight ? 'hover:bg-black/10' : 'hover:bg-white/10') : 'hover:bg-gray-100'}`}
                  >
                    <User className={`h-5 w-5 ${headerBg ? '' : 'text-gray-700'}`} />
                    <div className="hidden lg:block text-left">
                      <p className={`text-[10px] leading-none ${headerBg ? 'opacity-60' : 'text-gray-500'}`}>Account</p>
                      <p className={`text-xs font-semibold leading-tight mt-0.5 ${headerBg ? '' : 'text-gray-900'}`}>Sign In</p>
                    </div>
                  </button>
                )}
                </div>

                {/* Cart */}
                <button
                  onClick={onCartClick}
                  className={`flex items-center gap-2 p-2 rounded-lg transition-colors relative ${headerBg ? (isHeaderLight ? 'hover:bg-black/10' : 'hover:bg-white/10') : 'hover:bg-gray-100'}`}
                >
                  <div className="relative">
                    <ShoppingCart className={`h-5 w-5 ${headerBg ? '' : 'text-gray-700'}`} />
                    {cartCount > 0 && (
                      <span className={`absolute -top-2 -right-2 h-[18px] min-w-[18px] flex items-center justify-center px-1 text-[10px] font-bold rounded-full animate-in zoom-in duration-200 ${headerBg ? (isHeaderLight ? 'bg-black/80 text-white' : 'bg-white text-gray-900') : 'bg-gray-900 text-white'}`}>
                        {cartCount > 99 ? "99+" : cartCount}
                      </span>
                    )}
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className={`text-[10px] leading-none ${headerBg ? 'opacity-60' : 'text-gray-500'}`}>Cart</p>
                    <p className={`text-xs font-semibold leading-tight mt-0.5 ${headerBg ? '' : 'text-gray-900'}`}>
                      {cartCount} {cartCount === 1 ? "item" : "items"}
                    </p>
                  </div>
                </button>

                {/* Mobile hamburger menu (rightmost) */}
                <button
                  className={`lg:hidden p-2 rounded-lg transition-colors ${headerBg ? (isHeaderLight ? 'hover:bg-black/10' : 'hover:bg-white/10') : 'hover:bg-gray-100'}`}
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Open menu"
                >
                  <Menu className={`h-5 w-5 ${headerBg ? '' : 'text-gray-700'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile contact bar */}
        {(storePhone || storeEmail) && (
          <div className="lg:hidden flex items-center justify-center gap-6 px-4 py-3 bg-gray-50 border-t border-gray-100 text-sm text-gray-700">
            {storePhone && (
              <a href={`tel:${storePhone}`} className="flex items-center gap-2 hover:text-gray-900 transition-colors">
                <Phone className="h-4 w-4" />
                {storePhone}
              </a>
            )}
            {storeEmail && (
              <a href={`mailto:${storeEmail}`} className="flex items-center gap-2 hover:text-gray-900 transition-colors">
                <Mail className="h-4 w-4" />
                {storeEmail}
              </a>
            )}
          </div>
        )}

        {/* Navigation row (desktop) */}
        <div className="hidden lg:block border-b border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-11">
              <nav className="flex items-center gap-0 h-full">
                {navLinks.map((link) => {
                  // Categories item gets a hover dropdown
                  if (link.label === "Categories" && categories.length > 0) {
                    return (
                      <div key={link.label} className="relative h-full group">
                        <a
                          href={link.href}
                          className="relative px-4 h-full flex items-center gap-1 text-[13px] font-medium transition-colors text-gray-800 hover:text-gray-950 after:absolute after:bottom-0 after:left-4 after:right-4 after:h-[2px] after:bg-gray-900 after:scale-x-0 group-hover:after:scale-x-100 after:transition-transform after:origin-left"
                        >
                          {link.label}
                          <ChevronDown className="h-3 w-3 opacity-50 transition-transform group-hover:rotate-180" />
                        </a>
                        {/* Dropdown */}
                        <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 absolute top-full right-0 pt-1 z-50">
                          <div className="bg-white border border-gray-200 rounded-xl shadow-xl py-2 min-w-[200px]">
                            <button
                              onClick={() => {
                                onCategoryChange?.("all");
                                document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors font-medium"
                            >
                              All Products
                            </button>
                            <div className="border-t border-gray-100 my-1" />
                            {categories.map((cat) => (
                              <button
                                key={cat.id}
                                onClick={() => {
                                  onCategoryChange?.(cat.id);
                                  document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                              >
                                {cat.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <a
                      key={link.label}
                      href={link.href}
                      className={`relative px-4 h-full flex items-center text-[13px] font-medium transition-colors ${
                        link.highlight
                          ? "text-red-600 hover:text-red-700 font-semibold"
                          : "text-gray-800 hover:text-gray-950"
                      } after:absolute after:bottom-0 after:left-4 after:right-4 after:h-[2px] after:bg-gray-900 after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left`}
                    >
                      {link.label}
                    </a>
                  );
                })}
              </nav>
              {(storePhone || storeEmail) && (
                <div className="flex items-center gap-4 text-[12px] text-gray-700">
                  {storePhone && (
                    <a href={`tel:${storePhone}`} className="flex items-center gap-1.5 hover:text-gray-900 transition-colors">
                      <Phone className="h-3.5 w-3.5" />
                      {storePhone}
                    </a>
                  )}
                  {storeEmail && (
                    <a href={`mailto:${storeEmail}`} className="flex items-center gap-1.5 hover:text-gray-900 transition-colors">
                      <Mail className="h-3.5 w-3.5" />
                      {storeEmail}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile search bar */}
        {searchOpen && (
          <div className="md:hidden border-t border-gray-100 p-3 animate-in slide-in-from-top-2 duration-200 relative bg-white">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 pr-10 h-11 rounded-full bg-gray-50 border-gray-200 text-sm"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Mobile search results */}
            {searchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full bg-white border-t border-gray-100 shadow-2xl z-50 max-h-[60vh] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {searchResults.length} {searchResults.length === 1 ? "result" : "results"}
                  </span>
                </div>
                {searchResults.length > 0 ? (
                  <div className="overflow-y-auto max-h-[50vh] divide-y divide-gray-50">
                    {searchResults.slice(0, 6).map((product) => (
                      <button
                        key={product.id}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                        onClick={() => { onProductClick(product); setSearchOpen(false); onSearchChange(""); }}
                      >
                        <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageOff className="h-3.5 w-3.5 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                          <span className="text-sm font-bold text-gray-900">{formatPrice(product.price)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10">
                    <Search className="h-5 w-5 text-gray-300 mb-2" />
                    <p className="text-xs text-gray-500">No products found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      {/* ─── Mobile menu overlay ─── */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Slide-out drawer (from right) */}
          <div className="fixed top-4 right-3 z-50 w-[70vw] max-w-[280px] max-h-[60vh] bg-white rounded-2xl shadow-2xl animate-in slide-in-from-right duration-300 lg:hidden flex flex-col overflow-hidden">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2.5">
                {drawerLogo ? (
                  <img src={drawerLogo} alt={storeName} className="h-9 w-auto max-w-[140px] object-contain" />
                ) : (
                  <>
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-900 text-white">
                      <Store className="h-5 w-5" />
                    </div>
                    <span className="font-bold text-gray-900">{storeName}</span>
                  </>
                )}
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 -mr-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Drawer search */}
            <div className="px-5 py-4 border-b border-gray-100 shrink-0">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10 h-11 rounded-xl bg-gray-50 border-gray-200 text-sm"
                />
              </div>
            </div>

            {/* Drawer navigation */}
            <nav className="flex-1 overflow-y-auto py-2">
              {navLinks.map((link) => {
                if (link.label === "Categories" && categories.length > 0) {
                  return (
                    <div key={link.label}>
                      <button
                        onClick={() => setMobileCatOpen(!mobileCatOpen)}
                        className="w-full flex items-center justify-between px-5 py-3.5 text-[15px] font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                      >
                        {link.label}
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${mobileCatOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {mobileCatOpen && (
                        <div className="bg-gray-50/60">
                          <button
                            onClick={() => {
                              onCategoryChange?.("all");
                              setMobileMenuOpen(false);
                              setMobileCatOpen(false);
                              document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
                            }}
                            className="w-full text-left px-8 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                          >
                            All Products
                          </button>
                          {categories.map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => {
                                onCategoryChange?.(cat.id);
                                setMobileMenuOpen(false);
                                setMobileCatOpen(false);
                                document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
                              }}
                              className="w-full text-left px-8 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                            >
                              {cat.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-5 py-3.5 text-[15px] font-medium transition-colors ${
                      link.highlight ? "text-red-600" : "text-gray-700 hover:text-gray-900"
                    } hover:bg-gray-50`}
                  >
                    {link.label}
                  </a>
                );
              })}

              <div className="mx-5 my-3 border-t border-gray-100" />

              {/* Account links */}
              {customer ? (
                <>
                  <div className="px-5 py-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Account</p>
                  </div>
                  <button
                    onClick={() => { setMobileMenuOpen(false); onAccountClick(); }}
                    className="w-full flex items-center gap-3 px-5 py-3 text-[15px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="h-4.5 w-4.5 text-gray-400" />
                    My Account
                  </button>
                  <button
                    onClick={() => { setMobileMenuOpen(false); onAccountClick(); }}
                    className="w-full flex items-center gap-3 px-5 py-3 text-[15px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Package className="h-4.5 w-4.5 text-gray-400" />
                    Orders
                  </button>
                  <button
                    onClick={() => { setMobileMenuOpen(false); onSignOut(); }}
                    className="w-full flex items-center gap-3 px-5 py-3 text-[15px] font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4.5 w-4.5" />
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="px-5 py-3">
                  <Button
                    onClick={() => { setMobileMenuOpen(false); onSignInClick(); }}
                    className="w-full h-11 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-semibold text-sm"
                  >
                    Sign In / Register
                  </Button>
                </div>
              )}
            </nav>

            {/* Drawer footer */}
            <div className="border-t border-gray-100 px-5 py-4 shrink-0">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Truck className="h-3.5 w-3.5 shrink-0" />
                <span>Free delivery on orders over £50</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Mobile bottom navigation bar ─── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-around h-14 px-2">
          <a
            href="#"
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px] font-medium">Home</span>
          </a>
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Search className="h-5 w-5" />
            <span className="text-[10px] font-medium">Search</span>
          </button>
          <button
            onClick={onCartClick}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-gray-600 hover:text-gray-900 transition-colors relative"
          >
            <div className="relative">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 h-4 min-w-[16px] flex items-center justify-center px-1 text-[9px] font-bold bg-red-500 text-white rounded-full">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">Cart</span>
          </button>
          <button
            onClick={() => { customer ? onAccountClick() : onSignInClick(); }}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <User className="h-5 w-5" />
            <span className="text-[10px] font-medium">{customer ? "Account" : "Sign In"}</span>
          </button>
        </div>
        {/* Safe area for devices with home indicator */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>

    </>
  );
}
