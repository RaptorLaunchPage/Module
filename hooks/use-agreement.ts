"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'

interface UserAgreement {
  id: string
  user_id: string
  role: string
  agreement_version: number
  status: 'accepted' | 'pending' | 'declined'
  accepted_at: string | null
  created_at: string
  updated_at: string
}

interface AgreementState {
  isChecking: boolean
  needsAgreement: boolean
  currentAgreement: UserAgreement | null
  latestVersion: number
}

const CURRENT_AGREEMENT_VERSION = 2 // Update this when you have new agreement terms

export function useAgreement() {
  const { user, profile, loading: authLoading } = useAuth()
  const [agreementState, setAgreementState] = useState<AgreementState>({
    isChecking: false,
    needsAgreement: false,
    currentAgreement: null,
    latestVersion: CURRENT_AGREEMENT_VERSION
  })

  // Check agreement status once when user is authenticated
  useEffect(() => {
    let mounted = true

    const checkAgreementStatus = async () => {
      if (!user || !profile || authLoading) return
      
      // Skip agreement check for certain roles or if already checking
      if (agreementState.isChecking || profile.role === 'pending_player') {
        return
      }

      setAgreementState(prev => ({ ...prev, isChecking: true }))

      try {
        // Check if user has accepted the latest agreement version
        const { data: agreement, error } = await supabase
          .from('user_agreements')
          .select('*')
          .eq('user_id', user.id)
          .eq('role', profile.role)
          .eq('agreement_version', CURRENT_AGREEMENT_VERSION)
          .eq('status', 'accepted')
          .maybeSingle()

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking agreement:', error)
          if (mounted) {
            setAgreementState(prev => ({ 
              ...prev, 
              isChecking: false,
              needsAgreement: false 
            }))
          }
          return
        }

        if (mounted) {
          setAgreementState(prev => ({
            ...prev,
            isChecking: false,
            needsAgreement: !agreement,
            currentAgreement: agreement
          }))
        }
      } catch (error) {
        console.error('Agreement check failed:', error)
        if (mounted) {
          setAgreementState(prev => ({ 
            ...prev, 
            isChecking: false,
            needsAgreement: false 
          }))
        }
      }
    }

    checkAgreementStatus()

    return () => {
      mounted = false
    }
  }, [user?.id, profile?.role, authLoading]) // Only run when these specific values change

  const acceptAgreement = async (): Promise<boolean> => {
    if (!user || !profile) return false

    try {
      const { error } = await supabase
        .from('user_agreements')
        .insert({
          user_id: user.id,
          role: profile.role,
          agreement_version: CURRENT_AGREEMENT_VERSION,
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          ip_address: null, // Could be populated with actual IP if needed
          user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : null
        })

      if (error) {
        console.error('Error accepting agreement:', error)
        return false
      }

      // Update local state
      setAgreementState(prev => ({
        ...prev,
        needsAgreement: false,
        currentAgreement: {
          id: 'temp', // Will be replaced on next check
          user_id: user.id,
          role: profile.role,
          agreement_version: CURRENT_AGREEMENT_VERSION,
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }))

      return true
    } catch (error) {
      console.error('Failed to accept agreement:', error)
      return false
    }
  }

  return {
    ...agreementState,
    acceptAgreement
  }
}
