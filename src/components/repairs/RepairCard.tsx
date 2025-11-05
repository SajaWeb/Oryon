/**
 * Repair Card Component - Modern Design
 * Displays a single repair order with all its details and actions in a compact, modern layout
 */

import { Eye, Edit2, DollarSign, Trash2, Building2, Wrench, Clock } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { Repair } from './types'
import { statusLabels, statusColors } from './constants'

interface RepairCardProps {
  repair: Repair
  onViewDetails: (repair: Repair) => void
  onChangeStatus: (repair: Repair) => void
  onCreateInvoice: (repair: Repair) => void
  onDelete: (id: number) => void
  canDelete: boolean
  branches?: Array<{ id: string; name: string }>
  userRole?: string
}

export function RepairCard({
  repair,
  onViewDetails,
  onChangeStatus,
  onCreateInvoice,
  onDelete,
  canDelete,
  branches,
  userRole
}: RepairCardProps) {
  const branchName = branches?.find(b => b.id === repair.branchId)?.name
  
  // Solo asesores y administradores pueden facturar
  const canInvoice = userRole === 'admin' || userRole === 'administrador' || userRole === 'asesor'
  
  // Determine status variant for styling
  const getStatusStyle = (status: string) => {
    const baseClasses = "text-[10px] px-1.5 py-0 capitalize border"
    switch(status) {
      case 'pending':
        return `${baseClasses} bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300 border-yellow-200/50 dark:border-yellow-800/50`
      case 'in_progress':
        return `${baseClasses} bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/50 dark:border-blue-800/50`
      case 'completed':
        return `${baseClasses} bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-green-200/50 dark:border-green-800/50`
      case 'delivered':
        return `${baseClasses} bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/50 dark:border-purple-800/50`
      case 'cancelled':
        return `${baseClasses} bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200/50 dark:border-red-800/50`
      default:
        return `${baseClasses} bg-gray-50 dark:bg-gray-950/40 text-gray-700 dark:text-gray-300 border-gray-200/50 dark:border-gray-800/50`
    }
  }

  return (
    <TooltipProvider>
      <Card className="group relative overflow-hidden border border-gray-200/60 dark:border-gray-700/60 shadow-sm hover:shadow-md transition-all duration-300 bg-white dark:bg-gray-900">
        {/* Subtle top accent */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/80 via-blue-600/80 to-blue-500/80" />
        
        <CardContent className="p-4">
          {/* Top Section: Title + Actions */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white leading-tight mb-1.5">
                Orden #{repair.id}
              </h3>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge className={getStatusStyle(repair.status)}>
                  {statusLabels[repair.status]}
                </Badge>
                {repair.invoiced && (
                  <Badge className="text-[10px] px-1.5 py-0 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-200/50 dark:border-green-800/50">
                    ✓ Facturado
                  </Badge>
                )}
                {branchName && (
                  <Badge className="text-[10px] px-1.5 py-0 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
                    <Building2 size={9} className="mr-0.5" />
                    {branchName}
                  </Badge>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-0.5">
              {repair.status === 'completed' && !repair.invoiced && canInvoice && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-green-50 dark:hover:bg-green-950/30 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                      onClick={() => onCreateInvoice(repair)}
                    >
                      <DollarSign size={13} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Facturar</TooltipContent>
                </Tooltip>
              )}
              {canDelete && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      onClick={() => onDelete(repair.id)}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Eliminar</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Customer Info */}
          <div className="mb-3 p-2.5 bg-gray-50/70 dark:bg-gray-800/50 rounded-lg border border-gray-200/40 dark:border-gray-700/40">
            <p className="text-[10px] text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-0.5 font-medium">Cliente</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{repair.customerName}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{repair.customerPhone}</p>
          </div>

          {/* Device & Problem Grid */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* Device */}
            <div className="bg-blue-50/70 dark:bg-blue-950/20 rounded-lg p-2.5 border border-blue-200/40 dark:border-blue-800/40">
              <p className="text-[10px] text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-0.5 font-medium flex items-center gap-1">
                <Wrench size={10} />
                Equipo
              </p>
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 leading-tight mb-0.5">
                {repair.deviceBrand} {repair.deviceModel}
              </p>
              <p className="text-[10px] text-gray-600 dark:text-gray-400 capitalize">
                {repair.deviceType}
              </p>
            </div>

            {/* Estimated Cost */}
            <div className="bg-green-50/70 dark:bg-green-950/20 rounded-lg p-2.5 border border-green-200/40 dark:border-green-800/40">
              <p className="text-[10px] text-green-700 dark:text-green-400 uppercase tracking-wide mb-0.5 font-medium">Costo Estimado</p>
              <p className="text-xl font-bold text-green-700 dark:text-green-400">
                ${repair.estimatedCost.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Problem Description */}
          <div className="mb-3 p-2.5 bg-orange-50/70 dark:bg-orange-950/20 rounded-lg border border-orange-200/40 dark:border-orange-800/40">
            <p className="text-[10px] text-orange-700 dark:text-orange-400 uppercase tracking-wide mb-1 font-medium">Problema Reportado</p>
            <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 leading-relaxed">
              {repair.problem}
            </p>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-1.5 pt-3 border-t border-gray-200/60 dark:border-gray-700/60">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-[11px] border-blue-200/60 dark:border-blue-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-700 dark:text-blue-300"
                  onClick={() => onViewDetails(repair)}
                >
                  <Eye size={13} className="mr-1" />
                  Ver Detalles
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ver información completa</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  className="h-8 px-3 text-[11px] bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white border-0 shadow-sm"
                  onClick={() => onChangeStatus(repair)}
                >
                  <Edit2 size={13} className="mr-1" />
                  Cambiar Estado
                </Button>
              </TooltipTrigger>
              <TooltipContent>Actualizar estado de la orden</TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
