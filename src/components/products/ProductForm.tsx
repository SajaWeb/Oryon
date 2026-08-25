/**
 * Product Form Component
 * Form for creating and editing products
 */

import { useState, useEffect } from 'react'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { BranchSelector } from './BranchSelector'
import { PRODUCT_CATEGORIES, TRACKING_METHODS } from './constants'
import { validateProductForm } from './utils'
import type { Product, ProductFormData, Branch } from './types'

interface ProductFormProps {
  product?: Product | null
  branches: Branch[]
  onSubmit: (data: ProductFormData) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  userRole?: string
}

export function ProductForm({ 
  product, 
  branches, 
  onSubmit, 
  onCancel,
  isSubmitting = false,
  userRole 
}: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    category: 'celulares',
    price: '',
    cost: '',
    storage: '',
    ram: '',
    color: '',
    description: '',
    trackByUnit: false,
    hasVariants: false,
    quantity: '',
    branchId: branches.length > 0 ? branches[0].id : ''
  })

  // Load product data when editing
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        category: product.category,
        price: product.price.toString(),
        cost: product.cost ? product.cost.toString() : '',
        storage: product.storage || '',
        ram: product.ram || '',
        color: product.color || '',
        description: product.description,
        trackByUnit: product.trackByUnit || false,
        hasVariants: product.hasVariants || false,
        quantity: product.quantity ? product.quantity.toString() : '',
        branchId: product.branchId || (branches.length > 0 ? branches[0].id : '')
      })
    } else {
      // Reset form when creating new product
      setFormData({
        name: '',
        category: 'celulares',
        price: '',
        cost: '',
        storage: '',
        ram: '',
        color: '',
        description: '',
        trackByUnit: false,
        hasVariants: false,
        quantity: '',
        branchId: branches.length > 0 ? branches[0].id : ''
      })
    }
  }, [product, branches])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    const validation = validateProductForm(formData)
    if (!validation.isValid) {
      alert(validation.error)
      return
    }

    await onSubmit(formData)
  }

  const updateField = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const isEditing = !!product

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Branch restriction notice */}
      {branches.length === 1 && !isEditing && (
        <div className="bg-[var(--accent-subtle)] border border-[var(--accent-subtle-border)] rounded-lg p-3">
          <p className="text-sm text-primary">
            📍 <strong>Tu sucursal:</strong> {branches[0].name}. Los productos que crees estarán asignados a esta sucursal.
          </p>
        </div>
      )}

      {/* Product Name */}
      <div>
        <Label htmlFor="name">Nombre del Producto *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="Ej: iPhone 15 Pro"
          required
        />
      </div>

      {/* Category */}
      <div>
        <Label htmlFor="category">Categoría *</Label>
        <Select
          value={formData.category}
          onValueChange={(value) => updateField('category', value)}
        >
          <SelectTrigger id="category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRODUCT_CATEGORIES.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Branch Selector */}
      <BranchSelector
        value={formData.branchId}
        onChange={(value) => updateField('branchId', value)}
        branches={branches}
        required
      />

      {/* Inventory Tracking Method */}
      <div className="border border-line rounded-lg p-4 bg-[var(--accent-subtle)]">
        <Label className="mb-2 block">Método de Seguimiento de Inventario</Label>
        <div className="space-y-2">
          {TRACKING_METHODS.map((method) => (
            <label key={method.id} className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="trackMethod"
                checked={
                  method.id === 'simple' ? (!formData.trackByUnit && !formData.hasVariants) :
                  method.id === 'variants' ? formData.hasVariants :
                  formData.trackByUnit
                }
                onChange={() => {
                  if (method.id === 'simple') {
                    updateField('trackByUnit', false)
                    updateField('hasVariants', false)
                  } else if (method.id === 'variants') {
                    updateField('trackByUnit', false)
                    updateField('hasVariants', true)
                  } else {
                    updateField('trackByUnit', true)
                    updateField('hasVariants', false)
                  }
                }}
                className="mt-1"
              />
              <div>
                <div className="font-medium">{method.title}</div>
                <div className="text-sm text-ink-secondary">
                  {method.description}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Quantity field - only for simple products */}
      {!formData.trackByUnit && !formData.hasVariants && (
        <div>
          <Label htmlFor="quantity">Cantidad Inicial</Label>
          <Input
            id="quantity"
            type="number"
            min="0"
            value={formData.quantity}
            onChange={(e) => updateField('quantity', e.target.value)}
            placeholder="0"
            disabled={isEditing && userRole === 'asesor'}
          />
          {isEditing && userRole === 'asesor' ? (
            <p className="text-xs text-warning mt-1">
              ⚠️ Solo administradores pueden modificar la cantidad. Usa "Gestionar Inventario" para agregar stock.
            </p>
          ) : (
            <p className="text-xs text-ink-tertiary mt-1">Stock disponible del producto</p>
          )}
        </div>
      )}

      {/* Info for variants */}
      {formData.hasVariants && (
        <div className="bg-[var(--warning-subtle)] border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] rounded-lg p-3">
          <p className="text-sm text-warning">
            💡 Las variantes (colores) se agregarán después de crear el producto
          </p>
        </div>
      )}

      {/* Info for units */}
      {formData.trackByUnit && (
        <div className="bg-[var(--warning-subtle)] border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] rounded-lg p-3">
          <p className="text-sm text-warning">
            💡 Las unidades (IMEI/Serial) se agregarán después de crear el producto
          </p>
        </div>
      )}

      {/* Cost and Price */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cost">Costo</Label>
          <Input
            id="cost"
            type="number"
            step="0.01"
            min="0"
            value={formData.cost}
            onChange={(e) => updateField('cost', e.target.value)}
            placeholder="0.00"
          />
          <p className="text-xs text-ink-tertiary mt-1">Costo de adquisición</p>
        </div>
        <div>
          <Label htmlFor="price">Precio de Venta *</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0.01"
            value={formData.price}
            onChange={(e) => updateField('price', e.target.value)}
            placeholder="0.00"
            required
          />
          <p className="text-xs text-ink-tertiary mt-1">Precio al cliente</p>
        </div>
      </div>

      {/* Specifications */}
      <div className="border-t pt-4 space-y-4">
        <h4 className="text-sm">Especificaciones del Producto (Opcional)</h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="storage">Almacenamiento</Label>
            <Input
              id="storage"
              value={formData.storage}
              onChange={(e) => updateField('storage', e.target.value)}
              placeholder="Ej: 256GB"
            />
          </div>
          <div>
            <Label htmlFor="ram">RAM</Label>
            <Input
              id="ram"
              value={formData.ram}
              onChange={(e) => updateField('ram', e.target.value)}
              placeholder="Ej: 8GB"
            />
          </div>
          <div>
            <Label htmlFor="color">Color</Label>
            <Input
              id="color"
              value={formData.color}
              onChange={(e) => updateField('color', e.target.value)}
              placeholder="Ej: Titanio Negro"
            />
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Descripción adicional del producto..."
          rows={3}
        />
      </div>

      {/* Form Actions */}
      <div className="flex gap-2 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          className="flex-1"
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button 
          type="submit" 
          className="flex-1" 
          disabled={isSubmitting || branches.length === 0}
        >
          {isSubmitting ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {isEditing ? 'Actualizando...' : 'Creando...'}
            </>
          ) : (
            <>{isEditing ? 'Actualizar' : 'Crear'} Producto</>
          )}
        </Button>
      </div>
    </form>
  )
}
