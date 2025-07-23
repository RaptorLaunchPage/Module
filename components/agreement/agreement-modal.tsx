"use client"

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, FileText, Users, Zap } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

interface AgreementModalProps {
  isOpen: boolean
  onAccept: () => Promise<boolean>
  onDecline?: () => void
}

export function AgreementModal({ isOpen, onAccept, onDecline }: AgreementModalProps) {
  const { profile } = useAuth()
  const [hasRead, setHasRead] = useState(false)
  const [isAccepting, setIsAccepting] = useState(false)

  const handleAccept = async () => {
    if (!hasRead) return
    
    setIsAccepting(true)
    try {
      const success = await onAccept()
      if (!success) {
        console.error('Failed to accept agreement')
      }
    } catch (error) {
      console.error('Error accepting agreement:', error)
    } finally {
      setIsAccepting(false)
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

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-2xl">
                {getRoleDisplayName(profile?.role || 'member')} Agreement
              </DialogTitle>
              <DialogDescription>
                Please review and accept the terms for your role in Raptor Esports Hub
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="px-6 max-h-[60vh]">
          <div className="space-y-6 pb-4">
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Shield className="h-5 w-5" />
                  Welcome to Raptor Esports Hub
                </CardTitle>
              </CardHeader>
              <CardContent className="text-blue-700">
                <p>
                  As a <strong>{getRoleDisplayName(profile?.role || 'member')}</strong>, you have specific 
                  responsibilities and access rights within our BGMI esports organization.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Your Role & Responsibilities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile?.role === 'admin' && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">As an Administrator, you agree to:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Maintain the integrity and security of the platform</li>
                      <li>Handle user data responsibly and in compliance with privacy laws</li>
                      <li>Make fair decisions regarding team management and disputes</li>
                      <li>Keep sensitive information confidential</li>
                    </ul>
                  </div>
                )}

                {profile?.role === 'manager' && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">As a Team Manager, you agree to:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Manage your team's activities and performance professionally</li>
                      <li>Ensure fair treatment of all team members</li>
                      <li>Maintain accurate records of team activities and finances</li>
                      <li>Communicate effectively with players, coaches, and administration</li>
                    </ul>
                  </div>
                )}

                {profile?.role === 'player' && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">As a Player, you agree to:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Participate actively in team practices and scheduled matches</li>
                      <li>Maintain good sportsmanship and represent the team positively</li>
                      <li>Follow team rules, schedules, and coaching instructions</li>
                      <li>Keep team strategies and sensitive information confidential</li>
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  General Terms
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Data Privacy</h4>
                  <p>Your profile and performance data are used for team coordination and analysis.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Code of Conduct</h4>
                  <p>Maintain respectful communication and uphold the positive reputation of Raptor Esports Hub.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 bg-gray-50">
          <div className="w-full space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="agreement-read" 
                checked={hasRead}
                onCheckedChange={(checked) => setHasRead(checked === true)}
              />
              <label htmlFor="agreement-read" className="text-sm font-medium">
                I have read and understand the terms and conditions above
              </label>
            </div>
            
            <div className="flex gap-3 justify-end">
              {onDecline && (
                <Button variant="outline" onClick={onDecline}>
                  Decline
                </Button>
              )}
              <Button 
                onClick={handleAccept} 
                disabled={!hasRead || isAccepting}
                className="min-w-24"
              >
                {isAccepting ? 'Accepting...' : 'Accept & Continue'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
