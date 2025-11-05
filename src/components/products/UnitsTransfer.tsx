/**
 * Units Transfer Component
 * Allows administrators to transfer individual units (IMEI/Serial) between branches
 */

import { useState } from 'react'
import { ArrowRight, Package, Check } from 'lucide-react'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Checkbox } from '../ui/checkbox'
import { Badge } from '../ui/badge'
import type { Product, Branch, ProductUnit, UnitsTransferData } from './types'

interface UnitsTransferProps {
  product: Product
  branches: Branch[]
  onTransfer: (data: UnitsTransferData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function UnitsTransfer({
  product,
  branches,
  onTransfer,
  onCancel,
  isLoading = false
}: UnitsTransferProps) {
  const [transferData, setTransferData] = useState<UnitsTransferData>({
    targetBranchId: '',
    unitIds: [],
    reason: ''
  })

  // Filter out the current branch
  const targetBranches = branches.filter(b => b.id !== product.branchId)

  // Get only available units
  const availableUnits = (product.units || []).filter(u => u.status === 'available')

  const handleSubmit = async () => {
    if (!transferData.targetBranchId || transferData.unitIds.length === 0 || !transferData.reason.trim()) {
      alert('Completa todos los campos y selecciona al menos una unidad')
      return
    }

    await onTransfer(transferData)
  }

  const toggleUnit = (unitId: number) => {
    setTransferData(prev => ({
      ...prev,
      unitIds: prev.unitIds.includes(unitId)
        ? prev.unitIds.filter(id => id !== unitId)
        : [...prev.unitIds, unitId]
    }))
  }

  const toggleAll = () => {
    if (transferData.unitIds.length === availableUnits.length) {
      setTransferData(prev => ({ ...prev, unitIds: [] }))
    } else {
      setTransferData(prev => ({ 
        ...prev, 
        unitIds: availableUnits.map(u => u.id) 
      }))
    }
  }

  const currentBranch = branches.find(b => b.id === product.branchId)
  const targetBranch = branches.find(b => b.id === transferData.targetBranchId)

  return (
    <div className="space-y-4">
      {/* Current Branch Info */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Sucursal Actual</p>
            <p className="font-semibold">{currentBranch?.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Unidades Disponibles</p>
            <p className="text-xl font-semibold text-blue-600">{availableUnits.length}</p>
          </div>
        </div>
      </div>

      {/* No units available warning */}
      {availableUnits.length === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ No hay unidades disponibles para trasladar. Las unidades vendidas o en reparación no pueden ser trasladadas.
          </p>
        </div>
      )}

      {/* Target Branch Selection */}
      {availableUnits.length > 0 && (
        <>
          <div>
            <Label htmlFor="target-branch">Sucursal Destino *</Label>
            <Select
              value={transferData.targetBranchId}
              onValueChange={(value) => setTransferData({ ...transferData, targetBranchId: value })}
              disabled={isLoading}
            >
              <SelectTrigger id="target-branch">
                <SelectValue placeholder="Selecciona la sucursal destino" />
              </SelectTrigger>
              <SelectContent>
                {targetBranches.length > 0 ? (
                  targetBranches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No hay otras sucursales disponibles
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Transfer Arrow Visual */}
          {transferData.targetBranchId && (
            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Desde</p>
                  <p className="font-semibold">{currentBranch?.name}</p>
                </div>
                <ArrowRight className="text-blue-600 mx-4" size={24} />
                <div className="text-center flex-1">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Hacia</p>
                  <p className="font-semibold">{targetBranch?.name}</p>
                </div>
              </div>
            </div>
          )}

          {/* Units Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Selecciona las Unidades a Trasladar *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleAll}
                disabled={isLoading || !transferData.targetBranchId}
              >
                {transferData.unitIds.length === availableUnits.length ? 'Deseleccionar' : 'Seleccionar'} Todas
              </Button>
            </div>
            <div className="border rounded-lg max-h-60 overflow-y-auto">
              {availableUnits.length > 0 ? (
                <div className="divide-y">
                  {availableUnits.map((unit) => (
                    <div
                      key={unit.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      onClick={() => !isLoading && transferData.targetBranchId && toggleUnit(unit.id)}
                    >
                      <Checkbox
                        checked={transferData.unitIds.includes(unit.id)}
                        onCheckedChange={() => toggleUnit(unit.id)}
                        disabled={isLoading || !transferData.targetBranchId}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {unit.imei && (
                            <Badge variant="outline" className="text-xs">
                              IMEI: {unit.imei}
                            </Badge>
                          )}
                          {unit.serialNumber && (
                            <Badge variant="outline" className="text-xs">
                              S/N: {unit.serialNumber}
                            </Badge>
                          )}
                        </div>
                        {!unit.imei && !unit.serialNumber && (
                          <p className="text-xs text-gray-500">Unidad #{unit.id}</p>
                        )}
                      </div>
                      {transferData.unitIds.includes(unit.id) && (
                        <Check className="text-green-600" size={18} />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  <Package className="mx-auto mb-2 opacity-50" size={32} />
                  <p className="text-sm">No hay unidades disponibles</p>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {transferData.unitIds.length} de {availableUnits.length} unidades seleccionadas
            </p>
          </div>

          {/* Reason */}
          <div>
            <Label htmlFor="reason">Motivo del Traslado *</Label>
            <Textarea
              id="reason"
              value={transferData.reason}
              onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
              placeholder="Ej: Traslado de unidades por mayor demanda en sucursal destino"
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Summary */}
          {transferData.unitIds.length > 0 && transferData.targetBranchId && (
            <div className="border-t pt-4">
              <p className="text-sm font-semibold mb-2">Resumen del Traslado:</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg">
                  <p className="text-xs text-red-600 dark:text-red-400">{currentBranch?.name}</p>
                  <p className="text-lg font-semibold text-red-600">
                    -{transferData.unitIds.length}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Quedan: {availableUnits.length - transferData.unitIds.length}
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                  <p className="text-xs text-green-600 dark:text-green-400">{targetBranch?.name}</p>
                  <p className="text-lg font-semibold text-green-600">
                    +{transferData.unitIds.length}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    unidades individuales
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={
            isLoading || 
            !transferData.targetBranchId || 
            transferData.unitIds.length === 0 || 
            !transferData.reason.trim() ||
            availableUnits.length === 0
          }
          className="flex-1"
        >
          {isLoading ? 'Trasladando...' : `Trasladar ${transferData.unitIds.length} Unidad${transferData.unitIds.length !== 1 ? 'es' : ''}`}
        </Button>
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
        <p className="text-xs text-yellow-800 dark:text-yellow-200">
          ⚠️ <strong>Importante:</strong> Las unidades seleccionadas serán movidas permanentemente a la sucursal destino.
          Esta acción quedará registrada en el historial.
        </p>
      </div>
    </div>
  )
}
