import { useState, useEffect } from 'react'
import { projectId } from '../../utils/supabase/info'
import { Package, X, AlertCircle, CheckCircle, FileDown } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import { toast } from 'sonner@2.0.3'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog'

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
  description?: string
  minStock?: number
  hideStockAlert?: boolean
  trackByUnit?: boolean
  hasVariants?: boolean
  quantity?: number
  units?: ProductUnit[]
  variants?: ProductVariant[]
}

interface LowStockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string
  onStockUpdated?: () => void
}

export function LowStockDialog({
  open,
  onOpenChange,
  accessToken,
  onStockUpdated
}: LowStockDialogProps) {
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [productToHide, setProductToHide] = useState<Product | null>(null)
  const [globalStockThreshold, setGlobalStockThreshold] = useState<number>(5)

  useEffect(() => {
    if (open) {
      fetchGlobalSettings()
      fetchLowStockProducts()
    }
  }, [open])

  const fetchGlobalSettings = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/company/settings`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.settings) {
          setGlobalStockThreshold(data.settings.lowStockThreshold || 5)
        }
      }
    } catch (error) {
      console.error('Error fetching global settings:', error)
      // Use default threshold
    }
  }

  const fetchLowStockProducts = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/products`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )
      
      if (!response.ok) {
        const error = await response.json()
        console.error('Error fetching products:', error)
        toast.error('Error al cargar productos')
        return
      }
      
      const products = await response.json()
      
      // Filter products with low stock
      const lowStock = products.filter((p: Product) => {
        // Skip if alert is hidden
        if (p.hideStockAlert) return false
        
        // Use product-specific threshold or global threshold
        const threshold = p.minStock || globalStockThreshold
        
        // Calculate available stock based on product type
        let availableStock = 0
        if (p.trackByUnit) {
          // Count available units (IMEI/Serial)
          availableStock = p.units?.filter(u => u.status === 'available').length || 0
        } else if (p.hasVariants) {
          // Sum stock from all variants
          availableStock = p.variants?.reduce((sum, v) => sum + v.stock, 0) || 0
        } else {
          // Simple quantity tracking
          availableStock = p.quantity || 0
        }
        
        return availableStock < threshold
      })
      
      setLowStockProducts(lowStock)
    } catch (error) {
      console.error('Error fetching low stock products:', error)
      toast.error('Error al cargar productos con stock bajo')
    } finally {
      setLoading(false)
    }
  }

  const handleHideAlert = async (product: Product) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/products/${product.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            hideStockAlert: true
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        console.error('Error hiding alert:', error)
        toast.error('Error al ocultar la alerta')
        return
      }

      const data = await response.json()
      if (data.success) {
        toast.success(`Alerta ocultada para "${product.name}"`)
        // Remove from the list
        setLowStockProducts(prev => prev.filter(p => p.id !== product.id))
        setProductToHide(null)
        onStockUpdated?.()
      } else {
        console.error('Error hiding alert:', data.error)
        toast.error('Error al ocultar la alerta')
      }
    } catch (error) {
      console.error('Error hiding alert:', error)
      toast.error('Error al ocultar la alerta')
    }
  }

  const getAvailableStock = (product: Product) => {
    if (product.trackByUnit) {
      return product.units?.filter(u => u.status === 'available').length || 0
    } else if (product.hasVariants) {
      return product.variants?.reduce((sum, v) => sum + v.stock, 0) || 0
    } else {
      return product.quantity || 0
    }
  }

  const getStockStatus = (product: Product) => {
    const availableStock = getAvailableStock(product)
    const threshold = product.minStock || globalStockThreshold
    if (availableStock === 0) return { label: 'Sin stock', color: 'bg-red-600' }
    if (availableStock < threshold / 2) return { label: 'Crítico', color: 'bg-red-500' }
    return { label: 'Bajo', color: 'bg-orange-500' }
  }

  const handlePrintPDF = () => {
    // Create print window with formatted content
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('No se pudo abrir la ventana de impresión. Verifica los permisos del navegador.')
      return
    }

    const currentDate = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    const productsHTML = lowStockProducts.map((product) => {
      const status = getStockStatus(product)
      const availableStock = getAvailableStock(product)
      const stockType = product.trackByUnit ? 'Unidades (IMEI/Serial)' : 
                       product.hasVariants ? 'Variantes' : 'Cantidad'
      
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${product.name}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${product.category}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 600; color: ${
            availableStock === 0 ? '#dc2626' : '#ea580c'
          };">${availableStock}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${stockType}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
            <span style="
              background-color: ${status.color === 'bg-red-600' ? '#dc2626' : status.color === 'bg-red-500' ? '#ef4444' : '#f97316'};
              color: white;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 12px;
            ">${status.label}</span>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${product.price.toLocaleString()}</td>
        </tr>
      `
    }).join('')

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reporte de Stock Bajo - Oryon App</title>
        <style>
          @media print {
            body { 
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
          body {
            font-family: system-ui, -apple-system, sans-serif;
            margin: 0;
            padding: 40px;
            background: white;
            color: #111827;
          }
          .header {
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #2563eb;
          }
          .header h1 {
            margin: 0 0 8px 0;
            color: #1e40af;
            font-size: 28px;
          }
          .header .date {
            color: #6b7280;
            font-size: 14px;
          }
          .summary {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 16px;
            margin-bottom: 24px;
            border-radius: 4px;
          }
          .summary p {
            margin: 0;
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
          }
          thead {
            background-color: #1e40af;
            color: white;
          }
          thead th {
            padding: 14px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          tbody tr:hover {
            background-color: #f9fafb;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
          }
          @media print {
            body {
              padding: 20px;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📦 Reporte de Stock Bajo</h1>
          <p class="date">Generado: ${currentDate}</p>
        </div>

        <div class="summary">
          <p><strong>Total de productos con alerta:</strong> ${lowStockProducts.length} ${lowStockProducts.length === 1 ? 'producto' : 'productos'}</p>
          <p style="margin-top: 4px;">Umbral de stock global: ${globalStockThreshold} unidades</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th style="text-align: center;">Stock</th>
              <th style="text-align: center;">Tipo</th>
              <th style="text-align: center;">Estado</th>
              <th style="text-align: right;">Precio</th>
            </tr>
          </thead>
          <tbody>
            ${productsHTML}
          </tbody>
        </table>

        <div class="footer">
          <p>Oryon App - Sistema de Gestión de Inventario y Reparaciones</p>
          <p style="margin-top: 4px;">Este reporte contiene productos que requieren reposición</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
    
    toast.success('Abriendo vista de impresión...')
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="text-red-600" size={24} />
              Productos con Stock Bajo
            </DialogTitle>
            <DialogDescription>
              Productos que requieren reposición o gestión de inventario
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Cargando productos...</p>
            </div>
          ) : lowStockProducts.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle className="mx-auto text-green-600 mb-2" size={48} />
              <p className="text-gray-600">No hay productos con stock bajo</p>
              <p className="text-sm text-gray-500 mt-1">Todos los productos tienen inventario suficiente</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-3">
                {lowStockProducts.map((product) => {
                  const status = getStockStatus(product)
                  return (
                    <div
                      key={product.id}
                      className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Package className="text-blue-600" size={24} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="font-medium truncate">{product.name}</h4>
                            <p className="text-sm text-gray-600">{product.category}</p>
                          </div>
                          <Badge className={`${status.color} text-white`}>
                            {status.label}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <div>
                            <span className="text-gray-600">Stock disponible: </span>
                            <span className={`font-medium ${
                              getAvailableStock(product) === 0 
                                ? 'text-red-600' 
                                : 'text-orange-600'
                            }`}>
                              {getAvailableStock(product)} {product.trackByUnit ? 'unidades' : product.hasVariants ? 'total' : 'disponibles'}
                            </span>
                          </div>
                          {product.hasVariants && product.variants && product.variants.length > 0 && (
                            <div>
                              <span className="text-gray-600">{product.variants.length} variantes</span>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-600">Precio: </span>
                            <span className="font-medium">${product.price.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setProductToHide(product)}
                        className="text-gray-400 hover:text-red-600"
                        title="No reponer este producto"
                      >
                        <X size={18} />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}

          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-sm text-gray-600">
              Total: {lowStockProducts.length} {lowStockProducts.length === 1 ? 'producto' : 'productos'}
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handlePrintPDF}
                disabled={lowStockProducts.length === 0}
                className="gap-2"
              >
                <FileDown size={18} />
                Imprimir PDF
              </Button>
              <Button onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog for hiding alert */}
      <AlertDialog open={!!productToHide} onOpenChange={(open) => !open && setProductToHide(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Ocultar alerta de stock?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto ocultará la alerta para <strong>"{productToHide?.name}"</strong>.
              El producto seguirá en tu inventario pero no aparecerá en las alertas de stock bajo.
              <br /><br />
              <span className="text-orange-600">
                Nota: Puedes volver a activar la alerta editando el producto.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => productToHide && handleHideAlert(productToHide)}
              className="bg-red-600 hover:bg-red-700"
            >
              Ocultar alerta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
