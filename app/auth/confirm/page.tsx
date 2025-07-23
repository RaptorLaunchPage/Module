"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
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
    // If user is already authenticated (OAuth or email), redirect via route guard
    if (user && profile && !isLoading) {
      // Let the route guard handle redirect to prevent conflicts
      return
    }

    // Otherwise, handle email confirmation as before
    const handleAuthConfirmation = async () => {
      try {
        // Get the token hash from URL
        const tokenHash = searchParams.get('token_hash')
        const type = searchParams.get('type')
        
        if (!tokenHash || type !== 'signup') {
          throw new Error('Invalid confirmation link')
        }

        // Verify the token with Supabase
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'signup'
        })

        if (error) {
          throw error
        }

        if (data.user) {
          setStatus('success')
          setMessage('Email confirmed successfully! You can now login.')
          toast({
            title: 'Verification complete',
            description: 'You can login now.',
            variant: 'default',
          })
          // Redirect to home after 3 seconds
          setTimeout(() => {
            router.push('/')
          }, 3000)
        } else {
          throw new Error('No user data returned')
        }

      } catch (error: any) {
        console.error('Email confirmation error:', error)
        setStatus('error')
        setMessage(error.message || 'Failed to confirm email. The link may be expired or invalid.')
      }
    }

    // Only handle confirmation if not already authenticated
    if (!user || !profile) {
      handleAuthConfirmation()
    }
  }, [searchParams, router, toast, user, profile, isLoading])

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