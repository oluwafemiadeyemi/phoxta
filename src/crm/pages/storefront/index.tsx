import { useState, useEffect, useMemo, useCallback } from "react";
import { supabaseClient } from "@crm/lib/supabase";
import type { IProduct, ICategory } from "@crm/types/finefoods";
import { ArrowUp, CheckCircle2, ShoppingCart, Search, X } from "lucide-react";

import { StorefrontNavbar } from "./components/navbar";
import { StorefrontHero } from "./components/hero";
import { StorefrontProductGrid } from "./components/product-grid";
import { StorefrontCart } from "./components/cart";
import { StorefrontProductModal } from "./components/product-modal";
import { StorefrontCheckout } from "./components/checkout";
import { StorefrontFooter } from "./components/footer";
import { StorefrontAuthModal, type StoreCustomer } from "./components/auth-modal";
import { StorefrontAccountDashboard } from "./components/account-dashboard";
import { StorefrontChatWidget } from "./components/chat-widget";

export interface CartItem {
  product: IProduct;
  quantity: number;
}

export interface StoreInfo {
  id: string;
  title: string;
  email: string;
  gsm: string;
  address: string;
  logoLightUrl?: string;
  logoDarkUrl?: string;
  heroImageUrl?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroBadgeText?: string;
  heroCtaText?: string;
  heroCtaLink?: string;
  heroRatingText?: string;
  heroTypewriterWords?: string[];
  heroProductIds?: string[];
  heroBanners?: string[];
  stripePublishableKey?: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankSortCode?: string;
  bankIban?: string;
  bankReferencePrefix?: string;
  taxEnabled?: boolean;
  taxRate?: number;
  taxLabel?: string;
  brandPrimary?: string;
  brandSecondary?: string;
  brandAccent?: string;
  brandBackground?: string;
  brandForeground?: string;
  brandMuted?: string;
  brandSchemeName?: string;
}

/** Convert a store title to a URL-friendly slug */
function toSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function StorefrontPage({ storeSlug }: { storeSlug?: string }) {
  // Accept storeSlug as a prop (from Next.js page) or fall back to URL path
  const storeName = storeSlug || (typeof window !== "undefined" ? window.location.pathname.split("/").pop() : "") || "";

  // Use native URL search params instead of react-router's useSearchParams
  const [searchParamsStr, setSearchParamsStr] = useState(() =>
    typeof window !== "undefined" ? window.location.search : ""
  );
  const searchParams = useMemo(() => new URLSearchParams(searchParamsStr), [searchParamsStr]);

  // State
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<IProduct | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cartToast, setCartToast] = useState<string | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Auth state
  const [customer, setCustomer] = useState<StoreCustomer | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [showAccountDashboard, setShowAccountDashboard] = useState(false);

  const activeCategory = searchParams.get("category") || "all";

  // Check existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/store/auth/me");
        const data = await res.json();
        if (data.customer) {
          setCustomer(data.customer);
        }
      } catch {
        // No session
      }
    };
    checkSession();
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await fetch("/api/store/auth/signout", { method: "POST" });
    } catch {
      // ignore
    }
    setCustomer(null);
    setShowAccountDashboard(false);
  }, []);

  // Back-to-top scroll listener
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Listen for product-open events from chat widget (product recommendations)
  useEffect(() => {
    const handleOpenProduct = (e: Event) => {
      const productId = (e as CustomEvent).detail?.productId;
      if (!productId || !products.length) return;
      const product = products.find((p) => p.id === productId);
      if (product) {
        setSelectedProduct(product);
      }
    };
    window.addEventListener("phoxta:openProduct", handleOpenProduct);
    return () => window.removeEventListener("phoxta:openProduct", handleOpenProduct);
  }, [products]);

  // Load store data
  useEffect(() => {
    if (!storeName) return;

    const fetchStoreData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch all active stores and match by slugified title
        const { data: storesData, error: storeErr } = await supabaseClient
          .from("stores")
          .select("*")
          .eq("is_active", true);

        const storeData = (storesData || []).find(
          (s: any) => toSlug(s.title) === storeName.toLowerCase()
        );

        if (storeErr || !storeData) {
          setError("Store not found or is no longer active.");
          setLoading(false);
          return;
        }
        setStore({
          id: storeData.id,
          title: storeData.title,
          email: storeData.email,
          gsm: storeData.gsm,
          address: storeData.address,
          logoLightUrl: storeData.logo_light_url ?? undefined,
          logoDarkUrl: storeData.logo_dark_url ?? undefined,
          heroImageUrl: storeData.hero_image_url ?? undefined,
          heroTitle: storeData.hero_title ?? undefined,
          heroSubtitle: storeData.hero_subtitle ?? undefined,
          heroBadgeText: storeData.hero_badge_text ?? undefined,
          heroCtaText: storeData.hero_cta_text ?? undefined,
          heroCtaLink: storeData.hero_cta_link ?? undefined,
          heroRatingText: storeData.hero_rating_text ?? undefined,
          heroTypewriterWords: storeData.hero_typewriter_words ?? undefined,
          heroProductIds: storeData.hero_product_ids ?? undefined,
          heroBanners: storeData.hero_banners ?? undefined,
          stripePublishableKey: storeData.stripe_publishable_key ?? undefined,
          bankName: storeData.bank_name ?? undefined,
          bankAccountName: storeData.bank_account_name ?? undefined,
          bankAccountNumber: storeData.bank_account_number ?? undefined,
          bankSortCode: storeData.bank_sort_code ?? undefined,
          bankIban: storeData.bank_iban ?? undefined,
          bankReferencePrefix: storeData.bank_reference_prefix ?? undefined,
          taxEnabled: storeData.tax_enabled ?? false,
          taxRate: storeData.tax_rate ?? 0,
          taxLabel: storeData.tax_label ?? 'VAT',
          brandPrimary: storeData.brand_primary ?? undefined,
          brandSecondary: storeData.brand_secondary ?? undefined,
          brandAccent: storeData.brand_accent ?? undefined,
          brandBackground: storeData.brand_background ?? undefined,
          brandForeground: storeData.brand_foreground ?? undefined,
          brandMuted: storeData.brand_muted ?? undefined,
          brandSchemeName: storeData.brand_scheme_name ?? undefined,
        });

        // Fetch user_id for this store to get their products
        const { data: storeRow } = await supabaseClient
          .from("stores")
          .select("user_id")
          .eq("id", storeData.id)
          .single();

        const userId = storeRow?.user_id;
        if (!userId) {
          setError("Store configuration error.");
          setLoading(false);
          return;
        }

        // Fetch active products for this user
        const { data: productsData } = await supabaseClient
          .from("products")
          .select("*")
          .eq("user_id", userId)
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        // Fetch active categories for this user
        const { data: categoriesData } = await supabaseClient
          .from("categories")
          .select("*")
          .eq("user_id", userId)
          .eq("is_active", true)
          .order("title", { ascending: true });

        setProducts(
          (productsData || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: Number(p.price),
            stock: p.stock,
            isActive: p.is_active,
            categoryId: p.category_id,
            categoryName: p.category_name,
            imageUrl: p.image_url,
            createdAt: p.created_at,
          }))
        );

        setCategories(
          (categoriesData || []).map((c: any) => ({
            id: c.id,
            title: c.title,
            isActive: c.is_active,
            cover: c.cover,
            createdAt: c.created_at,
          }))
        );
      } catch (err) {
        setError("Failed to load store data.");
      } finally {
        setLoading(false);
      }
    };

    fetchStoreData();
  }, [storeName]);

  // Deep-link: auto-open product modal from ?product={id} (e.g. from email links)
  useEffect(() => {
    if (!products.length) return;
    const params = new URLSearchParams(window.location.search);
    const productId = params.get("product");
    if (productId) {
      const product = products.find((p) => p.id === productId);
      if (product) {
        setSelectedProduct(product);
        // Clean up URL without reload
        const url = new URL(window.location.href);
        url.searchParams.delete("product");
        window.history.replaceState({}, "", url.pathname + url.search);
      }
    }
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    let result = products;
    if (activeCategory !== "all") {
      result = result.filter((p) => p.categoryId === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          (p.categoryName || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [products, activeCategory, searchQuery]);

  // Cart operations
  const addToCart = useCallback((product: IProduct, qty = 1) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + qty, product.stock) }
            : item
        );
      }
      return [...prev, { product, quantity: Math.min(qty, product.stock) }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const updateCartQuantity = useCallback((productId: string, quantity: number) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: Math.max(1, Math.min(quantity, item.product.stock)) }
          : item
      )
    );
  }, []);

  const clearCart = useCallback(() => setCartItems([]), []);

  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cartItems]
  );

  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const handleCategoryChange = (categoryId: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (categoryId === "all") {
      newParams.delete("category");
    } else {
      newParams.set("category", categoryId);
    }
    const newSearch = newParams.toString();
    const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ""}`;
    window.history.replaceState(null, "", newUrl);
    setSearchParamsStr(newSearch ? `?${newSearch}` : "");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Loading store...</p>
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-6xl mb-4">🏪</div>
          <h1 className="text-2xl font-bold mb-2">Store Not Found</h1>
          <p className="text-muted-foreground">
            {error || "This store doesn't exist or is no longer active."}
          </p>
        </div>
      </div>
    );
  }

  // Account dashboard view
  if (showAccountDashboard && customer) {
    return (
      <StorefrontAccountDashboard
        customer={customer}
        storeName={store.title}
        onBack={() => setShowAccountDashboard(false)}
        onSignOut={handleSignOut}
        onCustomerUpdate={setCustomer}
      />
    );
  }

  // Build branding CSS overrides
  const brandingStyle: React.CSSProperties = {};
  if (store?.brandBackground) brandingStyle.backgroundColor = store.brandBackground;
  if (store?.brandForeground) brandingStyle.color = store.brandForeground;

  // Convert hex to HSL for Tailwind CSS variable overrides
  function hexToHSL(hex: string): string | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  }

  // Determine if a hex color is dark using proper sRGB linearization
  function isDark(hex: string): boolean {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return false;
    const toLinear = (c: number) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const r = toLinear(parseInt(result[1], 16));
    const g = toLinear(parseInt(result[2], 16));
    const b = toLinear(parseInt(result[3], 16));
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance < 0.4;
  }

  // Auto-pick contrasting foreground for any background color
  function contrastForeground(bgHex: string): string {
    return isDark(bgHex) ? "0 0% 100%" : "0 0% 5%";
  }

  const brandCSS = store ? [
    store.brandPrimary && `--primary: ${hexToHSL(store.brandPrimary)};`,
    store.brandSecondary && `--secondary: ${hexToHSL(store.brandSecondary)};`,
    store.brandAccent && `--accent: ${hexToHSL(store.brandAccent)};`,
    store.brandBackground && `--background: ${hexToHSL(store.brandBackground)};`,
    store.brandForeground && `--foreground: ${hexToHSL(store.brandForeground)};`,
    store.brandMuted && `--muted: ${hexToHSL(store.brandMuted)};`,
    store.brandPrimary && `--primary-foreground: ${contrastForeground(store.brandPrimary)};`,
    store.brandSecondary && `--secondary-foreground: ${contrastForeground(store.brandSecondary)};`,
    store.brandAccent && `--accent-foreground: ${contrastForeground(store.brandAccent)};`,
    store.brandForeground && `--muted-foreground: ${hexToHSL(store.brandForeground)}; --card-foreground: ${hexToHSL(store.brandForeground)};`,
    store.brandBackground && `--card: ${hexToHSL(store.brandBackground)};`,
    store.brandAccent && `--ring: ${hexToHSL(store.brandAccent)};`,
  ].filter(Boolean).join("\n") : "";

  return (
    <div className="min-h-screen bg-background flex flex-col" style={brandingStyle}>
      {brandCSS && (
        <style dangerouslySetInnerHTML={{ __html: `.min-h-screen { ${brandCSS} }` }} />
      )}
      <StorefrontNavbar
        storeName={store.title}
        cartCount={cartCount}
        onCartClick={() => setCartOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchResults={filteredProducts}
        onProductClick={setSelectedProduct}
        onAddToCart={(product) => {
          addToCart(product);
          setCartToast(product.name);
          setTimeout(() => setCartToast(null), 2500);
        }}
        customer={customer}
        onSignInClick={() => setAuthModalOpen(true)}
        onAccountClick={() => setShowAccountDashboard(true)}
        onSignOut={handleSignOut}
        brandPrimary={store.brandPrimary}
        storeLogoLight={store.logoLightUrl}
        storeLogoDark={store.logoDarkUrl}
        storePhone={store.gsm}
        storeEmail={store.email}
        categories={categories}
        onCategoryChange={handleCategoryChange}
      />

      <StorefrontHero
        storeName={store.title}
        productCount={products.length}
        products={products}
        categories={categories}
        heroTitle={store.heroTitle}
        heroSubtitle={store.heroSubtitle}
        heroBadgeText={store.heroBadgeText}
        heroImageUrl={store.heroImageUrl}
        heroCtaText={store.heroCtaText}
        heroCtaLink={store.heroCtaLink}
        heroRatingText={store.heroRatingText}
        heroTypewriterWords={store.heroTypewriterWords}
        heroProductIds={store.heroProductIds}
        heroBanners={store.heroBanners}
        brandPrimary={store.brandPrimary}
        brandSecondary={store.brandSecondary}
        brandAccent={store.brandAccent}
        brandBackground={store.brandBackground}
        brandForeground={store.brandForeground}
        brandMuted={store.brandMuted}
      />

      <main className="flex-1 w-full">
        {/* Search results banner */}
        {searchQuery.trim() && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  <span className="font-semibold">{filteredProducts.length}</span>{" "}
                  {filteredProducts.length === 1 ? "result" : "results"} for{" "}
                  <span className="font-semibold">&ldquo;{searchQuery}&rdquo;</span>
                </span>
              </div>
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Clear search
              </button>
            </div>
          </div>
        )}

        <StorefrontProductGrid
          products={filteredProducts}
          loading={loading}
          onProductClick={setSelectedProduct}
          onAddToCart={(product) => {
            addToCart(product);
            setCartToast(product.name);
            setTimeout(() => setCartToast(null), 2500);
          }}
          activeCategoryName={
            activeCategory === "all"
              ? undefined
              : categories.find((c) => c.id === activeCategory)?.title
          }
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          productCounts={products.reduce(
            (acc, p) => {
              if (p.categoryId) {
                acc[p.categoryId] = (acc[p.categoryId] || 0) + 1;
              }
              return acc;
            },
            {} as Record<string, number>
          )}
          totalCount={products.length}
        />
      </main>

      <StorefrontFooter storeName={store.title} storeEmail={store.email} storePhone={store.gsm} storeAddress={store.address} />

      {/* Cart Drawer */}
      <StorefrontCart
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        total={cartTotal}
        onRemove={removeFromCart}
        onUpdateQuantity={updateCartQuantity}
        onCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />

      {/* Product Detail */}
      <StorefrontProductModal
        product={selectedProduct}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={addToCart}
      />

      {/* Checkout */}
      <StorefrontCheckout
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        items={cartItems}
        total={cartTotal}
        storeId={store?.id ?? ""}
        customer={customer}
        taxEnabled={store?.taxEnabled}
        taxRate={store?.taxRate}
        taxLabel={store?.taxLabel}
        stripePublishableKey={store?.stripePublishableKey}
        onOrderComplete={() => {
          clearCart();
          setCheckoutOpen(false);
        }}
      />

      {/* Cart toast notification */}
      {cartToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-center gap-2 bg-foreground text-background px-4 py-3 rounded-xl shadow-2xl text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
            <span className="truncate max-w-[200px]">{cartToast}</span>
            added to cart
            <button
              onClick={() => {
                setCartToast(null);
                setCartOpen(true);
              }}
              className="ml-2 px-2 py-0.5 rounded-md bg-background/20 hover:bg-background/30 text-xs font-semibold transition-colors"
            >
              View Cart
            </button>
          </div>
        </div>
      )}

      {/* Back to top */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 flex items-center justify-center hover:scale-110 transition-transform animate-in fade-in duration-300"
          aria-label="Back to top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}

      {/* Auth Modal */}
      <StorefrontAuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        storeId={store.id}
        storeName={store.title}
        onAuthSuccess={(c) => setCustomer(c)}
      />

      {/* Chat Widget */}
      <StorefrontChatWidget storeId={store.id} color={store.brandPrimary} customer={customer} />
    </div>
  );
}
