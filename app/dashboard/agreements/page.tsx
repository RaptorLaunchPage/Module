"use client"

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, Shield, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Agreement {
  id: string
  user_id: string
  role: string
  agreement_version: number
  status: 'accepted' | 'pending' | 'declined'
  accepted_at: string | null
  created_at: string
  updated_at: string
}

export default function AgreementsPage() {
  const { profile } = useAuth()
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAgreements = async () => {
      if (!profile?.id) return

      try {
        const { data, error } = await supabase
          .from('user_agreements')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error loading agreements:', error)
          return
        }

        setAgreements(data || [])
      } catch (error) {
        console.error('Failed to load agreements:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAgreements()
  }, [profile?.id])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />
      case 'declined': return <AlertTriangle className="h-4 w-4 text-red-500" />
      default: return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'declined': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator'
      case 'manager': return 'Team Manager'
      case 'coach': return 'Coach'
      case 'analyst': return 'Analyst'
      case 'player': return 'Player'
      case 'tryout': return 'Tryout Participant'
      default: return 'Member'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Agreements</h1>
            <p className="text-gray-600">View your role agreements and terms acceptance history</p>
          </div>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Agreements</h1>
          <p className="text-gray-600">View your role agreements and terms acceptance history</p>
        </div>
      </div>

      {/* Current Role Agreement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Current Role Agreement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div>
              <h3 className="font-semibold text-blue-900">
                {getRoleDisplayName(profile?.role || 'member')} Agreement
              </h3>
              <p className="text-blue-700 text-sm">
                Latest version for your current role in Raptor Esports Hub
              </p>
            </div>
            <Badge className="bg-blue-100 text-blue-800">
              Current Role
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Agreement History */}
      <Card>
        <CardHeader>
          <CardTitle>Agreement History</CardTitle>
        </CardHeader>
        <CardContent>
          {agreements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No agreement history found</p>
              <p className="text-sm">You haven't accepted any agreements yet</p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {agreements.map((agreement) => (
                  <div
                    key={agreement.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(agreement.status)}
                      <div>
                        <h4 className="font-medium">
                          {getRoleDisplayName(agreement.role)} Agreement v{agreement.agreement_version}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {agreement.accepted_at
                            ? `Accepted on ${new Date(agreement.accepted_at).toLocaleDateString()}`
                            : `Created on ${new Date(agreement.created_at).toLocaleDateString()}`
                          }
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(agreement.status)}>
                        {agreement.status.charAt(0).toUpperCase() + agreement.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Agreement Information */}
      <Card>
        <CardHeader>
          <CardTitle>About Agreements</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <div className="space-y-4 text-gray-600">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">What are Role Agreements?</h4>
              <p>
                Role agreements define the responsibilities, permissions, and terms specific to your 
                role within Raptor Esports Hub. Each role has different requirements and access levels.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">When do I need to accept agreements?</h4>
              <p>
                You'll be prompted to accept agreements when:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Your role changes within the organization</li>
                <li>Agreement terms are updated with new versions</li>
                <li>New policies or requirements are introduced</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Need Help?</h4>
              <p>
                If you have questions about any agreement terms or your role responsibilities, 
                please contact your team manager or an administrator.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
