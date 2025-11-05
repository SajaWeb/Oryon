import { useEffect, useState } from 'react'
import { projectId } from '../utils/supabase/info'
import { Plus, Trash2, ShoppingCart, Printer, Package, Check, User, Search, X } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { toast } from 'sonner@2.0.3'
import { SaleCard } from './sales/SaleCard'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './ui/pagination'
import { Checkbox } from './ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover'
import { printInvoice, InvoiceData, PrintConfig } from '../utils/print'

interface ProductUnit {
  id: number
  productId: number
  imei?: string
  serialNumber?: string
  status: 'available' | 'sold' | 'in_repair'
  createdAt?: string
}

interface ProductVariant {
  id: number
  productId: number
  name: string
  sku?: string
  stock: number
  createdAt?: string
}

interface Product {
  id: number
  name: string
  category: string
  price: number
  cost?: number
  storage?: string
  ram?: string
  color?: string
  trackByUnit?: boolean
  hasVariants?: boolean
  quantity?: number
  units?: ProductUnit[]
  variants?: ProductVariant[]
  branchId?: string
}

interface CartItem {
  productId: number
  productName: string
  price: number
  cost?: number
  quantity: number
  unitIds?: number[]
  unitDetails?: string[]
  variantId?: number
  variantName?: string
}

interface Sale {
  id: number
  invoiceNumber?: string
  items: CartItem[]
  total: number
  totalCost?: number
  customerName: string
  customerPhone?: string
  createdAt: string
  paymentMethod?: string
  type?: 'product' | 'repair'
  repairId?: number
  notes?: string
  laborItems?: Array<{
    description: string
    hours: number
    hourlyRate: number
  }>
  parts?: Array<{
    description: string
    purchaseCost: number
    salePrice: number
    quantity: number
  }>
  status?: 'active' | 'cancelled'
  cancelledBy?: string
  cancelledAt?: string
  cancelReason?: string
  creditDays?: number
  creditDueDate?: string
  amountPaid?: number
}

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  branchId?: string
  assignedBranches?: string[]
  companyId: string
}

interface SalesProps {
  accessToken: string
  userName: string
  userRole: string
  userProfile?: UserProfile
}

export function Sales({ accessToken, userName, userRole, userProfile }: SalesProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [selectedUnits, setSelectedUnits] = useState<number[]>([])
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null)
  const [variantQuantity, setVariantQuantity] = useState<number>(1)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [customerIdType, setCustomerIdType] = useState('')
  const [customerIdNumber, setCustomerIdNumber] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [selectedBranchId, setSelectedBranchId] = useState<string>('')
  const [branches, setBranches] = useState<any[]>([])
  const [paymentMethod, setPaymentMethod] = useState<string>('Efectivo')
  const [creditDays, setCreditDays] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [unitSelectionOpen, setUnitSelectionOpen] = useState(false)
  const [variantSelectionOpen, setVariantSelectionOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [customers, setCustomers] = useState<any[]>([])
  const [identificationTypes, setIdentificationTypes] = useState<string[]>(['Cédula', 'NIT', 'Pasaporte'])
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [newCustomerDialogOpen, setNewCustomerDialogOpen] = useState(false)
  const [productSearchOpen, setProductSearchOpen] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  
  // Filtros
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPaymentType, setFilterPaymentType] = useState<string>('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  useEffect(() => {
    fetchProducts()
    fetchSales()
    fetchCustomers()
    fetchCompanySettings()
    fetchBranches()
  }, [])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filterStatus, filterPaymentType, filterDateFrom, filterDateTo])

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
        let availableBranches = data.branches || []
        
        // For advisors, filter to show only their assigned branches
        if (userRole === 'asesor' && userProfile) {
          const assignedBranches = userProfile.assignedBranches || []
          const legacyBranchId = userProfile.branchId
          
          if (assignedBranches.length > 0) {
            availableBranches = availableBranches.filter((b: any) => 
              assignedBranches.includes(b.id)
            )
          } else if (legacyBranchId) {
            availableBranches = availableBranches.filter((b: any) => 
              b.id === legacyBranchId
            )
          }
        }
        
        setBranches(availableBranches)
        // Set default branch to first branch if available
        if (availableBranches.length > 0 && !selectedBranchId) {
          setSelectedBranchId(availableBranches[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching branches:', error)
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
      const data = await response.json()
      if (Array.isArray(data)) {
        // Filter products with available stock (units, variants, or quantity)
        let productsWithStock = data.filter((p: Product) => {
          if (p.trackByUnit) {
            const availableUnits = p.units?.filter(u => u.status === 'available').length || 0
            return availableUnits > 0
          } else if (p.hasVariants) {
            const totalVariantStock = p.variants?.reduce((sum, v) => sum + v.stock, 0) || 0
            return totalVariantStock > 0
          } else {
            return (p.quantity || 0) > 0
          }
        })

        // For advisors, only show products from their assigned branches
        if (userRole === 'asesor' && userProfile) {
          const assignedBranches = userProfile.assignedBranches || []
          const legacyBranchId = userProfile.branchId
          
          productsWithStock = productsWithStock.filter((p: Product) => {
            // Support both new assignedBranches and legacy branchId
            if (assignedBranches.length > 0) {
              return assignedBranches.includes(p.branchId || '')
            }
            // Fallback to legacy branchId
            return p.branchId === legacyBranchId
          })
        }
        
        setProducts(productsWithStock)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSales = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/sales`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      )
      const data = await response.json()
      if (data.success) {
        const parsed = data.sales.map((s: string) => JSON.parse(s))
        setSales(parsed.sort((a: Sale, b: Sale) => b.id - a.id))
      }
    } catch (error) {
      console.error('Error fetching sales:', error)
    }
  }

  const fetchCustomers = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/customers`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      )
      const data = await response.json()
      if (data.success) {
        const parsed = data.customers.map((c: string) => JSON.parse(c))
        setCustomers(parsed.sort((a: any, b: any) => a.name.localeCompare(b.name)))
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const fetchCompanySettings = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/company/info`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )
      const data = await response.json()
      if (data.success && data.company.identificationTypes) {
        setIdentificationTypes(data.company.identificationTypes)
      }
    } catch (error) {
      console.error('Error fetching company settings:', error)
      // Keep default values if fetch fails
    }
  }

  const openUnitSelection = () => {
    if (!selectedProductId) {
      toast.error('Selecciona un producto primero')
      return
    }
    
    const productsForBranch = selectedBranchId 
      ? products.filter(p => (p as any).branchId === selectedBranchId)
      : products
    
    const product = productsForBranch.find(p => p.id === parseInt(selectedProductId))
    if (!product) return
    
    // If product tracks by individual units (IMEI/Serial)
    if (product.trackByUnit) {
      setSelectedUnits([])
      setProductSearch('')
      setUnitSelectionOpen(true)
      return
    }
    
    // If product has variants (colors)
    if (product.hasVariants) {
      setSelectedVariantId(null)
      setVariantQuantity(1)
      setVariantSelectionOpen(true)
      return
    }
    
    // Simple quantity product - add directly
    addQuantityProductToCart(product)
  }

  const addQuantityProductToCart = (product: Product, quantityToAdd: number = 1) => {
    const existingItem = cart.find(item => item.productId === product.id)
    if (existingItem) {
      setCart(cart.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + quantityToAdd }
          : item
      ))
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        price: product.price,
        cost: product.cost || 0,
        quantity: quantityToAdd
      }])
    }
    setSelectedProductId('')
  }

  const toggleUnitSelection = (unitId: number) => {
    if (selectedUnits.includes(unitId)) {
      setSelectedUnits(selectedUnits.filter(id => id !== unitId))
    } else {
      setSelectedUnits([...selectedUnits, unitId])
    }
  }

  const addToCart = () => {
    if (!selectedProductId) return

    const productsForBranch = selectedBranchId 
      ? products.filter(p => (p as any).branchId === selectedBranchId)
      : products

    const product = productsForBranch.find(p => p.id === parseInt(selectedProductId))
    if (!product) return

    // Track by individual units (IMEI/Serial)
    if (product.trackByUnit) {
      if (selectedUnits.length === 0) {
        toast.error('Selecciona al menos una unidad para agregar al carrito')
        return
      }

      const unitDetails = selectedUnits.map(unitId => {
        const unit = product.units?.find(u => u.id === unitId)
        if (unit) {
          return unit.imei || unit.serialNumber || `Unidad #${unitId}`
        }
        return `Unidad #${unitId}`
      })

      const existingItem = cart.find(item => item.productId === product.id)
      if (existingItem) {
        setCart(cart.map(item =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + selectedUnits.length,
                unitIds: [...(item.unitIds || []), ...selectedUnits],
                unitDetails: [...(item.unitDetails || []), ...unitDetails]
              }
            : item
        ))
      } else {
        setCart([...cart, {
          productId: product.id,
          productName: product.name,
          price: product.price,
          cost: product.cost || 0,
          quantity: selectedUnits.length,
          unitIds: selectedUnits,
          unitDetails
        }])
      }

      setSelectedProductId('')
      setSelectedUnits([])
      setProductSearch('')
      setUnitSelectionOpen(false)
      toast.success(`${selectedUnits.length} unidad${selectedUnits.length !== 1 ? 'es' : ''} agregada${selectedUnits.length !== 1 ? 's' : ''} al carrito`)
    } 
    // Track by variants (colors)
    else if (product.hasVariants) {
      if (!selectedVariantId) {
        toast.error('Selecciona una variante (color) para agregar al carrito')
        return
      }

      const variant = product.variants?.find(v => v.id === selectedVariantId)
      if (!variant) {
        toast.error('Variante no encontrada')
        return
      }

      if (variantQuantity <= 0 || variantQuantity > variant.stock) {
        toast.error(`Cantidad inválida. Stock disponible: ${variant.stock}`)
        return
      }

      // Check if this variant is already in cart
      const existingItem = cart.find(item => 
        item.productId === product.id && item.variantId === selectedVariantId
      )

      if (existingItem) {
        const newQuantity = existingItem.quantity + variantQuantity
        if (newQuantity > variant.stock) {
          toast.error(`No hay suficiente stock. Disponible: ${variant.stock}`)
          return
        }
        setCart(cart.map(item =>
          item.productId === product.id && item.variantId === selectedVariantId
            ? { ...item, quantity: newQuantity }
            : item
        ))
      } else {
        setCart([...cart, {
          productId: product.id,
          productName: `${product.name} - ${variant.name}`,
          price: product.price,
          cost: product.cost || 0,
          quantity: variantQuantity,
          variantId: selectedVariantId,
          variantName: variant.name
        }])
      }

      setSelectedProductId('')
      setSelectedVariantId(null)
      setVariantQuantity(1)
      setVariantSelectionOpen(false)
      toast.success(`${variantQuantity} ${variant.name} agregado${variantQuantity !== 1 ? 's' : ''} al carrito`)
    }
    // Simple quantity tracking
    else {
      // This case should be handled in the UI directly without opening a dialog
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        price: product.price,
        cost: product.cost || 0,
        quantity: 1
      }])
      setSelectedProductId('')
    }
  }

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.productId !== productId))
  }

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }

  const calculateTotalCost = () => {
    return cart.reduce((sum, item) => sum + ((item.cost || 0) * item.quantity), 0)
  }

  const handlePrintInvoice = async (sale: Sale) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/company/print-config`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      )
      
      const data = await response.json()
      if (!data.success || !data.printConfig) {
        toast.error('Por favor configura la impresión en Configuración primero')
        return
      }

      const printConfig = data.printConfig

      const invoiceData: InvoiceData = {
        invoiceNumber: sale.invoiceNumber || `FACT-${sale.id}`,
        date: new Date(sale.createdAt).toLocaleString('es-CO'),
        customerName: sale.customerName,
        items: sale.items.map(item => ({
          name: item.productName,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity
        })),
        subtotal: sale.total,
        total: sale.total,
        paymentMethod: sale.paymentMethod || 'Efectivo'
      }

      printInvoice(invoiceData, printConfig)
      toast.success('Factura enviada a impresión')
    } catch (error) {
      console.error('Error loading print config:', error)
      toast.error('Error al cargar la configuración de impresión')
    }
  }

  const findOrCreateCustomer = async () => {
    // Try to find existing customer
    const customersResponse = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/customers`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    )
    
    const customersData = await customersResponse.json()
    if (customersData.success) {
      const customers = customersData.customers.map((c: string) => JSON.parse(c))
      const existingCustomer = customers.find((c: any) => {
        // Buscar por nombre exacto
        if (c.name.toLowerCase() === customerName.toLowerCase()) {
          return true
        }
        // Buscar por teléfono
        if (customerPhone && customerPhone.trim() && c.phone === customerPhone) {
          return true
        }
        // Buscar por número de identificación
        if (customerIdNumber && customerIdNumber.trim() && 
            c.identificationNumber && 
            c.identificationNumber.toLowerCase().trim() === customerIdNumber.toLowerCase().trim()) {
          return true
        }
        return false
      })
      
      if (existingCustomer) {
        return existingCustomer.id
      }
    }
    
    // Create new customer
    const createResponse = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/customers`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: customerName,
          email: customerEmail || `${customerName.toLowerCase().replace(/\s+/g, '.')}@cliente.com`,
          phone: customerPhone || 'N/A',
          address: customerAddress || '',
          identificationType: customerIdType,
          identificationNumber: customerIdNumber
        })
      }
    )
    
    const createData = await createResponse.json()
    if (createData.success) {
      return createData.customer.id
    } else {
      // Error al crear cliente (puede ser duplicado)
      throw new Error(createData.error || 'Error al crear el cliente')
    }
  }

  const handleSelectCustomer = (customer: any) => {
    setSelectedCustomerId(customer.id)
    setCustomerName(customer.name)
    setCustomerPhone(customer.phone || '')
    setCustomerEmail(customer.email || '')
    setCustomerAddress(customer.address || '')
    setCustomerIdType(customer.identificationType || '')
    setCustomerIdNumber(customer.identificationNumber || '')
    setCustomerSearch('')
    setCustomerSearchOpen(false)
  }

  const handleCreateNewCustomer = async () => {
    if (!customerName.trim()) {
      toast.error('Ingresa el nombre del cliente')
      return
    }

    if (!customerIdType || !customerIdNumber) {
      toast.error('Ingresa el tipo y número de identificación')
      return
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/customers`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: customerName,
            email: customerEmail || `${customerName.toLowerCase().replace(/\s+/g, '.')}@cliente.com`,
            phone: customerPhone || 'N/A',
            address: customerAddress || '',
            identificationType: customerIdType,
            identificationNumber: customerIdNumber
          })
        }
      )

      const data = await response.json()
      if (data.success) {
        setSelectedCustomerId(data.customer.id)
        fetchCustomers()
        setNewCustomerDialogOpen(false)
        toast.success('Cliente creado exitosamente')
      } else {
        toast.error('Error al crear cliente: ' + (data.error || 'Error desconocido'))
      }
    } catch (error) {
      console.error('Error creating customer:', error)
      toast.error('Error al crear cliente')
    }
  }

  const clearCustomerForm = () => {
    setSelectedCustomerId(null)
    setCustomerName('')
    setCustomerPhone('')
    setCustomerEmail('')
    setCustomerAddress('')
    setCustomerIdType('')
    setCustomerIdNumber('')
    setCustomerSearch('')
  }

  const completeSale = async () => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío')
      return
    }

    if (!customerName.trim()) {
      toast.error('Ingresa el nombre del cliente')
      return
    }

    if (!selectedBranchId) {
      toast.error('Selecciona una sucursal para la venta')
      return
    }

    if (paymentMethod === 'Crédito' && creditDays <= 0) {
      toast.error('Ingresa los días de crédito')
      return
    }

    try {
      const customerId = await findOrCreateCustomer()
      
      const saleData: any = {
        items: cart,
        total: calculateTotal(),
        totalCost: calculateTotalCost(),
        customerName,
        customerPhone,
        customerId,
        paymentMethod,
        status: 'active',
        type: 'product',
        branchId: selectedBranchId
      }

      if (paymentMethod === 'Crédito') {
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + creditDays)
        saleData.creditDays = creditDays
        saleData.creditDueDate = dueDate.toISOString()
        saleData.amountPaid = 0
      }
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/sales`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(saleData)
        }
      )

      const data = await response.json()
      if (data.success) {
        // Print invoice if config is available
        try {
          const configResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/company/print-config`,
            {
              headers: { Authorization: `Bearer ${accessToken}` }
            }
          )
          
          const configData = await configResponse.json()
          if (configData.success && configData.printConfig) {
            const printConfig = configData.printConfig
            
            const invoiceData: InvoiceData = {
              invoiceNumber: data.sale.invoiceNumber || `FACT-${data.sale.id || Date.now()}`,
              date: new Date().toLocaleString('es-CO'),
              customerName,
              items: cart.map(item => ({
                name: item.productName,
                quantity: item.quantity,
                price: item.price,
                total: item.price * item.quantity
              })),
              subtotal: calculateTotal(),
              total: calculateTotal(),
              paymentMethod
            }
            
            const shouldPrint = confirm('¿Deseas imprimir la factura?')
            if (shouldPrint) {
              printInvoice(invoiceData, printConfig)
            }
          }
        } catch (configError) {
          console.error('Error loading print config:', configError)
        }
        
        setCart([])
        setCustomerName('')
        setCustomerPhone('')
        setCustomerEmail('')
        setPaymentMethod('Efectivo')
        setCreditDays(0)
        setDialogOpen(false)
        fetchProducts()
        fetchSales()
        toast.success('Venta completada exitosamente')
      } else {
        console.error('Error completing sale:', data.error)
        toast.error('Error al completar la venta: ' + (data.error || 'Error desconocido'))
      }
    } catch (error) {
      console.error('Error completing sale:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error al completar la venta'
      toast.error(errorMessage)
    }
  }

  const handleCancelSale = async () => {
    if (!selectedSale || !cancelReason.trim()) {
      toast.error('Ingresa la razón de anulación')
      return
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/sales/${selectedSale.id}/cancel`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            cancelReason,
            cancelledBy: userName
          })
        }
      )

      const data = await response.json()
      if (data.success) {
        fetchSales()
        setCancelDialogOpen(false)
        setSelectedSale(null)
        setCancelReason('')
        toast.success('Factura anulada exitosamente')
      } else {
        console.error('Error cancelling sale:', data.error)
        toast.error('Error al anular la factura: ' + (data.error || 'Error desconocido'))
      }
    } catch (error) {
      console.error('Error cancelling sale:', error)
      toast.error('Error al anular la factura')
    }
  }

  const getCreditStatus = (sale: Sale) => {
    if (sale.paymentMethod !== 'Crédito' || !sale.creditDueDate) return null

    const now = new Date()
    const dueDate = new Date(sale.creditDueDate)
    const diffTime = dueDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { status: 'overdue', days: Math.abs(diffDays), label: `${Math.abs(diffDays)} días en mora` }
    } else if (diffDays === 0) {
      return { status: 'due-today', days: 0, label: 'Vence hoy' }
    } else {
      return { status: 'pending', days: diffDays, label: `${diffDays} días restantes` }
    }
  }

  const filterSales = () => {
    let filtered = sales

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(sale => {
        if (filterStatus === 'active') return sale.status !== 'cancelled'
        if (filterStatus === 'cancelled') return sale.status === 'cancelled'
        return true
      })
    }

    // Filter by payment type
    if (filterPaymentType !== 'all') {
      if (filterPaymentType === 'credit') {
        filtered = filtered.filter(sale => sale.paymentMethod === 'Crédito')
      } else if (filterPaymentType === 'overdue') {
        filtered = filtered.filter(sale => {
          const creditStatus = getCreditStatus(sale)
          return creditStatus?.status === 'overdue'
        })
      } else {
        filtered = filtered.filter(sale => sale.paymentMethod !== 'Crédito')
      }
    }

    // Filter by date range
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom)
      fromDate.setHours(0, 0, 0, 0)
      filtered = filtered.filter(sale => new Date(sale.createdAt) >= fromDate)
    }

    if (filterDateTo) {
      const toDate = new Date(filterDateTo)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(sale => new Date(sale.createdAt) <= toDate)
    }

    return filtered
  }

  const selectedProduct = products.find(p => p.id === parseInt(selectedProductId))
  const availableUnits = selectedProduct?.units?.filter(u => u.status === 'available') || []
  const filteredSales = filterSales()
  
  // Filter products by selected branch
  const productsForSelectedBranch = selectedBranchId 
    ? products.filter(p => (p as any).branchId === selectedBranchId)
    : products

  // Pagination logic
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedSales = filteredSales.slice(startIndex, endIndex)

  if (loading) {
    return <div className="p-8">Cargando...</div>
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-8 gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl mb-1 sm:mb-2">Ventas</h2>
          <p className="text-sm sm:text-base text-gray-600">Punto de venta y registro de transacciones</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto h-10 sm:h-auto">
              <ShoppingCart size={20} className="mr-2" />
              Nueva Venta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Nueva Venta</DialogTitle>
              <DialogDescription>Registra una nueva venta agregando productos al carrito</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Customer Search and Selection */}
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <Label>Información del Cliente *</Label>
                  {selectedCustomerId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearCustomerForm}
                    >
                      <Plus size={16} className="mr-1" />
                      Cambiar Cliente
                    </Button>
                  )}
                </div>

                {!selectedCustomerId ? (
                  <>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="customerSearch">Buscar Cliente Existente</Label>
                        <div className="relative">
                          <Input
                            id="customerSearch"
                            value={customerSearch}
                            onChange={(e) => {
                              setCustomerSearch(e.target.value)
                              setCustomerSearchOpen(e.target.value.length > 0)
                            }}
                            placeholder="Buscar por nombre, teléfono o identificación..."
                          />
                          {customerSearchOpen && customerSearch && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {customers.filter(c =>
                                c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                                c.phone?.includes(customerSearch) ||
                                c.identificationNumber?.includes(customerSearch) ||
                                c.email?.toLowerCase().includes(customerSearch.toLowerCase())
                              ).length > 0 ? (
                                customers
                                  .filter(c =>
                                    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                                    c.phone?.includes(customerSearch) ||
                                    c.identificationNumber?.includes(customerSearch) ||
                                    c.email?.toLowerCase().includes(customerSearch.toLowerCase())
                                  )
                                  .map(customer => (
                                    <div
                                      key={customer.id}
                                      className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                                      onClick={() => handleSelectCustomer(customer)}
                                    >
                                      <p className="font-semibold">{customer.name}</p>
                                      <p className="text-sm text-gray-600">
                                        {customer.identificationType} {customer.identificationNumber} - {customer.phone}
                                      </p>
                                    </div>
                                  ))
                              ) : (
                                <div className="p-3 text-center text-gray-500">
                                  No se encontraron clientes
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1 border-t border-gray-300"></div>
                        <span className="text-sm text-gray-600">o</span>
                        <div className="flex-1 border-t border-gray-300"></div>
                      </div>

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setNewCustomerDialogOpen(true)
                          setCustomerSearchOpen(false)
                        }}
                      >
                        <Plus size={16} className="mr-2" />
                        Crear Nuevo Cliente
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2 bg-white p-3 rounded-lg">
                    <p><strong>Cliente:</strong> {customerName}</p>
                    <p className="text-sm text-gray-600">
                      {customerIdType} {customerIdNumber}
                    </p>
                    <p className="text-sm text-gray-600">
                      Tel: {customerPhone} | Email: {customerEmail}
                    </p>
                    {customerAddress && (
                      <p className="text-sm text-gray-600">Dirección: {customerAddress}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Only show if customer is selected */}
              {!selectedCustomerId && (
                <div className="text-center text-sm text-gray-500 italic">
                  Por favor selecciona o crea un cliente para continuar
                </div>
              )}

              {selectedCustomerId && (
                <>
              <div className="grid grid-cols-2 gap-4 opacity-0 h-0 overflow-hidden">
                <div>
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="cliente@email.com"
                  />
                </div>
                <div>
                  <Label htmlFor="paymentMethod">Método de Pago</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Efectivo">Efectivo</SelectItem>
                      <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                      <SelectItem value="Transferencia">Transferencia</SelectItem>
                      <SelectItem value="Nequi">Nequi</SelectItem>
                      <SelectItem value="Daviplata">Daviplata</SelectItem>
                      <SelectItem value="Crédito">Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Credit Days - Only show if payment method is Crédito */}
              {paymentMethod === 'Crédito' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <Label htmlFor="creditDays">Días de Crédito</Label>
                  <Input
                    id="creditDays"
                    type="number"
                    value={creditDays || ''}
                    onChange={(e) => setCreditDays(parseInt(e.target.value) || 0)}
                    placeholder="30"
                    min="1"
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    {creditDays > 0 && `Fecha de vencimiento: ${new Date(Date.now() + creditDays * 24 * 60 * 60 * 1000).toLocaleDateString('es-CO')}`}
                  </p>
                </div>
              )}

              {/* Branch Selector */}
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <Label htmlFor="branchSelect">Sucursal de Venta *</Label>
                {userRole === 'asesor' && branches.length === 1 && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-2 mt-1">
                    📍 Tu sucursal asignada: {branches[0].name}
                  </p>
                )}
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                  <SelectTrigger id="branchSelect" className="mt-2">
                    <SelectValue placeholder="Selecciona la sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Solo se mostrarán productos de la sucursal seleccionada
                  {userRole === 'asesor' && ' (solo tus sucursales asignadas)'}
                </p>
              </div>

              {/* Add Products - Only show if customer is selected */}
              <div className="border-t pt-4">
                <h4 className="mb-3">Agregar Productos</h4>
                
                {productsForSelectedBranch.length === 0 && selectedBranchId && (
                  <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-3">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <span className="block mb-1">⚠️ No hay productos disponibles en esta sucursal</span>
                      <span className="text-xs">
                        Selecciona otra sucursal o agrega productos a {branches.find(b => b.id === selectedBranchId)?.name}
                      </span>
                    </p>
                  </div>
                )}
                
                {!selectedBranchId && (
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-3">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      ℹ️ Por favor selecciona una sucursal primero
                    </p>
                  </div>
                )}
                
                {products.length === 0 && selectedBranchId && productsForSelectedBranch.length === 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-3">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <span className="block mb-1">⚠️ No hay productos disponibles para venta</span>
                      <span className="text-xs">
                        Asegúrate de:
                      </span>
                    </p>
                    <ul className="text-xs text-yellow-700 dark:text-yellow-300 mt-2 ml-4 list-disc space-y-1">
                      <li>Haber creado productos en el módulo de <span className="font-semibold">Productos</span></li>
                      <li>Si el producto se maneja por unidades: haber agregado <span className="font-semibold">unidades</span> con IMEI/Serial</li>
                      <li>Si el producto se maneja por cantidad: tener <span className="font-semibold">stock disponible</span></li>
                    </ul>
                  </div>
                )}
                
                <div className="space-y-3">
                  {/* Product Search with Command */}
                  <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={productSearchOpen}
                        className="w-full justify-between"
                        disabled={!selectedBranchId || productsForSelectedBranch.length === 0}
                      >
                        {selectedProductId && productsForSelectedBranch.find(p => p.id === parseInt(selectedProductId)) ? (
                          <span className="flex items-center gap-2">
                            <Package size={16} />
                            {productsForSelectedBranch.find(p => p.id === parseInt(selectedProductId))?.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground flex items-center gap-2">
                            <Search size={16} />
                            {!selectedBranchId ? "Selecciona una sucursal primero" : productsForSelectedBranch.length === 0 ? "No hay productos disponibles" : "Buscar producto..."}
                          </span>
                        )}
                        {selectedProductId && (
                          <X
                            size={16}
                            className="opacity-50 hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedProductId('')
                              setProductSearch('')
                            }}
                          />
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Buscar por nombre, categoría..." 
                          value={productSearch}
                          onValueChange={setProductSearch}
                        />
                        <CommandList>
                          <CommandEmpty>No se encontraron productos</CommandEmpty>
                          <CommandGroup heading="Productos Disponibles">
                            {productsForSelectedBranch.map(product => {
                              let available = 0
                              let typeIcon = <Package size={14} />
                              let typeLabel = 'Cantidad'
                              
                              if (product.trackByUnit) {
                                available = product.units?.filter(u => u.status === 'available').length || 0
                                typeIcon = <Badge variant="outline" className="text-xs">IMEI/SN</Badge>
                                typeLabel = 'Unidades únicas'
                              } else if (product.hasVariants) {
                                available = product.variants?.reduce((sum, v) => sum + v.stock, 0) || 0
                                typeIcon = <Badge variant="outline" className="text-xs">Variantes</Badge>
                                typeLabel = 'Con variantes'
                              } else {
                                available = product.quantity || 0
                              }
                              
                              return (
                                <CommandItem
                                  key={product.id}
                                  value={`${product.name} ${product.category} ${product.id}`}
                                  onSelect={() => {
                                    setSelectedProductId(product.id.toString())
                                    setProductSearchOpen(false)
                                    setProductSearch('')
                                  }}
                                  className="flex items-center justify-between"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span>{product.name}</span>
                                      {typeIcon}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {product.category} • ${product.price.toFixed(2)} • {available} disponibles
                                    </div>
                                  </div>
                                  {selectedProductId === product.id.toString() && (
                                    <Check size={16} className="text-primary" />
                                  )}
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  
                  {/* Action Button - Dynamic based on product type */}
                  {selectedProductId && (() => {
                    const product = productsForSelectedBranch.find(p => p.id === parseInt(selectedProductId))
                    if (!product) return null
                    
                    let buttonText = 'Agregar al Carrito'
                    let buttonVariant: "default" | "secondary" = "default"
                    
                    if (product.trackByUnit) {
                      const availableUnits = product.units?.filter(u => u.status === 'available').length || 0
                      buttonText = `Seleccionar Unidades (${availableUnits} disponibles)`
                      buttonVariant = "secondary"
                    } else if (product.hasVariants) {
                      const variantCount = product.variants?.length || 0
                      buttonText = `Seleccionar Variante (${variantCount} opciones)`
                      buttonVariant = "secondary"
                    }
                    
                    return (
                      <Button 
                        onClick={openUnitSelection} 
                        className="w-full"
                        variant={buttonVariant}
                      >
                        <ShoppingCart size={16} className="mr-2" />
                        {buttonText}
                      </Button>
                    )
                  })()}
                </div>
              </div>

              {/* Cart */}
              {cart.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="mb-3">Carrito de Compras</h4>
                  <div className="space-y-2">
                    {cart.map((item, idx) => (
                      <div key={`${item.productId}-${item.variantId || ''}-${idx}`} className="flex justify-between items-start p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="flex-1">
                          <p>{item.productName}</p>
                          {item.variantName && (
                            <Badge variant="outline" className="text-xs mt-1 mb-1">
                              {item.variantName}
                            </Badge>
                          )}
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Cantidad: {item.quantity} x ${item.price.toFixed(2)} = ${(item.price * item.quantity).toFixed(2)}
                          </p>
                          {item.unitDetails && item.unitDetails.length > 0 && (
                            <div className="mt-1">
                              <p className="text-xs text-gray-500">Unidades:</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.unitDetails.map((detail, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {detail}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromCart(item.productId)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between text-xl">
                      <span>Total:</span>
                      <span className="text-green-600">${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              <Button 
                onClick={completeSale} 
                className="w-full" 
                size="lg"
                disabled={!selectedCustomerId || cart.length === 0}
              >
                <ShoppingCart className="mr-2" />
                Completar Venta
              </Button>
              </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Unit Selection Dialog */}
      <Dialog open={unitSelectionOpen} onOpenChange={setUnitSelectionOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Seleccionar Unidades - {selectedProduct?.name}</DialogTitle>
            <DialogDescription>
              Selecciona las unidades específicas (IMEI/Serial) que deseas agregar al carrito
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {availableUnits.length > 0 ? (
              <>
                {/* Search for units */}
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Buscar por IMEI o Serial..."
                    className="pl-10"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {availableUnits.filter(unit => {
                    if (!productSearch) return true
                    const searchLower = productSearch.toLowerCase()
                    return (
                      unit.imei?.toLowerCase().includes(searchLower) ||
                      unit.serialNumber?.toLowerCase().includes(searchLower)
                    )
                  }).map(unit => (
                    <div
                      key={unit.id}
                      className={`flex items-center justify-between p-3 sm:p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedUnits.includes(unit.id) 
                          ? 'bg-blue-50 dark:bg-blue-950 border-blue-500 dark:border-blue-600' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => toggleUnitSelection(unit.id)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox
                          checked={selectedUnits.includes(unit.id)}
                          onCheckedChange={() => toggleUnitSelection(unit.id)}
                        />
                        <div className="flex-1 min-w-0">
                          {unit.imei && (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">IMEI:</span>
                              <span className="font-mono text-sm sm:text-base break-all">{unit.imei}</span>
                            </div>
                          )}
                          {unit.serialNumber && (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Serial:</span>
                              <span className="font-mono text-sm sm:text-base break-all">{unit.serialNumber}</span>
                            </div>
                          )}
                          {!unit.imei && !unit.serialNumber && (
                            <p className="text-sm text-gray-500">Unidad #{unit.id}</p>
                          )}
                        </div>
                      </div>
                      {selectedUnits.includes(unit.id) && (
                        <Check size={20} className="text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                  {availableUnits.filter(unit => {
                    if (!productSearch) return true
                    const searchLower = productSearch.toLowerCase()
                    return (
                      unit.imei?.toLowerCase().includes(searchLower) ||
                      unit.serialNumber?.toLowerCase().includes(searchLower)
                    )
                  }).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No se encontraron unidades con ese IMEI o Serial
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-4 border-t">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedUnits.length} unidad{selectedUnits.length !== 1 ? 'es' : ''} seleccionada{selectedUnits.length !== 1 ? 's' : ''}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => {
                      setUnitSelectionOpen(false)
                      setProductSearch('')
                    }} className="flex-1 sm:flex-none">
                      Cancelar
                    </Button>
                    <Button onClick={addToCart} disabled={selectedUnits.length === 0} className="flex-1 sm:flex-none">
                      <ShoppingCart size={16} className="mr-2" />
                      Agregar ({selectedUnits.length})
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No hay unidades disponibles para este producto
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Variant Selection Dialog */}
      <Dialog open={variantSelectionOpen} onOpenChange={setVariantSelectionOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Seleccionar Variante - {selectedProduct?.name}</DialogTitle>
            <DialogDescription>
              Selecciona la variante (color, modelo, etc.) y la cantidad que deseas agregar al carrito
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedProduct?.variants && selectedProduct.variants.length > 0 ? (
              <>
                <div className="space-y-2 sm:space-y-3 max-h-[400px] overflow-y-auto">
                  {selectedProduct.variants.filter(v => v.stock > 0).map(variant => (
                    <div
                      key={variant.id}
                      className={`flex items-center justify-between p-3 sm:p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedVariantId === variant.id 
                          ? 'bg-blue-50 dark:bg-blue-950 border-blue-500 dark:border-blue-600' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => setSelectedVariantId(variant.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedVariantId === variant.id 
                              ? 'border-blue-600 bg-blue-600' 
                              : 'border-gray-300'
                          }`}>
                            {selectedVariantId === variant.id && (
                              <Check size={14} className="text-white" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm sm:text-base">{variant.name}</p>
                            {variant.sku && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {variant.sku}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={variant.stock > 10 ? 'default' : variant.stock > 0 ? 'secondary' : 'destructive'}>
                          {variant.stock} disp.
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {selectedProduct.variants.filter(v => v.stock === 0).length > 0 && (
                    <>
                      <div className="pt-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Variantes sin stock:</p>
                      </div>
                      {selectedProduct.variants.filter(v => v.stock === 0).map(variant => (
                        <div
                          key={variant.id}
                          className="flex items-center justify-between p-3 sm:p-4 border rounded-lg opacity-50 cursor-not-allowed"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                              <div>
                                <p className="font-medium text-sm sm:text-base">{variant.name}</p>
                                {variant.sku && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {variant.sku}</p>
                                )}
                              </div>
                            </div>
                          </div>
                          <Badge variant="destructive">Agotado</Badge>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {selectedVariantId && (
                  <div className="pt-4 border-t space-y-2">
                    <Label htmlFor="variantQuantity">Cantidad</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setVariantQuantity(Math.max(1, variantQuantity - 1))}
                        disabled={variantQuantity <= 1}
                      >
                        -
                      </Button>
                      <Input
                        id="variantQuantity"
                        type="number"
                        min="1"
                        max={selectedProduct.variants.find(v => v.id === selectedVariantId)?.stock || 1}
                        value={variantQuantity}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 1
                          const maxStock = selectedProduct.variants?.find(v => v.id === selectedVariantId)?.stock || 1
                          setVariantQuantity(Math.min(Math.max(1, value), maxStock))
                        }}
                        className="text-center"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const maxStock = selectedProduct.variants?.find(v => v.id === selectedVariantId)?.stock || 1
                          setVariantQuantity(Math.min(variantQuantity + 1, maxStock))
                        }}
                        disabled={variantQuantity >= (selectedProduct.variants?.find(v => v.id === selectedVariantId)?.stock || 1)}
                      >
                        +
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Máximo disponible: {selectedProduct.variants.find(v => v.id === selectedVariantId)?.stock}
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-4 border-t">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedVariantId ? (
                      <>
                        <span className="font-medium">
                          {selectedProduct.variants.find(v => v.id === selectedVariantId)?.name}
                        </span>
                        {' • '}Cantidad: {variantQuantity}
                      </>
                    ) : (
                      'Selecciona una variante'
                    )}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setVariantSelectionOpen(false)} className="flex-1 sm:flex-none">
                      Cancelar
                    </Button>
                    <Button onClick={addToCart} disabled={!selectedVariantId} className="flex-1 sm:flex-none">
                      <ShoppingCart size={16} className="mr-2" />
                      Agregar ({variantQuantity})
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No hay variantes disponibles para este producto
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Sales History */}
      <div className="grid gap-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl">Historial de Ventas</h3>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Estado</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="active">Activas</SelectItem>
                    <SelectItem value="cancelled">Anuladas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Tipo de Pago</Label>
                <Select value={filterPaymentType} onValueChange={setFilterPaymentType}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="cash">Contado</SelectItem>
                    <SelectItem value="credit">Crédito</SelectItem>
                    <SelectItem value="overdue">En Mora</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Fecha Desde</Label>
                <Input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Fecha Hasta</Label>
                <Input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>

            {(filterStatus !== 'all' || filterPaymentType !== 'all' || filterDateFrom || filterDateTo) && (
              <div className="mt-4 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Mostrando {filteredSales.length} de {sales.length} facturas
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterStatus('all')
                    setFilterPaymentType('all')
                    setFilterDateFrom('')
                    setFilterDateTo('')
                    setCurrentPage(1)
                  }}
                >
                  Limpiar Filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {filteredSales.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              No hay ventas registradas con los filtros aplicados
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {paginatedSales.map(sale => (
              <SaleCard
                key={sale.id}
                sale={sale}
                onPrintInvoice={handlePrintInvoice}
                onCancelSale={(sale) => {
                  setSelectedSale(sale)
                  setCancelDialogOpen(true)
                }}
                canCancel={userRole === 'admin'}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {filteredSales.length > itemsPerPage && (
          <div className="mt-6 flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current
                  const showPage = 
                    page === 1 || 
                    page === totalPages || 
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  
                  if (!showPage) {
                    // Show ellipsis
                    if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <PaginationItem key={page}>
                          <span className="px-2">...</span>
                        </PaginationItem>
                      )
                    }
                    return null
                  }
                  
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                })}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* New Customer Dialog */}
      <Dialog open={newCustomerDialogOpen} onOpenChange={setNewCustomerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Cliente</DialogTitle>
            <DialogDescription>
              Ingresa los datos del cliente para poder facturar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="newCustomerName">Nombre Completo *</Label>
                <Input
                  id="newCustomerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Juan Pérez"
                />
              </div>
              <div>
                <Label htmlFor="newCustomerPhone">Teléfono *</Label>
                <Input
                  id="newCustomerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="3001234567"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="newCustomerIdType">Tipo de Identificación *</Label>
                <Select value={customerIdType} onValueChange={setCustomerIdType}>
                  <SelectTrigger id="newCustomerIdType">
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {identificationTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="newCustomerIdNumber">Número de Identificación *</Label>
                <Input
                  id="newCustomerIdNumber"
                  value={customerIdNumber}
                  onChange={(e) => setCustomerIdNumber(e.target.value)}
                  placeholder="1234567890"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="newCustomerEmail">Email</Label>
              <Input
                id="newCustomerEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="cliente@email.com"
              />
            </div>

            <div>
              <Label htmlFor="newCustomerAddress">Dirección</Label>
              <Input
                id="newCustomerAddress"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Calle 123 #45-67"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setNewCustomerDialogOpen(false)
                  clearCustomerForm()
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleCreateNewCustomer}>
                Crear Cliente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Sale Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular Factura #{selectedSale?.id}</DialogTitle>
            <DialogDescription>
              Esta acción anulará permanentemente la factura. Por favor ingresa el motivo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cancelReason">Motivo de Anulación</Label>
              <Textarea
                id="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ej: Error en el registro, cliente devolvió productos, etc."
                rows={4}
                className="mt-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCancelDialogOpen(false)
                  setSelectedSale(null)
                  setCancelReason('')
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelSale}
                disabled={!cancelReason.trim()}
              >
                Anular Factura
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
