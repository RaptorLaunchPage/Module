"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './use-auth-provider'
import { AgreementStatus, getRequiredAgreementVersion } from '@/lib/agreement-versions'

interface AgreementContextType {
  loading: boolean
  requiresAgreement: boolean
  agreementStatus: AgreementStatus | null
  hasChecked: boolean
  showAgreementModal: boolean
  checkAgreementStatus: () => Promise<void>
  acceptAgreement: (status?: 'accepted' | 'declined') => Promise<boolean>
  dismissAgreementModal: () => void
  resetAgreementState: () => void
}

const AgreementContext = createContext<AgreementContextType | undefined>(undefined)

interface AgreementProviderProps {
  children: React.ReactNode
}

export function AgreementProvider({ children }: AgreementProviderProps) {
  const { user, profile, getToken, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [requiresAgreement, setRequiresAgreement] = useState(false)
  const [agreementStatus, setAgreementStatus] = useState<AgreementStatus | null>(null)
  const [hasChecked, setHasChecked] = useState(false)
  const [showAgreementModal, setShowAgreementModal] = useState(false)

  // Check if development override is enabled
  const isDevelopmentOverride = React.useMemo(() => {
    const isDev = process.env.NODE_ENV === 'development'
    const hasOverride = process.env.NEXT_PUBLIC_DISABLE_AGREEMENT_ENFORCEMENT === 'true'
    return isDev && hasOverride
  }, [])

  const checkAgreementStatus = useCallback(async () => {
    if (!user || !profile?.role || authLoading || hasChecked || loading) return

    // Skip if development override is enabled
    if (isDevelopmentOverride) {
      setHasChecked(true)
      return
    }

    setLoading(true)
    try {
      const token = await getToken()
      if (!token) throw new Error('No auth token')

      const response = await fetch('/api/agreements', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to check agreement status: ${response.statusText}`)
      }

      const data = await response.json()
      const status = data.agreement_status as AgreementStatus

      setAgreementStatus(status)
      setRequiresAgreement(status.requires_agreement)
      setShowAgreementModal(status.requires_agreement)
      setHasChecked(true)

    } catch (error) {
      console.error('Agreement status check failed:', error)
      // In case of error, don't block access
      setRequiresAgreement(false)
      setAgreementStatus(null)
      setHasChecked(true)
    } finally {
      setLoading(false)
    }
  }, [user?.id, profile?.role, authLoading, hasChecked, loading, getToken, isDevelopmentOverride])

  const acceptAgreement = useCallback(async (status: 'accepted' | 'declined' = 'accepted'): Promise<boolean> => {
    if (!user || !profile?.role) return false

    try {
      const token = await getToken()
      if (!token) throw new Error('No auth token')

      const requiredVersion = getRequiredAgreementVersion(profile.role)

      const response = await fetch('/api/agreements', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: profile.role,
          version: requiredVersion,
          status
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to accept agreement: ${response.statusText}`)
      }

      // Update state after successful acceptance
      if (status === 'accepted') {
        setRequiresAgreement(false)
        setShowAgreementModal(false)
        setAgreementStatus(prev => prev ? { ...prev, requires_agreement: false, status: 'current' } : null)
      }

      return true

    } catch (error) {
      console.error('Agreement acceptance failed:', error)
      return false
    }
  }, [user?.id, profile?.role, getToken])

  const dismissAgreementModal = useCallback(() => {
    setShowAgreementModal(false)
  }, [])

  const resetAgreementState = useCallback(() => {
    setLoading(false)
    setRequiresAgreement(false)
    setAgreementStatus(null)
    setHasChecked(false)
    setShowAgreementModal(false)
  }, [])

  // Check agreement status when user/profile changes and auth is complete
  useEffect(() => {
    if (user && profile?.role && !authLoading && !hasChecked) {
      checkAgreementStatus()
    }
  }, [user?.id, profile?.role, authLoading, hasChecked, checkAgreementStatus])

  // Reset state when user logs out
  useEffect(() => {
    if (!user) {
      resetAgreementState()
    }
  }, [user, resetAgreementState])

  const value: AgreementContextType = {
    loading,
    requiresAgreement,
    agreementStatus,
    hasChecked,
    showAgreementModal,
    checkAgreementStatus,
    acceptAgreement,
    dismissAgreementModal,
    resetAgreementState
  }

  return (
    <AgreementContext.Provider value={value}>
      {children}
    </AgreementContext.Provider>
  )
}

export function useAgreementContext() {
  const context = useContext(AgreementContext)
  if (context === undefined) {
    throw new Error('useAgreementContext must be used within an AgreementProvider')
  }
  return context
}
