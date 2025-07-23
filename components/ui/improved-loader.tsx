"use client"

import React from 'react'
import { VideoBackground } from '@/components/video-background'
import { Loader2, Shield, Users, Gamepad2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface ImprovedLoaderProps {
  message?: string
  type?: 'auth' | 'profile' | 'dashboard' | 'agreement'
  progress?: number
}

export function ImprovedLoader({ message, type = 'auth', progress }: ImprovedLoaderProps) {
  const getIcon = () => {
    switch (type) {
      case 'auth': return <Shield className="h-8 w-8 text-blue-400" />
      case 'profile': return <Users className="h-8 w-8 text-green-400" />
      case 'dashboard': return <Gamepad2 className="h-8 w-8 text-purple-400" />
      case 'agreement': return <Shield className="h-8 w-8 text-orange-400" />
      default: return <Loader2 className="h-8 w-8 text-white animate-spin" />
    }
  }

  const getTitle = () => {
    switch (type) {
      case 'auth': return 'Authenticating'
      case 'profile': return 'Loading Profile'
      case 'dashboard': return 'Preparing Dashboard'
      case 'agreement': return 'Checking Agreements'
      default: return 'Loading'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Card className="bg-white/90 backdrop-blur-md border-gray-200 shadow-2xl max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              {getIcon()}
              <Loader2 className="absolute inset-0 h-8 w-8 text-gray-600 animate-spin" />
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900">
              {getTitle()}
            </h3>
            
            {message && (
              <p className="text-gray-700 text-sm max-w-xs">
                {message}
              </p>
            )}
            
            {typeof progress === 'number' && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
            )}
            
            <div className="mt-6">
              <div className="flex justify-center space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
            
            <div className="text-xs text-gray-600 mt-4">
              Raptor Esports Hub
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="pointer-events-none fixed left-1/4 top-1/3 z-10 h-6 w-6 rounded-full bg-white opacity-60 blur-2xl animate-pulse" />
      <div className="pointer-events-none fixed right-1/4 bottom-1/4 z-10 h-3 w-3 rounded-full bg-white opacity-40 blur-md animate-pulse" />
      <div className="pointer-events-none fixed left-1/3 bottom-1/3 z-10 h-4 w-4 rounded-full bg-blue-400 opacity-30 blur-lg animate-pulse" style={{ animationDelay: '1s' }} />
    </div>
  )
}
