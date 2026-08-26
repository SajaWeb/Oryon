/**
 * Branch Transfer Component
 * Allows administrators to transfer products between branches
 */

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { ArrowRight, Package } from 'lucide-react'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import type { Product, Branch, BranchTransferData, ProductVariant } from './types'

interface BranchTransferProps {
  product: Product
  branches: Branch[]
  onTransfer: (data: BranchTransferData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function BranchTransfer({
  product,
  branches,
  onTransfer,
  onCancel,
  isLoading = false
}: BranchTransferProps) {
  const [transferData, setTransferData] = useState<BranchTransferData>({
    targetBranchId: '',
    quantity: '',
    reason: ''
  })
  const [variants, setVariants] = useState<ProductVariant[]>([])

  // Filter out the current branch
  const targetBranches = branches.filter(b => b.id !== product.branchId)

  // Load variants if product has them
  useEffect(() => {
    if (product.hasVariants && product.variants) {
      setVariants(product.variants)
    }
  }, [product])

  const handleSubmit = async () => {
    if (!transferData.targetBranchId || !transferData.quantity || !transferData.reason.trim()) {
      toast.error('Completa todos los campos')
      return
    }

    const quantity = parseInt(transferData.quantity)
    if (quantity <= 0) {
      toast.error('La cantidad debe ser mayor a 0')
      return
    }

    // Validate quantity available
    const currentStock = product.hasVariants 
      ? variants.reduce((sum, v) => sum + (v.stock || 0), 0)
      : (product.quantity || 0)
    
    if (quantity > currentStock) {
      toast.error(`No puedes trasladar ${quantity} unidades. Stock disponible: ${currentStock}`)
      return
    }

    await onTransfer(transferData)
  }

  const currentBranch = branches.find(b => b.id === product.branchId)
  const targetBranch = branches.find(b => b.id === transferData.targetBranchId)

  // Calculate total stock for variants
  const totalVariantStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0)
  const displayStock = product.hasVariants ? totalVariantStock : (product.quantity || 0)

  // Calculate how variants will be affected (proportional distribution)
  const getVariantTransferPreview = () => {
    if (!product.hasVariants || !transferData.quantity) return []
    
    const transferQuantity = parseInt(transferData.quantity)
    if (!transferQuantity || transferQuantity <= 0) return []

    let remainingToTransfer = transferQuantity
    const preview = []

    for (const variant of variants) {
      if (remainingToTransfer <= 0) break
      
      const variantStock = variant.stock || 0
      if (variantStock <= 0) continue

      const transferFromVariant = Math.min(variantStock, remainingToTransfer)
      preview.push({
        name: variant.name,
        currentStock: variantStock,
        transferred: transferFromVariant,
        remaining: variantStock - transferFromVariant
      })

      remainingToTransfer -= transferFromVariant
    }

    return preview
  }

  const variantPreview = getVariantTransferPreview()

  return (
    <div className="space-y-4">
      {/* Current Stock Info */}
      <div className="bg-sunken rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-ink-secondary">Sucursal Actual</p>
            <p className="font-semibold">{currentBranch?.name}</p>
          </div>
          <div>
            <p className="text-sm text-ink-secondary">Stock Disponible</p>
            <p className="text-xl font-semibold text-primary">{displayStock}</p>
            {product.hasVariants && (
              <p className="text-xs text-ink-tertiary">
                {variants.length} variante{variants.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Variants Info (if product has variants) */}
      {product.hasVariants && variants.length > 0 && (
        <div className="bg-[var(--accent-subtle)] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-primary">
              Variantes Disponibles
            </h4>
          </div>
          <div className="space-y-1">
            {variants.map((variant) => (
              <div key={variant.id} className="flex justify-between items-center text-sm">
                <span className="text-ink-secondary">{variant.name}</span>
                <span className="font-semibold text-primary">
                  {variant.stock || 0} unidades
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-secondary mt-2">
            ℹ️ El stock se trasladará automáticamente desde las variantes con disponibilidad
          </p>
        </div>
      )}

      {/* Target Branch Selection */}
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
        <div className="bg-[var(--accent-subtle)] rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-xs text-ink-secondary">Desde</p>
              <p className="font-semibold">{currentBranch?.name}</p>
            </div>
            <ArrowRight className="text-primary mx-4" size={24} />
            <div className="text-center flex-1">
              <p className="text-xs text-ink-secondary">Hacia</p>
              <p className="font-semibold">{targetBranch?.name}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quantity */}
      <div>
        <Label htmlFor="quantity">Cantidad a Trasladar *</Label>
        <Input
          id="quantity"
          type="number"
          min="1"
          max={displayStock}
          value={transferData.quantity}
          onChange={(e) => setTransferData({ ...transferData, quantity: e.target.value })}
          placeholder="¿Cuántas unidades?"
          disabled={isLoading || !transferData.targetBranchId}
        />
        <p className="text-xs text-ink-tertiary mt-1">
          Máximo disponible: {displayStock} unidades
        </p>
      </div>

      {/* Variant Transfer Preview */}
      {product.hasVariants && variantPreview.length > 0 && (
        <div className="bg-[var(--warning-subtle)] border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] rounded-lg p-3">
          <h4 className="text-sm font-semibold text-warning mb-2">
            📦 Distribución del Traslado por Variante
          </h4>
          <div className="space-y-2">
            {variantPreview.map((item, index) => (
              <div key={index} className="flex justify-between items-center text-xs">
                <span className="text-ink-secondary">{item.name}</span>
                <div className="flex gap-2 items-center">
                  <span className="text-danger">-{item.transferred}</span>
                  <span className="text-ink-tertiary">→</span>
                  <span className="text-ink-secondary">
                    Quedan: {item.remaining}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reason */}
      <div>
        <Label htmlFor="reason">Motivo del Traslado *</Label>
        <Textarea
          id="reason"
          value={transferData.reason}
          onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
          placeholder="Ej: Traslado por mayor demanda en sucursal destino"
          rows={3}
          disabled={isLoading}
        />
      </div>

      {/* Stock Preview After Transfer - For products WITHOUT variants */}
      {!product.hasVariants && transferData.quantity && parseInt(transferData.quantity) > 0 && (
        <div className="border-t pt-4">
          <p className="text-sm font-semibold mb-2">Stock después del traslado:</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--danger-subtle)] p-3 rounded-lg">
              <p className="text-xs text-danger">{currentBranch?.name}</p>
              <p className="text-lg font-semibold text-danger">
                {(product.quantity || 0) - parseInt(transferData.quantity)}
              </p>
            </div>
            <div className="bg-[var(--success-subtle)] p-3 rounded-lg">
              <p className="text-xs text-success">{targetBranch?.name}</p>
              <p className="text-lg font-semibold text-success">
                +{transferData.quantity}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stock Preview After Transfer - For products WITH variants */}
      {product.hasVariants && transferData.quantity && parseInt(transferData.quantity) > 0 && (
        <div className="border-t pt-4">
          <p className="text-sm font-semibold mb-2">Stock total después del traslado:</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--danger-subtle)] p-3 rounded-lg">
              <p className="text-xs text-danger">{currentBranch?.name}</p>
              <p className="text-lg font-semibold text-danger">
                {totalVariantStock - parseInt(transferData.quantity)}
              </p>
              <p className="text-xs text-ink-tertiary mt-1">Stock en variantes</p>
            </div>
            <div className="bg-[var(--success-subtle)] p-3 rounded-lg">
              <p className="text-xs text-success">{targetBranch?.name}</p>
              <p className="text-lg font-semibold text-success">
                +{transferData.quantity}
              </p>
              <p className="text-xs text-ink-tertiary mt-1">Se crearán/actualizarán variantes</p>
            </div>
          </div>
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
          onClick={handleSubmit}
          disabled={isLoading || !transferData.targetBranchId || !transferData.quantity || !transferData.reason.trim()}
          className="flex-1"
        >
          {isLoading ? 'Trasladando...' : 'Confirmar Traslado'}
        </Button>
      </div>

      {/* Warning */}
      <div className="bg-[var(--warning-subtle)] border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] rounded-lg p-3">
        <p className="text-xs text-warning">
          ⚠️ <strong>Importante:</strong> El traslado moverá el inventario de manera permanente.
          Esta acción quedará registrada en el historial.
        </p>
      </div>
    </div>
  )
}
