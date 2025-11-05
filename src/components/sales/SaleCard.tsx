/**
 * Sale Card Component - Modern Design
 * Displays a single sale/invoice with all its details and actions in a compact, modern layout
 */

import { Printer, Trash2, Receipt, Clock, DollarSign, TrendingUp, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'

interface CartItem {
  productId: number
  productName: string
  price: number
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

interface SaleCardProps {
  sale: Sale
  onPrintInvoice: (sale: Sale) => void
  onCancelSale: (sale: Sale) => void
  canCancel: boolean
}

export function SaleCard({ sale, onPrintInvoice, onCancelSale, canCancel }: SaleCardProps) {
  const isCancelled = sale.status === 'cancelled'
  const isRepair = sale.type === 'repair'
  
  // Calculate credit status
  const getCreditStatus = () => {
    if (sale.paymentMethod !== 'Crédito' || !sale.creditDueDate) return null

    const now = new Date()
    const dueDate = new Date(sale.creditDueDate)
    const diffTime = dueDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { status: 'overdue', days: Math.abs(diffDays), label: `${Math.abs(diffDays)} días en mora`, color: 'red' }
    } else if (diffDays === 0) {
      return { status: 'due-today', days: 0, label: 'Vence hoy', color: 'yellow' }
    } else {
      return { status: 'pending', days: diffDays, label: `${diffDays} días restantes`, color: 'blue' }
    }
  }

  const creditStatus = getCreditStatus()
  const isOverdue = creditStatus?.status === 'overdue'

  // Calculate profit
  const profit = sale.totalCost && sale.totalCost > 0 ? sale.total - sale.totalCost : null

  return (
    <TooltipProvider>
      <Card className="group relative overflow-hidden border border-gray-200/60 dark:border-gray-700/60 shadow-sm hover:shadow-md transition-all duration-300 bg-white dark:bg-gray-900">
        {/* Subtle top accent with conditional color */}
        <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${
          isCancelled 
            ? 'from-red-500/80 via-red-600/80 to-red-500/80' 
            : isOverdue
              ? 'from-orange-500/80 via-orange-600/80 to-orange-500/80'
              : isRepair
                ? 'from-purple-500/80 via-purple-600/80 to-purple-500/80'
                : 'from-blue-500/80 via-blue-600/80 to-blue-500/80'
        }`} />
        
        <CardContent className="p-4">
          {/* Top Section: Title + Actions */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <h3 className="font-semibold text-gray-900 dark:text-white leading-tight">
                  {sale.invoiceNumber || `#${sale.id}`}
                </h3>
                {isRepair && (
                  <Badge className="text-[10px] px-1.5 py-0 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50">
                    <Receipt size={9} className="mr-0.5" />
                    Reparación #{sale.repairId}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {isCancelled && (
                  <Badge className="text-[10px] px-1.5 py-0 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200/50 dark:border-red-800/50">
                    ✗ Anulada
                  </Badge>
                )}
                {!isCancelled && sale.paymentMethod === 'Crédito' && creditStatus && (
                  <Badge className={`text-[10px] px-1.5 py-0 border ${
                    creditStatus.color === 'red' 
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200/50 dark:border-red-800/50'
                      : creditStatus.color === 'yellow'
                        ? 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300 border-yellow-200/50 dark:border-yellow-800/50'
                        : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/50 dark:border-blue-800/50'
                  }`}>
                    <Clock size={9} className="mr-0.5" />
                    {creditStatus.label}
                  </Badge>
                )}
                {!isRepair && sale.paymentMethod !== 'Crédito' && !isCancelled && (
                  <Badge className="text-[10px] px-1.5 py-0 bg-gray-50 dark:bg-gray-950/40 text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-gray-800/50 capitalize">
                    💳 {sale.paymentMethod || 'Efectivo'}
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-gray-300/80 dark:border-gray-600/80 text-gray-600 dark:text-gray-400">
                  <Clock size={9} className="mr-0.5" />
                  {new Date(sale.createdAt).toLocaleDateString('es-CO', { 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Badge>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-0.5">
              {!isCancelled && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                      onClick={() => onPrintInvoice(sale)}
                    >
                      <Printer size={13} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Imprimir</TooltipContent>
                </Tooltip>
              )}
              {!isCancelled && canCancel && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      onClick={() => onCancelSale(sale)}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Anular Factura</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Customer Info */}
          <div className="mb-3 p-2.5 bg-gray-50/70 dark:bg-gray-800/50 rounded-lg border border-gray-200/40 dark:border-gray-700/40">
            <p className="text-[10px] text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-0.5 font-medium">Cliente</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{sale.customerName}</p>
            {sale.customerPhone && (
              <p className="text-xs text-gray-600 dark:text-gray-400">Tel: {sale.customerPhone}</p>
            )}
          </div>

          {/* Items Section */}
          {isRepair ? (
            <div className="space-y-2 mb-3">
              {sale.laborItems && sale.laborItems.length > 0 && (
                <div className="bg-blue-50/70 dark:bg-blue-950/20 rounded-lg p-2.5 border border-blue-200/40 dark:border-blue-800/40">
                  <p className="text-[10px] text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-1.5 font-medium">Mano de Obra</p>
                  {sale.laborItems.map((item, idx) => (
                    <div key={idx} className="text-xs text-gray-700 dark:text-gray-300 mb-1 last:mb-0">
                      <div className="flex justify-between items-start">
                        <span className="flex-1">{item.description}</span>
                        <span className="font-medium ml-2">${(item.hours * item.hourlyRate).toFixed(2)}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        {item.hours}h × ${item.hourlyRate}/h
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {sale.parts && sale.parts.length > 0 && (
                <div className="bg-purple-50/70 dark:bg-purple-950/20 rounded-lg p-2.5 border border-purple-200/40 dark:border-purple-800/40">
                  <p className="text-[10px] text-purple-700 dark:text-purple-400 uppercase tracking-wide mb-1.5 font-medium">Repuestos</p>
                  {sale.parts.map((part, idx) => (
                    <div key={idx} className="text-xs text-gray-700 dark:text-gray-300 mb-1 last:mb-0">
                      <div className="flex justify-between items-start">
                        <span className="flex-1">{part.description}</span>
                        <span className="font-medium ml-2">${(part.quantity * part.salePrice).toFixed(2)}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        {part.quantity}x ${part.salePrice} (costo: ${part.purchaseCost})
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {sale.notes && (
                <div className="text-xs text-gray-600 dark:text-gray-400 p-2 bg-gray-50/70 dark:bg-gray-800/50 rounded border border-gray-200/40 dark:border-gray-700/40">
                  <span className="font-medium">Notas:</span> {sale.notes}
                </div>
              )}
            </div>
          ) : (
            <div className="mb-3 bg-gray-50/70 dark:bg-gray-800/50 rounded-lg p-2.5 border border-gray-200/40 dark:border-gray-700/40">
              <p className="text-[10px] text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5 font-medium">Productos</p>
              <div className="space-y-1">
                {sale.items.map((item, idx) => (
                  <div key={idx} className="text-xs text-gray-700 dark:text-gray-300">
                    <div className="flex justify-between items-start">
                      <span className="flex-1">
                        {item.quantity}x {item.productName}
                        {item.variantName && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1 border-gray-300/80 dark:border-gray-600/80">
                            {item.variantName}
                          </Badge>
                        )}
                      </span>
                      <span className="font-medium ml-2">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    {item.unitDetails && item.unitDetails.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.unitDetails.slice(0, 2).map((detail, i) => (
                          <Badge key={i} variant="outline" className="text-[9px] px-1 py-0 border-gray-300/80 dark:border-gray-600/80">
                            {detail}
                          </Badge>
                        ))}
                        {item.unitDetails.length > 2 && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 border-gray-300/80 dark:border-gray-600/80">
                            +{item.unitDetails.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total & Profit Grid */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* Total */}
            <div className={`rounded-lg p-2.5 border ${
              isCancelled 
                ? 'bg-gray-50/70 dark:bg-gray-800/50 border-gray-200/40 dark:border-gray-700/40'
                : 'bg-green-50/70 dark:bg-green-950/20 border-green-200/40 dark:border-green-800/40'
            }`}>
              <p className={`text-[10px] uppercase tracking-wide mb-0.5 font-medium ${
                isCancelled ? 'text-gray-600 dark:text-gray-400' : 'text-green-700 dark:text-green-400'
              }`}>
                <DollarSign size={10} className="inline mr-0.5" />
                Total
              </p>
              <p className={`text-xl font-bold ${
                isCancelled 
                  ? 'text-gray-500 dark:text-gray-400 line-through' 
                  : 'text-green-700 dark:text-green-400'
              }`}>
                ${sale.total.toLocaleString()}
              </p>
              {sale.totalCost && sale.totalCost > 0 && (
                <p className="text-[10px] text-gray-600 dark:text-gray-400">
                  Costo: ${sale.totalCost.toLocaleString()}
                </p>
              )}
            </div>

            {/* Profit */}
            {profit !== null && !isCancelled && (
              <div className="bg-blue-50/70 dark:bg-blue-950/20 rounded-lg p-2.5 border border-blue-200/40 dark:border-blue-800/40">
                <p className="text-[10px] text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-0.5 font-medium">
                  <TrendingUp size={10} className="inline mr-0.5" />
                  Ganancia
                </p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-400">
                  ${profit.toLocaleString()}
                </p>
                <p className="text-[10px] text-gray-600 dark:text-gray-400">
                  {((profit / sale.total) * 100).toFixed(1)}% margen
                </p>
              </div>
            )}
            
            {(profit === null || isCancelled) && (
              <div className="bg-gray-50/70 dark:bg-gray-800/50 rounded-lg p-2.5 border border-gray-200/40 dark:border-gray-700/40 flex items-center justify-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  {isCancelled ? 'Factura Anulada' : 'Sin datos de costo'}
                </p>
              </div>
            )}
          </div>

          {/* Cancelled Info */}
          {isCancelled && sale.cancelReason && (
            <div className="p-2.5 bg-red-50/70 dark:bg-red-950/20 rounded-lg border border-red-200/40 dark:border-red-800/40">
              <p className="text-[10px] text-red-700 dark:text-red-400 uppercase tracking-wide mb-1 font-medium flex items-center gap-1">
                <AlertCircle size={10} />
                Motivo de Anulación
              </p>
              <p className="text-xs text-gray-700 dark:text-gray-300">{sale.cancelReason}</p>
              {sale.cancelledBy && (
                <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-1">
                  Por: {sale.cancelledBy} • {sale.cancelledAt && new Date(sale.cancelledAt).toLocaleDateString('es-CO')}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
