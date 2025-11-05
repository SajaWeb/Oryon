// Este archivo se mantiene por compatibilidad con versiones anteriores
// La implementación real está en /components/repairs/index.tsx

import { Repairs as RepairsModular } from './repairs'

interface RepairsProps {
  accessToken: string | null
  userName: string
  userRole?: string
}

export function Repairs({ accessToken, userName, userRole }: RepairsProps) {
  return <RepairsModular accessToken={accessToken} userName={userName} userRole={userRole} />
}
