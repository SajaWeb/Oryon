import { RepairCard } from '../RepairCard'
import { Repair } from '../types'

interface RepairsListProps {
  repairs: Repair[]
  onViewDetails: (repair: Repair) => void
  onChangeStatus: (repair: Repair) => void
  onCreateInvoice: (repair: Repair) => void
  onDelete: (id: number) => void
  canDelete: boolean
  branches: any[]
  userRole?: string
  searchTerm: string
  filterStatus: string
}

export function RepairsList({
  repairs,
  onViewDetails,
  onChangeStatus,
  onCreateInvoice,
  onDelete,
  canDelete,
  branches,
  userRole,
  searchTerm,
  filterStatus
}: RepairsListProps) {
  if (repairs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {searchTerm || filterStatus !== 'all' 
          ? 'No se encontraron órdenes que coincidan con los filtros' 
          : 'No hay órdenes de reparación registradas'}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {repairs.map((repair) => (
        <RepairCard
          key={repair.id}
          repair={repair}
          onViewDetails={onViewDetails}
          onChangeStatus={onChangeStatus}
          onCreateInvoice={onCreateInvoice}
          onDelete={onDelete}
          canDelete={canDelete}
          branches={branches}
          userRole={userRole}
        />
      ))}
    </div>
  )
}
