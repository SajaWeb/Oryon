import { useEffect, useMemo, useState } from 'react'
import { projectId } from '../utils/supabase/info'
import { Plus, Trash2, ShoppingCart, Printer, Package, Check, User, Search, X, ReceiptText } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { toast } from 'sonner@2.0.3'
// Oryon se importa con alias: esta vista aún usa los primitivos shadcn en el punto de venta
// y los nombres chocarían.
import {
  Alert as OryonAlert,
  Badge as OryonBadge,
  Button as OryonButton,
  FieldGroup,
  FormField as OryonFormField,
  IconButton as OryonIconButton,
  Input as OryonInput,
  Loading,
  Select as OryonSelect,
  type Column,
} from './oryon'
import { FormDialog } from './layout/FormDialog'
import { OpenCashDialog } from './cash/OpenCashDialog'
import { CASH_SESSION_REQUIRED, openSession } from './cash/api'
import { useBreakpoint } from '../hooks/useBreakpoint'

/** Los métodos que acepta el taller. Antes estaban escritos a mano en el JSX. */
const PAYMENT_METHODS = ['Efectivo', 'Tarjeta', 'Transferencia', 'Nequi', 'Daviplata', 'Crédito'] as const
import { ListPage } from './patterns/ListPage'
import { ResponsiveDetail } from './layout/ResponsiveDetail'
import { useShell } from './layout/AppShell'
import { usePageHeader } from './layout/PageHeaderContext'
import { SaleListCard } from './sales/SaleListCard'
import { SaleDetailPanel } from './sales/SaleDetailPanel'
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
import { printInvoice, type InvoiceData, type PrintConfig } from '../utils/printing'

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
  const { compact } = useShell()
  const { isMobile: isMobileView, isDesktop } = useBreakpoint()
  const controlSize = isMobileView ? 'lg' : 'md'
  const [openCashDialog, setOpenCashDialog] = useState(false)
  const [openingCash, setOpeningCash] = useState(false)
  /** Al abrir la caja desde el cobro, se reintenta la venta que quedó a medias. */
  const [pendingSaleAfterCash, setPendingSaleAfterCash] = useState(false)
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
  const [searchTerm, setSearchTerm] = useState('')
  // Factura abierta en el drawer (escritorio) o en la hoja inferior (móvil).
  const [detailSale, setDetailSale] = useState<Sale | null>(null)

  useEffect(() => {
    fetchProducts()
    fetchSales()
    fetchCustomers()
    fetchCompanySettings()
    fetchBranches()
  }, [])

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
      toast.success('Factura enviada a la impresora')
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

  const handleOpenCashFromSale = async (targetBranch: string, baseAmount: number) => {
    setOpeningCash(true)
    try {
      const res = await openSession(accessToken, targetBranch, baseAmount)
      if (!res.success) {
        toast.error(res.error || 'No se pudo abrir la caja')
        return
      }
      toast.success('Caja abierta')
      setOpenCashDialog(false)
      if (pendingSaleAfterCash) {
        setPendingSaleAfterCash(false)
        await completeSale()
      }
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo abrir la caja')
    } finally {
      setOpeningCash(false)
    }
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
            
            /* Antes: confirm() nativo y, si aceptabas, una ventana emergente con
               window.print(). El confirm bloqueaba la página entera y el popup lo
               bloqueaba el navegador en móvil. Ahora el PDF se genera y se descarga
               solo; imprimirlo o no es decisión del usuario, después. */
            printInvoice(invoiceData, printConfig)
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
      } else if (data.code === CASH_SESSION_REQUIRED) {
        /* Sin caja abierta no se cobra. En vez de mandar al usuario a otra
           pantalla con un cliente delante, se ofrece abrirla aquí mismo y la
           venta se reintenta sola. */
        setPendingSaleAfterCash(true)
        setOpenCashDialog(true)
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

    // Búsqueda de texto: la vista no tenía ninguna, así que en un teléfono con cien
    // facturas paginadas no había forma de encontrar una por número o cliente.
    const q = searchTerm.trim().toLowerCase()
    if (q) {
      filtered = filtered.filter(sale =>
        (sale.invoiceNumber || `FACT-${sale.id}`).toLowerCase().includes(q) ||
        sale.customerName?.toLowerCase().includes(q) ||
        sale.customerPhone?.toLowerCase().includes(q) ||
        sale.notes?.toLowerCase().includes(q)
      )
    }

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

  const formatMoney = (n: number) => `$${Number(n || 0).toLocaleString('es-CO')}`
  /** Las categorías se guardan en minúscula («celulares»); en pantalla van con mayúscula. */
  const capitalize = (v?: string) => (v ? v.charAt(0).toUpperCase() + v.slice(1) : '—')

  usePageHeader({
    title: 'Ventas',
    subtitle: loading
      ? 'Cargando facturas…'
      : `${filteredSales.length} de ${sales.length} ${sales.length === 1 ? 'venta' : 'ventas'}`,
    eyebrow: 'Caja',
    onRefresh: fetchSales,
    refreshing: loading,
  })

  const saleColumns: Column<Sale>[] = [
    {
      key: 'invoiceNumber',
      label: 'Factura',
      mono: true,
      width: 110,
      render: (v) => v.invoiceNumber || `FACT-${v.id}`,
    },
    {
      key: 'createdAt',
      label: 'Fecha',
      mono: true,
      muted: true,
      render: (v) => {
        const d = new Date(v.createdAt)
        return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO')
      },
    },
    { key: 'customerName', label: 'Cliente' },
    { key: 'paymentMethod', label: 'Pago', muted: true, render: (v) => v.paymentMethod || '—' },
    {
      key: 'status',
      label: 'Estado',
      render: (v) => {
        if (v.status === 'cancelled') return <OryonBadge tone="danger">Anulada</OryonBadge>
        const credit = getCreditStatus(v)
        if (credit) return <OryonBadge tone={credit.status === 'overdue' ? 'danger' : 'warning'}>{credit.label}</OryonBadge>
        return <OryonBadge tone="success">Activa</OryonBadge>
      },
    },
    { key: 'total', label: 'Total', mono: true, align: 'right', render: (v) => formatMoney(v.total) },
    {
      key: 'totalCost',
      label: 'Costo',
      mono: true,
      align: 'right',
      hideOnCompact: true,
      render: (v) => (v.totalCost ? formatMoney(v.totalCost) : '—'),
    },
    {
      key: 'margin',
      label: 'Margen',
      mono: true,
      align: 'right',
      hideOnCompact: true,
      render: (v) => {
        if (!v.totalCost || !v.total) return '—'
        return `${(((v.total - v.totalCost) / v.total) * 100).toFixed(1).replace('.', ',')}%`
      },
    },
  ]
  
  // Filter products by selected branch
  /* Coincidencias de los dos buscadores del punto de venta. Antes el de clientes
     repetía el mismo filter tres veces en el JSX y el de productos vivía dentro de
     un Command dentro de un Popover dentro del modal. */
  const matchingCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase()
    if (!q) return []
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.identificationNumber?.includes(q) ||
        c.email?.toLowerCase().includes(q)
    )
  }, [customers, customerSearch])

  const productsForSelectedBranch = selectedBranchId 
    ? products.filter(p => (p as any).branchId === selectedBranchId)
    : products

  const matchingProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase()
    if (!q) return productsForSelectedBranch
    return productsForSelectedBranch.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)
    )
  }, [productsForSelectedBranch, productSearch])

  if (loading) {
    return <Loading mode="screen" label="Cargando facturación" />
  }

  return (
    <>
      {/* El título y la acción principal los aporta el shell y ListPage: aquí solo queda
          el punto de venta, que vive en su propio diálogo. */}
      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Nueva venta"
        description="Elige el cliente, arma el carrito y cobra."
        footer={
          <>
            <OryonButton variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancelar
            </OryonButton>
            <OryonButton
              variant="primary"
              iconLeft={ShoppingCart}
              onClick={completeSale}
              disabled={!selectedCustomerId || cart.length === 0}
            >
              {cart.length > 0 ? `Cobrar ${formatMoney(calculateTotal())}` : 'Cobrar'}
            </OryonButton>
          </>
        }
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isDesktop ? 'minmax(0,1fr) minmax(0,1fr)' : 'minmax(0,1fr)',
            alignItems: 'start',
            gap: isDesktop ? 28 : 22,
          }}
        >
          {/* ── Se arma la venta ─────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, minWidth: 0 }}>
            <FieldGroup title="Cliente">
              {selectedCustomerId ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '10px 12px',
                    background: 'var(--bg-sunken)',
                    border: 'var(--border-width) solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)' }}>{customerName}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--text-secondary)' }}>
                      {[customerIdType, customerIdNumber].filter(Boolean).join(' ')}
                      {customerPhone ? ` · ${customerPhone}` : ''}
                    </span>
                    {customerEmail && (
                      <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>{customerEmail}</span>
                    )}
                  </div>
                  <OryonButton size="sm" variant="ghost" onClick={clearCustomerForm}>
                    Cambiar
                  </OryonButton>
                </div>
              ) : (
                <>
                  <OryonInput
                    size={controlSize}
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value)
                      setCustomerSearchOpen(e.target.value.length > 0)
                    }}
                    placeholder="Nombre, teléfono o identificación"
                    iconLeft={Search}
                    aria-label="Buscar cliente"
                  />

                  {customerSearch && (
                    <div
                      style={{
                        maxHeight: 180,
                        overflowY: 'auto',
                        background: 'var(--bg-sunken)',
                        border: 'var(--border-width) solid var(--border-default)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      {matchingCustomers.length > 0 ? (
                        matchingCustomers.map((customer, i) => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => handleSelectCustomer(customer)}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 2,
                              width: '100%',
                              padding: '10px 12px',
                              minHeight: 'var(--tap-target)',
                              textAlign: 'left',
                              background: 'transparent',
                              border: 0,
                              borderTop: i === 0 ? 0 : 'var(--border-width) solid var(--border-subtle)',
                              cursor: 'pointer',
                            }}
                          >
                            <span style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)' }}>{customer.name}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--text-secondary)' }}>
                              {[customer.identificationType, customer.identificationNumber].filter(Boolean).join(' ')}
                              {customer.phone ? ` · ${customer.phone}` : ''}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p style={{ margin: 0, padding: 16, textAlign: 'center', fontSize: 'var(--text-small)', color: 'var(--text-tertiary)' }}>
                          Ningún cliente coincide.
                        </p>
                      )}
                    </div>
                  )}

                  <OryonButton
                    variant="secondary"
                    size={controlSize}
                    iconLeft={Plus}
                    fullWidth
                    onClick={() => {
                      setNewCustomerDialogOpen(true)
                      setCustomerSearchOpen(false)
                    }}
                  >
                    Crear cliente nuevo
                  </OryonButton>
                </>
              )}
            </FieldGroup>

            <FieldGroup title="Condiciones">
              <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? 'minmax(0,1fr)' : 'repeat(2, minmax(0,1fr))', gap: 12 }}>
                <OryonFormField
                  label="Sucursal"
                  required
                  hint="Solo se venden productos de esta sucursal"
                >
                  <OryonSelect
                    size={controlSize}
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    placeholder="Elige la sucursal"
                    options={branches.map((b) => ({ value: b.id, label: b.name }))}
                  />
                </OryonFormField>

                {/* Este selector estaba oculto con opacity-0/h-0: toda venta se
                    guardaba como Efectivo y el crédito era inalcanzable. */}
                <OryonFormField label="Método de pago" required>
                  <OryonSelect
                    size={controlSize}
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
                  />
                </OryonFormField>
              </div>

              {paymentMethod === 'Crédito' && (
                <OryonFormField
                  label="Días de crédito"
                  required
                  hint={
                    creditDays > 0
                      ? `Vence el ${new Date(Date.now() + creditDays * 86400000).toLocaleDateString('es-CO')}`
                      : 'A cuántos días se compromete a pagar el cliente.'
                  }
                >
                  <OryonInput
                    size={controlSize}
                    type="number"
                    min="1"
                    inputMode="numeric"
                    mono
                    value={creditDays || ''}
                    onChange={(e) => setCreditDays(parseInt(e.target.value) || 0)}
                    placeholder="30"
                  />
                </OryonFormField>
              )}
            </FieldGroup>

            <FieldGroup title="Agregar productos">
              {!selectedBranchId ? (
                <OryonAlert variant="info" title="Falta la sucursal">
                  Elige primero la sucursal para ver qué hay disponible.
                </OryonAlert>
              ) : productsForSelectedBranch.length === 0 ? (
                <OryonAlert variant="warning" title="No hay productos disponibles">
                  En {branches.find((b) => b.id === selectedBranchId)?.name} no hay stock que vender. Revisa el
                  inventario: los productos por unidades necesitan unidades con IMEI o serial, y los de cantidad
                  necesitan stock.
                </OryonAlert>
              ) : (
                <>
                  <OryonInput
                    size={controlSize}
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Buscar por nombre o categoría"
                    iconLeft={Search}
                    aria-label="Buscar producto"
                  />

                  <div
                    style={{
                      maxHeight: 220,
                      overflowY: 'auto',
                      background: 'var(--bg-sunken)',
                      border: 'var(--border-width) solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    {matchingProducts.length === 0 ? (
                      <p style={{ margin: 0, padding: 16, textAlign: 'center', fontSize: 'var(--text-small)', color: 'var(--text-tertiary)' }}>
                        Ningún producto coincide.
                      </p>
                    ) : (
                      matchingProducts.map((product, i) => {
                        const active = selectedProductId === product.id.toString()
                        const available = product.trackByUnit
                          ? product.units?.filter((u) => u.status === 'available').length || 0
                          : product.hasVariants
                            ? product.variants?.reduce((sum, v) => sum + v.stock, 0) || 0
                            : product.quantity || 0
                        const kind = product.trackByUnit ? 'IMEI/SN' : product.hasVariants ? 'Variantes' : null

                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => setSelectedProductId(product.id.toString())}
                            aria-pressed={active}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 12,
                              width: '100%',
                              padding: '10px 12px',
                              minHeight: 'var(--tap-target)',
                              textAlign: 'left',
                              background: active ? 'var(--accent-subtle)' : 'transparent',
                              border: 0,
                              borderTop: i === 0 ? 0 : 'var(--border-width) solid var(--border-subtle)',
                              cursor: 'pointer',
                            }}
                          >
                            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                <span style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)' }}>{product.name}</span>
                                {kind && <OryonBadge tone="neutral">{kind}</OryonBadge>}
                              </span>
                              <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>
                                {capitalize(product.category)} · {available} disponibles
                              </span>
                            </span>
                            <span
                              style={{
                                flex: '0 0 auto',
                                fontFamily: 'var(--font-mono)',
                                fontVariantNumeric: 'tabular-nums',
                                fontSize: 'var(--text-small)',
                                color: 'var(--text-primary)',
                              }}
                            >
                              {formatMoney(product.price)}
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>

                  {selectedProductId &&
                    (() => {
                      const product = productsForSelectedBranch.find((p) => p.id === parseInt(selectedProductId))
                      if (!product) return null
                      const label = product.trackByUnit
                        ? `Elegir unidades (${product.units?.filter((u) => u.status === 'available').length || 0} disponibles)`
                        : product.hasVariants
                          ? `Elegir variante (${product.variants?.length || 0} opciones)`
                          : 'Agregar al carrito'
                      return (
                        <OryonButton variant="primary" size={controlSize} iconLeft={ShoppingCart} fullWidth onClick={openUnitSelection}>
                          {label}
                        </OryonButton>
                      )
                    })()}
                </>
              )}
            </FieldGroup>
          </div>

          {/* ── El carrito, siempre a la vista ────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, minWidth: 0 }}>
            <FieldGroup title={`Carrito${cart.length > 0 ? ` · ${cart.length}` : ''}`}>
              {cart.length === 0 ? (
                <div
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    gap: 6,
                    padding: '32px 16px',
                    background: 'var(--bg-sunken)',
                    border: '1px dashed var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                  }}
                >
                  <ShoppingCart size={22} strokeWidth={1.6} color="var(--text-tertiary)" />
                  <span style={{ fontSize: 'var(--text-small)', color: 'var(--text-secondary)' }}>El carrito está vacío</span>
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>
                    Los productos que agregues aparecen aquí.
                  </span>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      background: 'var(--surface-card)',
                      border: 'var(--border-width) solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    {cart.map((item, idx) => (
                      <div
                        key={`${item.productId}-${item.variantId || ''}-${idx}`}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          padding: '10px 12px',
                          borderTop: idx === 0 ? 0 : 'var(--border-width) solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)' }}>{item.productName}</span>
                            {item.variantName && <OryonBadge tone="neutral">{item.variantName}</OryonBadge>}
                          </span>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontVariantNumeric: 'tabular-nums',
                              fontSize: 'var(--text-mono-sm)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {item.quantity} × {formatMoney(item.price)}
                          </span>
                          {item.unitDetails && item.unitDetails.length > 0 && (
                            <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {item.unitDetails.map((detail, i) => (
                                <OryonBadge key={i} tone="neutral">
                                  {detail}
                                </OryonBadge>
                              ))}
                            </span>
                          )}
                        </div>
                        <span
                          style={{
                            flex: '0 0 auto',
                            fontFamily: 'var(--font-mono)',
                            fontVariantNumeric: 'tabular-nums',
                            fontSize: 'var(--text-body)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {formatMoney(item.price * item.quantity)}
                        </span>
                        <OryonIconButton
                          icon={Trash2}
                          label={`Quitar ${item.productName}`}
                          size="sm"
                          onClick={() => removeFromCart(item.productId)}
                        />
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '12px 14px',
                      background: 'var(--bg-sunken)',
                      border: 'var(--border-width) solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <span style={{ fontSize: 'var(--text-body)', color: 'var(--text-secondary)' }}>Total</span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: 'var(--text-h3)',
                        fontWeight: 'var(--fw-semibold)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {formatMoney(calculateTotal())}
                    </span>
                  </div>
                </>
              )}

              {cart.length > 0 && !selectedCustomerId && (
                <p style={{ margin: 0, fontSize: 'var(--text-small)', color: 'var(--warning)' }}>
                  Falta elegir el cliente para poder cobrar.
                </p>
              )}
            </FieldGroup>
          </div>
        </div>
      </FormDialog>

      <OpenCashDialog
        open={openCashDialog}
        onClose={() => {
          setOpenCashDialog(false)
          setPendingSaleAfterCash(false)
        }}
        branches={branches}
        defaultBranchId={selectedBranchId}
        lockBranch
        submitting={openingCash}
        onSubmit={handleOpenCashFromSale}
      />

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
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary" />
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
                          ? 'bg-[var(--accent-subtle)] border-[var(--accent-fill)]' 
                          : 'hover:bg-sunken'
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
                              <span className="text-xs sm:text-sm text-ink-secondary">IMEI:</span>
                              <span className="font-mono text-sm sm:text-base break-all">{unit.imei}</span>
                            </div>
                          )}
                          {unit.serialNumber && (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                              <span className="text-xs sm:text-sm text-ink-secondary">Serial:</span>
                              <span className="font-mono text-sm sm:text-base break-all">{unit.serialNumber}</span>
                            </div>
                          )}
                          {!unit.imei && !unit.serialNumber && (
                            <p className="text-sm text-ink-tertiary">Unidad #{unit.id}</p>
                          )}
                        </div>
                      </div>
                      {selectedUnits.includes(unit.id) && (
                        <Check size={20} className="text-primary flex-shrink-0" />
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
                    <div className="text-center py-8 text-ink-tertiary">
                      No se encontraron unidades con ese IMEI o Serial
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-4 border-t">
                  <p className="text-sm text-ink-secondary">
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
              <div className="text-center py-8 text-ink-tertiary">
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
                          ? 'bg-[var(--accent-subtle)] border-[var(--accent-fill)]' 
                          : 'hover:bg-sunken'
                      }`}
                      onClick={() => setSelectedVariantId(variant.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedVariantId === variant.id 
                              ? 'border-[var(--accent-fill)] bg-primary' 
                              : 'border-line'
                          }`}>
                            {selectedVariantId === variant.id && (
                              <Check size={14} className="text-white" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm sm:text-base">{variant.name}</p>
                            {variant.sku && (
                              <p className="text-xs text-ink-tertiary">SKU: {variant.sku}</p>
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
                        <p className="text-xs text-ink-tertiary">Variantes sin stock:</p>
                      </div>
                      {selectedProduct.variants.filter(v => v.stock === 0).map(variant => (
                        <div
                          key={variant.id}
                          className="flex items-center justify-between p-3 sm:p-4 border rounded-lg opacity-50 cursor-not-allowed"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="w-5 h-5 rounded-full border-2 border-line"></div>
                              <div>
                                <p className="font-medium text-sm sm:text-base">{variant.name}</p>
                                {variant.sku && (
                                  <p className="text-xs text-ink-tertiary">SKU: {variant.sku}</p>
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
                    <p className="text-xs text-ink-tertiary">
                      Máximo disponible: {selectedProduct.variants.find(v => v.id === selectedVariantId)?.stock}
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-4 border-t">
                  <p className="text-sm text-ink-secondary">
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
              <div className="text-center py-8 text-ink-tertiary">
                No hay variantes disponibles para este producto
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ListPage<Sale>
        rows={filteredSales}
        columns={saleColumns}
        rowKey="id"
        pageSize={12}
        selectedId={detailSale?.id ?? null}
        onRowClick={(sale) => setDetailSale((cur) => (cur?.id === sale.id ? null : sale))}
        renderCard={(sale) => {
          const credit = getCreditStatus(sale)
          return (
            <SaleListCard
              sale={sale}
              creditLabel={
                credit ? { text: credit.label, overdue: credit.status === 'overdue' } : null
              }
              onOpen={() => setDetailSale(sale)}
            />
          )
        }}
        search={{
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: 'Factura, cliente, teléfono, nota…',
        }}
        filters={[
          {
            id: 'status',
            label: 'Estado',
            placeholder: 'Todas',
            value: filterStatus === 'all' ? '' : filterStatus,
            options: [
              { value: 'active', label: 'Activas' },
              { value: 'cancelled', label: 'Anuladas' },
            ],
            onChange: (v) => setFilterStatus(v || 'all'),
          },
          {
            id: 'payment',
            label: 'Tipo de pago',
            placeholder: 'Todos',
            value: filterPaymentType === 'all' ? '' : filterPaymentType,
            options: [
              { value: 'cash', label: 'Contado' },
              { value: 'credit', label: 'Crédito' },
              { value: 'overdue', label: 'En mora' },
            ],
            onChange: (v) => setFilterPaymentType(v || 'all'),
          },
          {
            id: 'from',
            label: 'Fecha desde',
            placeholder: 'Desde',
            value: filterDateFrom,
            options: [],
            onChange: setFilterDateFrom,
            type: 'date',
          },
          {
            id: 'to',
            label: 'Fecha hasta',
            placeholder: 'Hasta',
            value: filterDateTo,
            options: [],
            onChange: setFilterDateTo,
            type: 'date',
          },
        ]}
        onClearFilters={() => {
          setFilterStatus('all')
          setFilterPaymentType('all')
          setFilterDateFrom('')
          setFilterDateTo('')
        }}
        primaryAction={{ label: 'Nueva venta', icon: ShoppingCart, onClick: () => setDialogOpen(true) }}
        tableTitle="Facturas emitidas"
        tableSubtitle={`${filteredSales.length} de ${sales.length} ${sales.length === 1 ? 'venta' : 'ventas'} · ${formatMoney(
          filteredSales.filter((v) => v.status !== 'cancelled').reduce((a, v) => a + (v.total || 0), 0)
        )} facturado`}
        countLabel={(shown, total) => `Mostrando ${shown} de ${total} facturas`}
        endLabel={(total) => `Fin de la lista · ${total} facturas`}
        empty={{
          icon: ReceiptText,
          title: sales.length === 0 ? 'Sin ventas' : 'Sin resultados',
          description:
            sales.length === 0
              ? 'Aún no se ha registrado ninguna venta. Crea la primera desde "Nueva venta".'
              : 'Ninguna venta coincide con el rango de fechas o los filtros aplicados.',
        }}
      />

      <ResponsiveDetail
        open={detailSale != null}
        onClose={() => setDetailSale(null)}
        kind="Venta"
        title={detailSale ? detailSale.invoiceNumber || `FACT-${detailSale.id}` : ''}
        meta={
          detailSale
            ? `${detailSale.customerName} · ${new Date(detailSale.createdAt).toLocaleDateString('es-CO')}`
            : undefined
        }
        actions={
          detailSale && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <OryonButton fullWidth iconLeft={Printer} onClick={() => handlePrintInvoice(detailSale)}>
                Imprimir
              </OryonButton>
              {userRole === 'admin' && detailSale.status !== 'cancelled' && (
                <OryonButton
                  variant="danger"
                  fullWidth
                  iconLeft={X}
                  onClick={() => {
                    setSelectedSale(detailSale)
                    setCancelDialogOpen(true)
                    setDetailSale(null)
                  }}
                >
                  Anular venta
                </OryonButton>
              )}
            </div>
          )
        }
      >
        {detailSale && <SaleDetailPanel sale={detailSale} columns={compact ? 1 : 2} creditStatus={getCreditStatus(detailSale)} />}
      </ResponsiveDetail>

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
    </>
  )
}
