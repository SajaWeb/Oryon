/**
 * Add Stock Component
 * Allows advisors to add stock to products (for new purchases)
 */

import { useState } from 'react'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { TrendingUp, ShoppingCart } from 'lucide-react'
import type { Product } from './types'

interface AddStockProps {
  product: Product
  onAdd: (data: { quantity: number; reason: string }) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function AddStock({ product, onAdd, onCancel, isLoading = false }: AddStockProps) {
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const qty = parseInt(quantity)
    if (!qty || qty <= 0) {
      alert('La cantidad debe ser mayor a 0')
      return
    }

    if (!reason.trim()) {
      alert('Debes proporcionar una razón para agregar stock')
      return
    }

    await onAdd({ quantity: qty, reason: reason.trim() })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Info Notice */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <ShoppingCart className="text-blue-600 dark:text-blue-400 mt-0.5" size={16} />
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Agregar inventario por compra
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Esta función te permite aumentar el stock cuando recibes nuevos productos.
              Solo puedes agregar, no restar inventario.
            </p>
          </div>
        </div>
      </div>

      {/* Product Info */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {product.name}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          Stock actual: <span className="font-medium">{product.quantity || 0} unidades</span>
        </p>
      </div>

      {/* Quantity Input */}
      <div>
        <Label htmlFor="quantity">Cantidad a Agregar *</Label>
        <Input
          id="quantity"
          type="number"
          min="1"
          step="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Ej: 10"
          required
          disabled={isLoading}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Cantidad de unidades que ingresarán al inventario
        </p>
      </div>

      {/* Reason Input */}
      <div>
        <Label htmlFor="reason">Razón / Nota *</Label>
        <Textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ej: Compra a proveedor XYZ - Factura #12345"
          required
          disabled={isLoading}
          rows={3}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Describe el motivo del ingreso (proveedor, factura, etc.)
        </p>
      </div>

      {/* Preview */}
      {quantity && parseInt(quantity) > 0 && (
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <p className="text-sm text-green-900 dark:text-green-100">
            Stock nuevo: <span className="font-semibold">
              {(product.quantity || 0) + parseInt(quantity)} unidades
            </span>
          </p>
        </div>
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
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
        >
          {isLoading ? (
            <>Agregando...</>
          ) : (
            <>
              <TrendingUp size={16} className="mr-2" />
              Agregar Stock
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
