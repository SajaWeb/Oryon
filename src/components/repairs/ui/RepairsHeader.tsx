import { Plus } from 'lucide-react'
import { Button } from '../../ui/button'

interface RepairsHeaderProps {
  onNewRepair: () => void
}

export function RepairsHeader({ onNewRepair }: RepairsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-3">
      <div>
        <h2 className="text-2xl sm:text-3xl mb-1 sm:mb-2">Reparaciones</h2>
        <p className="text-sm sm:text-base text-gray-600">Gestiona las órdenes de reparación</p>
      </div>
      <Button 
        onClick={onNewRepair}
        className="w-full sm:w-auto h-10 sm:h-auto"
      >
        <Plus size={20} className="mr-2" />
        Nueva Orden
      </Button>
    </div>
  )
}
