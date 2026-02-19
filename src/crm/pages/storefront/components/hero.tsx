import { useState, useEffect } from "react";
import { ImageOff, ArrowRight, Sparkles } from "lucide-react";
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
  brandPrimary?: string;
  brandSecondary?: string;
  brandAccent?: string;
  brandBackground?: string;
  brandForeground?: string;
  brandMuted?: string;
}

/* ─── Typewriter Hook ─── */
function useTypewriter(words: string[], typingSpeed = 80, deletingSpeed = 50, pauseTime = 2000) {
  const [text, setText] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (words.length === 0) return;
    const currentWord = words[wordIndex % words.length];

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        setText(currentWord.substring(0, text.length + 1));
        if (text.length + 1 === currentWord.length) {
          setTimeout(() => setIsDeleting(true), pauseTime);
        }
      } else {
        setText(currentWord.substring(0, text.length - 1));
        if (text.length === 0) {
          setIsDeleting(false);
          setWordIndex((prev) => (prev + 1) % words.length);
        }
      }
    }, isDeleting ? deletingSpeed : typingSpeed);

    return () => clearTimeout(timeout);
  }, [text, isDeleting, wordIndex, words, typingSpeed, deletingSpeed, pauseTime]);

  return text;
}

/* ─── Animated Mesh Gradient Background ─── */
interface HeroBackgroundProps {
  brandPrimary?: string;
  brandBackground?: string;
}

function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(99,102,241,${alpha})`;
  return `rgba(${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)},${alpha})`;
}

function isDarkColor(hex: string): boolean {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return true;
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const L = 0.2126 * toLinear(parseInt(result[1], 16)) + 0.7152 * toLinear(parseInt(result[2], 16)) + 0.0722 * toLinear(parseInt(result[3], 16));
  return L < 0.4;
}

function HeroBackground({ brandPrimary, brandBackground }: HeroBackgroundProps) {
  // Use only primary color at varying opacities for the entire background
  const c = brandPrimary || "#6366f1";
  const bg = brandBackground || "#f8fafc";

  return (
    <div className="absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes mesh-float-1 {
          0%, 100% { transform: translate(0%, 0%) scale(1); }
          25% { transform: translate(15%, -20%) scale(1.1); }
          50% { transform: translate(-10%, 15%) scale(0.95); }
          75% { transform: translate(20%, 10%) scale(1.05); }
        }
        @keyframes mesh-float-2 {
          0%, 100% { transform: translate(0%, 0%) scale(1); }
          25% { transform: translate(-20%, 15%) scale(1.15); }
          50% { transform: translate(15%, -10%) scale(0.9); }
          75% { transform: translate(-5%, -20%) scale(1.1); }
        }
        @keyframes mesh-float-3 {
          0%, 100% { transform: translate(0%, 0%) scale(1.05); }
          33% { transform: translate(10%, 20%) scale(0.95); }
          66% { transform: translate(-15%, -10%) scale(1.1); }
        }
        @keyframes mesh-float-4 {
          0%, 100% { transform: translate(0%, 0%) scale(1); }
          20% { transform: translate(-10%, -15%) scale(1.1); }
          40% { transform: translate(20%, 5%) scale(0.95); }
          60% { transform: translate(-5%, 20%) scale(1.08); }
          80% { transform: translate(15%, -10%) scale(1); }
        }
        @keyframes aurora-wave {
          0% { transform: translateX(-100%) skewX(-15deg); opacity: 0; }
          20% { opacity: 0.6; }
          50% { transform: translateX(20%) skewX(-15deg); opacity: 0.4; }
          80% { opacity: 0.6; }
          100% { transform: translateX(100%) skewX(-15deg); opacity: 0; }
        }
        @keyframes grid-pulse {
          0%, 100% { opacity: 0.03; }
          50% { opacity: 0.07; }
        }
        @keyframes sparkle-float {
          0% { transform: translateY(100%) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
        }
      `}</style>

      {/* Base gradient — primary tinted */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${bg} 0%, ${hexToRgba(c, 0.04)} 25%, ${hexToRgba(c, 0.06)} 50%, ${hexToRgba(c, 0.03)} 75%, ${bg} 100%)`,
        }}
      />

      {/* Animated grid overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(${hexToRgba(c, 0.06)} 1px, transparent 1px),
            linear-gradient(90deg, ${hexToRgba(c, 0.06)} 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          animation: "grid-pulse 6s ease-in-out infinite",
        }}
      />

      {/* Mesh gradient orbs — all primary color at different opacities/sizes */}
      <div
        className="absolute w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] rounded-full opacity-[0.35]"
        style={{
          top: "-15%",
          left: "-10%",
          background: `radial-gradient(circle, ${hexToRgba(c, 0.5)} 0%, ${hexToRgba(c, 0.15)} 40%, transparent 70%)`,
          animation: "mesh-float-1 20s ease-in-out infinite",
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] rounded-full opacity-[0.25]"
        style={{
          top: "20%",
          right: "-5%",
          background: `radial-gradient(circle, ${hexToRgba(c, 0.4)} 0%, ${hexToRgba(c, 0.1)} 45%, transparent 70%)`,
          animation: "mesh-float-2 25s ease-in-out infinite",
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute w-[350px] h-[350px] sm:w-[500px] sm:h-[500px] rounded-full opacity-[0.2]"
        style={{
          bottom: "-10%",
          left: "30%",
          background: `radial-gradient(circle, ${hexToRgba(c, 0.35)} 0%, ${hexToRgba(c, 0.1)} 45%, transparent 70%)`,
          animation: "mesh-float-3 22s ease-in-out infinite",
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute w-[300px] h-[300px] sm:w-[450px] sm:h-[450px] rounded-full opacity-[0.18]"
        style={{
          top: "50%",
          left: "10%",
          background: `radial-gradient(circle, ${hexToRgba(c, 0.3)} 0%, ${hexToRgba(c, 0.08)} 40%, transparent 70%)`,
          animation: "mesh-float-4 28s ease-in-out infinite",
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute w-[250px] h-[250px] sm:w-[400px] sm:h-[400px] rounded-full opacity-[0.15]"
        style={{
          top: "10%",
          left: "50%",
          background: `radial-gradient(circle, ${hexToRgba(c, 0.3)} 0%, ${hexToRgba(c, 0.08)} 40%, transparent 70%)`,
          animation: "mesh-float-1 18s ease-in-out infinite reverse",
          filter: "blur(60px)",
        }}
      />

      {/* Aurora wave streaks — primary only */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute top-[20%] w-[120%] h-[120px] sm:h-[180px] opacity-[0.12]"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${hexToRgba(c, 0.6)} 20%, ${hexToRgba(c, 0.4)} 50%, ${hexToRgba(c, 0.3)} 80%, transparent 100%)`,
            animation: "aurora-wave 12s ease-in-out infinite",
            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute top-[55%] w-[120%] h-[100px] sm:h-[140px] opacity-[0.08]"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${hexToRgba(c, 0.4)} 30%, ${hexToRgba(c, 0.5)} 60%, ${hexToRgba(c, 0.3)} 90%, transparent 100%)`,
            animation: "aurora-wave 16s ease-in-out infinite 4s",
            filter: "blur(40px)",
          }}
        />
      </div>

      {/* Floating sparkle particles — all primary */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${2 + Math.random() * 3}px`,
            height: `${2 + Math.random() * 3}px`,
            left: `${10 + i * 11}%`,
            bottom: "-5%",
            background: hexToRgba(c, 0.3 + (i % 3) * 0.15),
            boxShadow: `0 0 ${4 + i * 2}px ${2 + i}px ${hexToRgba(c, 0.2 + (i % 2) * 0.1)}`,
            animation: `sparkle-float ${14 + i * 3}s linear infinite ${i * 2}s`,
          }}
        />
      ))}

      {/* Bright wash behind text area (left side on desktop) */}
      <div
        className="hidden lg:block absolute"
        style={{
          top: "5%",
          left: "-5%",
          width: "60%",
          height: "90%",
          background: `radial-gradient(ellipse at 30% 50%, ${hexToRgba(bg, 0.92)} 0%, ${hexToRgba(bg, 0.7)} 35%, ${hexToRgba(bg, 0.3)} 65%, transparent 85%)`,
          filter: "blur(20px)",
        }}
      />

      {/* Decorative geometric shapes */}
      <div
        className="absolute top-[15%] left-[8%] w-20 h-20 sm:w-28 sm:h-28 rounded-2xl opacity-40"
        style={{
          border: `1px solid ${hexToRgba(c, 0.3)}`,
          transform: "rotate(15deg)",
          animation: "mesh-float-1 15s ease-in-out infinite",
        }}
      />
      <div
        className="absolute bottom-[20%] right-[12%] w-16 h-16 sm:w-24 sm:h-24 rounded-full opacity-30"
        style={{
          border: `1px solid ${hexToRgba(c, 0.25)}`,
          animation: "mesh-float-2 18s ease-in-out infinite",
        }}
      />
      <div
        className="absolute top-[60%] left-[45%] w-12 h-12 sm:w-16 sm:h-16 rounded-lg opacity-25"
        style={{
          border: `1px solid ${hexToRgba(c, 0.2)}`,
          transform: "rotate(45deg)",
          animation: "mesh-float-3 20s ease-in-out infinite",
        }}
      />

      {/* Subtle noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* Bottom gradient fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24"
        style={{
          background: `linear-gradient(to top, ${hexToRgba(bg, 0.9)}, transparent)`,
        }}
      />
    </div>
  );
}

/* ─── Swerve colors for floating cards ─── */
const swerveColors = [
  ["#ec4899", "#8b5cf6", "#6366f1"],
  ["#f59e0b", "#ef4444", "#f97316"],
  ["#10b981", "#14b8a6", "#06b6d4"],
  ["#a855f7", "#ec4899", "#d946ef"],
];

export function StorefrontHero({
  storeName,
  productCount,
  products = [],
  heroTitle,
  heroSubtitle,
  heroBadgeText,
  heroImageUrl,
  heroCtaText,
  heroCtaLink,
  heroRatingText,
  heroTypewriterWords,
  heroProductIds,
  brandPrimary,
  brandSecondary,
  brandAccent,
  brandBackground,
  brandForeground,
  brandMuted,
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

  /* ─── Typewriter for rotating words ─── */
  const typewriterText = useTypewriter(heroTypewriterWords ?? [], 80, 50, 2000);
  const hasTypewriter = heroTypewriterWords && heroTypewriterWords.length > 0;

  /* ─── Resolved display values ─── */
  const displayTitle = heroTitle || storeName;
  const displaySubtitle = heroSubtitle || `Discover ${productCount} handpicked products curated just for you.`;
  const displayBadge = heroBadgeText || "New Collection";
  const displayCta = heroCtaText || "Shop Now";


  return (
    <section className="relative overflow-hidden text-gray-900">
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
        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
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
        .typewriter-cursor {
          display: inline-block;
          width: 3px;
          margin-left: 2px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          animation: cursor-blink 0.8s step-end infinite;
        }
      `}</style>

      {/* Animated mesh gradient background */}
      <HeroBackground
        brandPrimary={brandPrimary}
        brandBackground={brandBackground}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-10 sm:py-16 lg:py-28">

        {/* Hero image: stacked on mobile, absolute on desktop */}
        <div className="flex justify-center mb-14 lg:mb-0 lg:absolute lg:right-4 xl:right-16 lg:top-1/2 lg:-translate-y-[58%] lg:z-10">
          <div className="relative">
            <div className="absolute inset-x-0 bottom-0 h-[75%] rounded-3xl bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200 shadow-xl" />
            <img
              src={modelImageUrl}
              alt="Store feature"
              className="relative w-72 sm:w-80 md:w-[22rem] lg:w-96 xl:w-[28rem] h-[22rem] sm:h-[26rem] md:h-[28rem] lg:h-[30rem] xl:h-[36rem] object-contain object-bottom drop-shadow-2xl"
            />

            {/* Floating product cards overlaying the hero image */}
            {leftProducts.length > 0 && leftProducts[0] && (
              <div className="absolute -left-10 sm:-left-12 lg:-left-16 xl:-left-20 top-1/2 -translate-y-1/2 z-20 hero-float-1">
                <FloatingProductCard
                  product={leftProducts[0]}
                  floatClass=""
                  delay={0}
                  colors={swerveColors[0]}
                />
              </div>
            )}
            {leftProducts.length > 1 && leftProducts[1] && (
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-6 sm:-bottom-8 lg:-bottom-10 xl:-bottom-12 z-20 hero-float-2">
                <FloatingProductCard
                  product={leftProducts[1]}
                  floatClass=""
                  delay={0.6}
                  colors={swerveColors[1]}
                />
              </div>
            )}
            {leftProducts.length > 2 && leftProducts[2] && (
              <div className="absolute -right-10 sm:-right-12 lg:-right-16 xl:-right-20 top-1/3 -translate-y-1/2 z-20 hero-float-3">
                <FloatingProductCard
                  product={leftProducts[2]}
                  floatClass=""
                  delay={1.2}
                  colors={swerveColors[2]}
                />
              </div>
            )}
            {leftProducts.length > 3 && leftProducts[3] && (
              <div className="absolute -right-8 sm:-right-10 lg:-right-12 xl:-right-16 bottom-[15%] z-20 hero-float-4">
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

        {/* Hero Text Content */}
        <div className="relative z-15 max-w-xl lg:max-w-[55%] xl:max-w-[50%] text-center lg:text-left mx-auto lg:mx-0">
          {/* Badge */}
          <div className="hero-fade-in mb-3 lg:mb-6">
            <span className="inline-flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-1 lg:py-1.5 rounded-full text-[10px] lg:text-xs font-semibold tracking-wide uppercase bg-primary/10 text-primary border border-primary/20 shadow-sm">
              <Sparkles className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
              {displayBadge}
            </span>
          </div>

          {/* Title */}
          <h1 className="hero-fade-in-d1 text-3xl sm:text-4xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1]">
            {displayTitle}
            {hasTypewriter && (
              <>
                <br />
                <span
                  className="bg-clip-text text-transparent text-primary"
                  style={{
                    backgroundImage: brandPrimary
                      ? `linear-gradient(135deg, ${brandPrimary} 0%, ${brandAccent || brandPrimary} 50%, ${brandSecondary || brandPrimary} 100%)`
                      : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)",
                    backgroundSize: "200% auto",
                    animation: "shimmer-text 4s linear infinite",
                  }}
                >
                  {typewriterText}
                </span>
                <span className="typewriter-cursor h-[0.9em] align-middle" />
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p className="hero-fade-in-d2 mt-3 lg:mt-5 text-sm sm:text-base lg:text-xl text-muted-foreground leading-relaxed max-w-lg mx-auto lg:mx-0">
            {displaySubtitle}
          </p>

          {/* CTA Button */}
          <div className="hero-fade-in-d3 mt-5 lg:mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-4">
            <a
              href={heroCtaLink || "#products"}
              className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-sm font-semibold shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
              style={{
                background: brandPrimary
                  ? `linear-gradient(135deg, ${brandPrimary}, ${brandAccent || brandPrimary})`
                  : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: brandPrimary
                  ? (isDarkColor(brandPrimary) ? "#ffffff" : "#1e293b")
                  : "#ffffff",
              }}
            >
              {displayCta}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>


        </div>
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
      <div className="relative w-[4.5rem] h-[4.5rem] sm:w-24 sm:h-24 md:w-[6.5rem] md:h-[6.5rem] lg:w-32 lg:h-32 xl:w-36 xl:h-36 rounded-2xl overflow-hidden bg-gray-50 shadow-xl border border-gray-200">
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
