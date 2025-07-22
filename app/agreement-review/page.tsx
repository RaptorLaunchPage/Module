"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useAgreementEnforcement } from "@/hooks/use-agreement-enforcement"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { 
  FileText, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  ScrollText,
  Shield
} from "lucide-react"
import ReactMarkdown from 'react-markdown'

interface AgreementContent {
  role: string
  current_version: number
  title: string
  last_updated: string
  content: string
}

export default function AgreementReviewPage() {
  const { user, profile, loading: authLoading, getToken } = useAuth()
  const { agreementStatus, acceptAgreement } = useAgreementEnforcement()
  const { toast } = useToast()
  const router = useRouter()
  
  const [agreementContent, setAgreementContent] = useState<AgreementContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // Load agreement content
  useEffect(() => {
    const loadAgreementContent = async () => {
      if (!user || !profile?.role) return

      try {
        const token = await getToken()
        if (!token) throw new Error('No auth token')

        const response = await fetch(`/api/agreements/content?role=${profile.role}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to load agreement: ${response.statusText}`)
        }

        const data = await response.json()
        setAgreementContent(data.agreement)
      } catch (error) {
        console.error('Failed to load agreement content:', error)
        toast({
          title: "Error",
          description: "Failed to load agreement content. Please try again.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    if (user && profile?.role) {
      loadAgreementContent()
    }
  }, [user, profile?.role, toast])

  // Handle scroll to track if user has read to the bottom
  useEffect(() => {
    const handleScroll = () => {
      const element = contentRef.current
      if (!element) return

      const threshold = 50 // pixels from bottom
      const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + threshold
      
      if (isAtBottom && !hasScrolledToBottom) {
        setHasScrolledToBottom(true)
      }
    }

    const element = contentRef.current
    if (element) {
      element.addEventListener('scroll', handleScroll)
      // Check initial state
      handleScroll()
      
      return () => element.removeEventListener('scroll', handleScroll)
    }
  }, [hasScrolledToBottom])

  const handleAccept = async () => {
    setSubmitting(true)
    try {
      const success = await acceptAgreement('accepted')
      if (success) {
        toast({
          title: "Agreement Accepted",
          description: "Thank you for accepting the agreement. Redirecting to dashboard...",
        })
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else {
        throw new Error('Failed to accept agreement')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to accept agreement. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDecline = async () => {
    setSubmitting(true)
    try {
      const success = await acceptAgreement('declined')
      if (success) {
        toast({
          title: "Agreement Declined",
          description: "You have declined the agreement. Logging out...",
          variant: "destructive"
        })
        // Log out the user after declining
        setTimeout(() => {
          window.location.href = '/auth/login'
        }, 2000)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process your response. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Emergency bypass for admins
  const handleEmergencyBypass = () => {
    if (profile?.role === 'admin') {
      toast({
        title: "Admin Bypass",
        description: "Using emergency admin bypass. Redirecting to dashboard...",
      })
      router.push('/dashboard')
    }
  }

  // Redirect if no agreement needed
  useEffect(() => {
    if (!authLoading && agreementStatus && !agreementStatus.requires_agreement) {
      router.push('/dashboard')
    }
  }, [authLoading, agreementStatus, router])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading agreement...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user || !profile) {
    router.push('/auth/login')
    return null
  }

  if (!agreementContent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Agreement Not Found</h3>
              <p className="text-muted-foreground">
                Could not load the agreement for your role. Please contact support.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-2xl">Agreement Review Required</CardTitle>
                <CardDescription>
                  Please review and accept the {agreementContent.title} to continue.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Agreement Status Alert */}
        {agreementStatus && (
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {agreementStatus.status === 'missing' && 'You need to accept the agreement to access the system.'}
              {agreementStatus.status === 'outdated' && `Your agreement version (${agreementStatus.current_version}) is outdated. Please review the latest version (${agreementStatus.required_version}).`}
              {agreementStatus.status === 'declined' && 'You previously declined this agreement. Please review and accept to continue.'}
              {agreementStatus.status === 'pending' && 'Your agreement acceptance is pending. Please complete the process.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Agreement Content */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {agreementContent.title}
            </CardTitle>
            <CardDescription>
              {agreementContent.last_updated} • Version {agreementContent.current_version}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              ref={contentRef}
              className="max-h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50"
            >
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>
                  {agreementContent.content}
                </ReactMarkdown>
              </div>
            </div>
            
            {!hasScrolledToBottom && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800">
                  <ScrollText className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Please scroll to the bottom to read the complete agreement.
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={handleDecline}
                variant="outline"
                size="lg"
                disabled={submitting}
                className="min-w-[150px]"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Decline
              </Button>
              
              <Button
                onClick={handleAccept}
                size="lg"
                disabled={!hasScrolledToBottom || submitting}
                className="min-w-[150px]"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept Agreement
                  </>
                )}
              </Button>
            </div>
            
            {!hasScrolledToBottom && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                You must read the complete agreement before accepting.
              </p>
            )}

            {/* Emergency Admin Bypass */}
            {profile?.role === 'admin' && (
              <div className="mt-6 pt-4 border-t">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Admin Emergency Access
                  </p>
                  <Button
                    onClick={handleEmergencyBypass}
                    variant="ghost"
                    size="sm"
                    className="text-orange-600 hover:text-orange-700"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Emergency Bypass
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
