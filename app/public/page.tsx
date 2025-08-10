"use client"

import React, { useState, useEffect } from "react"
import { VideoBackground } from "@/components/video-background"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FadeInOnScroll } from "@/components/ui/fade-in-on-scroll"
import { Trophy, Users, Calendar, Play, Mail, ArrowRight, Sparkles, Clock, Award, Target, TrendingUp, Star } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { PublicNavigation } from "@/components/public/PublicNavigation"
import { PublicFooter } from "@/components/public/PublicFooter"

export default function PublicSitePage() {
  const [teamsCount, setTeamsCount] = useState<number>(12)
  const [playersCount, setPlayersCount] = useState<number>(72)

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

  return (
    <VideoBackground>
      <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto">
        <PublicNavigation />
        
        {/* Hero */}
        <section className="relative h-[60vh] sm:h-[70vh] w-full pt-14">
          <div className="absolute inset-0">
            <div className="h-full w-full bg-gradient-to-br from-black via-black/80 to-black/60" />
          </div>
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
            <FadeInOnScroll>
              <h1 className="text-4xl sm:text-6xl font-extrabold drop-shadow-xl text-white">
                Next-Gen Esports Org — Powered by AI, Driven by Data & Passion.
              </h1>
            </FadeInOnScroll>
            <FadeInOnScroll delayMs={120}>
              <p className="mt-4 text-white/80 max-w-3xl">Cinematic performance. Data-backed decisions. Build your legacy with us.</p>
            </FadeInOnScroll>
            <FadeInOnScroll delayMs={240}>
              <div className="flex gap-4 mt-8">
                <a href="https://discord.gg/6986Kf3eG4" target="_blank" rel="noreferrer"
                  className="px-5 py-2 rounded-md font-semibold bg-gradient-to-r from-[#00C6FF] via-[#3A7DFF] to-[#B721FF] text-white hover:brightness-110 transition-shadow shadow-[0_0_30px_rgba(58,125,255,0.35)]">
                  Join Us
                </a>
                <a href="/highlight"
                  className="px-5 py-2 rounded-md font-semibold border border-white/30 text-white/90 hover:text-white hover:bg-white/10 transition-colors">
                  Watch Highlights
                </a>
              </div>
            </FadeInOnScroll>
          </div>
        </section>

        {/* Stats */}
        <FadeInOnScroll as="section" className="max-w-6xl mx-auto px-4 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat icon={<Users className="h-5 w-5" />} label="Active Teams" value={teamsCount} />
            <Stat icon={<Users className="h-5 w-5" />} label="Active Players" value={playersCount} />
            <Stat icon={<Calendar className="h-5 w-5" />} label="Total Matches" value={1248} />
            <Stat icon={<Trophy className="h-5 w-5" />} label="Total WWCD" value={439} />
          </div>
        </FadeInOnScroll>

        {/* About Overview */}
        <FadeInOnScroll as="section" className="max-w-6xl mx-auto px-4 py-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-extrabold drop-shadow-xl text-white">Powered by AI. Backed by Raptor.</h2>
            <p className="mt-2 text-white/85 max-w-3xl mx-auto">Founded in 2025, Raptor Esports combines competitive excellence with cutting-edge technology to empower players.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
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
        </FadeInOnScroll>

        {/* Tier System */}
        <FadeInOnScroll as="section" className="max-w-6xl mx-auto px-4 py-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white">Tier System</h2>
            <p className="mt-2 text-white/85 max-w-3xl mx-auto">Progressive system that rewards skill, consistency, and team performance.</p>
          </div>
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
        </FadeInOnScroll>

        {/* Incentives */}
        <FadeInOnScroll as="section" className="max-w-6xl mx-auto px-4 py-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white">Earn more as you climb the ranks.</h2>
            <p className="mt-2 text-white/85 max-w-3xl mx-auto">Comprehensive incentive system designed to reward performance and dedication.</p>
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="grid sm:grid-cols-3 gap-4">
              <Card className="bg-black/50 border-white/10">
                <CardHeader>
                  <CardTitle>Paid scrims</CardTitle>
                </CardHeader>
                <CardContent className="text-white/80">Rewarding consistency and effort.</CardContent>
              </Card>
              <Card className="bg-black/50 border-white/10">
                <CardHeader>
                  <CardTitle>AI tools</CardTitle>
                </CardHeader>
                <CardContent className="text-white/80">Analytics, insights, dashboards.</CardContent>
              </Card>
              <Card className="bg-black/50 border-white/10">
                <CardHeader>
                  <CardTitle>Attendance</CardTitle>
                </CardHeader>
                <CardContent className="text-white/80">Tracked training & matches.</CardContent>
              </Card>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="bg-black/50 border-white/10">
                <CardHeader>
                  <CardTitle>Tier Rewards</CardTitle>
                </CardHeader>
                <CardContent className="text-white/90 space-y-1 text-sm">
                  <div className="flex justify-between"><span>T1</span><span>Premium + Coaching</span></div>
                  <div className="flex justify-between"><span>God Tier</span><span>Elite + Analyst</span></div>
                  <div className="text-white/70 mt-2">Major tournaments (₹20k+) split 50/50 post-expense.</div>
                </CardContent>
              </Card>
              <Card className="bg-black/50 border-white/10">
                <CardHeader>
                  <CardTitle>Progression</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-2 text-center">
                    {['T4','T3','T2','T1','God'].map((t, i) => (
                      <div key={t} className={`rounded px-2 py-3 ${i>=3? 'bg-white/15':'bg-white/10'}`}>
                        <div className="text-white font-semibold">{t}</div>
                        <div className="text-white/70 text-xs">{i===0?'Start':i===1?'Growth':i===2?'Compete':i===3?'Contend':'Dominate'}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-center text-white/80 text-sm">More Wins = Bigger Cuts.</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </FadeInOnScroll>

        {/* Tournaments */}
        <FadeInOnScroll as="section" className="max-w-6xl mx-auto px-4 py-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white">Tournaments</h2>
            <p className="mt-2 text-white/85 max-w-3xl mx-auto">Competitive opportunities across multiple formats and skill levels.</p>
          </div>
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
        </FadeInOnScroll>

        {/* CTA */}
        <FadeInOnScroll as="section" className="max-w-6xl mx-auto px-4 py-12 text-center">
          <a
            href="https://discord.gg/6986Kf3eG4"
            target="_blank"
            rel="noreferrer"
            className="inline-flex px-5 py-2 rounded-md font-semibold bg-gradient-to-r from-[#00C6FF] via-[#3A7DFF] to-[#B721FF] text-white hover:brightness-110 transition-shadow shadow-[0_0_30px_rgba(58,125,255,0.35)]"
          >
            Join Discord
          </a>
        </FadeInOnScroll>
        
        <PublicFooter />
      </div>
    </VideoBackground>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="bg-black/50 border-white/10">
      <CardContent className="p-4 text-left text-white">
        <div className="flex items-center gap-2 text-white/80">{icon}<span className="text-sm">{label}</span></div>
        <div className="text-2xl font-bold tabular-nums">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
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