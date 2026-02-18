import { useState, useEffect, useRef, useCallback } from "react";
import { ImageOff, ChevronRight, Grid3X3 } from "lucide-react";
import type { IProduct, ICategory } from "@crm/types/finefoods";

interface StorefrontHeroProps {
  storeName: string;
  productCount: number;
  products?: IProduct[];
  categories?: ICategory[];
  heroTitle?: string;
  heroSubtitle?: string;
  heroBadgeText?: string;
  heroImageUrl?: string;
  heroCtaText?: string;
  heroCtaLink?: string;
  heroRatingText?: string;
  heroTypewriterWords?: string[];
  heroProductIds?: string[];
  heroBanners?: string[];
}

/* ─── Constellation Stars Canvas ─── */
function ConstellationCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const starsRef = useRef<{ x: number; y: number; vx: number; vy: number; r: number; o: number; conn: boolean }[]>([]);
  const rafRef = useRef<number>(0);

  const init = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = typeof devicePixelRatio !== "undefined" ? devicePixelRatio : 1;
    const w = (canvas.width = canvas.offsetWidth * dpr);
    const h = (canvas.height = canvas.offsetHeight * dpr);
    const count = Math.floor((w * h) / 50000);
    const stars: typeof starsRef.current = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() * 0.9 + 0.3,
        o: Math.random() * 0.3 + 0.12,
        conn: Math.random() < 0.12,
      });
    }
    starsRef.current = stars;
  }, []);

  useEffect(() => {
    init();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = typeof devicePixelRatio !== "undefined" ? devicePixelRatio : 1;
    const LINE_DIST = 80 * dpr;
    const MOUSE_DIST = 120 * dpr;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const stars = starsRef.current;
      const mx = mouseRef.current.x * dpr;
      const my = mouseRef.current.y * dpr;

      for (const s of stars) {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0) s.x = w;
        if (s.x > w) s.x = 0;
        if (s.y < 0) s.y = h;
        if (s.y > h) s.y = 0;
      }

      for (let i = 0; i < stars.length; i++) {
        if (!stars[i].conn) continue;
        for (let j = i + 1; j < stars.length; j++) {
          if (!stars[j].conn) continue;
          const dx = stars[i].x - stars[j].x;
          const dy = stars[i].y - stars[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINE_DIST) {
            ctx.beginPath();
            ctx.moveTo(stars[i].x, stars[i].y);
            ctx.lineTo(stars[j].x, stars[j].y);
            ctx.strokeStyle = `rgba(148,163,184,${0.08 * (1 - dist / LINE_DIST)})`;
            ctx.lineWidth = 0.5 * dpr;
            ctx.stroke();
          }
        }
      }

      for (const s of stars) {
        const mdx = s.x - mx;
        const mdy = s.y - my;
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mDist < MOUSE_DIST) {
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(mx, my);
          ctx.strokeStyle = `rgba(99,102,241,${0.18 * (1 - mDist / MOUSE_DIST)})`;
          ctx.lineWidth = 0.5 * dpr;
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * dpr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100,116,139,${s.o})`;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    const handleResize = () => init();
    window.addEventListener("resize", handleResize);
    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const handleLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };
    canvas.addEventListener("mousemove", handleMouse);
    canvas.addEventListener("mouseleave", handleLeave);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", handleMouse);
      canvas.removeEventListener("mouseleave", handleLeave);
    };
  }, [init]);

  return <canvas ref={canvasRef} className={className} style={{ width: "100%", height: "100%" }} />;
}

/* ─── Swerve colors for floating cards ─── */
const swerveColors = [
  ["#ec4899", "#8b5cf6", "#6366f1"],
  ["#f59e0b", "#ef4444", "#f97316"],
  ["#10b981", "#14b8a6", "#06b6d4"],
  ["#a855f7", "#ec4899", "#d946ef"],
];

/* ─── Category Sidebar with Glassmorphism ─── */
function CategorySidebar({ categories, products }: { categories: ICategory[]; products: IProduct[] }) {
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = (catId: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setHoveredCat(catId);
  };
  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setHoveredCat(null), 200);
  };

  const getProductsForCategory = (catId: string) =>
    products.filter((p) => p.categoryId === catId).slice(0, 4);

  if (categories.length === 0) return null;

  return (
    <div className="hidden lg:flex flex-col flex-shrink-0 z-20 relative">
      <div
        className="rounded-2xl border border-white/30 shadow-xl px-1 py-2 space-y-0.5 min-w-[180px]"
        style={{
          background: "rgba(255,255,255,0.55)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <div className="flex items-center gap-2 px-3 py-1.5 mb-1">
          <Grid3X3 className="h-3.5 w-3.5 text-indigo-500" />
          <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Categories</span>
        </div>
        {categories.slice(0, 8).map((cat) => (
          <div
            key={cat.id}
            className="relative"
            onMouseEnter={() => handleMouseEnter(cat.id)}
            onMouseLeave={handleMouseLeave}
          >
            <button
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-sm font-medium transition-all cursor-pointer ${
                hoveredCat === cat.id
                  ? "bg-white/80 text-gray-900 shadow-sm"
                  : "text-gray-600 hover:bg-white/50 hover:text-gray-800"
              }`}
            >
              <span className="truncate text-[13px]">{cat.title}</span>
              <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                hoveredCat === cat.id ? "translate-x-0.5 text-indigo-500" : "text-gray-400"
              }`} />
            </button>

            {/* Hover popup */}
            {hoveredCat === cat.id && (() => {
              const catProducts = getProductsForCategory(cat.id);
              if (catProducts.length === 0) return null;
              return (
                <div
                  className="absolute left-full top-0 ml-2 z-30 rounded-2xl border border-white/30 shadow-2xl p-3 min-w-[260px]"
                  style={{
                    background: "rgba(255,255,255,0.7)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                  }}
                  onMouseEnter={() => handleMouseEnter(cat.id)}
                  onMouseLeave={handleMouseLeave}
                >
                  <p className="text-xs font-bold text-gray-700 mb-2 px-1">{cat.title}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {catProducts.map((product) => (
                      <div
                        key={product.id}
                        className="group rounded-xl overflow-hidden bg-white/60 border border-gray-200/60 hover:shadow-md transition-all"
                      >
                        <div className="aspect-square w-full bg-gray-100 relative overflow-hidden">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageOff className="h-5 w-5 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="p-1.5">
                          <p className="text-[10px] font-semibold text-gray-800 truncate">{product.name}</p>
                          <p className="text-[10px] font-bold text-indigo-600">£{product.price.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StorefrontHero({
  storeName,
  productCount,
  products = [],
  categories = [],
  heroTitle,
  heroSubtitle,
  heroBadgeText,
  heroImageUrl,
  heroCtaText,
  heroCtaLink,
  heroRatingText,
  heroTypewriterWords,
  heroProductIds,
  heroBanners = [],
}: StorefrontHeroProps) {
  /* Pick products for floating cards */
  let heroProducts: IProduct[];
  if (heroProductIds && heroProductIds.length > 0) {
    heroProducts = heroProductIds
      .map((pid) => products.find((p) => p.id === pid))
      .filter(Boolean) as IProduct[];
  } else {
    heroProducts = products.filter((p) => p.imageUrl).slice(0, 4);
  }
  while (heroProducts.length < 4 && heroProducts.length < products.length) {
    const next = products[heroProducts.length];
    if (!heroProducts.find((p) => p.id === next.id)) heroProducts.push(next);
  }

  const leftProducts = heroProducts.slice(0, 4);

  const modelImageUrl =
    heroImageUrl ||
    "https://www.pngall.com/wp-content/uploads/5/African-Woman-PNG-Image.png";

  /* ─── Banner Carousel ─── */
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerCount = heroBanners.length;

  useEffect(() => {
    if (bannerCount <= 1) return;
    const timer = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % bannerCount);
    }, 4000);
    return () => clearInterval(timer);
  }, [bannerCount]);

  return (
    <section className="relative overflow-hidden bg-white text-gray-900">
      {/* Keyframe styles */}
      <style>{`
        @keyframes hero-bounce-slow {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-18px) rotate(2deg); }
        }
        @keyframes hero-bounce-slow-alt {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-14px) rotate(-2deg); }
        }
        @keyframes shimmer-border {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes hero-fade-in {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer-text {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes textBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .hero-float-1 { animation: hero-bounce-slow 4s ease-in-out infinite; }
        .hero-float-2 { animation: hero-bounce-slow-alt 5s ease-in-out infinite 0.5s; }
        .hero-float-3 { animation: hero-bounce-slow 4.5s ease-in-out infinite 1s; }
        .hero-float-4 { animation: hero-bounce-slow-alt 5.5s ease-in-out infinite 0.3s; }
        .hero-fade-in { animation: hero-fade-in 0.8s ease-out forwards; }
        .hero-fade-in-d1 { animation: hero-fade-in 0.8s ease-out 0.15s forwards; opacity: 0; }
        .hero-fade-in-d2 { animation: hero-fade-in 0.8s ease-out 0.3s forwards; opacity: 0; }
        .hero-fade-in-d3 { animation: hero-fade-in 0.8s ease-out 0.45s forwards; opacity: 0; }
        .hero-fade-in-d4 { animation: hero-fade-in 0.8s ease-out 0.6s forwards; opacity: 0; }
      `}</style>

      {/* Constellation canvas background */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{ opacity: 0.25 }}>
        <ConstellationCanvas className="absolute inset-0" />
      </div>

      {/* Colorful gradient glows (Phoxta-style) */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[45%] w-[320px] h-[260px] sm:w-[500px] sm:h-[400px] md:w-[700px] md:h-[500px]" style={{ filter: "blur(80px)" }}>
          <div className="absolute inset-0 m-auto w-[120px] h-[120px] sm:w-[160px] sm:h-[160px] md:w-[200px] md:h-[200px] rounded-full" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)" }} />
          <div className="absolute inset-0 m-auto w-[220px] h-[160px] sm:w-[340px] sm:h-[240px] md:w-[420px] md:h-[280px] rounded-full opacity-30" style={{ background: "radial-gradient(ellipse at center, rgba(99,102,241,0.4) 0%, transparent 60%)" }} />
          <div className="absolute inset-0 m-auto w-[180px] h-[200px] sm:w-[280px] sm:h-[320px] md:w-[340px] md:h-[380px] rounded-full opacity-25 rotate-[30deg]" style={{ background: "radial-gradient(ellipse at center, rgba(168,85,247,0.35) 0%, transparent 55%)" }} />
          <div className="absolute inset-0 m-auto w-[200px] h-[140px] sm:w-[320px] sm:h-[200px] md:w-[400px] md:h-[250px] rounded-full opacity-20 -rotate-[20deg]" style={{ background: "radial-gradient(ellipse at center, rgba(59,130,246,0.35) 0%, transparent 55%)" }} />
          <div className="absolute inset-0 m-auto w-[140px] h-[160px] sm:w-[200px] sm:h-[240px] md:w-[250px] md:h-[300px] rounded-full opacity-15 -translate-x-[40px] sm:-translate-x-[60px]" style={{ background: "radial-gradient(ellipse at center, rgba(244,114,182,0.3) 0%, transparent 55%)" }} />
          <div className="absolute inset-0 m-auto w-[120px] h-[100px] sm:w-[170px] sm:h-[140px] md:w-[210px] md:h-[170px] rounded-full opacity-15 translate-y-[30px]" style={{ background: "radial-gradient(ellipse at center, rgba(52,211,153,0.25) 0%, transparent 60%)" }} />
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-28">

        {/* Right: model image – hidden on mobile */}
        <div className="hidden lg:block absolute right-4 xl:right-16 top-1/2 -translate-y-[58%] z-10">
          <div className="relative">
            <div className="absolute inset-x-0 bottom-0 h-[75%] rounded-3xl bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200 shadow-xl" />
            <img
              src={modelImageUrl}
              alt="Store feature"
              className="relative w-72 xl:w-96 h-[26rem] xl:h-[32rem] object-contain object-bottom drop-shadow-2xl"
            />

            {/* Floating product cards overlaying the hero image */}
            {leftProducts.length > 0 && leftProducts[0] && (
              <div className="absolute -left-16 xl:-left-20 top-1/2 -translate-y-1/2 z-20 hero-float-1">
                <FloatingProductCard
                  product={leftProducts[0]}
                  floatClass=""
                  delay={0}
                  colors={swerveColors[0]}
                />
              </div>
            )}
            {leftProducts.length > 1 && leftProducts[1] && (
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-10 xl:-bottom-12 z-20 hero-float-2">
                <FloatingProductCard
                  product={leftProducts[1]}
                  floatClass=""
                  delay={0.6}
                  colors={swerveColors[1]}
                />
              </div>
            )}
            {leftProducts.length > 2 && leftProducts[2] && (
              <div className="absolute -right-16 xl:-right-20 top-1/3 -translate-y-1/2 z-20 hero-float-3">
                <FloatingProductCard
                  product={leftProducts[2]}
                  floatClass=""
                  delay={1.2}
                  colors={swerveColors[2]}
                />
              </div>
            )}
            {leftProducts.length > 3 && leftProducts[3] && (
              <div className="absolute -right-12 xl:-right-16 bottom-[15%] z-20 hero-float-4">
                <FloatingProductCard
                  product={leftProducts[3]}
                  floatClass=""
                  delay={1.8}
                  colors={swerveColors[3]}
                />
              </div>
            )}
          </div>
        </div>

        {/* Banner Carousel + Categories in a row (desktop) */}
        <div className="hidden lg:flex items-start gap-6 relative z-15 max-w-[60%] -ml-2">
          {/* Banner Carousel */}
          {heroBanners.length > 0 ? (
            <div className="shrink-0 pt-4 hero-fade-in">
              <div className="relative w-[360px] xl:w-[420px] aspect-square rounded-2xl overflow-hidden shadow-xl border border-gray-200 bg-gray-50">
                {heroBanners.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Banner ${i + 1}`}
                    className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out"
                    style={{ opacity: i === bannerIndex ? 1 : 0 }}
                  />
                ))}
                {/* Dot indicators */}
                {heroBanners.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {heroBanners.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setBannerIndex(i)}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                          i === bannerIndex
                            ? "bg-white scale-110 shadow-md"
                            : "bg-white/50 hover:bg-white/70"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="shrink-0 pt-4 hero-fade-in">
              <div className="w-[360px] xl:w-[420px] aspect-square rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 flex items-center justify-center">
                <p className="text-sm text-gray-400">No banners uploaded</p>
              </div>
            </div>
          )}

          {/* Category sidebar */}
          <CategorySidebar categories={categories} products={products} />
        </div>

        {/* Mobile: Banner Carousel */}
        {heroBanners.length > 0 && (
          <div className="lg:hidden max-w-sm mx-auto hero-fade-in">
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-xl border border-gray-200 bg-gray-50">
              {heroBanners.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Banner ${i + 1}`}
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out"
                  style={{ opacity: i === bannerIndex ? 1 : 0 }}
                />
              ))}
              {heroBanners.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                  {heroBanners.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setBannerIndex(i)}
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                        i === bannerIndex
                          ? "bg-white scale-110 shadow-md"
                          : "bg-white/50 hover:bg-white/70"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile: Horizontal scrolling product cards */}
        {leftProducts.length > 0 && (
          <div className="lg:hidden mt-10 -mx-4 px-4">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
              {leftProducts.map((product) => (
                <div key={product.id} className="snap-start shrink-0">
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-gray-50 shadow-lg border border-gray-200">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageOff className="h-6 w-6 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1">
                      <p className="text-[9px] sm:text-[10px] font-medium text-white truncate">
                        {product.name}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Floating product card                                              */
/* ------------------------------------------------------------------ */
function FloatingProductCard({
  product,
  floatClass,
  delay,
  colors = ["#ec4899", "#8b5cf6", "#6366f1"],
}: {
  product: IProduct;
  floatClass: string;
  delay: number;
  colors?: string[];
}) {
  const gradient = `conic-gradient(from 0deg, transparent 0%, transparent 60%, ${colors[0]} 70%, ${colors[1]} 80%, ${colors[2]} 90%, transparent 100%)`;

  return (
    <div
      className={`relative ${floatClass}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="relative w-28 h-28 xl:w-32 xl:h-32 rounded-2xl overflow-hidden bg-gray-50 shadow-xl border border-gray-200">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="h-8 w-8 text-gray-300" />
          </div>
        )}

        {/* Colorful shimmer border */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none z-10"
          style={{
            mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            maskComposite: "exclude",
            WebkitMaskComposite: "xor",
            padding: "3px",
            overflow: "hidden",
          }}
        >
          <div
            className="absolute -inset-[50%] w-[200%] h-[200%]"
            style={{
              background: gradient,
              animation: `shimmer-border ${3 + delay}s linear infinite`,
            }}
          />
        </div>

        {/* Product name overlay */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
          <p className="text-[10px] font-medium text-white truncate">
            {product.name}
          </p>
        </div>
      </div>
    </div>
  );
}
