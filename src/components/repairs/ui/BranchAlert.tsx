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
    <Alert className="mb-4 bg-[color-mix(in_srgb,var(--state-diagnosis)_12%,transparent)] border-[color-mix(in_srgb,var(--state-diagnosis)_30%,transparent)]">
      <Info className="h-4 w-4 text-[var(--state-diagnosis)]" />
      <AlertDescription className="text-[var(--state-diagnosis)]">
        <strong>Vista por sucursal:</strong> Solo puedes ver y gestionar las órdenes de reparación de tu{hasMultipleBranches ? 's' : ''} sucursal{hasMultipleBranches ? 'es' : ''} asignada{hasMultipleBranches ? 's' : ''}.
      </AlertDescription>
    </Alert>
  )
}
