/**
 * Product Module Utilities
 * Reusable utility functions for the products module
 */

import type { Product } from './types'

/**
 * Calculate margin percentage between price and cost
 */
export const getMarginPercentage = (product: Product): string | null => {
  if (!product.cost || product.cost === 0) return null
  const margin = ((product.price - product.cost) / product.cost) * 100
  return margin.toFixed(1)
}

/**
 * Get available stock based on product type
 */
export const getAvailableStock = (product: Product): number => {
  if (product.trackByUnit) {
    return product.units?.filter(u => u.status === 'available').length || 0
  }
  if (product.hasVariants) {
    return product.variants?.reduce((sum, v) => sum + v.stock, 0) || 0
  }
  return product.quantity || 0
}

/**
 * Check if product has low stock
 */
export const isLowStock = (product: Product, threshold: number = 5): boolean => {
  const stock = getAvailableStock(product)
  return stock < threshold && !product.hideStockAlert
}

/**
 * Format product price for display
 */
export const formatPrice = (price: number): string => {
  return `$${Math.round(price).toLocaleString()}`
}

/**
 * Get stock label based on product type
 */
export const getStockLabel = (product: Product): string => {
  if (product.trackByUnit) return 'unids'
  if (product.hasVariants) return 'total'
  return 'disp'
}

/**
 * Export products to CSV with detailed inventory information
 */
export const exportProductsToCSV = (
  products: Product[], 
  branches: Array<{ id: string; name: string }>
): void => {
  try {
    // BOM para UTF-8 en Excel
    const BOM = '\uFEFF'
    
    // Headers del CSV
    const headers = [
      'Producto',
      'Categoría',
      'Sucursal',
      'Tipo',
      'Variante/IMEI',
      'Estado',
      'Storage',
      'RAM',
      'Color',
      'Stock',
      'Costo Unit.',
      'Precio Venta',
      'Margen %',
      'Valor Inventario'
    ]

    const rows: string[][] = []

    products.forEach(product => {
      const branchName = branches.find(b => b.id === product.branchId)?.name || 'Sin sucursal'
      const margin = getMarginPercentage(product) || '0'
      const cost = product.cost || 0
      const price = product.price

      // Productos con seguimiento por unidades (IMEI/Serial)
      if (product.trackByUnit && product.units && product.units.length > 0) {
        product.units.forEach(unit => {
          const stock = unit.status === 'available' ? 1 : 0
          const inventoryValue = stock * cost
          
          rows.push([
            product.name,
            product.category,
            branchName,
            'Con Unidades',
            unit.imei || unit.serialNumber || 'N/A',
            unit.status === 'available' ? 'Disponible' : unit.status === 'sold' ? 'Vendido' : 'Reservado',
            product.storage || '',
            product.ram || '',
            product.color || '',
            stock.toString(),
            cost.toString(),
            price.toString(),
            margin,
            inventoryValue.toString()
          ])
        })
      } 
      // Productos con variantes
      else if (product.hasVariants && product.variants && product.variants.length > 0) {
        product.variants.forEach(variant => {
          const inventoryValue = variant.stock * cost
          
          // Usar el nombre de la variante y el SKU
          const variantInfo = variant.sku 
            ? `${variant.name} (SKU: ${variant.sku})` 
            : variant.name
          
          rows.push([
            product.name,
            product.category,
            branchName,
            'Con Variantes',
            variantInfo,
            'Disponible',
            product.storage || '',
            product.ram || '',
            product.color || '',
            variant.stock.toString(),
            cost.toString(),
            price.toString(),
            margin,
            inventoryValue.toString()
          ])
        })
      } 
      // Productos simples
      else {
        const stock = product.quantity || 0
        const inventoryValue = stock * cost
        
        rows.push([
          product.name,
          product.category,
          branchName,
          'Simple',
          '',
          'Disponible',
          product.storage || '',
          product.ram || '',
          product.color || '',
          stock.toString(),
          cost.toString(),
          price.toString(),
          margin,
          inventoryValue.toString()
        ])
      }
    })

    // Construir CSV
    let csvContent = BOM + headers.join(',') + '\n'
    rows.forEach(row => {
      csvContent += row.map(cell => {
        // Escapar comillas y envolver en comillas si contiene comas
        const escaped = cell.replace(/"/g, '""')
        return `"${escaped}"`
      }).join(',') + '\n'
    })

    // Crear y descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `inventario_detallado_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error exporting products to CSV:', error)
    throw error
  }
}

/**
 * Validate product form data
 */
export const validateProductForm = (formData: {
  name: string
  price: string
  branchId: string
  trackByUnit: boolean
  hasVariants: boolean
  quantity: string
}): { isValid: boolean; error?: string } => {
  if (!formData.name.trim()) {
    return { isValid: false, error: 'El nombre del producto es requerido' }
  }

  if (!formData.price || parseFloat(formData.price) <= 0) {
    return { isValid: false, error: 'El precio debe ser mayor a 0' }
  }

  if (!formData.branchId) {
    return { isValid: false, error: 'Debes seleccionar una sucursal' }
  }

  // Validate quantity for simple products
  if (!formData.trackByUnit && !formData.hasVariants) {
    if (!formData.quantity || parseInt(formData.quantity) < 0) {
      return { isValid: false, error: 'La cantidad debe ser mayor o igual a 0' }
    }
  }

  return { isValid: true }
}

/**
 * Parse bulk units input
 */
export const parseBulkUnitsInput = (input: string): Array<{ imei?: string; serialNumber?: string }> => {
  const lines = input.trim().split('\n')
  return lines
    .map(line => {
      const [imei, serialNumber] = line.split(',').map(s => s.trim())
      return { 
        imei: imei || undefined, 
        serialNumber: serialNumber || undefined 
      }
    })
    .filter(u => u.imei || u.serialNumber)
}

/**
 * Check if user can edit a product based on their role and branch
 */
export const canEditProduct = (
  userRole: string,
  userBranchId: string | undefined,
  productBranchId: string,
  assignedBranches?: string[]
): boolean => {
  // Admin can edit all products
  if (userRole === 'admin') {
    return true
  }
  
  // Asesor can only edit products from their assigned branches
  if (userRole === 'asesor') {
    // Support both legacy branchId and new assignedBranches
    if (assignedBranches && assignedBranches.length > 0) {
      return assignedBranches.includes(productBranchId)
    }
    // Fallback to legacy branchId
    return userBranchId === productBranchId
  }
  
  // Tecnico cannot edit products
  return false
}

/**
 * Get available branches for user based on role
 */
export const getAvailableBranches = (
  userRole: string,
  userBranchId: string | undefined,
  allBranches: Array<{ id: string; name: string; address?: string; isActive: boolean }>,
  assignedBranches?: string[]
): Array<{ id: string; name: string; address?: string; isActive: boolean }> => {
  // Admin can see all branches
  if (userRole === 'admin') {
    return allBranches
  }
  
  // Asesor can only see/create products for their assigned branches
  if (userRole === 'asesor') {
    // Use assignedBranches if available (new system)
    if (assignedBranches && assignedBranches.length > 0) {
      return allBranches.filter(branch => assignedBranches.includes(branch.id))
    }
    // Fallback to legacy branchId
    if (userBranchId) {
      return allBranches.filter(branch => branch.id === userBranchId)
    }
  }
  
  // Tecnico cannot create products
  return []
}
