import { useState, useCallback } from 'react'
import { projectId } from '../../../utils/supabase/info'
import { defaultIdentificationTypes } from '../constants'

export function useCompanySettings(accessToken: string | null) {
  const [identificationTypes, setIdentificationTypes] = useState<string[]>([])

  const fetchCompanySettings = useCallback(async () => {
    if (!accessToken) {
      console.error('Cannot fetch company settings: no access token')
      setIdentificationTypes(defaultIdentificationTypes)
      return // Don't throw here, just use defaults
    }
    
    try {
      console.log('Fetching company settings...')
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/company/info`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )
      
      console.log('Company settings response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Company settings response not ok:', errorText)
        setIdentificationTypes(defaultIdentificationTypes)
        return // Don't throw, just use defaults
      }
      
      const data = await response.json()
      console.log('Company settings received:', data)
      
      if (data.success && data.company.identificationTypes) {
        setIdentificationTypes(data.company.identificationTypes)
      } else {
        setIdentificationTypes(defaultIdentificationTypes)
      }
    } catch (error) {
      console.error('Error fetching company settings (catch block):', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown'
      })
      setIdentificationTypes(defaultIdentificationTypes)
      // Don't throw, company settings are not critical
    }
  }, [accessToken])

  return {
    identificationTypes,
    fetchCompanySettings
  }
}
