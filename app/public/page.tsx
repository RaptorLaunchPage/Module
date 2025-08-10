"use client"

import React, { useState, useEffect } from "react"
import { VideoBackground } from "@/components/video-background"
import { Card, CardContent } from "@/components/ui/card"
import { FadeInOnScroll } from "@/components/ui/fade-in-on-scroll"
import { Trophy, Users, Calendar } from "lucide-react"
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
      <div className="relative w-full overflow-x-hidden overflow-y-auto">
        <PublicNavigation />
        
        {/* Hero */}
        <section className="relative h-[60vh] sm:h-[70vh] w-full pt-14">
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
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