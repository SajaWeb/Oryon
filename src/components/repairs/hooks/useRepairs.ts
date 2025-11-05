import { useState, useCallback } from 'react'
import { projectId } from '../../../utils/supabase/info'
import { Repair } from '../types'

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  branchId?: string
  assignedBranches?: string[]
  companyId: string
}

export function useRepairs(accessToken: string | null, userRole?: string, userProfile?: UserProfile) {
  const [repairs, setRepairs] = useState<Repair[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRepairs = useCallback(async () => {
    if (!accessToken) {
      console.error('Cannot fetch repairs: no access token')
      throw new Error('No access token available')
    }
    
    try {
      console.log('Fetching repairs with projectId:', projectId)
      console.log('Access token available:', !!accessToken)
      
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/repairs`
      console.log('Fetching from URL:', url)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }).catch(fetchError => {
        console.error('Network error during fetch:', fetchError)
        throw new Error(`Error de conexión: No se pudo conectar al servidor. Verifica que el backend de Supabase esté activo.`)
      })
      
      console.log('Repairs response status:', response.status)
      console.log('Repairs response ok:', response.ok)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Repairs response not ok:', errorText)
        throw new Error(`El servidor respondió con error ${response.status}: ${errorText || 'Error desconocido'}`)
      }
      
      const data = await response.json()
      console.log('Repairs data received:', data)
      
      if (data.success) {
        let parsed = data.repairs.map((r: string) => JSON.parse(r))
        
        // Filter repairs by branch for non-admin users
        if (userRole !== 'admin' && userProfile) {
          const assignedBranches = userProfile.assignedBranches || []
          const legacyBranchId = userProfile.branchId
          
          parsed = parsed.filter((repair: Repair) => {
            // Support both new assignedBranches and legacy branchId
            if (assignedBranches.length > 0) {
              return assignedBranches.includes(repair.branchId || '')
            }
            // Fallback to legacy branchId
            return repair.branchId === legacyBranchId
          })
        }
        
        setRepairs(parsed.sort((a: Repair, b: Repair) => b.id - a.id))
        setError(null)
      } else {
        console.error('Error fetching repairs from server:', data.error)
        throw new Error(data.error || 'Error al obtener las reparaciones')
      }
    } catch (error) {
      console.error('Error fetching repairs (catch block):', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      })
      setError(error instanceof Error ? error.message : String(error))
      throw error
    } finally {
      setLoading(false)
    }
  }, [accessToken, userRole, userProfile])

  const deleteRepair = useCallback(async (id: number) => {
    if (!accessToken) {
      throw new Error('No access token available')
    }

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/repairs/${id}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    )

    const data = await response.json()
    if (data.success) {
      await fetchRepairs()
      return true
    } else {
      throw new Error(data.error || 'Error al eliminar la orden')
    }
  }, [accessToken, fetchRepairs])

  return {
    repairs,
    loading,
    error,
    fetchRepairs,
    deleteRepair,
    setLoading,
    setError
  }
}
