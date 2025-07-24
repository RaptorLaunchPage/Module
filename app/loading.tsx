"use client"

import { AdvancedLoading, useSequentialLoading, LoadingStep } from "@/components/ui/advanced-loading"

export default function Loading() {
  // Handle timeout by forcing a page refresh
  const handleTimeout = () => {
    console.warn('🕐 Page loading timeout - refreshing')
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

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
      onTimeout={handleTimeout}
      timeoutMs={20000}
      showProgress={true}
    />
  )
}
