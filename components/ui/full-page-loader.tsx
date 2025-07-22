"use client"

import { VideoBackground } from "@/components/video-background"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Shield, CheckCircle, Wifi, Database, User, Settings, Globe } from "lucide-react"
import { useEffect, useState } from "react"

export type LoadingState = 
  | 'connecting'
  | 'authenticating'
  | 'checking-agreement'
  | 'loading-profile'
  | 'initializing'
  | 'redirecting'
  | 'processing'
  | 'saving'
  | 'loading'

interface LoadingStateConfig {
  icon: React.ComponentType<any>
  title: string
  description: string
  color: string
}

const LOADING_STATES: Record<LoadingState, LoadingStateConfig> = {
  connecting: {
    icon: Wifi,
    title: "Connecting",
    description: "Establishing secure connection",
    color: "text-blue-400"
  },
  authenticating: {
    icon: Shield,
    title: "Authenticating",
    description: "Verifying your credentials",
    color: "text-green-400"
  },
  'checking-agreement': {
    icon: CheckCircle,
    title: "Checking Agreement",
    description: "Reviewing user agreement status",
    color: "text-amber-400"
  },
  'loading-profile': {
    icon: User,
    title: "Loading Profile",
    description: "Retrieving your profile data",
    color: "text-purple-400"
  },
  initializing: {
    icon: Settings,
    title: "Initializing",
    description: "Setting up your dashboard",
    color: "text-cyan-400"
  },
  redirecting: {
    icon: Globe,
    title: "Redirecting",
    description: "Taking you to your destination",
    color: "text-indigo-400"
  },
  processing: {
    icon: Database,
    title: "Processing",
    description: "Processing your request",
    color: "text-orange-400"
  },
  saving: {
    icon: CheckCircle,
    title: "Saving",
    description: "Saving your changes",
    color: "text-green-400"
  },
  loading: {
    icon: Loader2,
    title: "Loading",
    description: "Please wait",
    color: "text-white"
  }
}

interface FullPageLoaderProps {
  message?: string
  state?: LoadingState
  customTitle?: string
  customDescription?: string
  size?: 'sm' | 'md' | 'lg'
  showBackground?: boolean
}

export function FullPageLoader({ 
  message,
  state = 'loading',
  customTitle,
  customDescription,
  size = 'md',
  showBackground = true
}: FullPageLoaderProps) {
  const [dots, setDots] = useState('')
  const config = LOADING_STATES[state]
  const Icon = config.icon

  // Animated dots effect
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return ''
        return prev + '.'
      })
    }, 500)
    return () => clearInterval(interval)
  }, [])

  const sizeClasses = {
    sm: {
      card: "w-full max-w-sm",
      icon: "h-8 w-8",
      spinner: "h-6 w-6",
      title: "text-lg",
      dots: "w-1.5 h-1.5"
    },
    md: {
      card: "w-full max-w-md",
      icon: "h-12 w-12",
      spinner: "h-8 w-8",
      title: "text-xl",
      dots: "w-2 h-2"
    },
    lg: {
      card: "w-full max-w-lg",
      icon: "h-16 w-16",
      spinner: "h-10 w-10",
      title: "text-2xl",
      dots: "w-2.5 h-2.5"
    }
  }

  const sizes = sizeClasses[size]

  const content = (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className={`${sizes.card} bg-white/10 backdrop-blur-md border-white/20 shadow-xl`}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            {/* Icon and Spinner */}
            <div className="relative mb-6">
              <Icon className={`${sizes.icon} ${config.color} mx-auto mb-4 opacity-80`} />
              <Loader2 className={`${sizes.spinner} text-white animate-spin absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`} />
            </div>

            {/* Title */}
            <h3 className={`${sizes.title} font-semibold text-white mb-2`}>
              {customTitle || config.title}
            </h3>

            {/* Description */}
            <p className="text-white/80 mb-4">
              {message || customDescription || config.description}
              <span className="inline-block w-6 text-left">{dots}</span>
            </p>
            
            {/* Animated dots */}
            <div className="mt-6">
              <div className="flex justify-center space-x-1">
                <div className={`${sizes.dots} bg-white/60 rounded-full animate-bounce`}></div>
                <div className={`${sizes.dots} bg-white/60 rounded-full animate-bounce`} style={{ animationDelay: '0.1s' }}></div>
                <div className={`${sizes.dots} bg-white/60 rounded-full animate-bounce`} style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>

            {/* Progress bar effect */}
            <div className="mt-6 w-full bg-white/20 rounded-full h-1">
              <div className="bg-gradient-to-r from-blue-400 to-purple-400 h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  if (showBackground) {
    return (
      <VideoBackground>
        {/* Ambient glowing dots */}
        <div className="pointer-events-none fixed left-1/4 top-1/3 z-10 h-6 w-6 rounded-full bg-white opacity-60 blur-2xl animate-pulse" />
        <div className="pointer-events-none fixed right-1/4 bottom-1/4 z-10 h-3 w-3 rounded-full bg-white opacity-40 blur-md animate-pulse" />
        <div className="pointer-events-none fixed left-1/3 bottom-1/3 z-10 h-4 w-4 rounded-full bg-blue-400 opacity-30 blur-lg animate-pulse" style={{ animationDelay: '1s' }} />
        {content}
      </VideoBackground>
    )
  }

  return content
}

// Hook for sequential loading states
export function useSequentialLoading(states: LoadingState[], interval: number = 2000) {
  const [currentStateIndex, setCurrentStateIndex] = useState(0)

  useEffect(() => {
    if (states.length <= 1) return

    const timer = setInterval(() => {
      setCurrentStateIndex(prev => {
        if (prev < states.length - 1) {
          return prev + 1
        }
        return prev
      })
    }, interval)

    return () => clearInterval(timer)
  }, [states.length, interval])

  return states[currentStateIndex]
}

// Inline loading component for smaller spaces
export function InlineLoading({ 
  state = 'loading',
  className = ""
}: {
  state?: LoadingState
  className?: string
}) {
  const config = LOADING_STATES[state]
  const Icon = config.icon

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <Icon className={`h-5 w-5 ${config.color} opacity-80`} />
        <Loader2 className="h-3 w-3 text-white animate-spin absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
      </div>
      <span className="text-white/80">{config.description}</span>
    </div>
  )
}