"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Trophy, Users, BarChart3 } from "lucide-react"

export default function HomePage() {
  return (
    <div>
      <h1>Raptor Esports CRM</h1>
      <p>System is working</p>
      <a href="/auth/login">Login</a>
    </div>
  )
}
