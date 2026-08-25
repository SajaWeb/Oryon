/**
 * Products Module - Main Component
 * Complete product management system with multi-branch support
 */

import { useState, useEffect } from 'react'
import { ArrowLeftRight, ArrowUpDown, History, PackageSearch, Pencil, Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { Alert, Badge, Button, Card, IconButton, KeyValue, type Column } from '../oryon'
import { ListPage } from '../patterns/ListPage'
import { PageBody } from '../layout/PageBody'
import { ResponsiveDetail } from '../layout/ResponsiveDetail'
import { useShell } from '../layout/AppShell'
import { usePageHeader } from '../layout/PageHeaderContext'
import { ProductListCard } from './ProductListCard'
import { toast } from 'sonner@2.0.3'
import { projectId } from '../../utils/supabase/info'
import { ProductForm } from './ProductForm'
import { UnitsManagement } from './UnitsManagement'
import { VariantsManagement } from './VariantsManagement'
import { InventoryAdjustment } from './InventoryAdjustment'
import { BranchTransfer } from './BranchTransfer'
import { UnitsTransfer } from './UnitsTransfer'
import { ProductTransactionHistory } from './ProductTransactionHistory'
import { AddStock } from './AddStock'
import { exportProductsToCSV, canEditProduct, getAvailableBranches, getAvailableStock, isLowStock, formatPrice, getMarginPercentage } from './utils'
import { PRODUCT_CATEGORIES } from './constants'
import type { Product, ProductFormData, ProductFilters as FilterState, Branch, UnitFormData, VariantFormData, InventoryAdjustmentData, BranchTransferData, UnitsTransferData, UserProfile, ProductTransaction } from './types'

interface ProductsProps {
  accessToken: string
  userRole?: string
  userProfile?: UserProfile
}

export function Products({ accessToken, userRole, userProfile }: ProductsProps) {
  // State
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false)
  const [unitsDialogOpen, setUnitsDialogOpen] = useState(false)
  const [variantsDialogOpen, setVariantsDialogOpen] = useState(false)
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [unitsTransferDialogOpen, setUnitsTransferDialogOpen] = useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [addStockDialogOpen, setAddStockDialogOpen] = useState(false)
  
  // Selected items
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  
  // Transaction history
  const [transactions, setTransactions] = useState<ProductTransaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  
  // Filters and pagination
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    categoryFilter: 'all',
    branchFilter: 'all',
    stockFilter: 'all'
  })
  // Umbral de stock bajo de la empresa. El filtro y el chip de la lista lo usan en vez de
  // un 5 fijo, que es lo que hacía la tarjeta anterior.
  const [lowStockThreshold, setLowStockThreshold] = useState(5)
  // Producto abierto en el drawer (escritorio) o en la hoja inferior (móvil).
  const [detailProduct, setDetailProduct] = useState<Product | null>(null)

  const { compact, isMobile } = useShell()
  // El drawer de tablet mide 320px: dos columnas de ficha ahí no se leen.
  const detailColumns = compact ? 1 : 2

  const isAdmin = userRole === 'admin'
  const userBranchId = userProfile?.branchId
  const userAssignedBranches = userProfile?.assignedBranches
  
  // Get available branches based on user role
  const availableBranches = getAvailableBranches(userRole || 'asesor', userBranchId, branches, userAssignedBranches)

  // Fetch data on mount
  useEffect(() => {
    fetchProducts()
    fetchBranches()
    fetchStockThreshold()
  }, [])

  // Filter products when filters change
  useEffect(() => {
    filterProducts()
  }, [products, filters])

  // Fetch Functions
  const fetchStockThreshold = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/company/settings`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      )
      if (!response.ok) return
      const data = await response.json()
      if (data.success && data.settings?.lowStockThreshold) {
        setLowStockThreshold(data.settings.lowStockThreshold)
      }
    } catch (error) {
      console.error('Error fetching stock threshold:', error)
    }
  }

  const fetchBranches = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/branches`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )
      const data = await response.json()
      if (data.success) {
        setBranches(data.branches || [])
      }
    } catch (error) {
      console.error('Error fetching branches:', error)
      toast.error('Error al cargar sucursales')
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/products`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      )
      if (response.ok) {
        const data = await response.json()
        
        // Filter out invalid products (without id or name)
        const validProducts = data.filter((p: Product) => {
          if (!p.id || !p.name || isNaN(p.price)) {
            console.warn('Invalid product detected and filtered:', p)
            return false
          }
          return true
        })
        
        setProducts(validProducts)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      toast.error('Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }

  // Filter Logic
  const filterProducts = () => {
    let filtered = [...products]

    // Search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchLower) ||
        product.description.toLowerCase().includes(searchLower) ||
        product.storage?.toLowerCase().includes(searchLower) ||
        product.ram?.toLowerCase().includes(searchLower) ||
        product.color?.toLowerCase().includes(searchLower) ||
        product.units?.some(unit =>
          unit.imei?.toLowerCase().includes(searchLower) ||
          unit.serialNumber?.toLowerCase().includes(searchLower)
        )
      )
    }

    // Category filter
    if (filters.categoryFilter !== 'all') {
      filtered = filtered.filter(product => product.category === filters.categoryFilter)
    }

    // Branch filter
    if (filters.branchFilter !== 'all') {
      filtered = filtered.filter(product => product.branchId === filters.branchFilter)
    }

    // Stock filter — el umbral es el de la empresa, no un 5 fijo
    if (filters.stockFilter !== 'all') {
      filtered = filtered.filter(product => {
        const stock = getAvailableStock(product)
        if (filters.stockFilter === 'out') return stock === 0
        if (filters.stockFilter === 'low') return stock > 0 && isLowStock(product, lowStockThreshold)
        return stock > 0 && !isLowStock(product, lowStockThreshold)
      })
    }

    setFilteredProducts(filtered)
  }

  // Product CRUD Operations
  const handleSubmitProduct = async (formData: ProductFormData) => {
    if (isSubmitting) return
    
    setIsSubmitting(true)
    const toastId = toast.loading(
      editingProduct ? 'Actualizando producto...' : 'Creando producto...',
      { description: 'Por favor espera' }
    )

    try {
      const url = editingProduct
        ? `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/products/${editingProduct.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/products`

      const response = await fetch(url, {
        method: editingProduct ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          price: parseFloat(formData.price),
          cost: formData.cost ? parseFloat(formData.cost) : 0,
          storage: formData.storage || undefined,
          ram: formData.ram || undefined,
          color: formData.color || undefined,
          description: formData.description,
          trackByUnit: formData.trackByUnit,
          hasVariants: formData.hasVariants,
          quantity: !formData.trackByUnit && !formData.hasVariants && formData.quantity 
            ? parseInt(formData.quantity) 
            : 0,
          branchId: formData.branchId
        })
      })

      if (response.ok) {
        await fetchProducts()
        setDialogOpen(false)
        setEditingProduct(null)
        
        toast.success(
          editingProduct ? '✅ Producto actualizado exitosamente' : '✅ Producto creado exitosamente',
          {
            id: toastId,
            description: `${formData.name} ha sido ${editingProduct ? 'actualizado' : 'agregado'} al inventario`,
            duration: 4000
          }
        )
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error('❌ Error al guardar el producto', {
          id: toastId,
          description: errorData.error || 'Por favor intenta nuevamente',
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Error saving product:', error)
      toast.error('❌ Error al guardar el producto', {
        id: toastId,
        description: 'Verifica tu conexión a internet',
        duration: 5000
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este producto y todas sus unidades?')) return

    const toastId = toast.loading('🗑️ Eliminando producto...', {
      description: 'Por favor espera'
    })

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/products/${id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      )

      if (response.ok) {
        await fetchProducts()
        toast.success('✅ Producto eliminado exitosamente', {
          id: toastId,
          description: 'El producto ha sido removido del inventario',
          duration: 4000
        })
      } else {
        toast.error('❌ Error al eliminar el producto', {
          id: toastId,
          description: 'Por favor intenta nuevamente',
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      toast.error('❌ Error al eliminar el producto', {
        id: toastId,
        description: 'Verifica tu conexión a internet',
        duration: 5000
      })
    }
  }

  // Units Management
  const handleAddUnit = async (data: UnitFormData) => {
    if (!selectedProduct) return

    const toastId = toast.loading('📦 Agregando unidad...', {
      description: 'Por favor espera'
    })

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/products/${selectedProduct.id}/units`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            imei: data.imei || undefined,
            serialNumber: data.serialNumber || undefined
          })
        }
      )

      if (response.ok) {
        await fetchProducts()
        const updatedProducts = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/products`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        ).then(r => r.json())
        setSelectedProduct(updatedProducts.find((p: Product) => p.id === selectedProduct.id))

        toast.success('✅ Unidad agregada exitosamente', {
          id: toastId,
          description: `IMEI/SN: ${data.imei || data.serialNumber}`,
          duration: 4000
        })
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error('❌ Error al agregar unidad', {
          id: toastId,
          description: errorData.error || 'Por favor verifica los datos',
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Error adding unit:', error)
      toast.error('❌ Error al agregar unidad', {
        id: toastId,
        description: 'Verifica tu conexión a internet',
        duration: 5000
      })
    }
  }

  const handleAddBulkUnits = async (units: Array<{ imei?: string; serialNumber?: string }>) => {
    if (!selectedProduct) return

    const toastId = toast.loading(`📦 Agregando ${units.length} unidades...`, {
      description: 'Esto puede tomar unos momentos'
    })

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/products/${selectedProduct.id}/units/bulk`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({ units })
        }
      )

      if (response.ok) {
        await fetchProducts()
        const updatedProducts = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/products`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        ).then(r => r.json())
        setSelectedProduct(updatedProducts.find((p: Product) => p.id === selectedProduct.id))

        toast.success(`✅ ${units.length} unidades agregadas exitosamente`, {
          id: toastId,
          description: `Se agregaron todas las unidades al inventario`,
          duration: 4000
        })
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error('❌ Error al agregar unidades', {
          id: toastId,
          description: errorData.error || 'Por favor verifica los datos',
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Error bulk adding units:', error)
      toast.error('❌ Error al agregar unidades', {
        id: toastId,
        description: 'Verifica tu conexión a internet',
        duration: 5000
      })
    }
  }

  const handleDeleteUnit = async (unitId: number) => {
    if (!selectedProduct) return

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/products/${selectedProduct.id}/units/${unitId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      )

      if (response.ok) {
        await fetchProducts()
        const updatedProducts = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/products`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        ).then(r => r.json())
        setSelectedProduct(updatedProducts.find((p: Product) => p.id === selectedProduct.id))
        toast.success('Unidad eliminada')
      } else {
        toast.error('Error al eliminar unidad')
      }
    } catch (error) {
      console.error('Error deleting unit:', error)
      toast.error('Error al eliminar unidad')
    }
  }

  // Variants Management
  const handleAddVariant = async (data: VariantFormData) => {
    if (!selectedProduct) return

    const toastId = toast.loading('📦 Agregando variante...', {
      description: 'Por favor espera'
    })

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/products/${selectedProduct.id}/variants`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            name: data.name,
            stock: parseInt(data.stock) || 0
          })
        }
      )

      if (response.ok) {
        await fetchProducts()
        const updatedProducts = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/products`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        ).then(r => r.json())
        setSelectedProduct(updatedProducts.find((p: Product) => p.id === selectedProduct.id))

        toast.success('✅ Variante agregada exitosamente', {
          id: toastId,
          description: `${data.name} - Stock: ${data.stock || 0}`,
          duration: 4000
        })
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error('❌ Error al agregar variante', {
          id: toastId,
          description: errorData.error || 'Por favor verifica los datos',
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Error adding variant:', error)
      toast.error('❌ Error al agregar variante', {
        id: toastId,
        description: 'Verifica tu conexión a internet',
        duration: 5000
      })
    }
  }

  const handleUpdateVariantStock = async (variantId: number, newStock: number) => {
    if (!selectedProduct) return

    const toastId = toast.loading('📦 Actualizando stock...', {
      description: 'Por favor espera'
    })

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/products/${selectedProduct.id}/variants/${variantId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({ stock: newStock })
        }
      )

      if (response.ok) {
        await fetchProducts()
        const updatedProducts = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/products`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        ).then(r => r.json())
        setSelectedProduct(updatedProducts.find((p: Product) => p.id === selectedProduct.id))

        toast.success('✅ Stock actualizado', {
          id: toastId,
          description: `Nuevo stock: ${newStock}`,
          duration: 3000
        })
      } else {
        toast.error('❌ Error al actualizar stock', {
          id: toastId,
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Error updating variant stock:', error)
      toast.error('❌ Error al actualizar stock', {
        id: toastId,
        description: 'Verifica tu conexión a internet',
        duration: 5000
      })
    }
  }

  const handleDeleteVariant = async (variantId: number) => {
    if (!selectedProduct) return

    const toastId = toast.loading('🗑️ Eliminando variante...', {
      description: 'Por favor espera'
    })

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/products/${selectedProduct.id}/variants/${variantId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      )

      if (response.ok) {
        await fetchProducts()
        const updatedProducts = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/products`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        ).then(r => r.json())
        setSelectedProduct(updatedProducts.find((p: Product) => p.id === selectedProduct.id))

        toast.success('✅ Variante eliminada', {
          id: toastId,
          duration: 3000
        })
      } else {
        toast.error('❌ Error al eliminar variante', {
          id: toastId,
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Error deleting variant:', error)
      toast.error('❌ Error al eliminar variante', {
        id: toastId,
        description: 'Verifica tu conexión a internet',
        duration: 5000
      })
    }
  }

  // Inventory Adjustment
  const handleInventoryAdjustment = async (data: InventoryAdjustmentData) => {
    if (!selectedProduct) return

    const quantity = parseInt(data.quantity)
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/products/${selectedProduct.id}/adjust-inventory`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            type: data.type,
            quantity: quantity,
            reason: data.reason
          })
        }
      )

      if (response.ok) {
        await fetchProducts()
        setAdjustmentDialogOpen(false)
        toast.success('✅ Ajuste de inventario realizado')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Error al realizar ajuste')
      }
    } catch (error) {
      console.error('Error adjusting inventory:', error)
      toast.error('Error al realizar ajuste')
    }
  }

  // Branch Transfer
  const handleBranchTransfer = async (data: BranchTransferData) => {
    if (!selectedProduct) return

    const quantity = parseInt(data.quantity)
    const toastId = toast.loading('Realizando traslado...')
    setIsSubmitting(true)
    
    console.log('Transfer data:', {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      targetBranchId: data.targetBranchId,
      quantity: quantity,
      reason: data.reason,
      hasVariants: selectedProduct.hasVariants
    })
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/products/${selectedProduct.id}/transfer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            targetBranchId: data.targetBranchId,
            quantity: quantity,
            reason: data.reason
          })
        }
      )

      if (response.ok) {
        await fetchProducts()
        setTransferDialogOpen(false)
        toast.success('✅ Traslado realizado exitosamente', {
          id: toastId,
          description: selectedProduct.hasVariants 
            ? `${quantity} unidades trasladadas (distribuidas entre variantes)`
            : `${quantity} unidades trasladadas`,
          duration: 5000
        })
      } else {
        const error = await response.json()
        console.error('Transfer error response:', error)
        toast.error('❌ Error al realizar traslado', {
          id: toastId,
          description: error.error || 'Verifica los datos e intenta nuevamente',
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Error transferring product:', error)
      toast.error('❌ Error al realizar traslado', {
        id: toastId,
        description: 'Verifica tu conexión a internet',
        duration: 5000
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Units Transfer
  const handleUnitsTransfer = async (data: UnitsTransferData) => {
    if (!selectedProduct) return

    const toastId = toast.loading('Trasladando unidades...')
    setIsSubmitting(true)
    
    console.log('Units transfer data:', {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      targetBranchId: data.targetBranchId,
      unitIds: data.unitIds,
      reason: data.reason
    })
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/products/${selectedProduct.id}/transfer-units`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            targetBranchId: data.targetBranchId,
            unitIds: data.unitIds,
            reason: data.reason
          })
        }
      )

      if (response.ok) {
        await fetchProducts()
        setUnitsTransferDialogOpen(false)
        toast.success('✅ Unidades trasladadas exitosamente', {
          id: toastId,
          description: `${data.unitIds.length} unidad${data.unitIds.length !== 1 ? 'es' : ''} trasladada${data.unitIds.length !== 1 ? 's' : ''}`,
          duration: 5000
        })
      } else {
        const error = await response.json()
        console.error('Units transfer error response:', error)
        toast.error('❌ Error al trasladar unidades', {
          id: toastId,
          description: error.error || 'Verifica los datos e intenta nuevamente',
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Error transferring units:', error)
      toast.error('❌ Error al trasladar unidades', {
        id: toastId,
        description: 'Verifica tu conexión a internet',
        duration: 5000
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Dialog Handlers
  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingProduct(null)
  }

  const openUnitsDialog = (product: Product) => {
    setSelectedProduct(product)
    setUnitsDialogOpen(true)
  }

  const openVariantsDialog = (product: Product) => {
    setSelectedProduct(product)
    setVariantsDialogOpen(true)
  }

  const openAdjustmentDialog = (product: Product) => {
    setSelectedProduct(product)
    setAdjustmentDialogOpen(true)
  }

  const openTransferDialog = async (product: Product) => {
    // For products with individual unit tracking, use units transfer dialog
    if (product.trackByUnit) {
      openUnitsTransferDialog(product)
      return
    }
    
    // Load variants if product has them
    if (product.hasVariants) {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/products/${product.id}/variants`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        )
        const data = await response.json()
        if (data.success && data.variants) {
          product.variants = data.variants
        }
      } catch (error) {
        console.error('Error loading variants:', error)
      }
    }
    
    setSelectedProduct(product)
    setTransferDialogOpen(true)
  }

  const openUnitsTransferDialog = (product: Product) => {
    setSelectedProduct(product)
    setUnitsTransferDialogOpen(true)
  }

  // Add Stock Handler (para asesores)
  const handleAddStock = async (data: { quantity: number; reason: string }) => {
    if (!selectedProduct) return

    const toastId = toast.loading('Agregando stock...')
    setIsSubmitting(true)

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/products/${selectedProduct.id}/add-stock`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify(data)
        }
      )

      if (response.ok) {
        await fetchProducts()
        setAddStockDialogOpen(false)
        toast.success('✅ Stock agregado exitosamente', {
          id: toastId,
          description: `+${data.quantity} unidades agregadas`,
          duration: 5000
        })
      } else {
        const error = await response.json()
        toast.error('❌ Error al agregar stock', {
          id: toastId,
          description: error.error || 'Verifica los datos e intenta nuevamente',
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Error adding stock:', error)
      toast.error('❌ Error al agregar stock', {
        id: toastId,
        description: 'Verifica tu conexión a internet',
        duration: 5000
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openAddStockDialog = (product: Product) => {
    setSelectedProduct(product)
    setAddStockDialogOpen(true)
  }

  // Export Handler (solo administradores)
  const handleExport = () => {
    if (userRole !== 'admin') {
      toast.error('Solo los administradores pueden exportar el inventario')
      return
    }
    
    try {
      exportProductsToCSV(filteredProducts, branches)
      toast.success('Inventario exportado exitosamente')
    } catch (error) {
      console.error('Error exporting:', error)
      toast.error('Error al exportar inventario')
    }
  }

  // Load Transaction History (solo administradores)
  const loadTransactionHistory = async () => {
    if (userRole !== 'admin') {
      toast.error('Solo los administradores pueden ver el historial')
      return
    }

    setLoadingTransactions(true)
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/products/transactions`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )

      if (!response.ok) throw new Error('Error al cargar historial')

      const data = await response.json()
      
      // Enrich transactions with branch names
      const enrichedTransactions = data.transactions.map((t: ProductTransaction) => ({
        ...t,
        branchName: branches.find(b => b.id === t.branchId)?.name || 'Sin sucursal',
        targetBranchName: t.targetBranchId ? branches.find(b => b.id === t.targetBranchId)?.name : undefined
      }))
      
      setTransactions(enrichedTransactions)
      setHistoryDialogOpen(true)
    } catch (error) {
      console.error('Error loading transactions:', error)
      toast.error('Error al cargar el historial de transacciones')
    } finally {
      setLoadingTransactions(false)
    }
  }

  usePageHeader({
    title: 'Productos',
    subtitle: loading
      ? 'Cargando inventario…'
      : `${filteredProducts.length} de ${products.length} ${products.length === 1 ? 'producto' : 'productos'}`,
    eyebrow: 'Inventario',
    onRefresh: fetchProducts,
    refreshing: loading,
  })

  if (loading) {
    return (
      <PageBody>
        <Card style={{ height: 200 }} bodyStyle={{ display: 'grid', placeItems: 'center' }}>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: '2px solid var(--border-subtle)',
              borderBottomColor: 'var(--accent-400)',
              animation: 'oryon-spin 900ms linear infinite',
            }}
          />
        </Card>
      </PageBody>
    )
  }

  const lowStockCount = filteredProducts.filter(
    (p) => getAvailableStock(p) > 0 && isLowStock(p, lowStockThreshold)
  ).length

  const branchName = (id: string) => branches.find((b) => b.id === id)?.name || 'Sin sucursal'
  const categoryLabel = (value: string) =>
    PRODUCT_CATEGORIES.find((c) => c.value === value)?.label || value

  const columns: Column<Product>[] = [
    { key: 'name', label: 'Producto' },
    { key: 'category', label: 'Categoría', muted: true, render: (p) => categoryLabel(p.category) },
    { key: 'branch', label: 'Sucursal', muted: true, hideOnCompact: true, render: (p) => branchName(p.branchId) },
    { key: 'price', label: 'Precio', mono: true, align: 'right', render: (p) => formatPrice(p.price) },
    {
      key: 'cost',
      label: 'Costo',
      mono: true,
      align: 'right',
      hideOnCompact: true,
      render: (p) => (p.cost ? formatPrice(p.cost) : '—'),
    },
    {
      key: 'margin',
      label: 'Margen',
      mono: true,
      align: 'right',
      hideOnCompact: true,
      render: (p) => {
        const m = getMarginPercentage(p)
        return m ? `${m}%` : '—'
      },
    },
    {
      key: 'stock',
      label: 'Stock',
      align: 'right',
      render: (p) => {
        const stock = getAvailableStock(p)
        const low = isLowStock(p, lowStockThreshold)
        if (stock === 0) return <Badge tone="danger">Agotado</Badge>
        return <Badge tone={low ? 'warning' : 'neutral'}>{low ? `${stock} bajo` : `${stock} u.`}</Badge>
      },
    },
  ]

  const detailActions = detailProduct && (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <Button
        fullWidth
        iconLeft={ArrowUpDown}
        onClick={() => { openAdjustmentDialog(detailProduct); setDetailProduct(null) }}
      >
        Ajustar
      </Button>
      <Button
        variant="primary"
        fullWidth
        iconLeft={ArrowLeftRight}
        onClick={() => { openTransferDialog(detailProduct); setDetailProduct(null) }}
      >
        Trasladar
      </Button>
      <Button
        fullWidth
        iconLeft={Pencil}
        onClick={() => { openEditDialog(detailProduct); setDetailProduct(null) }}
      >
        Editar
      </Button>
      <Button
        variant="danger"
        fullWidth
        iconLeft={Trash2}
        onClick={() => { handleDeleteProduct(detailProduct.id); setDetailProduct(null) }}
      >
        Eliminar
      </Button>
    </div>
  )

  return (
    <>
      <ListPage<Product>
        rows={filteredProducts}
        columns={columns}
        rowKey="id"
        selectedId={detailProduct?.id ?? null}
        onRowClick={(p) => setDetailProduct((current) => (current?.id === p.id ? null : p))}
        renderCard={(p) => (
          <ProductListCard
            product={p}
            branches={branches}
            threshold={lowStockThreshold}
            onOpen={() => setDetailProduct(p)}
          />
        )}
        search={{
          value: filters.searchTerm,
          onChange: (v) => setFilters({ ...filters, searchTerm: v }),
          placeholder: 'Nombre, descripción, IMEI, SKU…',
        }}
        filters={[
          {
            id: 'category',
            label: 'Categoría',
            placeholder: 'Todas las categorías',
            value: filters.categoryFilter === 'all' ? '' : filters.categoryFilter,
            options: PRODUCT_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
            onChange: (v) => setFilters({ ...filters, categoryFilter: v || 'all' }),
          },
          {
            id: 'branch',
            label: 'Sucursal',
            placeholder: 'Todas las sucursales',
            value: filters.branchFilter === 'all' ? '' : filters.branchFilter,
            options: branches.map((b) => ({ value: b.id, label: b.name })),
            onChange: (v) => setFilters({ ...filters, branchFilter: v || 'all' }),
          },
          {
            id: 'stock',
            label: 'Estado de stock',
            placeholder: 'Todo el stock',
            value: filters.stockFilter === 'all' ? '' : filters.stockFilter,
            options: [
              { value: 'low', label: 'Stock bajo' },
              { value: 'in', label: 'Stock normal' },
              { value: 'out', label: 'Agotado' },
            ],
            onChange: (v) => setFilters({ ...filters, stockFilter: v || 'all' }),
          },
        ]}
        onClearFilters={() =>
          setFilters({ searchTerm: filters.searchTerm, categoryFilter: 'all', branchFilter: 'all', stockFilter: 'all' })
        }
        primaryAction={
          availableBranches.length > 0
            ? { label: 'Nuevo producto', icon: Plus, onClick: () => setDialogOpen(true) }
            : undefined
        }
        onExport={isAdmin ? handleExport : undefined}
        secondaryActions={
          isAdmin ? (
            <IconButton
              icon={History}
              label="Historial de transacciones"
              variant="secondary"
              size={isMobile ? 'lg' : 'sm'}
              disabled={loadingTransactions}
              onClick={loadTransactionHistory}
              style={isMobile ? { width: 'var(--tap-target)', height: 'var(--control-height-lg)' } : undefined}
            />
          ) : undefined
        }
        tableTitle="Inventario"
        tableSubtitle={`${filteredProducts.length} ${filteredProducts.length === 1 ? 'producto' : 'productos'}${
          lowStockCount ? ` · ${lowStockCount} con stock bajo` : ''
        }`}
        countLabel={(shown, total) => `Mostrando ${shown} de ${total} productos`}
        endLabel={(total) => `Fin de la lista · ${total} productos`}
        empty={{
          icon: PackageSearch,
          title: products.length === 0 ? 'Sin productos' : 'Sin resultados',
          description:
            products.length === 0
              ? 'Aún no hay productos en el inventario. Crea el primero para empezar a vender.'
              : 'Ningún producto coincide con la búsqueda o los filtros aplicados.',
        }}
        banner={
          userRole === 'asesor' && availableBranches.length === 0 ? (
            <Alert variant="warning" title="Sin sucursales asignadas">
              Pide a tu administrador que te asigne una sucursal para poder crear productos.
            </Alert>
          ) : undefined
        }
      />

      <ResponsiveDetail
        open={detailProduct != null}
        onClose={() => setDetailProduct(null)}
        kind="Detalle de producto"
        title={detailProduct?.name ?? ''}
        meta={
          detailProduct
            ? `${categoryLabel(detailProduct.category)} · ${branchName(detailProduct.branchId)}`
            : undefined
        }
        actions={detailActions}
      >
        {detailProduct && (
          <>
            {isLowStock(detailProduct, lowStockThreshold) && (
              <Alert variant="warning" title="Stock bajo">
                Quedan {getAvailableStock(detailProduct)} unidades y el mínimo configurado es{' '}
                {detailProduct.minStock ?? lowStockThreshold}. Programa una compra al proveedor.
              </Alert>
            )}
            <KeyValue
              layout="stacked"
              columns={detailColumns}
              items={[
                { label: 'Precio de venta', value: formatPrice(detailProduct.price), mono: true },
                { label: 'Costo', value: detailProduct.cost ? formatPrice(detailProduct.cost) : '—', mono: true },
                {
                  label: 'Margen',
                  value: getMarginPercentage(detailProduct) ? `${getMarginPercentage(detailProduct)}%` : '—',
                  mono: true,
                },
                { label: 'Stock actual', value: getAvailableStock(detailProduct), mono: true },
                { label: 'Stock mínimo', value: detailProduct.minStock ?? lowStockThreshold, mono: true },
                { label: 'Sucursal', value: branchName(detailProduct.branchId) },
                { label: 'Almacenamiento', value: detailProduct.storage || '—' },
                { label: 'RAM', value: detailProduct.ram || '—' },
                { label: 'Color', value: detailProduct.color || '—' },
                {
                  label: 'Control por unidad',
                  value: detailProduct.trackByUnit ? 'Sí · por IMEI/serie' : 'No · por cantidad',
                },
                {
                  label: 'Variantes',
                  value: detailProduct.hasVariants
                    ? `${detailProduct.variants?.length ?? 0} activas`
                    : 'Sin variantes',
                },
                {
                  label: 'Creado',
                  value: detailProduct.createdAt
                    ? new Date(detailProduct.createdAt).toLocaleDateString('es-CO')
                    : '—',
                  mono: true,
                },
              ]}
            />
            {detailProduct.description && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span
                  style={{
                    fontSize: 'var(--text-caption)',
                    letterSpacing: 'var(--tr-caption)',
                    textTransform: 'uppercase',
                    fontWeight: 'var(--fw-semibold)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  Descripción
                </span>
                <span style={{ fontSize: 'var(--text-small)', color: 'var(--text-secondary)', textWrap: 'pretty' }}>
                  {detailProduct.description}
                </span>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {detailProduct.trackByUnit && (
                <Button fullWidth onClick={() => { openUnitsDialog(detailProduct); setDetailProduct(null) }}>
                  Unidades
                </Button>
              )}
              {detailProduct.hasVariants && (
                <Button fullWidth onClick={() => { openVariantsDialog(detailProduct); setDetailProduct(null) }}>
                  Variantes
                </Button>
              )}
              {!detailProduct.trackByUnit && !detailProduct.hasVariants && (
                <Button fullWidth onClick={() => { openAddStockDialog(detailProduct); setDetailProduct(null) }}>
                  Agregar stock
                </Button>
              )}
            </div>
          </>
        )}
      </ResponsiveDetail>

      {/* Nuevo / editar producto */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
            <DialogDescription>
              {editingProduct
                ? 'Actualiza la información del producto'
                : 'Crea un nuevo producto en tu inventario'}
            </DialogDescription>
          </DialogHeader>
          <ProductForm
            product={editingProduct}
            branches={availableBranches}
            onSubmit={handleSubmitProduct}
            onCancel={closeDialog}
            isSubmitting={isSubmitting}
            userRole={userRole}
          />
        </DialogContent>
      </Dialog>

      {/* Units Management Dialog */}
      <Dialog open={unitsDialogOpen} onOpenChange={setUnitsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">
              Gestionar Unidades - {selectedProduct?.name}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Agrega y gestiona unidades individuales con sus IMEI/Serial únicos
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <UnitsManagement
              product={selectedProduct}
              onAddUnit={handleAddUnit}
              onAddBulkUnits={handleAddBulkUnits}
              onDeleteUnit={handleDeleteUnit}
              canEdit={canEditProduct(userRole || 'asesor', userBranchId, selectedProduct.branchId, userAssignedBranches)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Variants Management Dialog */}
      <Dialog open={variantsDialogOpen} onOpenChange={setVariantsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">
              Gestionar Variantes - {selectedProduct?.name}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Agrega y gestiona variantes por color del producto
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <VariantsManagement
              product={selectedProduct}
              onAddVariant={handleAddVariant}
              onUpdateVariantStock={handleUpdateVariantStock}
              onDeleteVariant={handleDeleteVariant}
              canEdit={canEditProduct(userRole || 'asesor', userBranchId, selectedProduct.branchId, userAssignedBranches)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Inventory Adjustment Dialog - Solo Administradores */}
      {isAdmin && (
        <Dialog open={adjustmentDialogOpen} onOpenChange={setAdjustmentDialogOpen}>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base md:text-lg">Ajuste de Inventario</DialogTitle>
              <DialogDescription className="text-sm">
                Ajusta el stock de {selectedProduct?.name}
              </DialogDescription>
            </DialogHeader>
            {selectedProduct && (
              <InventoryAdjustment
                product={selectedProduct}
                onAdjust={handleInventoryAdjustment}
                onCancel={() => setAdjustmentDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Branch Transfer Dialog - Solo Administradores */}
      {isAdmin && (
        <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base md:text-lg">Traslado Entre Sucursales</DialogTitle>
              <DialogDescription className="text-sm">
                Mueve inventario de {selectedProduct?.name} a otra sucursal
              </DialogDescription>
            </DialogHeader>
            {selectedProduct && (
              <BranchTransfer
                product={selectedProduct}
                branches={branches}
                onTransfer={handleBranchTransfer}
                onCancel={() => setTransferDialogOpen(false)}
                isLoading={isSubmitting}
              />
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Units Transfer Dialog - Solo Administradores */}
      {isAdmin && (
        <Dialog open={unitsTransferDialogOpen} onOpenChange={setUnitsTransferDialogOpen}>
          <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base md:text-lg">Traslado de Unidades</DialogTitle>
              <DialogDescription className="text-sm">
                Selecciona las unidades de {selectedProduct?.name} que deseas trasladar
              </DialogDescription>
            </DialogHeader>
            {selectedProduct && (
              <UnitsTransfer
                product={selectedProduct}
                branches={branches}
                onTransfer={handleUnitsTransfer}
                onCancel={() => setUnitsTransferDialogOpen(false)}
                isLoading={isSubmitting}
              />
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Transaction History Dialog - Solo Administradores */}
      {isAdmin && (
        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto w-[95vw]">
            <DialogHeader>
              <DialogTitle className="text-lg md:text-xl flex items-center gap-2">
                <History size={24} />
                Historial de Transacciones de Productos
              </DialogTitle>
              <DialogDescription className="text-sm">
                Consulta todas las operaciones realizadas en el inventario de todas las sucursales
              </DialogDescription>
            </DialogHeader>
            <ProductTransactionHistory
              transactions={transactions}
              branches={branches}
              isLoading={loadingTransactions}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Add Stock Dialog - Para Asesores */}
      <Dialog open={addStockDialogOpen} onOpenChange={setAddStockDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">Agregar Stock</DialogTitle>
            <DialogDescription className="text-sm">
              Aumenta el inventario cuando recibas nuevos productos
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <AddStock
              product={selectedProduct}
              onAdd={handleAddStock}
              onCancel={() => setAddStockDialogOpen(false)}
              isLoading={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
