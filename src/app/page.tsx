'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'

// ---------------------------------------------------------------------------
// Constellation stars canvas background
// ---------------------------------------------------------------------------
function ConstellationCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -9999, y: -9999 })
  const starsRef = useRef<{ x: number; y: number; vx: number; vy: number; r: number; o: number; conn: boolean }[]>([])
  const rafRef = useRef<number>(0)

  const init = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const w = canvas.width = canvas.offsetWidth * devicePixelRatio
    const h = canvas.height = canvas.offsetHeight * devicePixelRatio
    const count = Math.floor((w * h) / 45000) // sparser density
    const stars: typeof starsRef.current = []
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        r: Math.random() * 1 + 0.3,
        o: Math.random() * 0.35 + 0.15,
        conn: Math.random() < 0.15,
      })
    }
    starsRef.current = stars
  }, [])

  useEffect(() => {
    init()
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const LINE_DIST = 90 * devicePixelRatio
    const MOUSE_DIST = 140 * devicePixelRatio

    const draw = () => {
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      const stars = starsRef.current
      const mx = mouseRef.current.x * devicePixelRatio
      const my = mouseRef.current.y * devicePixelRatio

      // Move stars
      for (const s of stars) {
        s.x += s.vx
        s.y += s.vy
        if (s.x < 0) s.x = w
        if (s.x > w) s.x = 0
        if (s.y < 0) s.y = h
        if (s.y > h) s.y = 0
      }

      // Draw lines between nearby connectable stars
      for (let i = 0; i < stars.length; i++) {
        if (!stars[i].conn) continue
        for (let j = i + 1; j < stars.length; j++) {
          if (!stars[j].conn) continue
          const dx = stars[i].x - stars[j].x
          const dy = stars[i].y - stars[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < LINE_DIST) {
            ctx.beginPath()
            ctx.moveTo(stars[i].x, stars[i].y)
            ctx.lineTo(stars[j].x, stars[j].y)
            ctx.strokeStyle = `rgba(148,163,184,${0.12 * (1 - dist / LINE_DIST)})`
            ctx.lineWidth = 0.5 * devicePixelRatio
            ctx.stroke()
          }
        }
      }

      // Draw stars & mouse interaction lines
      for (const s of stars) {
        // Mouse proximity line
        const mdx = s.x - mx
        const mdy = s.y - my
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy)
        if (mDist < MOUSE_DIST) {
          ctx.beginPath()
          ctx.moveTo(s.x, s.y)
          ctx.lineTo(mx, my)
          ctx.strokeStyle = `rgba(129,140,248,${0.25 * (1 - mDist / MOUSE_DIST)})`
          ctx.lineWidth = 0.6 * devicePixelRatio
          ctx.stroke()
        }

        // Draw star dot
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r * devicePixelRatio, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(203,213,225,${s.o})`
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    const handleResize = () => init()
    window.addEventListener('resize', handleResize)

    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    const handleLeave = () => { mouseRef.current = { x: -9999, y: -9999 } }
    canvas.addEventListener('mousemove', handleMouse)
    canvas.addEventListener('mouseleave', handleLeave)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', handleResize)
      canvas.removeEventListener('mousemove', handleMouse)
      canvas.removeEventListener('mouseleave', handleLeave)
    }
  }, [init])

  return <canvas ref={canvasRef} className={className} style={{ width: '100%', height: '100%' }} />
}

// ---------------------------------------------------------------------------
// Typewriter effect component
// ---------------------------------------------------------------------------
function Typewriter({ words, className }: { words: string[]; className?: string }) {
  const [wordIndex, setWordIndex] = useState(0)
  const [text, setText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentWord = words[wordIndex]
    const speed = isDeleting ? 60 : 120

    if (!isDeleting && text === currentWord) {
      // Pause before deleting
      const timeout = setTimeout(() => setIsDeleting(true), 2000)
      return () => clearTimeout(timeout)
    }

    if (isDeleting && text === '') {
      setIsDeleting(false)
      setWordIndex((prev) => (prev + 1) % words.length)
      return
    }

    const timeout = setTimeout(() => {
      setText(currentWord.substring(0, isDeleting ? text.length - 1 : text.length + 1))
    }, speed)

    return () => clearTimeout(timeout)
  }, [text, isDeleting, wordIndex, words])

  // Reserve width for longest word
  const longest = words.reduce((a, b) => a.length > b.length ? a : b)

  return (
    <span className={`inline italic ${className || ''}`}>
      <span>{text}</span>
      <span className="animate-pulse">|</span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// Animated rotating words component
// ---------------------------------------------------------------------------
function RotatingWords({ words, className }: { words: string[]; className?: string }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setIndex(i => (i + 1) % words.length), 2500)
    return () => clearInterval(interval)
  }, [words.length])

  return (
    <span className={`inline-block relative ${className || ''}`}>
      {words.map((word, i) => (
        <span
          key={word}
          className={`absolute left-0 top-0 transition-all duration-500 ${
            i === index
              ? 'opacity-100 translate-y-0'
              : i === (index - 1 + words.length) % words.length
              ? 'opacity-0 -translate-y-8'
              : 'opacity-0 translate-y-8'
          }`}
        >
          {word}
        </span>
      ))}
      {/* Invisible placeholder to reserve width */}
      <span className="invisible">{words.reduce((a, b) => a.length > b.length ? a : b)}</span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// Intersection observer hook for scroll animations
// ---------------------------------------------------------------------------
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); obs.disconnect() }
    }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  return { ref, inView }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function LandingPage() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [isMobileLanding, setIsMobileLanding] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    setIsMobileLanding(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobileLanding(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Scroll-in hooks for sections
  const featuresView = useInView()
  const ctaView = useInView()

  return (
    <>
    {/* Global dark background so constellation shows through transparent wrapper */}
    <style>{`html,body{background:#09090b!important}`}</style>

    {/* Full-page constellation stars background — outside overflow wrapper for true fixed on mobile */}
    <div className="fixed inset-0 pointer-events-none z-0" style={{ opacity: 0.3 }}>
      <ConstellationCanvas className="absolute inset-0" />
    </div>

    <div className="min-h-screen text-white overflow-x-hidden relative" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif' }}>

      {/* ═══════════════════ NAVBAR ═══════════════════ */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#09090b]/80 backdrop-blur-xl border-b border-white/[0.06]' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image src="/Phoxta light@3x.png" alt="Phoxta" width={120} height={36} className="h-9 w-auto" />
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => router.push('/auth')} className="text-sm text-white/60 hover:text-white transition-colors px-4 py-2 cursor-pointer">
              Sign In
            </button>
            <button onClick={() => router.push('/auth')} className="text-sm font-semibold bg-white text-[#09090b] px-5 py-2.5 rounded-full hover:bg-white/90 transition-all cursor-pointer shadow-lg shadow-white/10">
              Get Started
            </button>
          </div>

          {/* Mobile hamburger */}
          <button type="button" className="md:hidden w-10 h-10 flex items-center justify-center text-white/60 cursor-pointer" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              {mobileMenuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              }
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#09090b]/95 backdrop-blur-xl border-t border-white/[0.06] px-6 pb-6 pt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col gap-2">
              <button onClick={() => router.push('/auth')} className="text-sm text-white/60 hover:text-white transition-colors py-2 cursor-pointer">Sign In</button>
              <button onClick={() => router.push('/auth')} className="text-sm font-semibold bg-white text-[#09090b] px-5 py-2.5 rounded-full hover:bg-white/90 transition-all cursor-pointer">Get Started</button>
            </div>
          </div>
        )}
      </nav>

      {/* ═══════════════════ HERO SECTION ═══════════════════ */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 overflow-hidden">
        {/* Beaming colorful glow — contained within text area */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[45%] w-[320px] h-[260px] sm:w-[500px] sm:h-[400px] md:w-[700px] md:h-[500px] pointer-events-none" style={{ filter: 'blur(80px)' }}>
          <div className="absolute inset-0 m-auto w-[120px] h-[120px] sm:w-[160px] sm:h-[160px] md:w-[200px] md:h-[200px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)' }} />
          <div className="absolute inset-0 m-auto w-[220px] h-[160px] sm:w-[340px] sm:h-[240px] md:w-[420px] md:h-[280px] rounded-full opacity-35" style={{ background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.4) 0%, transparent 60%)' }} />
          <div className="absolute inset-0 m-auto w-[180px] h-[200px] sm:w-[280px] sm:h-[320px] md:w-[340px] md:h-[380px] rounded-full opacity-30 rotate-[30deg]" style={{ background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.35) 0%, transparent 55%)' }} />
          <div className="absolute inset-0 m-auto w-[200px] h-[140px] sm:w-[320px] sm:h-[200px] md:w-[400px] md:h-[250px] rounded-full opacity-25 -rotate-[20deg]" style={{ background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.35) 0%, transparent 55%)' }} />
          <div className="absolute inset-0 m-auto w-[160px] h-[120px] sm:w-[240px] sm:h-[170px] md:w-[300px] md:h-[200px] rounded-full opacity-20 translate-x-[30px] sm:translate-x-[45px] -translate-y-[15px] sm:-translate-y-[25px]" style={{ background: 'radial-gradient(ellipse at center, rgba(34,211,238,0.3) 0%, transparent 60%)' }} />
          <div className="absolute inset-0 m-auto w-[140px] h-[160px] sm:w-[200px] sm:h-[240px] md:w-[250px] md:h-[300px] rounded-full opacity-15 -translate-x-[40px] sm:-translate-x-[60px] translate-y-[10px] sm:translate-y-[15px]" style={{ background: 'radial-gradient(ellipse at center, rgba(244,114,182,0.3) 0%, transparent 55%)' }} />
          <div className="absolute inset-0 m-auto w-[120px] h-[100px] sm:w-[170px] sm:h-[140px] md:w-[210px] md:h-[170px] rounded-full opacity-15 translate-y-[30px] sm:translate-y-[45px]" style={{ background: 'radial-gradient(ellipse at center, rgba(52,211,153,0.25) 0%, transparent 60%)' }} />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <h1 className="text-[2.5rem] sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.1]">
            <span className="font-normal text-white">Launch a </span>
            <Typewriter
              words={['Startup', 'Business']}
              className="text-white"
            />
            <br />
            <style>{`@keyframes shimmer { 0% { background-position: 200% center; } 100% { background-position: -200% center; } } @keyframes textBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }`}</style>
            <span className="font-normal text-white">in </span><span className="inline-block bg-clip-text text-transparent animate-[shimmer_3s_linear_infinite,textBounce_3s_ease-in-out_infinite]" style={{ backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, #818cf8 0%, #a78bfa 20%, #f472b6 40%, #ffffff 50%, #f472b6 60%, #a78bfa 80%, #818cf8 100%)' }}>7 Clicks</span>
          </h1>

          <p className="mt-5 text-base md:text-lg text-white/50 max-w-xl mx-auto">
            From concept to launch — validate, design, and build your next big thing with AI-powered tools in just a few clicks.
          </p>

          <div className="mt-10 flex flex-row gap-3 sm:gap-4 justify-center">
            <button
              onClick={() => router.push('/auth')}
              className="group inline-flex items-center justify-center gap-2 bg-white text-[#09090b] px-5 sm:px-8 py-3 sm:py-4 rounded-full text-xs sm:text-sm font-bold hover:bg-white/90 transition-all cursor-pointer shadow-2xl shadow-white/10"
            >
              Get Started
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            </button>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center justify-center gap-2 bg-white/[0.06] border border-white/[0.1] text-white/70 px-5 sm:px-8 py-3 sm:py-4 rounded-full text-xs sm:text-sm font-medium hover:bg-white/[0.1] hover:text-white transition-all cursor-pointer"
            >
              Learn More
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" /></svg>
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════ FEATURES / CAPABILITIES ═══════════════════ */}
      <section id="features" ref={featuresView.ref} className={`relative py-16 md:py-24 transition-all duration-700 ${featuresView.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="relative bg-white text-[#09090b] rounded-3xl shadow-2xl shadow-black/30 border border-white/20 p-8 md:p-14 overflow-hidden animate-[sectionBounce_6s_ease-in-out_infinite]">
            <style>{`@keyframes sectionBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>
            {/* SVG gradient definition for feature icons */}
            <svg width="0" height="0" className="absolute">
              <defs>
                <linearGradient id="feat-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
            {/* Blue-purple constellation glow behind the content */}
            <div className="absolute inset-0 pointer-events-none" style={{ filter: 'blur(80px)' }}>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-40" style={{ background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.6) 0%, transparent 60%)' }} />
              <div className="absolute top-[30%] left-[25%] w-[350px] h-[350px] rounded-full opacity-30" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.55) 0%, transparent 55%)' }} />
              <div className="absolute top-[40%] right-[15%] w-[400px] h-[300px] rounded-full opacity-35" style={{ background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.5) 0%, transparent 55%)' }} />
              <div className="absolute bottom-[20%] left-[40%] w-[300px] h-[250px] rounded-full opacity-25" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 60%)' }} />
            </div>

            {/* Section header */}
            <div className="relative text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#09090b]">
                All-in-one platform to<br /><span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">validate &amp; launch</span> fast
              </h2>
              <p className="mt-4 text-[#09090b]/50 max-w-xl mx-auto">We unleash your business potential by maximising innovation through AI-powered tools and creative solutions.</p>
            </div>

            {/* 2-column layout: cards · illustration */}
            {/* 2-col grid on mobile, 3-col (cards · illustration · cards) on lg */}
            <div className="relative">
              {/* Mobile: 2-column grid of all 6 features */}
              <div className="grid grid-cols-2 gap-3 lg:hidden">
                {[
                  { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="url(#feat-grad)"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>, title: 'Idea Validator', desc: 'Validate your business ideas with AI-driven 10-phase assessments, market research, and expert feedback.' },
                  { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="url(#feat-grad)"><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" /></svg>, title: 'Designer', desc: 'Create stunning visuals with a powerful canvas editor — design graphics, mockups, and branded assets.' },
                  { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="url(#feat-grad)"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A8.966 8.966 0 0 1 3 12c0-1.264.26-2.467.732-3.558" /></svg>, title: 'Web Design', desc: 'Build professional websites from beautiful templates — customize layouts, text, and images with an intuitive editor.' },
                  { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="url(#feat-grad)"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>, title: 'Phoxta CRM', desc: 'Manage leads, track deals, nurture relationships, run email campaigns, and monitor analytics — all in one AI-powered pipeline.' },
                  { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="url(#feat-grad)"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" /></svg>, title: 'Market Place', desc: 'Browse and purchase creative assets — templates, graphics, and more — then customize them in one prompt with Phoxta AI.' },
                  { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="url(#feat-grad)"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>, title: 'Content Management', desc: 'Organize, schedule, and publish content across channels — manage your brand voice and assets from a single dashboard.' },
                ].map((f, i) => (
                  <div key={`m${i}`} className="group flex flex-col gap-2 rounded-2xl border border-[#09090b]/[0.06] bg-white/80 p-4 hover:bg-white transition-all duration-300 hover:border-indigo-200 hover:shadow-lg">
                    <div className="shrink-0 w-9 h-9 rounded-lg bg-transparent flex items-center justify-center">{f.icon}</div>
                    <h3 className="text-xs font-semibold text-[#09090b]">{f.title}</h3>
                    <p className="text-[10px] text-[#09090b]/45 leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>

              {/* Desktop: 3-column layout */}
              <div className="hidden lg:grid lg:grid-cols-3 gap-6 items-center">
              {/* Left column — 3 stacked cards */}
              <div className="flex flex-col gap-5">
                {[
                  { icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="url(#feat-grad)"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>, title: 'Idea Validator', desc: 'Validate your business ideas with AI-driven 10-phase assessments, market research, and expert feedback.' },
                  { icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="url(#feat-grad)"><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" /></svg>, title: 'Designer', desc: 'Create stunning visuals with a powerful canvas editor — design graphics, mockups, and branded assets.' },
                  { icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="url(#feat-grad)"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A8.966 8.966 0 0 1 3 12c0-1.264.26-2.467.732-3.558" /></svg>, title: 'Web Design', desc: 'Build professional websites from beautiful templates — customize layouts, text, and images with an intuitive editor.' },
                ].map((f, i) => (
                  <div key={`l${i}`} className="group flex items-start gap-4 rounded-2xl border border-[#09090b]/[0.06] bg-white/80 p-5 hover:bg-white transition-all duration-300 hover:border-indigo-200 hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="shrink-0 w-12 h-12 rounded-xl bg-transparent flex items-center justify-center">{f.icon}</div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#09090b] mb-1">{f.title}</h3>
                      <p className="text-xs text-[#09090b]/45 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Center column — illustration / visual */}
              <div className="flex items-center justify-center relative">
                <div className="relative w-full aspect-square max-w-[320px] mx-auto animate-[slowBounce_4s_ease-in-out_infinite]">
                  <style>{`@keyframes slowBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }`}</style>
                  {/* Glowing orb backdrop */}
                  <div className="absolute inset-0 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.5) 0%, rgba(168,85,247,0.3) 40%, transparent 70%)', filter: 'blur(30px)' }} />
                  {/* Central graphic */}
                  <div className="relative w-full h-full rounded-3xl overflow-hidden">
                    <img src="/3d-illustration.png" alt="Phoxta platform" className="w-full h-full object-contain" />
                  </div>
                </div>
              </div>

              {/* Right column — 3 stacked cards */}
              <div className="flex flex-col gap-5">
                {[
                  { icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="url(#feat-grad)"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>, title: 'Phoxta CRM', desc: 'Manage leads, track deals, nurture relationships, run email campaigns, and monitor analytics — all in one AI-powered pipeline.' },
                  { icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="url(#feat-grad)"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" /></svg>, title: 'Market Place', desc: 'Browse and purchase creative assets — templates, graphics, and more — then customize them in one prompt with Phoxta AI.' },
                  { icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="url(#feat-grad)"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>, title: 'Content Management', desc: 'Organize, schedule, and publish content across channels — manage your brand voice and assets from a single dashboard.' },
                ].map((f, i) => (
                  <div key={`r${i}`} className="group flex items-start gap-4 rounded-2xl border border-[#09090b]/[0.06] bg-white/80 p-5 hover:bg-white transition-all duration-300 hover:border-purple-200 hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="shrink-0 w-12 h-12 rounded-xl bg-transparent flex items-center justify-center">{f.icon}</div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#09090b] mb-1">{f.title}</h3>
                      <p className="text-xs text-[#09090b]/45 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ TOOLS / WORKSPACES (from current app hub) ═══════════════════ */}
      {/* ═══════════════════ CTA BANNER ═══════════════════ */}
      <section ref={ctaView.ref} className={`py-28 relative overflow-hidden transition-all duration-700 ${ctaView.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Background gradient */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.15) 0%, transparent 60%)' }} />

        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Ready to <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">launch your idea?</span>
          </h2>
          <p className="mt-5 text-white/30 text-base md:text-lg max-w-lg mx-auto">
            Join thousands of founders who turned their ideas into validated businesses. Start your 7-day journey today.
          </p>
          <div className="mt-10 flex flex-row gap-3 sm:gap-4 justify-center">
            <button
              onClick={() => router.push('/auth')}
              className="group inline-flex items-center justify-center gap-2 bg-white text-[#09090b] px-5 sm:px-8 py-3 sm:py-4 rounded-full text-xs sm:text-sm font-bold hover:bg-white/90 transition-all cursor-pointer shadow-2xl shadow-white/10"
            >
              Get Started
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="border-t border-white/[0.06] py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <Image src="/phoxta-logo.png" alt="Phoxta" width={32} height={32} className="rounded-lg" />
              <span className="text-sm font-semibold text-white/50">Phoxta</span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6 text-xs text-white/25">
              <button onClick={() => router.push('/auth')} className="hover:text-white/50 transition-colors cursor-pointer">Sign In</button>
            </div>

            {/* Copyright */}
            <div className="text-xs text-white/15">
              &copy; {new Date().getFullYear()} Phoxta. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  )
}
