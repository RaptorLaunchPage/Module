"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { VideoBackground } from "@/components/video-background"
import { Trophy, Users, Calendar, Play, Mail, ArrowRight, Sparkles, Clock, Award, Target, TrendingUp, Star } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { PublicFooter } from "@/components/public/PublicFooter"

const SECTIONS = [
  "Home",
  "About",
  "Vision & Values",
  "Milestones",
  "Incentives",
  "Tier System",
  "Rewards & Perks",
  "Progression",
  "Tournaments",
  "Contact",
] as const

// Public nav: all internal section jumps for a consistent slide experience
const NAV: Array<{ name: string; idx: number }> = [
  { name: "Home", idx: 0 },
  { name: "About", idx: 1 },
  { name: "Vision", idx: 2 },
  { name: "Milestones", idx: 3 },
  { name: "Incentives", idx: 4 },
  { name: "Tier System", idx: 5 },
  { name: "Rewards", idx: 6 },
  { name: "Progression", idx: 7 },
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
    setIndex((i) => (i + 1) % SECTIONS.length)
    hideHint()
  }, [hideHint])

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + SECTIONS.length) % SECTIONS.length)
    hideHint()
  }, [hideHint])

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
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
        if (dx > 0) prev()
        else next()
      }
    }
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart as any)
      el.removeEventListener('touchend', onTouchEnd as any)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [next, prev, hideHint])

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Try to fetch live counts from Supabase
        const { count: teams } = await supabase
          .from('teams')
          .select('*', { count: 'exact', head: true })
        if (teams) setTeamsCount(teams)

        const { count: players } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
        if (players) setPlayersCount(players)
      } catch (error) {
        console.log('Using default counts')
      }
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
              {NAV.map(({ name, idx }) => (
                <button
                  key={name}
                  onClick={() => goTo(idx)}
                  className={`text-xs sm:text-sm text-white/80 hover:text-white transition-colors pb-0.5 border-b-2 ${index === idx ? "border-white" : "border-transparent hover:border-white/40"}`}
                  aria-label={`Go to ${name}`}
                >
                  {name}
                </button>
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
                <button onClick={() => goTo(1)} className="hover:text-white hover:underline underline-offset-4">About</button>
                <button onClick={() => goTo(4)} className="hover:text-white hover:underline underline-offset-4">Incentives</button>
                <button onClick={() => goTo(8)} className="hover:text-white hover:underline underline-offset-4">Tournaments</button>
                <button onClick={() => goTo(9)} className="hover:text-white hover:underline underline-offset-4">Contact</button>
              </div>
            </div>
          </Section>

          {/* 2. About */}
          <Section>
            <div className="h-full w-full bg-gradient-to-br from-black via-black/80 to-black/60 px-6 py-10 text-white flex flex-col">
              <div className="text-center">
                <h2 className="text-3xl sm:text-4xl font-extrabold drop-shadow-xl">Powered by AI. Backed by Raptor.</h2>
                <p className="mt-2 text-white/85 max-w-3xl mx-auto">Founded in 2025, Raptor Esports combines competitive excellence with cutting-edge technology to empower players.</p>
              </div>
              <div className="mt-auto grid md:grid-cols-2 gap-6">
                <Card className="bg-black/50 border-white/10">
                  <CardHeader>
                    <CardTitle>Milestones (2025)</CardTitle>
                  </CardHeader>
                  <CardContent className="text-white/85 space-y-2">
                    <li>May — Organization established.</li>
                    <li>June — Incentive program launched.</li>
                    <li>July — Tier system + Instagram presence.</li>
                    <li>August — AI-driven performance platform launched.</li>
                  </CardContent>
                </Card>
                <Card className="bg-black/50 border-white/10">
                  <CardHeader>
                    <CardTitle>What We Offer</CardTitle>
                  </CardHeader>
                  <CardContent className="grid sm:grid-cols-3 gap-3 text-white/85">
                    <div className="bg-white/5 rounded p-3">
                      <div className="font-semibold">Sponsorship</div>
                      <div className="text-white/70 text-sm">Support for top-performing teams.</div>
                    </div>
                    <div className="bg-white/5 rounded p-3">
                      <div className="font-semibold">Training</div>
                      <div className="text-white/70 text-sm">Coaching, VOD reviews, practice.</div>
                    </div>
                    <div className="bg-white/5 rounded p-3">
                      <div className="font-semibold">Data Tools</div>
                      <div className="text-white/70 text-sm">AI insights & analytics.</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </Section>

          {/* 3. Vision & Values */}
          <Section>
            <div className="h-full w-full bg-gradient-to-br from-black via-black/80 to-black/60 px-6 py-10 text-white flex flex-col">
              <div className="text-center">
                <h2 className="text-3xl sm:text-4xl font-extrabold drop-shadow-xl">Our Vision & Values</h2>
                <p className="mt-2 text-white/85 max-w-3xl mx-auto">Building the future of competitive gaming through innovation and dedication.</p>
              </div>
              <div className="mt-auto grid md:grid-cols-3 gap-6">
                <Card className="bg-black/50 border-white/10">
                  <CardHeader>
                    <CardTitle>Our Vision</CardTitle>
                  </CardHeader>
                  <CardContent className="text-white/80">
                    Elevate Indian esports with a modern, data-driven ecosystem that nurtures winners.
                  </CardContent>
                </Card>
                <Card className="bg-black/50 border-white/10">
                  <CardHeader>
                    <CardTitle>What Drives Us</CardTitle>
                  </CardHeader>
                  <CardContent className="text-white/80">
                    Discipline, consistency, and innovation — backed by AI-powered insights.
                  </CardContent>
                </Card>
                <Card className="bg-black/50 border-white/10">
                  <CardHeader>
                    <CardTitle>Players First</CardTitle>
                  </CardHeader>
                  <CardContent className="text-white/80">
                    Transparent frameworks, fair incentives, and clear progression paths.
                  </CardContent>
                </Card>
              </div>
            </div>
          </Section>

          {/* 4. Milestones */}
          <Section>
            <div className="h-full w-full bg-gradient-to-br from-black via-black/80 to-black/60 px-6 py-10 text-white flex flex-col">
              <div className="text-center">
                <h2 className="text-3xl sm:text-4xl font-extrabold drop-shadow-xl">Our Journey</h2>
                <p className="mt-2 text-white/85 max-w-3xl mx-auto">Key milestones in our mission to revolutionize esports.</p>
              </div>
              <div className="mt-auto grid md:grid-cols-2 gap-6">
                <TimelineCard year="2025" items={[
                  "May — Organization established.",
                  "June — Incentive program launched.",
                  "July — Tier system + Instagram presence.",
                  "August — AI-driven performance platform launched.",
                ]} />
                <Card className="bg-black/50 border-white/10">
                  <CardHeader>
                    <CardTitle>Achievements</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 text-white/85">
                    <div className="bg-white/5 rounded p-3">
                      <div className="font-semibold">2025 Establishment</div>
                      <div className="text-white/70 text-sm">Rapidly growing community and structured programs launched.</div>
                    </div>
                    <div className="bg-white/5 rounded p-3">
                      <div className="font-semibold">AI Platform</div>
                      <div className="text-white/70 text-sm">Deployed performance analytics and curated insights engine.</div>
                    </div>
                    <div className="bg-white/5 rounded p-3">
                      <div className="font-semibold">Scrim Success</div>
                      <div className="text-white/70 text-sm">Consistent finishes and momentum across multiple rosters.</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </Section>

          {/* 5. Incentives */}
          <Section>
            <div className="h-full w-full bg-gradient-to-br from-black via-black/80 to-black/60 px-6 py-10 text-white flex flex-col">
              <div className="text-center">
                <h2 className="text-3xl sm:text-4xl font-extrabold drop-shadow-xl">Earn more as you climb the ranks.</h2>
                <p className="mt-2 text-white/85 max-w-3xl mx-auto">Comprehensive incentive system designed to reward performance and dedication.</p>
              </div>
              <div className="mt-auto grid md:grid-cols-3 gap-6">
                <Card className="bg-black/50 border-white/10">
                  <CardHeader>
                    <CardTitle>Paid practice scrims</CardTitle>
                  </CardHeader>
                  <CardContent className="text-white/80">Compensated practice hours to reward consistency and effort.</CardContent>
                </Card>
                <Card className="bg-black/50 border-white/10">
                  <CardHeader>
                    <CardTitle>AI performance tools</CardTitle>
                  </CardHeader>
                  <CardContent className="text-white/80">Full access to analytics, curated insights, and performance dashboards.</CardContent>
                </Card>
                <Card className="bg-black/50 border-white/10">
                  <CardHeader>
                    <CardTitle>Attendance monitoring</CardTitle>
                  </CardHeader>
                  <CardContent className="text-white/80">Track training and match participation to unlock rewards.</CardContent>
                </Card>
              </div>
            </div>
          </Section>

          {/* 6. Tier System */}
          <Section>
            <div className="h-full w-full bg-gradient-to-br from-black via-black/80 to-black/60 px-6 py-10 text-white flex flex-col">
              <div className="text-center">
                <h2 className="text-3xl sm:text-4xl font-extrabold drop-shadow-xl">Tier-Based Rewards</h2>
                <p className="mt-2 text-white/85 max-w-3xl mx-auto">Progressive system that rewards skill, consistency, and team performance.</p>
              </div>
              <div className="mt-auto">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-white/90 border-separate border-spacing-y-2">
                    <thead className="text-white/70">
                      <tr>
                        <th className="px-3 py-2">Tier</th>
                        <th className="px-3 py-2">Wildcards</th>
                        <th className="px-3 py-2">Data Support</th>
                        <th className="px-3 py-2">Accessories & Gear</th>
                        <th className="px-3 py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { tier: "T4", wc: "-", data: "Basic", gear: "-", notes: "Entry level." },
                        { tier: "T3", wc: "Limited", data: "Enhanced", gear: "Basic", notes: "Developing." },
                        { tier: "T2", wc: "Moderate", data: "Full", gear: "Standard", notes: "Competitive." },
                        { tier: "T1", wc: "High", data: "Full + Coaching", gear: "Premium", notes: "Tournament-ready." },
                        { tier: "God Tier", wc: "Max", data: "Elite + Analyst", gear: "Elite", notes: "Top performers." },
                      ].map((r) => (
                        <tr key={r.tier} className={`bg-white/5 rounded ${r.tier === 'T1' || r.tier === 'God Tier' ? 'outline outline-1 outline-white/20' : ''}`}>
                          <td className="px-3 py-3 font-semibold">{r.tier}</td>
                          <td className="px-3 py-3">{r.wc}</td>
                          <td className="px-3 py-3">{r.data}</td>
                          <td className="px-3 py-3">{r.gear}</td>
                          <td className="px-3 py-3 text-white/70">{r.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Section>

          {/* 7. Rewards & Perks */}
          <Section>
            <div className="h-full w-full bg-gradient-to-br from-black via-black/80 to-black/60 px-6 py-10 text-white flex flex-col">
              <div className="text-center">
                <h2 className="text-3xl sm:text-4xl font-extrabold drop-shadow-xl">Winning Share Perks</h2>
                <p className="mt-2 text-white/85 max-w-3xl mx-auto">Fair and transparent reward system that benefits the entire team.</p>
              </div>
              <div className="mt-auto grid md:grid-cols-2 gap-6">
                <Card className="bg-black/50 border-white/10">
                  <CardHeader>
                    <CardTitle>Policy Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="text-white/80 space-y-2">
                    <p>We follow a cost-coverage-first policy to reduce financial pressure on players.</p>
                    <p>After covering costs, surpluses are split fairly with a team-favored approach.</p>
                  </CardContent>
                </Card>
                <Card className="bg-black/50 border-white/10">
                  <CardHeader>
                    <CardTitle>Example</CardTitle>
                  </CardHeader>
                  <CardContent className="text-white/80 space-y-2">
                    <p>Major tournaments (over ₹20k) are split 50/50 after expense deduction.</p>
                    <p>More wins unlock higher tiers, increasing your benefits.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </Section>

          {/* 8. Progression */}
          <Section>
            <div className="h-full w-full bg-gradient-to-br from-black via-black/80 to-black/60 px-6 py-10 text-white flex flex-col">
              <div className="text-center">
                <h2 className="text-3xl sm:text-4xl font-extrabold drop-shadow-xl">Progression Ladder</h2>
                <p className="mt-2 text-white/85 max-w-3xl mx-auto">Clear path from entry to elite performance.</p>
              </div>
              <div className="mt-auto">
                <div className="grid sm:grid-cols-5 gap-3 mb-6">
                  {[
                    { t: "T4", sub: "Start" },
                    { t: "T3", sub: "Growth" },
                    { t: "T2", sub: "Compete" },
                    { t: "T1", sub: "Contend" },
                    { t: "God", sub: "Dominate" },
                  ].map((x, i) => (
                    <div key={x.t} className={`rounded p-4 text-center ${i >= 3 ? 'bg-white/15' : 'bg-white/10'}`}>
                      <div className="text-xl font-bold text-white">{x.t}</div>
                      <div className="text-white/70 text-sm">{x.sub}</div>
                    </div>
                  ))}
                </div>
                <div className="text-center text-white/80">More Wins = Bigger Cuts.</div>
              </div>
            </div>
          </Section>

          {/* 9. Tournaments */}
          <Section>
            <div className="h-full w-full bg-gradient-to-br from-black via-black/80 to-black/60 px-6 py-10 text-white flex flex-col">
              <div className="text-center">
                <h2 className="text-3xl sm:text-4xl font-extrabold drop-shadow-xl">Tournaments & Events</h2>
                <p className="mt-2 text-white/85 max-w-3xl mx-auto">Competitive opportunities across multiple formats and skill levels.</p>
              </div>
              <div className="mt-auto grid md:grid-cols-2 gap-6">
                <Card className="bg-black/50 border-white/10">
                  <CardHeader>
                    <CardTitle>Upcoming Events</CardTitle>
                  </CardHeader>
                  <CardContent className="text-white/80 space-y-2">
                    <li>Weekly scrim tournaments</li>
                    <li>Monthly championship series</li>
                    <li>Quarterly major tournaments</li>
                    <li>Annual championship</li>
                  </CardContent>
                </Card>
                <Card className="bg-black/50 border-white/10">
                  <CardHeader>
                    <CardTitle>Tournament Benefits</CardTitle>
                  </CardHeader>
                  <CardContent className="text-white/80 space-y-2">
                    <li>Prize pool distribution</li>
                    <li>Performance tracking</li>
                    <li>Team building opportunities</li>
                    <li>Professional exposure</li>
                  </CardContent>
                </Card>
              </div>
            </div>
          </Section>

          {/* 10. Contact */}
          <Section>
            <div className="h-full w-full bg-gradient-to-br from-black via-black/80 to-black/60 px-6 py-10 text-white flex flex-col">
              <div className="text-center">
                <h2 className="text-3xl sm:text-4xl font-extrabold drop-shadow-xl">Get In Touch</h2>
                <p className="mt-2 text-white/85 max-w-3xl mx-auto">Ready to join the Raptor family? Connect with us today.</p>
              </div>
              <div className="mt-auto grid md:grid-cols-2 gap-6">
                <Card className="bg-black/50 border-white/10">
                  <CardHeader>
                    <CardTitle>Join Our Community</CardTitle>
                  </CardHeader>
                  <CardContent className="text-white/80 space-y-4">
                    <a href="https://discord.gg/6986Kf3eG4" target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gradient-to-r from-[#00C6FF] via-[#3A7DFF] to-[#B721FF] text-white hover:brightness-110 transition-shadow">
                      <Mail className="h-4 w-4" />
                      Join Discord
                    </a>
                    <p>Connect with players, coaches, and staff in our active Discord community.</p>
                  </CardContent>
                </Card>
                <Card className="bg-black/50 border-white/10">
                  <CardHeader>
                    <CardTitle>Follow Us</CardTitle>
                  </CardHeader>
                  <CardContent className="text-white/80 space-y-2">
                    <a href="https://www.instagram.com/rexigris?igsh=MXVxMDFpMXNhYWQ1cQ==" target="_blank" rel="noreferrer" className="block hover:text-white transition-colors">
                      Instagram: @rexigris
                    </a>
                    <p>Stay updated with our latest news, highlights, and announcements.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </Section>
        </div>

        {/* Scroll hint */}
        {showHint && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40">
            <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 text-white/80 text-sm">
              Use arrow keys or scroll to navigate
            </div>
          </div>
        )}

        {/* Footer */}
        <PublicFooter />
      </div>
    </VideoBackground>
  )
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <section className="h-screen w-screen flex-shrink-0 p-4">
      <div className="h-full w-full overflow-visible">
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

function TimelineCard({ year, items }: { year: string; items: string[] }) {
  return (
    <Card className="bg-black/50 border-white/10">
      <CardHeader>
        <CardTitle>{year}</CardTitle>
      </CardHeader>
      <CardContent className="text-white/80 space-y-2">
        {items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </CardContent>
    </Card>
  )
}