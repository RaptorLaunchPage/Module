"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { VideoBackground } from '@/components/video-background'
import { Eye, EyeOff, Lock, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

function ResetPasswordContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log('🔄 Checking reset session validity...')
        
        // First check if we already have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError)
          setSessionError('Invalid reset session')
          setIsValidSession(false)
          return
        }

        if (session) {
          console.log('✅ Valid reset session found')
          setIsValidSession(true)
          return
        }

        // Check for tokens in URL (from email link)
        const accessToken = searchParams.get('access_token')
        const refreshToken = searchParams.get('refresh_token')
        const tokenHash = searchParams.get('token_hash')
        const type = searchParams.get('type')
        
        console.log('🔍 URL params:', { 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken,
          hasTokenHash: !!tokenHash,
          type 
        })

        if (tokenHash && type === 'recovery') {
          // Handle new token_hash format
          console.log('🔄 Verifying recovery token...')
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery'
          })

          if (error) {
            console.error('❌ Token verification error:', error)
            setSessionError(error.message)
            setIsValidSession(false)
            return
          }

          if (data.session) {
            console.log('✅ Recovery token verified, session established')
            setIsValidSession(true)
            return
          }
        } else if (accessToken && refreshToken) {
          // Handle legacy token format
          console.log('🔄 Setting session from tokens...')
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          
          if (error) {
            console.error('❌ Set session error:', error)
            setSessionError(error.message)
            setIsValidSession(false)
            return
          }

          if (data.session) {
            console.log('✅ Session established from tokens')
            setIsValidSession(true)
            return
          }
        }

        // No valid tokens found
        console.log('❌ No valid reset tokens found')
        setSessionError('Invalid or expired reset link')
        setIsValidSession(false)
        
      } catch (error: any) {
        console.error('❌ Session check error:', error)
        setSessionError('Failed to validate reset session')
        setIsValidSession(false)
      }
    }
    
    checkSession()
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive'
      })
      return
    }

    if (password.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)

    try {
      console.log('🔄 Updating password...')
      const { data, error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        throw error
      }

      console.log('✅ Password updated successfully')
      toast({
        title: 'Success',
        description: 'Password updated successfully! Redirecting to login...'
      })

      // Sign out to clear the reset session
      await supabase.auth.signOut()

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/auth/login?message=password_updated')
      }, 2000)

    } catch (error: any) {
      console.error('❌ Password update error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to update password',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Show loading state while checking session
  if (isValidSession === null) {
    return (
      <VideoBackground>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-black/70 backdrop-blur-lg border border-white/30 shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-white">
                <Loader2 className="h-5 w-5 animate-spin" />
                Verifying Reset Link
              </CardTitle>
              <CardDescription className="text-slate-200">
                Please wait while we verify your password reset link...
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </VideoBackground>
    )
  }

  // Show error state for invalid session
  if (!isValidSession) {
    return (
      <VideoBackground>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-black/70 backdrop-blur-lg border border-white/30 shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-white">
                <XCircle className="h-5 w-5 text-red-400" />
                Invalid Reset Link
              </CardTitle>
              <CardDescription className="text-slate-200">
                This password reset link is invalid or has expired
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-red-500/10 border-red-500/20 text-red-100">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  {sessionError || 'The reset link is no longer valid. Please request a new one.'}
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-1 gap-2">
                <Button asChild variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                  <Link href="/auth/forgot">Request New Reset Link</Link>
                </Button>
                <Button asChild className="w-full bg-primary hover:bg-primary/90 text-white font-medium">
                  <Link href="/auth/login">Back to Login</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </VideoBackground>
    )
  }

  // Show password reset form
  return (
    <VideoBackground>
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black/70 backdrop-blur-lg border border-white/30 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-white text-2xl font-semibold">
              <Lock className="h-5 w-5" />
              Reset Your Password
            </CardTitle>
            <CardDescription className="text-slate-200">
              Enter your new password below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-slate-400 hover:text-white"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-slate-400 hover:text-white"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {password && confirmPassword && password !== confirmPassword && (
                <Alert className="bg-red-500/10 border-red-500/20 text-red-100">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>Passwords do not match</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium"
                disabled={loading || !password || !confirmPassword || password !== confirmPassword}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Update Password
                  </>
                )}
              </Button>

              <div className="text-center">
                <Button asChild variant="ghost" className="text-slate-300 hover:text-white">
                  <Link href="/auth/login">Back to Login</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </VideoBackground>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <VideoBackground>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-black/70 backdrop-blur-lg border border-white/30 shadow-2xl">
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
      <ResetPasswordContent />
    </Suspense>
  )
}