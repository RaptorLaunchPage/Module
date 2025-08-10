"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { VideoBackground } from "@/components/video-background"
import { Trophy, Users, Calendar, Play, Mail, ArrowRight } from "lucide-react"
import { supabase } from "@/lib/supabase"

const SECTIONS = [
  "Home",
  "About Us",
  "Sponsorship",
  "Tier System",
  "Incentives",
  "What’s Covered",
  "How It Works",
  "Why Join",
  "Tournaments",
  "Contact",
] as const

// Public nav: mix of internal sections and external pages
const NAV: Array<{ name: string; idx?: number; href?: string }> = [
  { name: "Home", idx: 0 },
  { name: "About", href: "/about" },
  { name: "Tier System", idx: 3 },
  { name: "Incentives", href: "/incentives" },
  { name: "Tournaments", idx: 8 },
  { name: "Contact", idx: 9 },
]

type SectionKey = typeof SECTIONS[number]

export default function PublicSitePage() {
  const [index, setIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Counts with sensible defaults; will try to fetch live values
  const [teamsCount, setTeamsCount] = useState<number>(12)
  const [playersCount, setPlayersCount] = useState<number>(72)
  const [showHint, setShowHint] = useState<boolean>(false)

  const clamp = useCallback((i: number) => Math.max(0, Math.min(SECTIONS.length - 1, i)), [])

  const hideHint = useCallback(() => setShowHint(false), [])

  const goTo = useCallback((i: number) => {
    setIndex(clamp(i))
    hideHint()
  }, [clamp, hideHint])

  const next = useCallback(() => {
    setIndex((i) => clamp(i + 1))
    hideHint()
  }, [clamp, hideHint])

  const prev = useCallback(() => {
    setIndex((i) => clamp(i - 1))
    hideHint()
  }, [clamp, hideHint])

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!containerRef.current) return
      e.preventDefault()
      hideHint()
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        if (e.deltaY > 0) next()
        else prev()
      } else {
        if (e.deltaX > 0) next()
        else prev()
      }
    }
    const onKey = (e: KeyboardEvent) => {
      hideHint()
      if (e.key === "ArrowRight") next()
      if (e.key === "ArrowLeft") prev()
    }
    const container = containerRef.current
    container?.addEventListener("wheel", onWheel, { passive: false })
    window.addEventListener("keydown", onKey)
    return () => {
      container?.removeEventListener("wheel", onWheel as any)
      window.removeEventListener("keydown", onKey)
    }
  }, [next, prev, hideHint])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Observe vertical scroll near bottom to show hint
    const handleScroll = () => {
      const scrolledToBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 24
      if (scrolledToBottom) {
        setShowHint(true)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })

    let startX = 0
    let startY = 0
    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
    }
    const onTouchEnd = (e: TouchEvent) => {
      const dx = (e.changedTouches[0]?.clientX || 0) - startX
      const dy = (e.changedTouches[0]?.clientY || 0) - startY
      hideHint()
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
        if (dx < 0) next()
        else prev()
      }
    }
    el.addEventListener("touchstart", onTouchStart)
    el.addEventListener("touchend", onTouchEnd)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchend", onTouchEnd)
    }
  }, [next, prev, hideHint])

  // Auto-hide hint after a few seconds once shown
  useEffect(() => {
    if (!showHint) return
    const t = setTimeout(() => setShowHint(false), 5000)
    return () => clearTimeout(t)
  }, [showHint])

  // Attempt to fetch live counts (will silently fall back on failure)
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const teamsRes = await supabase.from('teams').select('*', { count: 'exact', head: true })
        if (typeof teamsRes.count === 'number') setTeamsCount(teamsRes.count)
      } catch {}
      try {
        const playersRes = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'player')
          .eq('status', 'Active')
        if (typeof playersRes.count === 'number') setPlayersCount(playersRes.count)
      } catch {}
    }
    fetchCounts()
  }, [])

  const translate = useMemo(() => `translateX(-${index * 100}%)`, [index])

  return (
    <VideoBackground>
      <div className="relative h-screen w-full overflow-hidden" ref={containerRef}>
        {/* Slim, fixed header */}
        <header className="fixed top-0 left-0 right-0 z-30 bg-black/55 backdrop-blur-md border-b border-white/10">
          <div className="max-w-7xl mx-auto h-14 px-3 sm:px-4 flex items-center">
            {/* Brand left with gradient */}
            <div className="font-extrabold tracking-wide text-transparent bg-gradient-to-r from-[#00C6FF] via-[#3A7DFF] to-[#B721FF] bg-clip-text drop-shadow-xl">
              RAPTOR ESPORTS
            </div>
            {/* Center nav names (no button UI) */}
            <nav className="mx-auto hidden md:flex items-center gap-3 lg:gap-4 overflow-x-auto no-scrollbar px-2">
              {NAV.map(({ name, idx, href }) => (
                href ? (
                  <a
                    key={name}
                    href={href}
                    className={`text-xs sm:text-sm text-white/80 hover:text-white transition-colors pb-0.5 border-b-2 border-transparent hover:border-white/40`}
                    aria-label={`Go to ${name}`}
                  >
                    {name}
                  </a>
                ) : (
                  <button
                    key={name}
                    onClick={() => typeof idx === 'number' && goTo(idx)}
                    className={`text-xs sm:text-sm text-white/80 hover:text-white transition-colors pb-0.5 border-b-2 ${index === idx ? "border-white" : "border-transparent hover:border-white/40"}`}
                    aria-label={`Go to ${name}`}
                  >
                    {name}
                  </button>
                )
              ))}
            </nav>
            {/* Right: Dashboard button */}
            <div className="ml-auto">
              <a
                href="/auth/login"
                className="px-3 py-1.5 rounded-md font-semibold bg-gradient-to-r from-[#00C6FF] via-[#3A7DFF] to-[#B721FF] text-white hover:brightness-110 transition-shadow shadow-[0_0_20px_rgba(58,125,255,0.35)] text-xs sm:text-sm"
              >
                Dashboard
              </a>
            </div>
          </div>
        </header>

        {/* Slides Container offset below header */}
        <div
          className="absolute left-0 right-0 bottom-0 top-14 flex w-[1000vw] transition-transform duration-500 ease-in-out"
          style={{ transform: translate }}
        >
          {/* 1. Home */}
          <Section>
            <div className="flex flex-col items-center justify-center h-full text-center text-white gap-6">
              <h1 className="text-4xl sm:text-6xl font-extrabold drop-shadow-xl text-white">
                Next-Gen Esports Org — Powered by AI, Driven by Data & Passion.
              </h1>
              <p className="text-white/80 max-w-2xl">Cinematic performance. Data-backed decisions. Build your legacy with us.</p>
              <div className="flex gap-4">
                <a href="https://discord.gg/6986Kf3eG4" target="_blank" rel="noreferrer"
                  className="px-5 py-2 rounded-md font-semibold bg-gradient-to-r from-[#00C6FF] via-[#3A7DFF] to-[#B721FF] text-white hover:brightness-110 transition-shadow shadow-[0_0_30px_rgba(58,125,255,0.35)]">
                  Join Us
                </a>
                <a href="/highlight"
                  className="px-5 py-2 rounded-md font-semibold border border-white/30 text-white/90 hover:text-white hover:bg-white/10 transition-colors">
                  Watch Highlights
                </a>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                <Stat icon={<Users className="h-5 w-5" />} label="Active Teams" value={teamsCount} />
                <Stat icon={<Users className="h-5 w-5" />} label="Active Players" value={playersCount} />
                <Stat icon={<Calendar className="h-5 w-5" />} label="Total Matches" value={1248} />
                <Stat icon={<Trophy className="h-5 w-5" />} label="Total WWCD" value={439} />
              </div>
              {/* Quick Links Row */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-white/80">
                <a href="/about" className="hover:text-white hover:underline underline-offset-4">About</a>
                <a href="/incentives" className="hover:text-white hover:underline underline-offset-4">Incentives</a>
                <button onClick={() => goTo(8)} className="hover:text-white hover:underline underline-offset-4">Tournaments</button>
                <button onClick={() => goTo(9)} className="hover:text-white hover:underline underline-offset-4">Contact</button>
              </div>
            </div>
          </Section>

          {/* 2. About Us */}
          <Section>
            <div className="max-w-5xl mx-auto text-white px-6 py-20">
              <h2 className="text-4xl font-bold mb-6">About Us</h2>
              <p className="text-white/80 mb-6">Founded with a relentless drive to elevate Indian esports, we’ve built a system that turns raw talent into championship performance.</p>
              <div className="grid md:grid-cols-2 gap-8">
                <Card className="bg-black/50 border-white/10">
                  <CardHeader>
                    <CardTitle>Our Origin</CardTitle>
                  </CardHeader>
                  <CardContent className="text-white/80">
                    From grassroots scrims to global stages — our journey is defined by discipline, data, and drive.
                  </CardContent>
                </Card>
                <Card className="bg-black/50 border-white/10">
                  <CardHeader>
                    <CardTitle>Mission</CardTitle>
                  </CardHeader>
                  <CardContent className="text-white/80">
                    Build India’s most competitive, data-driven esports ecosystem where players can thrive.
                  </CardContent>
                </Card>
              </div>
              <div className="mt-8 grid md:grid-cols-2 gap-8">
                <Card className="bg-black/50 border-white/10">
                  <CardHeader>
                    <CardTitle>Values</CardTitle>
                  </CardHeader>
                  <CardContent className="text-white/80 space-y-2">
                    <li>Professionalism</li>
                    <li>Accountability</li>
                    <li>Consistency</li>
                    <li>Integrity</li>
                    <li>Growth Mindset</li>
                  </CardContent>
                </Card>
                <Card className="bg-black/50 border-white/10">
                  <CardHeader>
                    <CardTitle>Highlights</CardTitle>
                  </CardHeader>
                  <CardContent className="text-white/80 space-y-2">
                    <TimelineItem year="2022" text="Org founded" />
                    <TimelineItem year="2023" text="Multiple top-3 tournament finishes" />
                    <TimelineItem year="2024" text="International scrim presence established" />
                  </CardContent>
                </Card>
              </div>
            </div>
          </Section>

          {/* 3. Sponsorship */}
          <Section>
            <div className="max-w-6xl mx-auto text-white px-6 py-20">
              <h2 className="text-4xl font-bold mb-6">Sponsorship</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {["HyperX", "Nvidia", "RedBull"].map((n) => (
                  <Card key={n} className="bg-black/50 border-white/10 flex items-center justify-center h-28">
                    <span className="text-white/80 text-lg">{n} (Logo)</span>
                  </Card>
                ))}
              </div>
              <div className="mt-8 grid md:grid-cols-2 gap-6">
                <Card className="bg-black/50 border-white/10">
                  <CardHeader>
                    <CardTitle>Benefits</CardTitle>
                  </CardHeader>
                  <CardContent className="text-white/80 space-y-2">
                    <li>Brand placements on jerseys & streams</li>
                    <li>Content collaborations</li>
                    <li>Community activations & events</li>
                    <li>Access to rising talent</li>
                  </CardContent>
                </Card>
                <Card className="bg-black/50 border-white/10">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Media Kit</CardTitle>
                    <Button variant="outline" className="text-white border-white/40" size="sm">
                      Download
                    </Button>
                  </CardHeader>
                  <CardContent className="text-white/80">
                    Our media kit includes audience metrics, demographics, and campaign case studies.
                  </CardContent>
                </Card>
              </div>
              <div className="mt-8">
                <h3 className="font-semibold mb-3">Past Highlights</h3>
                <div className="flex gap-3 flex-wrap">
                  {["LAN Showcase", "National Finals", "Brand Collab"].map((h) => (
                    <Badge key={h} variant="secondary" className="bg-white/10 text-white border-white/20">{h}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* 4. Tier System */}
          <Section>
            <div className="max-w-5xl mx-auto text-white px-6 py-20">
              <h2 className="text-4xl font-bold mb-6">Tier System</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <Card className="bg-black/50 border-white/10">
                  <CardHeader>
                    <CardTitle>Tier Ladder</CardTitle>
                  </CardHeader>
                  <CardContent className="text-white/80">
                    <div className="space-y-2">
                      <TierRow tier="Pro" req="Top finishes, high consistency" perks="Salary, travel, media" />
                      <TierRow tier="Elite" req="Consistent high-level scrims" perks="Bootcamps, premium gear" />
                      <TierRow tier="Advanced" req="Stable team performance" perks="Coaching, analytics" />
                      <TierRow tier="Starter" req="Potential with growth" perks="Practice slots" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-black/50 border-white/10">
                  <CardHeader>
                    <CardTitle>Requirements & Perks</CardTitle>
                  </CardHeader>
                  <CardContent className="text-white/80 space-y-2">
                    <li>Attendance & discipline benchmarks</li>
                    <li>Match performance thresholds</li>
                    <li>Coach evaluations</li>
                    <li>Structured progression path</li>
                  </CardContent>
                </Card>
              </div>
            </div>
          </Section>

          {/* 5. Incentives */}
          <Section>
            <div className="max-w-6xl mx-auto text-white px-6 py-20">
              <h2 className="text-4xl font-bold mb-6">Incentives</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <PerkCard title="Prizes & Rewards" desc="Tier-based cash, bonuses, and seasonal awards." />
                <PerkCard title="Exclusive Gear" desc="Headsets, keyboards, apparel, and custom kits." />
                <PerkCard title="Travel & Stay" desc="Domestic travel, hotel logistics for events." />
              </div>
              <div className="mt-6">
                <PerkCard title="Media Exposure" desc="Editorial features, highlights, and social boost." />
              </div>
            </div>
          </Section>

          {/* 6. What’s Covered by the Org */}
          <Section>
            <div className="max-w-5xl mx-auto text-white px-6 py-20">
              <h2 className="text-4xl font-bold mb-6">What’s Covered by the Org</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <ListCard title="Event Fees" items={["Tournament registrations", "Scrim slots", "Admin fees"]} />
                <ListCard title="Logistics" items={["Travel planning", "Hotel coordination", "On-ground support"]} />
                <ListCard title="Training" items={["Coaching staff", "VOD reviews", "Performance analytics"]} />
                <ListCard title="Gear & Maintenance" items={["Equipment support", "Jersey & branding", "Maintenance"]} />
              </div>
            </div>
          </Section>

          {/* 7. How It Works */}
          <Section>
            <div className="max-w-4xl mx-auto text-white px-6 py-20">
              <h2 className="text-4xl font-bold mb-6">How It Works</h2>
              <ol className="space-y-4 text-white/90">
                <Step n={1} title="Apply online" />
                <Step n={2} title="Skill assessment" />
                <Step n={3} title="Provisional period" />
                <Step n={4} title="Full membership" />
              </ol>
            </div>
          </Section>

          {/* 8. Why You Should Join */}
          <Section>
            <div className="max-w-6xl mx-auto text-white px-6 py-20">
              <h2 className="text-4xl font-bold mb-6">Why You Should Join</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <ListCard title="Competitive Edge" items={["Proven results", "Structured practice", "Analytic coaching"]} />
                <ListCard title="Player Growth" items={["Skill roadmap", "Role mentorship", "Leadership"]} />
                <ListCard title="Professional Setup" items={["Code of conduct", "Discipline framework", "Clear progression"]} />
                <ListCard title="Community" items={["Supportive culture", "Content ecosystem", "Fan engagement"]} />
              </div>
              <div className="mt-8">
                <Card className="bg-black/50 border-white/10">
                  <CardHeader>
                    <CardTitle>Testimonials</CardTitle>
                  </CardHeader>
                  <CardContent className="text-white/80 grid md:grid-cols-2 gap-6">
                    <blockquote>“Raptor gave me structure and purpose — my stats skyrocketed.”</blockquote>
                    <blockquote>“Best environment I’ve trained in. Professional and focused.”</blockquote>
                  </CardContent>
                </Card>
              </div>
            </div>
          </Section>

          {/* 9. Tournaments */}
          <Section>
            <div className="max-w-6xl mx-auto text-white px-6 py-20">
              <h2 className="text-4xl font-bold mb-6">Tournaments</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="bg-black/50 border-white/10">
                  <CardHeader>
                    <CardTitle>Upcoming</CardTitle>
                  </CardHeader>
                  <CardContent className="text-white/80 space-y-2">
                    <li>BGMI Masters - Oct 15</li>
                    <li>Open Qualifiers - Nov 02</li>
                  </CardContent>
                </Card>
                <Card className="bg-black/50 border-white/10">
                  <CardHeader>
                    <CardTitle>Brackets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <a href="#" className="text-white/90 hover:text-white underline underline-offset-4">View Live</a>
                  </CardContent>
                </Card>
                <Card className="bg-black/50 border-white/10">
                  <CardHeader>
                    <CardTitle>Past Victories</CardTitle>
                  </CardHeader>
                  <CardContent className="text-white/80">
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-16 bg-white/10 rounded" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </Section>

          {/* 10. Contact */}
          <Section>
            <div className="max-w-3xl mx-auto text-white px-6 py-20">
              <h2 className="text-4xl font-bold mb-6">Contact</h2>
              <Card className="bg-black/50 border-white/10">
                <CardContent className="p-6 space-y-4">
                  <form
                    className="grid md:grid-cols-2 gap-4"
                    onSubmit={(e) => {
                      e.preventDefault()
                      alert("Submitted! We’ll get back soon.")
                    }}
                  >
                    <input className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white" placeholder="Name" required />
                    <input className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white" placeholder="Email" type="email" required />
                    <input className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white md:col-span-2" placeholder="Subject" />
                    <textarea className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white md:col-span-2 h-28" placeholder="Message" />
                    <div className="md:col-span-2 flex items-center justify-between">
                      <div className="text-white/70 text-sm flex items-center gap-2">
                        <Mail className="h-4 w-4" /> contact@raptoresports.gg
                      </div>
                      <Button type="submit">Send Message</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
              <div className="mt-4 flex items-center gap-3">
                <a className="text-white/80 hover:text-white underline underline-offset-4" href="#">Twitter</a>
                <a className="text-white/80 hover:text-white underline underline-offset-4" href="https://www.instagram.com/rexigris?igsh=MXVxMDFpMXNhYWQ1cQ==" target="_blank" rel="noreferrer">Instagram</a>
                <a className="text-white/80 hover:text-white underline underline-offset-4" href="https://discord.gg/6986Kf3eG4" target="_blank" rel="noreferrer">Discord</a>
              </div>
            </div>
          </Section>
        </div>

        {/* Mobile swipe hint */}
        {showHint && (
          <div className="md:hidden fixed bottom-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none text-white/85 text-sm flex items-center gap-2">
            <span className="bg-black/50 backdrop-blur px-3 py-1.5 rounded-full border border-white/10">Swipe</span>
            <ArrowRight className="w-4 h-4 animate-pulse" />
          </div>
        )}

        {/* Footer */}
        <footer className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/70 to-transparent">
          <div className="max-w-7xl mx-auto h-12 px-3 sm:px-4 flex items-center justify-between text-xs sm:text-sm text-white/70">
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-white">Privacy</a>
              <a href="#" className="hover:text-white">Terms</a>
              <span className="hidden sm:inline">© {new Date().getFullYear()} Raptor Esports. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="hidden sm:inline">Developed by Swaraj Rathod</span>
              <a href="https://www.instagram.com/rexigris?igsh=MXVxMDFpMXNhYWQ1cQ==" target="_blank" rel="noreferrer" aria-label="Instagram"
                 className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/15 hover:bg-white/25">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-white/90">
                  <path d="M7 2C4.243 2 2 4.243 2 7v10c0 2.757 2.243 5 5 5h10c2.757 0 5-2.243 5-5V7c0-2.757-2.243-5-5-5H7zm0 2h10c1.654 0 3 1.346 3 3v10c0 1.654-1.346 3-3 3H7c-1.654 0-3-1.346-3-3V7c0-1.654 1.346-3 3-3zm11 1a1 1 0 100 2 1 1 0 000-2zM12 7a5 5 0 100 10 5 5 0 000-10z"/>
                </svg>
              </a>
            </div>
          </div>
        </footer>
      </div>
    </VideoBackground>
  )
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <section className="h-screen w-screen flex-shrink-0 p-4">
      <div className="h-full w-full overflow-hidden">
        {children}
      </div>
    </section>
  )
}

function useCountUp(target: number, durationMs = 1200) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let raf: number
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      setValue(Math.floor(t * target))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs])
  return value
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  const animated = useCountUp(value)
  const formatted = useMemo(() => animated.toLocaleString(), [animated])
  return (
    <Card className="bg-black/50 border-white/10 min-w-[160px]">
      <CardContent className="p-4 text-left text-white">
        <div className="flex items-center gap-2 text-white/80">{icon}<span className="text-sm">{label}</span></div>
        <div className="text-2xl font-bold tabular-nums">{formatted}</div>
      </CardContent>
    </Card>
  )
}

function TimelineItem({ year, text }: { year: string; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-2 rounded-full bg-white" />
      <div className="text-white/70 text-sm w-16">{year}</div>
      <div className="text-white/90">{text}</div>
    </div>
  )
}

function TierRow({ tier, req, perks }: { tier: string; req: string; perks: string }) {
  return (
    <div className="flex items-center justify-between bg-white/5 rounded px-3 py-2">
      <div className="font-semibold">{tier}</div>
      <div className="text-white/70 text-sm">{req}</div>
      <Badge variant="secondary" className="bg-white/10 text-white border-white/20">{perks}</Badge>
    </div>
  )
}

function PerkCard({ title, desc }: { title: string; desc: string }) {
  return (
    <Card className="bg-black/50 border-white/10">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-white/80">{desc}</CardContent>
    </Card>
  )
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card className="bg-black/50 border-white/10">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-white/80 space-y-2">
        {items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </CardContent>
    </Card>
  )
}

function Step({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-3 bg-white/5 rounded px-3 py-2">
      <div className="h-7 w-7 rounded-full bg-white text-black font-bold flex items-center justify-center">{n}</div>
      <div className="text-white/90">{title}</div>
    </div>
  )
}