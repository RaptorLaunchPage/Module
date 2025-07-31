"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase-client"
import { useAuthFixed as useAuth } from "@/hooks/use-auth-fixed"
import { FullPageLoader } from "@/components/ui/full-page-loader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { VideoBackground } from "@/components/video-background"

function AuthConfirmContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile, isLoading } = useAuth()
  const { toast } = useToast()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    // If user is already authenticated, redirect to dashboard
    if (isAuthenticated && user && profile) {
      console.log('✅ User already authenticated, redirecting to dashboard')
      router.push('/dashboard')
      return
    }

    // Handle email confirmation
    const handleAuthConfirmation = async () => {
      try {
        console.log('🔄 Processing email confirmation...')
        
        // Get the token hash from URL
        const tokenHash = searchParams.get('token_hash')
        const type = searchParams.get('type')
        const code = searchParams.get('code')
        
        console.log('🔍 Confirmation params:', { hasTokenHash: !!tokenHash, type, hasCode: !!code })

        // Handle code-based confirmation (newer flow)
        if (code) {
          console.log('🔄 Using code-based confirmation flow')
          // Let the auth callback handle this
          router.push(`/auth/callback?code=${code}`)
          return
        }

        // Handle token_hash-based confirmation (legacy flow)
        if (tokenHash && type === 'signup') {
          console.log('🔄 Using token_hash confirmation flow')
          
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'signup'
          })

          if (error) {
            throw error
          }

          if (data.user && data.session) {
            console.log('✅ Email confirmed, user session established')
            setStatus('success')
            setMessage('Email confirmed successfully! Redirecting to dashboard...')
            toast({
              title: 'Email Confirmed',
              description: 'Your account has been verified successfully!',
            })
            
            // Redirect to dashboard after short delay
            setTimeout(() => {
              router.push('/dashboard')
            }, 2000)
          } else {
            throw new Error('Failed to establish session after confirmation')
          }
        } else {
          throw new Error('Invalid confirmation link - missing required parameters')
        }

      } catch (error: any) {
        console.error('❌ Email confirmation error:', error)
        setStatus('error')
        setMessage(error.message || 'Failed to confirm email. The link may be expired or invalid.')
        toast({
          title: 'Confirmation Failed',
          description: error.message || 'The confirmation link is invalid or expired',
          variant: 'destructive'
        })
      }
    }

    // Only handle confirmation if not already authenticated and not loading
    if (!isAuthenticated && !isLoading) {
      handleAuthConfirmation()
    }
  }, [searchParams, router, toast, isAuthenticated, user, profile, isLoading])

  if (isLoading || (user && !profile)) {
    return <FullPageLoader message="Loading your account..." />
  }

  return (
    <VideoBackground>
      {/* Subtle white glowing dots */}
      <div className="pointer-events-none fixed left-1/4 top-1/3 z-10 h-6 w-6 rounded-full bg-white opacity-60 blur-2xl animate-pulse" />
      <div className="pointer-events-none fixed right-1/4 bottom-1/4 z-10 h-3 w-3 rounded-full bg-white opacity-40 blur-md animate-pulse" />
      
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black/70 backdrop-blur-lg border border-white/30 shadow-2xl relative z-20">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 esports-heading text-2xl text-white font-semibold">
              {status === 'loading' && <Loader2 className="h-5 w-5 animate-spin" />}
              {status === 'success' && <CheckCircle className="h-5 w-5 text-green-400" />}
              {status === 'error' && <XCircle className="h-5 w-5 text-red-400" />}
              Email Confirmation
            </CardTitle>
            <CardDescription className="text-slate-200">
              {status === 'loading' && 'Verifying your email...'}
              {status === 'success' && 'Your email has been confirmed!'}
              {status === 'error' && 'Confirmation failed'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === 'loading' && (
              <div className="text-center">
                <p className="text-slate-300">Please wait while we verify your email address.</p>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-4">
                <Alert className="bg-green-500/10 border-green-500/20 text-green-100">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
                <div className="text-center">
                  <p className="text-sm text-slate-300 mb-4">
                    Redirecting to home page in 3 seconds...
                  </p>
                  <Button asChild className="w-full bg-primary hover:bg-primary/90 text-white font-medium">
                    <Link href="/">Go to Home</Link>
                  </Button>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <Alert className="bg-red-500/10 border-red-500/20 text-red-100">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
                <div className="grid grid-cols-1 gap-2">
                  <Button asChild variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                    <Link href="/auth/signup">Try Signup Again</Link>
                  </Button>
                  <Button asChild className="w-full bg-primary hover:bg-primary/90 text-white font-medium">
                    <Link href="/auth/login">Go to Login</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </VideoBackground>
  )
}

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={
      <VideoBackground>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-black/70 backdrop-blur-lg border border-white/30 shadow-2xl relative z-20">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-white">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading...
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </VideoBackground>
    }>
      <AuthConfirmContent />
    </Suspense>
  )
}