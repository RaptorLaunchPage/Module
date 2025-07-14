"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { Eye, EyeOff, Mail, Lock, User, Shield, ArrowRight, CheckCircle, XCircle } from "lucide-react"

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string(),
  terms: z.boolean().refine((val) => val === true, "You must accept the terms and conditions"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type SignupFormData = z.infer<typeof signupSchema>

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const { signUp } = useAuth()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      terms: false,
    },
  })

  // Ensure video plays
  useEffect(() => {
    const video = videoRef.current
    if (video) {
      const playVideo = async () => {
        try {
          await video.play()
          console.log("Video started playing successfully")
          setVideoPlaying(true)
        } catch (error) {
          console.error("Failed to play video:", error)
          setVideoPlaying(false)
        }
      }
      
      if (video.readyState >= 2) {
        playVideo()
      } else {
        video.addEventListener('canplay', playVideo)
        return () => video.removeEventListener('canplay', playVideo)
      }
    }
  }, [])

  const handleManualPlay = async () => {
    const video = videoRef.current
    if (video) {
      try {
        await video.play()
        setVideoPlaying(true)
      } catch (error) {
        console.error("Manual play failed:", error)
      }
    }
  }

  const password = watch("password")

  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, label: "", color: "" }
    
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[a-z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++

    const labels = ["Very Weak", "Weak", "Fair", "Good", "Strong"]
    const colors = ["text-red-400", "text-orange-400", "text-yellow-400", "text-blue-400", "text-green-400"]
    
    return {
      score: Math.min(score, 5),
      label: labels[Math.min(score - 1, 4)] || "",
      color: colors[Math.min(score - 1, 4)] || "",
    }
  }

  const passwordStrength = getPasswordStrength(password)

  const onSubmit = async (data: SignupFormData) => {
    setLoading(true)
    setError("")

    const { error } = await signUp(data.email, data.password, data.name)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        {/* Space Particles Video Background */}
        <div className="absolute inset-0 z-0">
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-cover opacity-30"
            onError={(e) => console.error("Video failed to load:", e)}
            onLoadStart={() => console.log("Video loading started")}
            onCanPlay={() => console.log("Video can play")}
            onPlay={() => {
              console.log("Video is playing")
              setVideoPlaying(true)
            }}
            onPause={() => setVideoPlaying(false)}
          >
            <source src="/space-particles.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          
          {/* Manual play button if video doesn't autoplay */}
          {!videoPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <Button
                onClick={handleManualPlay}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                ▶ Play Background Video
              </Button>
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-purple-900/80 to-slate-900/80"></div>
        </div>

        <Card className="w-full max-w-md backdrop-blur-xl bg-black/20 border-white/10 shadow-2xl relative z-10 overflow-hidden">
          {/* Shining Particles Background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-4 left-4 w-2 h-2 bg-white rounded-full animate-pulse opacity-80 shadow-lg shadow-white/50"></div>
            <div className="absolute top-8 right-6 w-1.5 h-1.5 bg-white rounded-full animate-pulse opacity-90 shadow-lg shadow-white/50" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute bottom-6 left-8 w-1 h-1 bg-white rounded-full animate-pulse opacity-70 shadow-lg shadow-white/50" style={{ animationDelay: '1s' }}></div>
            <div className="absolute bottom-12 right-4 w-2.5 h-2.5 bg-white rounded-full animate-pulse opacity-60 shadow-lg shadow-white/50" style={{ animationDelay: '1.5s' }}></div>
            <div className="absolute top-1/2 left-2 w-1 h-1 bg-white rounded-full animate-pulse opacity-80 shadow-lg shadow-white/50" style={{ animationDelay: '2s' }}></div>
            <div className="absolute top-1/3 right-2 w-1.5 h-1.5 bg-white rounded-full animate-pulse opacity-70 shadow-lg shadow-white/50" style={{ animationDelay: '2.5s' }}></div>
            <div className="absolute top-1/4 left-1/2 w-1 h-1 bg-white rounded-full animate-pulse opacity-90 shadow-lg shadow-white/50" style={{ animationDelay: '3s' }}></div>
            <div className="absolute bottom-1/4 right-1/3 w-1.5 h-1.5 bg-white rounded-full animate-pulse opacity-60 shadow-lg shadow-white/50" style={{ animationDelay: '3.5s' }}></div>
          </div>
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-white bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              Check Your Email
            </CardTitle>
            <CardDescription className="text-slate-300 text-lg">
              We've sent you a confirmation link to complete your registration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push("/auth/login")}
              className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-medium py-3 transition-all duration-200 transform hover:scale-105"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* Space Particles Video Background */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover opacity-30"
          onError={(e) => console.error("Video failed to load:", e)}
          onLoadStart={() => console.log("Video loading started")}
          onCanPlay={() => console.log("Video can play")}
          onPlay={() => {
            console.log("Video is playing")
            setVideoPlaying(true)
          }}
          onPause={() => setVideoPlaying(false)}
        >
          <source src="/space-particles.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        {/* Manual play button if video doesn't autoplay */}
        {!videoPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Button
              onClick={handleManualPlay}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              ▶ Play Background Video
            </Button>
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-purple-900/80 to-slate-900/80"></div>
      </div>

      {/* Transparent Glowsy Black Form Container with Shining Particles */}
      <Card className="w-full max-w-md backdrop-blur-xl bg-black/20 border-white/10 shadow-2xl relative z-10 transform transition-all duration-300 hover:scale-105 overflow-hidden">
        {/* Shining Particles Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-4 left-4 w-2 h-2 bg-white rounded-full animate-pulse opacity-80 shadow-lg shadow-white/50"></div>
          <div className="absolute top-8 right-6 w-1.5 h-1.5 bg-white rounded-full animate-pulse opacity-90 shadow-lg shadow-white/50" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute bottom-6 left-8 w-1 h-1 bg-white rounded-full animate-pulse opacity-70 shadow-lg shadow-white/50" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-12 right-4 w-2.5 h-2.5 bg-white rounded-full animate-pulse opacity-60 shadow-lg shadow-white/50" style={{ animationDelay: '1.5s' }}></div>
          <div className="absolute top-1/2 left-2 w-1 h-1 bg-white rounded-full animate-pulse opacity-80 shadow-lg shadow-white/50" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/3 right-2 w-1.5 h-1.5 bg-white rounded-full animate-pulse opacity-70 shadow-lg shadow-white/50" style={{ animationDelay: '2.5s' }}></div>
          <div className="absolute top-1/4 left-1/2 w-1 h-1 bg-white rounded-full animate-pulse opacity-90 shadow-lg shadow-white/50" style={{ animationDelay: '3s' }}></div>
          <div className="absolute bottom-1/4 right-1/3 w-1.5 h-1.5 bg-white rounded-full animate-pulse opacity-60 shadow-lg shadow-white/50" style={{ animationDelay: '3.5s' }}></div>
        </div>
        
        <CardHeader className="text-center space-y-2 relative z-10">
          <div className="mx-auto w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-purple-500/25">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-white bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Create Account
          </CardTitle>
          <CardDescription className="text-slate-300 text-lg">
            Join the Raptor Esports team
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 relative z-10">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
                <AlertDescription className="text-red-200">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className="text-white font-medium">
                Full Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  id="name"
                  type="text"
                  {...register("name")}
                  placeholder="Enter your full name"
                  className="pl-10 bg-black/20 border-white/30 text-white placeholder:text-slate-300 focus:border-white/50 focus:ring-white/20 transition-all duration-200 backdrop-blur-sm"
                />
              </div>
              {errors.name && (
                <p className="text-red-400 text-sm">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="Enter your email"
                  className="pl-10 bg-black/20 border-white/30 text-white placeholder:text-slate-300 focus:border-white/50 focus:ring-white/20 transition-all duration-200 backdrop-blur-sm"
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-sm">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  placeholder="Create a strong password"
                  className="pl-10 pr-10 bg-black/20 border-white/30 text-white placeholder:text-slate-300 focus:border-white/50 focus:ring-white/20 transition-all duration-200 backdrop-blur-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {password && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          passwordStrength.score <= 2 ? "bg-red-500" :
                          passwordStrength.score <= 3 ? "bg-yellow-500" :
                          passwordStrength.score <= 4 ? "bg-blue-500" : "bg-green-500"
                        }`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      />
                    </div>
                    <span className={`text-sm font-medium ${passwordStrength.color}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center space-x-1">
                      {password.length >= 8 ? <CheckCircle className="w-3 h-3 text-green-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
                      <span className={password.length >= 8 ? "text-green-400" : "text-red-400"}>8+ characters</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {/[A-Z]/.test(password) ? <CheckCircle className="w-3 h-3 text-green-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
                      <span className={/[A-Z]/.test(password) ? "text-green-400" : "text-red-400"}>Uppercase</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {/[a-z]/.test(password) ? <CheckCircle className="w-3 h-3 text-green-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
                      <span className={/[a-z]/.test(password) ? "text-green-400" : "text-red-400"}>Lowercase</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {/[0-9]/.test(password) ? <CheckCircle className="w-3 h-3 text-green-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
                      <span className={/[0-9]/.test(password) ? "text-green-400" : "text-red-400"}>Number</span>
                    </div>
                    <div className="flex items-center space-x-1 col-span-2">
                      {/[^A-Za-z0-9]/.test(password) ? <CheckCircle className="w-3 h-3 text-green-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
                      <span className={/[^A-Za-z0-9]/.test(password) ? "text-green-400" : "text-red-400"}>Special character</span>
                    </div>
                  </div>
                </div>
              )}
              
              {errors.password && (
                <p className="text-red-400 text-sm">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white font-medium">
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  {...register("confirmPassword")}
                  placeholder="Confirm your password"
                  className="pl-10 pr-10 bg-black/20 border-white/30 text-white placeholder:text-slate-300 focus:border-white/50 focus:ring-white/20 transition-all duration-200 backdrop-blur-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-400 text-sm">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                {...register("terms")}
                className="mt-1 border-white/30 bg-black/20 data-[state=checked]:bg-white/30 data-[state=checked]:border-white/50"
              />
              <Label htmlFor="terms" className="text-slate-300 text-sm leading-relaxed">
                I agree to the{" "}
                <Link href="/terms" className="text-purple-400 hover:text-purple-300 underline">
                  Terms and Conditions
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-purple-400 hover:text-purple-300 underline">
                  Privacy Policy
                </Link>
              </Label>
            </div>
            {errors.terms && (
              <p className="text-red-400 text-sm">{errors.terms.message}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium py-3 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Creating account...</span>
                </div>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/20" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-2 text-slate-400">
                Already have an account?
              </span>
            </div>
          </div>

          {/* Coming Soon - Social Login */}
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-slate-400 text-sm mb-3">Coming Soon</p>
            </div>
            
            <Button
              variant="outline"
              className="w-full bg-black/20 border-white/30 text-white hover:bg-black/30 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
              disabled
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
            
            <Button
              variant="outline"
              className="w-full bg-black/20 border-white/30 text-white hover:bg-black/30 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
              disabled
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Continue with Discord
            </Button>
          </div>

          <div className="text-center space-y-4">
            <p className="text-slate-300">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
            
            <Link
              href="/"
              className="inline-flex items-center text-slate-400 hover:text-white text-sm transition-colors"
            >
              ← Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
