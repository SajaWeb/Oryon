import { useState, useCallback } from 'react'
import { projectId } from '../../../utils/supabase/info'

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  branchId?: string
  assignedBranches?: string[]
  companyId: string
}

export function useBranches(accessToken: string | null) {
  const [branches, setBranches] = useState<any[]>([])

  const fetchBranches = useCallback(async () => {
    if (!accessToken) {
      console.error('Cannot fetch branches: no access token')
      return
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/branches`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )
      const data = await response.json()
      if (data.success) {
        setBranches(data.branches || [])
      }
    } catch (error) {
      console.error('Error fetching branches:', error)
    }
  }, [accessToken])

  const getAvailableBranches = useCallback((userRole?: string, userProfile?: UserProfile) => {
    // For admins, return all branches
    if (userRole === 'admin') {
      return branches
    }
    
    // For advisors and technicians, filter to show only their assigned branches
    if (userProfile) {
      const assignedBranches = userProfile.assignedBranches || []
      const legacyBranchId = userProfile.branchId
      
      if (assignedBranches.length > 0) {
        return branches.filter((b: any) => assignedBranches.includes(b.id))
      } else if (legacyBranchId) {
        return branches.filter((b: any) => b.id === legacyBranchId)
      }
    }
    
    return branches
  }, [branches])

  return {
    branches,
    fetchBranches,
    getAvailableBranches
  }
}
