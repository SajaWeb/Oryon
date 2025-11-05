import { Info } from 'lucide-react'
import { Alert, AlertDescription } from '../../ui/alert'

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  branchId?: string
  assignedBranches?: string[]
  companyId: string
}

interface BranchAlertProps {
  userProfile: UserProfile
}

export function BranchAlert({ userProfile }: BranchAlertProps) {
  const hasMultipleBranches = userProfile.assignedBranches && userProfile.assignedBranches.length > 1

  return (
    <Alert className="mb-4 bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
      <Info className="h-4 w-4 text-purple-600 dark:text-purple-400" />
      <AlertDescription className="text-purple-800 dark:text-purple-300">
        <strong>Vista por sucursal:</strong> Solo puedes ver y gestionar las órdenes de reparación de tu{hasMultipleBranches ? 's' : ''} sucursal{hasMultipleBranches ? 'es' : ''} asignada{hasMultipleBranches ? 's' : ''}.
      </AlertDescription>
    </Alert>
  )
}
