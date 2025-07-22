"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { 
  UserPlus, 
  Clock, 
  Send,
  CheckCircle,
  AlertCircle
} from "lucide-react"

export default function TryoutApplicationPage() {
  const params = useParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  
  const [formData, setFormData] = useState({
    full_name: '',
    ign: '',
    discord_tag: '',
    contact_email: '',
    additional_notes: ''
  })

  useEffect(() => {
    // Mock loading
    setTimeout(() => setLoading(false), 1000)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.full_name || !formData.ign || !formData.contact_email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      })
      return
    }

    setSubmitting(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      setSubmitted(true)
      toast({
        title: "Application Submitted!",
        description: "Thank you for your interest. We'll review your application soon.",
      })
    } catch (error) {
      toast({
        title: "Submission Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-muted-foreground">Loading tryout details...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-12">
        <div className="container mx-auto px-4">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-semibold mb-2">Application Submitted!</h3>
              <p className="text-muted-foreground mb-4">
                Thank you for applying to Raptors Main - July 2025. We'll review your application and get back to you soon.
              </p>
              <p className="text-sm text-muted-foreground">
                Keep an eye on your email and Discord for updates.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <UserPlus className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-2">Raptors Main - July 2025</CardTitle>
                  <CardDescription className="text-base">
                    Looking for skilled players to join our main roster for the upcoming season.
                  </CardDescription>
                  
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Application deadline: January 31, 2025
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Tell us about yourself</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => ({...prev, full_name: e.target.value}))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ign">In-Game Name (IGN) *</Label>
                    <Input
                      id="ign"
                      value={formData.ign}
                      onChange={(e) => setFormData(prev => ({...prev, ign: e.target.value}))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="discord_tag">Discord Tag</Label>
                    <Input
                      id="discord_tag"
                      placeholder="username#1234"
                      value={formData.discord_tag}
                      onChange={(e) => setFormData(prev => ({...prev, discord_tag: e.target.value}))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Email Address *</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData(prev => ({...prev, contact_email: e.target.value}))}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
                <CardDescription>Help us understand your experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="additional_notes">Tell us about yourself</Label>
                  <Textarea
                    id="additional_notes"
                    placeholder="Tell us about your experience, achievements, or anything else you'd like us to know..."
                    rows={4}
                    value={formData.additional_notes}
                    onChange={(e) => setFormData(prev => ({...prev, additional_notes: e.target.value}))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex justify-center">
                  <Button 
                    type="submit" 
                    size="lg" 
                    disabled={submitting}
                    className="min-w-[200px]"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Application
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
    </div>
  )
}
