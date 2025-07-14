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
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md backdrop-blur-sm bg-white/10 border-white/20">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-white">
            {status === 'loading' && <Loader2 className="h-5 w-5 animate-spin" />}
            {status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {status === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
            Email Confirmation
          </CardTitle>
          <CardDescription className="text-slate-300">
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
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
              <div className="text-center">
                <p className="text-sm text-slate-300 mb-4">
                  Redirecting to login page in 3 seconds...
                </p>
                <Button asChild className="w-full">
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
                <Button asChild variant="outline" className="w-full">
                  <Link href="/auth/signup">Try Signup Again</Link>
                </Button>
                <Button asChild className="w-full">
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
        <div className="min-h-screen flex items-center justify-center px-4">
          <Card className="w-full max-w-md backdrop-blur-sm bg-white/10 border-white/20">
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