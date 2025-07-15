"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { VideoBackground } from "@/components/video-background"

function AuthConfirmContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
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
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push('/auth/login?message=Email confirmed! Please login.')
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

    handleAuthConfirmation()
  }, [searchParams, router])

  return (
    <VideoBackground>
      {/* Subtle white glowing dots */}
      <div className="pointer-events-none fixed left-1/4 top-1/3 z-10 h-6 w-6 rounded-full bg-white opacity-60 blur-2xl animate-pulse" />
      <div className="pointer-events-none fixed right-1/4 bottom-1/4 z-10 h-3 w-3 rounded-full bg-white opacity-40 blur-md animate-pulse" />
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md bg-black/60 backdrop-blur-md border border-white/20 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-white font-semibold">
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
                <p className="text-slate-200">Please wait while we verify your email address.</p>
              </div>
            )}
            {status === 'success' && (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
                <div className="text-center">
                  <p className="text-sm text-slate-200 mb-4">
                    Redirecting to login page in 3 seconds...
                  </p>
                  <Button asChild className="w-full bg-white/90 text-black hover:bg-white">
                    <Link href="/auth/login">Continue to Login</Link>
                  </Button>
                </div>
              </div>
            )}
            {status === 'error' && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
                <div className="grid grid-cols-1 gap-2">
                  <Button asChild variant="outline" className="w-full bg-white/10 text-white border border-white/20">
                    <Link href="/auth/signup">Try Signup Again</Link>
                  </Button>
                  <Button asChild className="w-full bg-white/90 text-black hover:bg-white">
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
        {/* Subtle white glowing dots */}
        <div className="pointer-events-none fixed left-1/4 top-1/3 z-10 h-6 w-6 rounded-full bg-white opacity-60 blur-2xl animate-pulse" />
        <div className="pointer-events-none fixed right-1/4 bottom-1/4 z-10 h-3 w-3 rounded-full bg-white opacity-40 blur-md animate-pulse" />
        <div className="min-h-screen flex items-center justify-center px-4">
          <Card className="w-full max-w-md bg-black/60 backdrop-blur-md border border-white/20 shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-white font-semibold">
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