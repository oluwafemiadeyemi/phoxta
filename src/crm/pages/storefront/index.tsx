import { useState, useEffect, useMemo, useCallback } from "react";
import { supabaseClient } from "@crm/lib/supabase";
import type { IProduct, ICategory } from "@crm/types/finefoods";
import { ArrowUp, CheckCircle2, ShoppingCart, Search, X } from "lucide-react";

import { StorefrontNavbar } from "./components/navbar";
import { StorefrontHero } from "./components/hero";
import { StorefrontCategoryBar } from "./components/category-bar";
import { StorefrontCategorySidebar } from "./components/category-sidebar";
import { StorefrontProductGrid } from "./components/product-grid";
import { StorefrontCart } from "./components/cart";
import { StorefrontProductModal } from "./components/product-modal";
import { StorefrontCheckout } from "./components/checkout";
import { StorefrontFooter } from "./components/footer";
import { StorefrontAuthModal, type StoreCustomer } from "./components/auth-modal";
import { StorefrontAccountDashboard } from "./components/account-dashboard";

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
      />

      <main className="flex-1 w-full py-5 sm:py-8">
        {/* Mobile: horizontal category bar */}
        <div className="px-3 sm:px-6 lg:px-8 md:hidden">
          <StorefrontCategoryBar
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
        </div>

        <div className="flex gap-0">
          {/* Desktop: category side panel flush to the left */}
          <div className="hidden md:block pl-2 lg:pl-4">
            <StorefrontCategorySidebar
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
          </div>

          {/* Product grid */}
          <div className="flex-1 min-w-0 px-3 sm:px-6 lg:px-8">
            {/* Search results banner */}
            {searchQuery.trim() && (
              <div className="flex items-center justify-between mb-4 px-4 py-3 rounded-xl bg-primary/5 border border-primary/10">
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
            />
          </div>
        </div>
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
    </div>
  );
}
