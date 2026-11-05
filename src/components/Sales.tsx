import { useEffect, useState } from 'react'
import { projectId } from '../utils/supabase/info'
import { Trash2, ShoppingCart, Printer, X, ReceiptText } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
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
import { CustomerPicker } from './customers/CustomerPicker'
import { ProductPicker, QuantityStepper, type CartAddition } from './sales/ProductPicker'
import { useBusiness } from '../utils/BusinessContext'
import {
  draftFromCustomer,
  emptyCustomerDraft,
  resolveCustomer,
  validateCustomerDraft,
  type CustomerDraft,
  type CustomerErrors,
} from './customers/customerDraft'
import { OpenCashDialog } from './cash/OpenCashDialog'
import { BRANCH_FORBIDDEN, CASH_SESSION_REQUIRED, CASH_SESSION_STALE, openSession } from './cash/api'
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
  const { profile } = useBusiness()
  const [openCashDialog, setOpenCashDialog] = useState(false)
  const [openingCash, setOpeningCash] = useState(false)
  /** Al abrir la caja desde el cobro, se reintenta la venta que quedó a medias. */
  const [pendingSaleAfterCash, setPendingSaleAfterCash] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  /* El cliente de la venta: el mismo selector y las mismas reglas que en una
     orden nueva (components/customers). */
  const [customer, setCustomer] = useState<CustomerDraft>(emptyCustomerDraft)
  const [customerErrors, setCustomerErrors] = useState<CustomerErrors>({})
  const [savingSale, setSavingSale] = useState(false)
  const [selectedBranchId, setSelectedBranchId] = useState<string>('')
  const [branches, setBranches] = useState<any[]>([])
  const [paymentMethod, setPaymentMethod] = useState<string>('Efectivo')
  const [creditDays, setCreditDays] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [customers, setCustomers] = useState<any[]>([])
  const [identificationTypes, setIdentificationTypes] = useState<string[]>(['Cédula', 'NIT', 'Pasaporte'])
  
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
        if (userRole !== 'admin' && userProfile) {
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
        if (userRole !== 'admin' && userProfile) {
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

  /* Clave de una línea del carrito: el mismo producto en dos variantes son dos
     líneas. Antes se quitaba por productId y desaparecían todas las variantes. */
  const lineKey = (item: { productId: number; variantId?: number }) => `${item.productId}:${item.variantId ?? ''}`

  /** Agrega lo que entrega el buscador; si la línea ya existe, suma. */
  const addToCart = (add: CartAddition) => {
    setCart((current) => {
      const key = lineKey(add)
      const existing = current.find((item) => lineKey(item) === key)
      if (!existing) return [...current, { ...add }]
      return current.map((item) =>
        lineKey(item) === key
          ? {
              ...item,
              quantity: item.quantity + add.quantity,
              unitIds: add.unitIds ? [...(item.unitIds ?? []), ...add.unitIds] : item.unitIds,
              unitDetails: add.unitDetails ? [...(item.unitDetails ?? []), ...add.unitDetails] : item.unitDetails,
            }
          : item
      )
    })
  }

  /** Tope de una línea: el stock del producto o de la variante. Las unidades no se suman con +. */
  const lineMax = (item: CartItem): number => {
    const product = products.find((p) => p.id === item.productId)
    if (!product) return item.quantity
    if (item.variantId != null) return product.variants?.find((v) => v.id === item.variantId)?.stock ?? item.quantity
    return product.quantity ?? item.quantity
  }

  const setLineQuantity = (key: string, quantity: number) => {
    setCart((current) => current.map((item) => (lineKey(item) === key ? { ...item, quantity: Math.max(1, quantity) } : item)))
  }

  const removeLine = (key: string) => {
    setCart((current) => current.filter((item) => lineKey(item) !== key))
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

    const custErrors = validateCustomerDraft(customer)
    setCustomerErrors(custErrors)
    if (Object.keys(custErrors).length > 0) {
      toast.error(custErrors.customer ?? 'Completa los datos del cliente')
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

    setSavingSale(true)
    try {
      /* El cliente elegido es ese; uno nuevo se crea (o se reusa si ya existía).
         Queda fijado como existente: si la venta se reintenta tras abrir la caja,
         no se intenta crear otra vez. */
      const { customer: resolved, created } = await resolveCustomer(accessToken, customer, customers)
      if (created) await fetchCustomers()
      setCustomer(draftFromCustomer(resolved))
      const customerName = resolved.name
      const customerPhone = resolved.phone || customer.phone

      const saleData: any = {
        items: cart,
        total: calculateTotal(),
        totalCost: calculateTotalCost(),
        customerName,
        customerPhone,
        customerEmail: resolved.email || customer.email || undefined,
        customerId: resolved.id,
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
        // Antes quedaba el id del cliente anterior pegado a la venta siguiente.
        setCustomer(emptyCustomerDraft())
        setCustomerErrors({})
        setPaymentMethod('Efectivo')
        setCreditDays(0)
        setDialogOpen(false)
        fetchProducts()
        fetchSales()
        toast.success('Venta completada exitosamente')
      } else if (data.code === CASH_SESSION_STALE) {
        /* La caja de un día anterior quedó abierta: no se ofrece abrir otra,
           hay que cerrar esa con su arqueo. */
        toast.error(data.error || 'La caja del día anterior sigue abierta', {
          description: 'Ciérrala en Caja antes de vender.',
        })
      } else if (data.code === BRANCH_FORBIDDEN || data.code === 'ROLE_FORBIDDEN') {
        toast.error(data.error || 'No tienes permiso para vender en esta sucursal')
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
    } finally {
      setSavingSale(false)
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

  const filteredSales = filterSales()

  const formatMoney = (n: number) => `$${Number(n || 0).toLocaleString('es-CO')}`

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

  const productsForSelectedBranch = selectedBranchId 
    ? products.filter(p => (p as any).branchId === selectedBranchId)
    : products


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
              loading={savingSale}
              disabled={savingSale || cart.length === 0}
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
              <CustomerPicker
                customers={customers}
                identificationTypes={identificationTypes}
                value={customer}
                onChange={(next) => {
                  setCustomer(next)
                  setCustomerErrors({})
                }}
                errors={customerErrors}
                showAddress
                disabled={savingSale}
              />
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
                <ProductPicker
                  products={productsForSelectedBranch}
                  cart={cart}
                  onAdd={addToCart}
                  size={controlSize === 'lg' ? 'lg' : 'md'}
                  unitLabelName={profile.unitTrackingLabel}
                />
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
                        key={lineKey(item)}
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
                          <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            {/* Las unidades se eligen una a una (IMEI/serial); el resto, con − y +. */}
                            {!item.unitIds?.length && (
                              <QuantityStepper
                                size="sm"
                                value={item.quantity}
                                max={lineMax(item)}
                                onChange={(n) => setLineQuantity(lineKey(item), n)}
                              />
                            )}
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontVariantNumeric: 'tabular-nums',
                                fontSize: 'var(--text-mono-sm)',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              {item.unitIds?.length ? `${item.quantity} × ` : '× '}
                              {formatMoney(item.price)}
                            </span>
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
                          onClick={() => removeLine(lineKey(item))}
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

              {cart.length > 0 && customer.mode === 'existing' && !customer.customerId && (
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
