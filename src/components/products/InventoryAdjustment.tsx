/**
 * Inventory Adjustment Component
 * Allows manual stock adjustments for simple products
 */

import { useState } from 'react'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import type { Product, InventoryAdjustmentData } from './types'

interface InventoryAdjustmentProps {
  product: Product
  onAdjust: (data: InventoryAdjustmentData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function InventoryAdjustment({
  product,
  onAdjust,
  onCancel,
  isLoading = false
}: InventoryAdjustmentProps) {
  const [adjustmentData, setAdjustmentData] = useState<InventoryAdjustmentData>({
    type: 'add',
    quantity: '',
    reason: ''
  })

  const handleSubmit = async () => {
    if (!adjustmentData.quantity || !adjustmentData.reason.trim()) {
      alert('Completa todos los campos')
      return
    }

    const quantity = parseInt(adjustmentData.quantity)
    if (quantity <= 0) {
      alert('La cantidad debe ser mayor a 0')
      return
    }

    // Validate subtract operation
    if (adjustmentData.type === 'subtract') {
      const currentStock = product.quantity || 0
      if (quantity > currentStock) {
        alert(`No puedes quitar ${quantity} unidades. Stock actual: ${currentStock}`)
        return
      }
    }

    await onAdjust(adjustmentData)
  }

  const updateField = (field: keyof InventoryAdjustmentData, value: string) => {
    setAdjustmentData(prev => ({ ...prev, [field]: value }))
  }

  const currentStock = product.quantity || 0
  const newStock = adjustmentData.type === 'add'
    ? currentStock + (parseInt(adjustmentData.quantity) || 0)
    : currentStock - (parseInt(adjustmentData.quantity) || 0)

  return (
    <div className="space-y-4">
      {/* Current Stock Info */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Stock actual:</strong> {currentStock} unidades
        </p>
      </div>

      {/* Adjustment Type */}
      <div>
        <Label>Tipo de Ajuste</Label>
        <Select
          value={adjustmentData.type}
          onValueChange={(value) => updateField('type', value)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="add">Agregar Stock</SelectItem>
            <SelectItem value="subtract">Quitar Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quantity */}
      <div>
        <Label htmlFor="adjustment-quantity">Cantidad</Label>
        <Input
          id="adjustment-quantity"
          type="number"
          min="1"
          max={adjustmentData.type === 'subtract' ? currentStock : undefined}
          value={adjustmentData.quantity}
          onChange={(e) => updateField('quantity', e.target.value)}
          placeholder="0"
          required
          disabled={isLoading}
        />
        {adjustmentData.quantity && (
          <p className="text-xs text-gray-600 mt-1">
            Nuevo stock: {newStock >= 0 ? newStock : 0} unidades
          </p>
        )}
      </div>

      {/* Reason */}
      <div>
        <Label htmlFor="adjustment-reason">Motivo del Ajuste</Label>
        <Textarea
          id="adjustment-reason"
          value={adjustmentData.reason}
          onChange={(e) => updateField('reason', e.target.value)}
          placeholder="Ej: Corrección de inventario, producto dañado, ajuste por conteo físico..."
          rows={3}
          required
          disabled={isLoading}
        />
        <p className="text-xs text-gray-500 mt-1">
          Describe por qué estás realizando este ajuste
        </p>
      </div>

      {/* Warning for subtract */}
      {adjustmentData.type === 'subtract' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ <strong>Atención:</strong> Estás quitando stock del inventario. Asegúrate de ingresar el motivo correcto.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          className="flex-1"
          disabled={isLoading || !adjustmentData.quantity || !adjustmentData.reason.trim()}
        >
          {isLoading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Procesando...
            </>
          ) : (
            'Realizar Ajuste'
          )}
        </Button>
      </div>
    </div>
  )
}
