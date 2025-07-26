"use client"

import { AdvancedLoading, LoadingStep } from "@/components/ui/advanced-loading"

export default function Loading() {
  // Sequential loading states for better UX
  const loadingSteps: LoadingStep[] = [
    'connecting',
    'authenticating', 
    'checking-agreement',
    'loading-profile',
    'initializing'
  ]

  return (
    <AdvancedLoading 
      steps={loadingSteps}
      customTitle="Loading Raptor Hub"
      customDescription="Initializing your esports experience..."
      timeoutMs={0}
      showProgress={true}
    />
  )
}
