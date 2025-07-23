"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth-provider"
import { useAgreementContext } from "@/hooks/use-agreement-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { forceLogout } from "@/lib/force-logout"
import { 
  FileText, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  ScrollText,
  Shield,
  X
} from "lucide-react"
import ReactMarkdown from 'react-markdown'

interface AgreementContent {
  role: string
  current_version: number
  title: string
  last_updated: string
  content: string
}

export function AgreementModal() {
  const { user, profile, getToken } = useAuth()
  const { 
    showAgreementModal, 
    agreementStatus, 
    acceptAgreement, 
    dismissAgreementModal 
  } = useAgreementContext()
  const { toast } = useToast()
  const router = useRouter()

  // Prevent body scroll and interaction when modal is open
  useEffect(() => {
    if (showAgreementModal) {
      document.body.style.overflow = 'hidden'
      document.body.style.pointerEvents = 'none'
      return () => {
        document.body.style.overflow = 'unset'
        document.body.style.pointerEvents = 'auto'
      }
    }
  }, [showAgreementModal])
  
  const [agreementContent, setAgreementContent] = useState<AgreementContent | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // Load agreement content when modal is shown
  useEffect(() => {
    const loadAgreementContent = async () => {
      if (!showAgreementModal || !user || !profile?.role) return

      setLoading(true)
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

    loadAgreementContent()
  }, [showAgreementModal, user, profile?.role, toast, getToken])

  // Handle scroll to track if user has read to the bottom
  useEffect(() => {
    const handleScroll = () => {
      const element = contentRef.current
      if (!element) return

      const threshold = 100
      const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + threshold
      
      if (isAtBottom && !hasScrolledToBottom) {
        setHasScrolledToBottom(true)
      }
    }

    const element = contentRef.current
    if (element) {
      element.addEventListener('scroll', handleScroll)
      // Check initial state - if content is short enough, auto-enable
      const isShortContent = element.scrollHeight <= element.clientHeight + 50
      if (isShortContent) {
        setHasScrolledToBottom(true)
      } else {
        handleScroll()
      }
      
      return () => element.removeEventListener('scroll', handleScroll)
    }
  }, [hasScrolledToBottom, agreementContent])

  const handleAccept = async () => {
    setSubmitting(true)
    try {
      const success = await acceptAgreement('accepted')
      if (success) {
        toast({
          title: "Agreement Accepted",
          description: "Thank you for accepting the agreement.",
        })
        // The context will handle closing the modal
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
    
    toast({
      title: "Agreement Declined",
      description: "Clearing session and logging out...",
      variant: "destructive"
    })
    
    try {
      // Try to record the decline (but don't wait for it)
      acceptAgreement('declined').catch(e => console.log('Decline recording failed:', e))
    } catch (e) {
      console.log('Decline API call failed:', e)
    }
    
    // Force logout immediately regardless of API success/failure
    setTimeout(() => {
      forceLogout()
    }, 1500)
    
    setSubmitting(false)
  }

  // Emergency bypass for admins
  const handleEmergencyBypass = () => {
    if (profile?.role === 'admin') {
      toast({
        title: "Admin Bypass",
        description: "Using emergency admin bypass.",
      })
      dismissAgreementModal()
    }
  }

  if (!showAgreementModal) return null

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-md border shadow-2xl">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading agreement...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!agreementContent) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-md border shadow-2xl">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Agreement Not Found</h3>
              <p className="text-muted-foreground mb-4">
                Could not load the agreement for your role. Please contact support.
              </p>
              <Button onClick={dismissAgreementModal} variant="outline">
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      {/* Backdrop to prevent interaction with main app */}
      <div 
        className="absolute inset-0" 
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      />
      
      <div className="relative w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden" style={{ pointerEvents: 'auto' }}>
        <Card className="bg-white/95 backdrop-blur-md border shadow-2xl">
          {/* Header */}
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Agreement Review Required</CardTitle>
                  <CardDescription>
                    Please review and accept the {agreementContent.title} to continue.
                  </CardDescription>
                </div>
              </div>
              {profile?.role === 'admin' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEmergencyBypass}
                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Agreement Status Alert */}
            {agreementStatus && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  {agreementStatus.status === 'missing' && 'You need to accept the agreement to access the system.'}
                  {agreementStatus.status === 'outdated' && `Your agreement version (${agreementStatus.current_version}) is outdated. Please review the latest version (${agreementStatus.required_version}).`}
                  {agreementStatus.status === 'declined' && 'You previously declined this agreement. Please review and accept to continue.'}
                  {agreementStatus.status === 'pending' && 'Your agreement acceptance is pending. Please complete the process.'}
                </AlertDescription>
              </Alert>
            )}

            {/* Agreement Content */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{agreementContent.title}</span>
                <span>•</span>
                <span>{agreementContent.last_updated}</span>
                <span>•</span>
                <span>Version {agreementContent.current_version}</span>
              </div>
              
              <div 
                ref={contentRef}
                className="max-h-80 overflow-y-auto border rounded-lg p-4 bg-muted/30"
              >
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown 
                    components={{
                      h1: ({ children }) => <h1 className="text-xl font-bold mb-4">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-lg font-semibold mb-3">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-md font-medium mb-2">{children}</h3>,
                      p: ({ children }) => <p className="mb-3">{children}</p>,
                      ul: ({ children }) => <ul className="mb-3 list-disc list-inside">{children}</ul>,
                      ol: ({ children }) => <ol className="mb-3 list-decimal list-inside">{children}</ol>,
                      li: ({ children }) => <li className="mb-1">{children}</li>,
                    }}
                  >
                    {agreementContent.content}
                  </ReactMarkdown>
                </div>
              </div>
              
              {!hasScrolledToBottom && (
                <Alert className="border-blue-200 bg-blue-50">
                  <ScrollText className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="flex items-center justify-between text-blue-800">
                    <span>Please scroll to the bottom to read the complete agreement.</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setHasScrolledToBottom(true)}
                      className="text-xs text-blue-600 hover:bg-blue-100"
                    >
                      I've read it
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 border-t">
              <Button
                onClick={handleDecline}
                variant="outline"
                size="lg"
                disabled={submitting}
                className="min-w-[150px] border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Decline
              </Button>
              
              <Button
                onClick={handleAccept}
                size="lg"
                disabled={!hasScrolledToBottom || submitting}
                className="min-w-[150px] bg-green-600 hover:bg-green-700"
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
                    {!hasScrolledToBottom && <span className="ml-1 text-xs">(Scroll Down)</span>}
                  </>
                )}
              </Button>
            </div>
            
            {!hasScrolledToBottom && (
              <p className="text-center text-sm text-muted-foreground">
                You must read the complete agreement before accepting.
              </p>
            )}

            {/* Emergency Admin Bypass */}
            {profile?.role === 'admin' && (
              <div className="pt-4 border-t text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Admin Emergency Access
                </p>
                <Button
                  onClick={handleEmergencyBypass}
                  variant="ghost"
                  size="sm"
                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Emergency Bypass
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
