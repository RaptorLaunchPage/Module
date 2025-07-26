"use client"

import React, { useState, useEffect } from 'react'
import { VideoBackground } from "@/components/video-background"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Wifi, 
  Shield, 
  CheckCircle, 
  User, 
  Settings, 
  Globe, 
  Database, 
  AlertCircle,
  Clock,
  Zap,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"

export type LoadingStep = 
  | 'connecting'
  | 'authenticating' 
  | 'checking-agreement'
  | 'loading-profile'
  | 'initializing'
  | 'redirecting'
  | 'processing'
  | 'error'

interface LoadingStepConfig {
  icon: React.ComponentType<any>
  title: string
  description: string
  color: string
  bgColor: string
  duration: number
}

const LOADING_STEPS: Record<LoadingStep, LoadingStepConfig> = {
  connecting: {
    icon: Wifi,
    title: "Establishing Connection",
    description: "Connecting to Raptor servers...",
    color: "text-blue-400",
    bgColor: "from-blue-500/20 to-cyan-500/20",
    duration: 300
  },
  authenticating: {
    icon: Shield,
    title: "Verifying Identity",
    description: "Authenticating your credentials...",
    color: "text-green-400", 
    bgColor: "from-green-500/20 to-emerald-500/20",
    duration: 300
  },
  'checking-agreement': {
    icon: CheckCircle,
    title: "Checking Agreements",
    description: "Reviewing user agreement status...",
    color: "text-amber-400",
    bgColor: "from-amber-500/20 to-yellow-500/20", 
    duration: 300
  },
  'loading-profile': {
    icon: User,
    title: "Loading Profile",
    description: "Retrieving your player data...",
    color: "text-purple-400",
    bgColor: "from-purple-500/20 to-violet-500/20",
    duration: 300
  },
  initializing: {
    icon: Settings,
    title: "Initializing Dashboard",
    description: "Setting up your esports hub...",
    color: "text-cyan-400",
    bgColor: "from-cyan-500/20 to-blue-500/20",
    duration: 300
  },
  redirecting: {
    icon: Globe,
    title: "Almost Ready",
    description: "Taking you to your dashboard...",
    color: "text-indigo-400",
    bgColor: "from-indigo-500/20 to-purple-500/20",
    duration: 300
  },
  processing: {
    icon: Database,
    title: "Processing",
    description: "Processing your request...",
    color: "text-orange-400",
    bgColor: "from-orange-500/20 to-red-500/20",
    duration: 300
  },
  error: {
    icon: AlertCircle,
    title: "Connection Issue",
    description: "Please refresh the page if this persists...",
    color: "text-red-400",
    bgColor: "from-red-500/20 to-pink-500/20",
    duration: 0
  }
}

interface AdvancedLoadingProps {
  currentStep?: LoadingStep
  steps?: LoadingStep[]
  customTitle?: string
  customDescription?: string
  onTimeout?: () => void
  timeoutMs?: number
  showProgress?: boolean
  autoProgress?: boolean // New prop to control auto-progression
}

export function AdvancedLoading({
  currentStep = 'connecting',
  steps = ['connecting', 'authenticating', 'checking-agreement', 'loading-profile', 'initializing'],
  customTitle,
  customDescription,
  onTimeout,
  timeoutMs = 15000,
  showProgress = true,
  autoProgress = false // Default to false - wait for external control
}: AdvancedLoadingProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(() => {
    // Find the index of the current step in the steps array
    const index = steps.indexOf(currentStep)
    return index >= 0 ? index : 0
  })
  const [progress, setProgress] = useState(0)
  const [hasTimedOut, setHasTimedOut] = useState(false)

  // Update current step index when currentStep prop changes
  useEffect(() => {
    const index = steps.indexOf(currentStep)
    if (index >= 0 && index !== currentStepIndex) {
      setCurrentStepIndex(index)
      setProgress(0) // Reset progress when step changes
    }
  }, [currentStep, steps, currentStepIndex])

  const currentStepKey = steps[currentStepIndex] || currentStep
  const config = LOADING_STEPS[currentStepKey]
  const Icon = config.icon

  // Auto-progress through steps (only if autoProgress is enabled)
  useEffect(() => {
    if (!autoProgress || hasTimedOut) return

    const stepDuration = config.duration
    const progressInterval = stepDuration / 100

    let progressCount = 0
    const progressTimer = setInterval(() => {
      progressCount += 1
      setProgress(progressCount)

      if (progressCount >= 100) {
        clearInterval(progressTimer)
        
        // Move to next step or complete
        if (currentStepIndex < steps.length - 1) {
          setCurrentStepIndex(prev => prev + 1)
          setProgress(0)
        }
      }
    }, progressInterval)

    return () => clearInterval(progressTimer)
  }, [currentStepIndex, steps.length, config.duration, hasTimedOut, autoProgress])

  // Show smooth progress animation for current step (even without auto-progress)
  useEffect(() => {
    if (hasTimedOut) return

    // Animate progress bar smoothly for visual feedback
    const progressTimer = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 2
        return newProgress >= 100 ? 100 : newProgress
      })
    }, 50)

    return () => clearInterval(progressTimer)
  }, [currentStepIndex, hasTimedOut])

  // Timeout handler
  useEffect(() => {
    if (timeoutMs <= 0) return

    const timeoutTimer = setTimeout(() => {
      setHasTimedOut(true)
      onTimeout?.()
    }, timeoutMs)

    return () => clearTimeout(timeoutTimer)
  }, [timeoutMs, onTimeout])

  // Calculate overall progress based on current step position
  const overallProgress = Math.min(((currentStepIndex + (progress / 100)) / steps.length) * 100, 100)

  return (
    <VideoBackground>
      {/* Ambient particles */}
      <div className="pointer-events-none fixed inset-0 z-10">
        <div className="absolute left-1/4 top-1/4 h-2 w-2 rounded-full bg-blue-400 opacity-60 blur-sm animate-pulse" />
        <div className="absolute right-1/3 top-1/2 h-1 w-1 rounded-full bg-purple-400 opacity-40 blur-sm animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute left-1/2 bottom-1/3 h-1.5 w-1.5 rounded-full bg-cyan-400 opacity-50 blur-sm animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute right-1/4 bottom-1/4 h-1 w-1 rounded-full bg-green-400 opacity-30 blur-sm animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-lg bg-black/90 backdrop-blur-xl border border-white/20 shadow-2xl">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              {/* Main Icon with Animated Background */}
              <div className="relative">
                <div className={cn(
                  "absolute inset-0 rounded-full bg-gradient-to-r blur-xl opacity-30 animate-pulse",
                  config.bgColor
                )} />
                <div className="relative flex items-center justify-center w-20 h-20 mx-auto">
                  <Icon className={cn("h-10 w-10", config.color)} />
                  <Loader2 className="absolute h-6 w-6 text-white/60 animate-spin" />
                </div>
              </div>

              {/* Title and Description */}
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white drop-shadow-lg">
                  {customTitle || config.title}
                </h2>
                <p className="text-white/80 drop-shadow-md">
                  {customDescription || config.description}
                </p>
              </div>

              {/* Step Progress Indicators */}
              {showProgress && (
                <div className="space-y-4">
                  <div className="flex justify-center space-x-3">
                    {steps.map((step, index) => {
                      const stepConfig = LOADING_STEPS[step]
                      const StepIcon = stepConfig.icon
                      const isActive = index === currentStepIndex
                      const isCompleted = index < currentStepIndex
                      
                      return (
                        <div
                          key={step}
                          className={cn(
                            "flex flex-col items-center space-y-1 transition-all duration-500",
                            isActive && "scale-110"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                            isCompleted 
                              ? "bg-green-500/20 border-green-400/60 text-green-400" 
                              : isActive
                                ? `border-white/60 ${stepConfig.color} bg-white/10`
                                : "border-white/20 text-white/40"
                          )}>
                            {isCompleted ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : (
                              <StepIcon className="h-5 w-5" />
                            )}
                          </div>
                          <span className={cn(
                            "text-xs font-medium transition-colors duration-500",
                            isActive 
                              ? "text-white" 
                              : isCompleted 
                                ? "text-green-400" 
                                : "text-white/50"
                          )}>
                            {stepConfig.title.split(' ')[0]}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div 
                      className={cn(
                        "h-full bg-gradient-to-r transition-all duration-300 ease-out",
                        config.bgColor.replace('/20', '/80')
                      )}
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>

                  {/* Progress Text */}
                  <div className="text-sm text-white/60">
                    Step {currentStepIndex + 1} of {steps.length} • {Math.round(overallProgress)}% Complete
                  </div>
                </div>
              )}

              {/* Timeout Warning */}
              {hasTimedOut && (
                <div className="mt-4 p-3 bg-yellow-900/40 backdrop-blur-lg border border-yellow-400/60 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-200">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Taking longer than expected...</span>
                  </div>
                </div>
              )}

              {/* Animated Elements */}
              <div className="flex justify-center space-x-1 mt-6">
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </VideoBackground>
  )
}

// Hook for sequential loading with timeout handling
export function useSequentialLoading(
  steps: LoadingStep[], 
  stepDuration: number = 300,
  onTimeout?: () => void,
  timeoutMs: number = 15000
) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [hasTimedOut, setHasTimedOut] = useState(false)

  useEffect(() => {
    if (hasTimedOut || steps.length <= 1) return

    const timer = setInterval(() => {
      setCurrentStepIndex(prev => {
        if (prev < steps.length - 1) {
          return prev + 1
        }
        return prev
      })
    }, stepDuration)

    return () => clearInterval(timer)
  }, [steps.length, stepDuration, hasTimedOut])

  useEffect(() => {
    if (timeoutMs <= 0) return

    const timeoutTimer = setTimeout(() => {
      setHasTimedOut(true)
      onTimeout?.()
    }, timeoutMs)

    return () => clearTimeout(timeoutTimer)
  }, [timeoutMs, onTimeout])

  return {
    currentStep: steps[currentStepIndex],
    currentStepIndex,
    hasTimedOut,
    progress: ((currentStepIndex + 1) / steps.length) * 100
  }
}

// Compact loading for inline use
export function CompactLoading({ 
  step = 'processing',
  className = ""
}: {
  step?: LoadingStep
  className?: string
}) {
  const config = LOADING_STEPS[step]
  const Icon = config.icon

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative">
        <Icon className={cn("h-5 w-5", config.color)} />
        <Loader2 className="absolute top-0 left-0 h-5 w-5 text-white/40 animate-spin" />
      </div>
      <span className="text-white/90 drop-shadow-sm">{config.description}</span>
    </div>
  )
}