"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"

export function PerformanceReportSimple() {
  console.log('🎯 PerformanceReportSimple rendering - MINIMAL VERSION')
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Report
          </CardTitle>
          <CardDescription>
            Minimal test version - no data loading
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-muted-foreground">
            Performance Report component loaded successfully! 🎉
          </p>
          <p className="text-center text-sm text-muted-foreground">
            This confirms the component can render without crashing.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}