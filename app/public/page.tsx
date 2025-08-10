"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { VideoBackground } from "@/components/video-background"
import { Trophy, Users, Calendar, Play, Mail, ChevronLeft, ChevronRight, Download, ExternalLink } from "lucide-react"

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

type SectionKey = typeof SECTIONS[number]

export default function PublicSitePage() {
  const [index, setIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const clamp = useCallback((i: number) => Math.max(0, Math.min(SECTIONS.length - 1, i)), [])

  const goTo = useCallback((i: number) => setIndex(clamp(i)), [clamp])
  const next = useCallback(() => setIndex((i) => clamp(i + 1)), [clamp])
  const prev = useCallback(() => setIndex((i) => clamp(i - 1)), [clamp])

  // Prevent vertical scrolling and convert wheel to horizontal step navigation
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!containerRef.current) return
      e.preventDefault()
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        if (e.deltaY > 0) next()
        else prev()
      } else {
        if (e.deltaX > 0) next()
        else prev()
      }
    }
    const onKey = (e: KeyboardEvent) => {
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
  }, [next, prev])

  // Touch swipe support (basic)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let startX = 0
    let startY = 0
    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
    }
    const onTouchEnd = (e: TouchEvent) => {
      const dx = (e.changedTouches[0]?.clientX || 0) - startX
      const dy = (e.changedTouches[0]?.clientY || 0) - startY
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
        if (dx < 0) next()
        else prev()
      }
    }
    el.addEventListener("touchstart", onTouchStart)
    el.addEventListener("touchend", onTouchEnd)
    return () => {
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchend", onTouchEnd)
    }
  }, [next, prev])

  const translate = useMemo(() => `translateX(-${index * 100}%)`, [index])

  return (
    <VideoBackground>
      <div className="relative h-screen w-full overflow-hidden" ref={containerRef}>
        {/* Top Navigation */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-black/40 backdrop-blur-md border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
            <div className="font-bold text-white tracking-wide">RAPTOR ESPORTS</div>
            <nav className="hidden md:flex items-center gap-2 flex-wrap">
              {SECTIONS.map((name, i) => (
                <Button
                  key={name}
                  size="sm"
                  variant={i === index ? "default" : "outline"}
                  onClick={() => goTo(i)}
                  className={i === index ? "bg-white text-black" : "bg-transparent text-white border-white/30 hover:bg-white/10"}
                >
                  {name}
                </Button>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <Button size="icon" variant="outline" className="bg-transparent text-white border-white/30" onClick={prev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" className="bg-transparent text-white border-white/30" onClick={next}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Slides Container */}
        <div
          className="absolute inset-0 flex h-full w-[1000vw] transition-transform duration-500 ease-in-out"
          style={{ transform: translate }}
        >
          {/* 1. Home */}
          <Section>
            <div className="flex flex-col items-center justify-center h-full text-center text-white gap-6">
              <h1 className="text-4xl sm:text-6xl font-extrabold drop-shadow-lg">Compete. Evolve. Conquer.</h1>
              <p className="text-white/80 max-w-2xl">India’s elite esports collective. Proven results, professional culture, and a path to greatness.</p>
              <div className="flex gap-3">
                <Button asChild>
                  <a href="#" className="flex items-center gap-2">
                    <Play className="h-4 w-4" /> Watch Highlight
                  </a>
                </Button>
                <Button variant="outline" className="text-white border-white/40">Apply Now</Button>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-8">
                <Stat icon={<Users className="h-5 w-5" />} label="Active Teams" value="12" />
                <Stat icon={<Trophy className="h-5 w-5" />} label="Major Wins" value="24" />
                <Stat icon={<Calendar className="h-5 w-5" />} label="Next Tourney" value="Oct 15" />
              </div>
              <div className="mt-8 w-full max-w-3xl">
                <Card className="bg-black/50 border-white/10">
                  <CardContent className="p-0">
                    <video controls poster="/poster.jpg" className="w-full h-[360px] object-cover rounded-md">
                      <source src="/highlight.mp4" type="video/mp4" />
                    </video>
                  </CardContent>
                </Card>
              </div>
            </div>
          </Section>

          {/* 2. About Us */}
          <Section>
            <div className="max-w-5xl mx-auto text-white px-6 py-12">
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
            <div className="max-w-6xl mx-auto text-white px-6 py-12">
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
                      <Download className="h-4 w-4 mr-2" /> Download
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
            <div className="max-w-5xl mx-auto text-white px-6 py-12">
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
            <div className="max-w-6xl mx-auto text-white px-6 py-12">
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
            <div className="max-w-5xl mx-auto text-white px-6 py-12">
              <h2 className="text-4xl font-bold mb-6">What’s Covered by the Org</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <ListCard title="Event Fees" items={["Tournament registrations", "Scrim slots", "Admin fees"]) } />
                <ListCard title="Logistics" items={["Travel planning", "Hotel coordination", "On-ground support"]) } />
                <ListCard title="Training" items={["Coaching staff", "VOD reviews", "Performance analytics"]) } />
                <ListCard title="Gear & Maintenance" items={["Equipment support", "Jersey & branding", "Maintenance"]} />
              </div>
            </div>
          </Section>

          {/* 7. How It Works */}
          <Section>
            <div className="max-w-4xl mx-auto text-white px-6 py-12">
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
            <div className="max-w-6xl mx-auto text-white px-6 py-12">
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
            <div className="max-w-6xl mx-auto text-white px-6 py-12">
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
                    <Button variant="outline" className="text-white border-white/40" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" /> View Live
                    </Button>
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
            <div className="max-w-3xl mx-auto text-white px-6 py-12">
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
                <Button variant="outline" className="text-white border-white/40" size="sm">
                  Twitter
                </Button>
                <Button variant="outline" className="text-white border-white/40" size="sm">
                  Instagram
                </Button>
                <Button variant="outline" className="text-white border-white/40" size="sm">
                  Discord
                </Button>
              </div>
            </div>
          </Section>
        </div>

        {/* Bottom progress dots */}
        <div className="absolute bottom-4 left-0 right-0 z-20 flex items-center justify-center gap-2">
          {SECTIONS.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to ${SECTIONS[i]}`}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all ${i === index ? "w-8 bg-white" : "w-2 bg-white/40"}`}
            />
          ))}
        </div>
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

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="bg-black/50 border-white/10 min-w-[160px]">
      <CardContent className="p-4 text-left text-white">
        <div className="flex items-center gap-2 text-white/80">{icon}<span className="text-sm">{label}</span></div>
        <div className="text-2xl font-bold">{value}</div>
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