/**
 * Variants Management Component
 * Manages product variants (colors, models, etc.)
 */

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import type { Product, VariantFormData } from './types'

interface VariantsManagementProps {
  product: Product
  onAddVariant: (data: VariantFormData) => Promise<void>
  onUpdateVariantStock: (variantId: number, newStock: number) => Promise<void>
  onDeleteVariant: (variantId: number) => Promise<void>
  isLoading?: boolean
  canEdit?: boolean
}

export function VariantsManagement({
  product,
  onAddVariant,
  onUpdateVariantStock,
  onDeleteVariant,
  isLoading = false,
  canEdit = true
}: VariantsManagementProps) {
  const [variantForm, setVariantForm] = useState<VariantFormData>({
    name: '',
    stock: ''
  })

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!variantForm.name.trim()) {
      alert('El nombre de la variante es requerido')
      return
    }

    await onAddVariant(variantForm)
    setVariantForm({ name: '', stock: '' })
  }

  const handleDeleteVariant = async (variantId: number) => {
    if (!confirm('¿Estás seguro de eliminar esta variante?')) return
    await onDeleteVariant(variantId)
  }

  const totalStock = product.variants?.reduce((sum, v) => sum + v.stock, 0) || 0

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Permission Notice for Read-Only Mode */}
      {!canEdit && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 md:p-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            ⚠️ <strong>Solo lectura:</strong> Solo puedes gestionar variantes de productos de tu sucursal asignada.
          </p>
        </div>
      )}

      {/* Add Variant Form */}
      {canEdit && (
        <div className="border rounded-lg p-3 md:p-4 bg-blue-50 dark:bg-blue-950">
        <h4 className="mb-3 text-sm md:text-base font-semibold">Agregar Nueva Variante</h4>
        <form onSubmit={handleAddVariant} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div>
              <Label htmlFor="variant-name">Nombre/Color *</Label>
              <Input
                id="variant-name"
                value={variantForm.name}
                onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                placeholder="Ej: Rojo, Negro, Azul..."
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="variant-stock">Stock Inicial</Label>
              <Input
                id="variant-stock"
                type="number"
                min="0"
                value={variantForm.stock}
                onChange={(e) => setVariantForm({ ...variantForm, stock: e.target.value })}
                placeholder="Cantidad inicial"
                disabled={isLoading}
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            <Plus size={16} className="mr-2" />
            Agregar Variante
          </Button>
        </form>
        </div>
      )}

      {/* Variants List */}
      <div>
        <h4 className="mb-3 text-sm md:text-base font-semibold">
          Variantes Registradas ({product.variants?.length || 0})
        </h4>
        {product.variants && product.variants.length > 0 ? (
          <div className="space-y-3">
            {product.variants.map((variant) => (
              <div
                key={variant.id}
                className="border rounded-lg p-4 bg-white dark:bg-gray-800 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className="text-sm">
                      {variant.name}
                    </Badge>
                    {variant.sku && (
                      <span className="text-xs text-gray-500 font-mono">
                        SKU: {variant.sku}
                      </span>
                    )}
                  </div>
                  
                  {/* Stock Management */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs text-gray-500">Stock Actual</Label>
                      <Badge
                        variant={variant.stock > 0 ? 'default' : 'destructive'}
                        className="text-xs w-fit"
                      >
                        {variant.stock > 0 ? `${variant.stock} disponibles` : 'Sin stock'}
                      </Badge>
                    </div>
                    
                    {/* Add Stock Input - Available for Asesores and Admins */}
                    {canEdit && (
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`add-stock-${variant.id}`} className="text-xs text-gray-500">
                          Agregar:
                        </Label>
                        <Input
                          id={`add-stock-${variant.id}`}
                          type="number"
                          min="1"
                          placeholder="Cant."
                          className="w-20 h-8 text-sm"
                          disabled={isLoading}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const input = e.currentTarget
                              const addAmount = parseInt(input.value) || 0
                              if (addAmount > 0) {
                                onUpdateVariantStock(variant.id, variant.stock + addAmount)
                                input.value = ''
                              }
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => {
                            const input = document.getElementById(`add-stock-${variant.id}`) as HTMLInputElement
                            const addAmount = parseInt(input?.value) || 0
                            if (addAmount > 0) {
                              onUpdateVariantStock(variant.id, variant.stock + addAmount)
                              input.value = ''
                            }
                          }}
                          disabled={isLoading}
                        >
                          <Plus size={14} className="mr-1" />
                          Añadir
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Delete Button */}
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 ml-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    onClick={() => handleDeleteVariant(variant.id)}
                    disabled={isLoading}
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            ))}

            {/* Total Stock Summary */}
            <div className="border-t pt-3 mt-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="font-semibold">Stock Total:</span>
                <Badge variant="secondary" className="text-base">
                  {totalStock} unidades
                </Badge>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 border rounded-lg text-sm">
            No hay variantes registradas. Agrega la primera variante arriba.
          </div>
        )}
      </div>

      {/* Instructions */}
      {canEdit && product.variants && product.variants.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            💡 <strong>Tip:</strong> Ingresa la cantidad y presiona Enter o haz clic en "Añadir" para incrementar el stock de la variante.
          </p>
        </div>
      )}
    </div>
  )
}
