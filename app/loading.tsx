"use client"

import { FullPageLoader, useSequentialLoading } from "@/components/ui/full-page-loader"

export default function Loading() {
  // Sequential loading states for better UX
  const currentState = useSequentialLoading([
    'connecting',
    'initializing',
    'loading-profile'
  ], 1500)

  return (
    <FullPageLoader 
      state={currentState}
      customTitle="Loading Raptor Hub"
      customDescription="Initializing your esports experience"
      size="lg"
    />
  )
}
