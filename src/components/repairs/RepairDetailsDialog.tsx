import { History, Lock, DollarSign, Printer, Tag } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { PatternLock } from '../PatternLock'
import { Repair } from './types'
import { statusLabels, statusColors } from './constants'

interface RepairDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  repair: Repair | null
  onChangeStatus: () => void
  onViewHistory: () => void
  onCreateInvoice: () => void
  onImageClick: (image: string) => void
  onPrintServiceOrder: () => void
  onPrintDeviceLabel: () => void
  branches?: Array<{ id: string; name: string }>
  userRole?: string
}

export function RepairDetailsDialog({
  open,
  onOpenChange,
  repair,
  onChangeStatus,
  onViewHistory,
  onCreateInvoice,
  onImageClick,
  onPrintServiceOrder,
  onPrintDeviceLabel,
  branches,
  userRole
}: RepairDetailsDialogProps) {
  if (!repair) return null
  
  const branchName = branches?.find(b => b.id === repair.branchId)?.name
  
  // Solo asesores y administradores pueden facturar
  const canInvoice = userRole === 'admin' || userRole === 'administrador' || userRole === 'asesor'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Orden #{repair.id} - Detalle</DialogTitle>
          <DialogDescription className="text-sm">Información completa de la orden de reparación</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <Button onClick={onChangeStatus} className="sm:col-span-2 h-10 text-sm sm:text-base">
              Cambiar Estado
            </Button>
            <Button variant="outline" onClick={onViewHistory} className="h-10 text-sm sm:text-base">
              <History size={16} className="mr-2" />
              <span className="hidden sm:inline">Ver Historial</span>
              <span className="sm:hidden">Historial</span>
            </Button>
            <Button variant="outline" onClick={onPrintServiceOrder} className="h-10 text-sm sm:text-base">
              <Printer size={16} className="mr-2" />
              <span className="hidden sm:inline">Imprimir Orden</span>
              <span className="sm:hidden">Imprimir</span>
            </Button>
            <Button variant="outline" onClick={onPrintDeviceLabel} className="sm:col-span-2 bg-amber-50 border-amber-300 hover:bg-amber-100 text-amber-900 h-auto py-2 text-xs sm:text-sm">
              <Tag size={16} className="mr-2 flex-shrink-0" />
              <span className="text-left">Imprimir Etiqueta Adhesiva para Equipo</span>
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div>
              <Label>Estado Actual</Label>
              <Badge className={`${statusColors[repair.status]} mt-2 text-lg px-4 py-2`}>
                {statusLabels[repair.status]}
              </Badge>
            </div>
            {branchName && (
              <div>
                <Label>Sucursal</Label>
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 mt-2 text-base px-4 py-2">
                  📍 {branchName}
                </Badge>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label className="text-sm sm:text-base">Cliente</Label>
              <p className="mt-1 text-sm sm:text-base">{repair.customerName}</p>
            </div>
            <div>
              <Label className="text-sm sm:text-base">Teléfono</Label>
              <p className="mt-1 text-sm sm:text-base">{repair.customerPhone}</p>
            </div>
          </div>

          <div>
            <Label className="text-sm sm:text-base">Dispositivo</Label>
            <p className="mt-1 capitalize text-sm sm:text-base">
              {repair.deviceType} {repair.deviceBrand} {repair.deviceModel}
            </p>
          </div>

          {(repair.imei || repair.serialNumber) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {repair.imei && (
                <div>
                  <Label className="text-sm sm:text-base">IMEI</Label>
                  <p className="mt-1 font-mono text-xs sm:text-sm">{repair.imei}</p>
                </div>
              )}
              {repair.serialNumber && (
                <div>
                  <Label className="text-sm sm:text-base">Número de Serie</Label>
                  <p className="mt-1 font-mono text-xs sm:text-sm">{repair.serialNumber}</p>
                </div>
              )}
            </div>
          )}

          {(repair.devicePassword || repair.devicePattern) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock size={16} className="text-amber-700" />
                <Label className="text-amber-900">Contraseña/Patrón del Equipo</Label>
              </div>
              {repair.devicePasswordType === 'text' && repair.devicePassword && (
                <div>
                  <p className="text-sm text-amber-800">PIN/Contraseña:</p>
                  <p className="mt-1 font-mono text-lg text-amber-900 bg-white px-3 py-2 rounded border border-amber-300">
                    {repair.devicePassword}
                  </p>
                </div>
              )}
              {repair.devicePasswordType === 'pattern' && repair.devicePattern && repair.devicePattern.length > 0 && (
                <div>
                  <p className="text-sm text-amber-800 mb-2">Patrón de Desbloqueo:</p>
                  <div className="flex justify-center bg-white p-3 rounded border border-amber-300">
                    <PatternLock
                      value={repair.devicePattern}
                      onPatternComplete={() => {}}
                      readOnly={true}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <Label className="text-sm sm:text-base">Problema Reportado</Label>
            <p className="mt-1 text-sm sm:text-base">{repair.problem}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label className="text-sm sm:text-base">Costo Estimado</Label>
              <p className="mt-1 text-lg sm:text-xl text-green-600">${repair.estimatedCost}</p>
            </div>
            <div>
              <Label className="text-sm sm:text-base">Fecha de Recepción</Label>
              <p className="mt-1 text-sm sm:text-base">{new Date(repair.receivedDate).toLocaleDateString()}</p>
            </div>
          </div>

          {repair.notes && (
            <div>
              <Label className="text-sm sm:text-base">Notas</Label>
              <p className="mt-1 text-sm sm:text-base">{repair.notes}</p>
            </div>
          )}

          {repair.images && repair.images.length > 0 && (
            <div>
              <Label className="text-sm sm:text-base">Imágenes del Equipo</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                {repair.images.map((img, idx) => (
                  <img 
                    key={idx}
                    src={img} 
                    alt={`Equipo ${idx + 1}`}
                    className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity active:opacity-70"
                    onClick={() => onImageClick(img)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Botón de Facturar si está completado y no facturado (solo para asesores y administradores) */}
          {repair.status === 'completed' && !repair.invoiced && canInvoice && (
            <div className="border-t pt-4">
              <Button 
                onClick={onCreateInvoice}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <DollarSign className="mr-2" size={16} />
                Facturar Reparación
              </Button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                El equipo está listo para ser facturado y entregado al cliente
              </p>
            </div>
          )}

          {/* Mostrar si ya fue facturado */}
          {repair.invoiced && repair.invoiceId && (
            <div className="border-t pt-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  ✓ Facturado - ID de Venta: #{repair.invoiceId}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Esta reparación ya ha sido facturada y está registrada en el módulo de Ventas
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
