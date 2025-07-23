import { useState, useEffect } from 'react'
import { useAuth } from './use-auth-provider'
import { AgreementStatus, CURRENT_AGREEMENT_VERSIONS, getRequiredAgreementVersion } from '@/lib/agreement-versions'

interface AgreementEnforcementResult {
  loading: boolean
  requiresAgreement: boolean
  agreementStatus: AgreementStatus | null
  checkAgreementStatus: () => Promise<void>
  acceptAgreement: (status?: 'accepted' | 'declined') => Promise<boolean>
}

export function useAgreementEnforcement(): AgreementEnforcementResult {
  const { user, profile, getToken } = useAuth()
  const [loading, setLoading] = useState(false)
  const [requiresAgreement, setRequiresAgreement] = useState(false)
  const [agreementStatus, setAgreementStatus] = useState<AgreementStatus | null>(null)

  const checkAgreementStatus = async () => {
    if (!user || !profile?.role) return

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

    } catch (error) {
      console.error('Agreement status check failed:', error)
      // In case of error, don't block access
      setRequiresAgreement(false)
      setAgreementStatus(null)
    } finally {
      setLoading(false)
    }
  }

  const acceptAgreement = async (status: 'accepted' | 'declined' = 'accepted'): Promise<boolean> => {
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

      // Refresh status after acceptance
      await checkAgreementStatus()
      return true

    } catch (error) {
      console.error('Agreement acceptance failed:', error)
      return false
    }
  }

  // Check agreement status when user/profile changes
  useEffect(() => {
    if (user && profile?.role) {
      checkAgreementStatus()
    }
  }, [user?.id, profile?.role])

  return {
    loading,
    requiresAgreement,
    agreementStatus,
    checkAgreementStatus,
    acceptAgreement
  }
}

// Helper hook for development override
export function useAgreementDevOverride() {
  const [devOverride, setDevOverride] = useState(false)

  useEffect(() => {
    // Check if we're in development and have the override env var
    const isDev = process.env.NODE_ENV === 'development'
    const hasOverride = process.env.NEXT_PUBLIC_DISABLE_AGREEMENT_ENFORCEMENT === 'true'
    setDevOverride(isDev && hasOverride)
  }, [])

  return devOverride
}
