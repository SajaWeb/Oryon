/**
 * Product Card Component - Modern Design
 * Displays a single product with all its details and actions in a compact, modern layout
 */

import { Edit, Trash2, Package, Smartphone, ArrowUpDown, ArrowLeftRight, Building2, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { getMarginPercentage, getAvailableStock, formatPrice } from './utils'
import { LOW_STOCK_THRESHOLD } from './constants'
import type { Product, Branch } from './types'

interface ProductCardProps {
  product: Product
  branches: Branch[]
  onEdit: (product: Product) => void
  onDelete: (id: number) => void
  onManageUnits?: (product: Product) => void
  onManageVariants?: (product: Product) => void
  onAdjustInventory?: (product: Product) => void
  onTransferBranch?: (product: Product) => void
  onAddStock?: (product: Product) => void
  isAdmin: boolean
  canEdit?: boolean
  userRole?: string
}

export function ProductCard({
  product,
  branches,
  onEdit,
  onDelete,
  onManageUnits,
  onManageVariants,
  onAdjustInventory,
  onTransferBranch,
  onAddStock,
  isAdmin,
  canEdit = true,
  userRole
}: ProductCardProps) {
  // Validar que el producto tenga datos válidos
  if (!product.id || !product.name || isNaN(product.price)) {
    console.error('Invalid product data:', product)
    return null
  }

  const stock = getAvailableStock(product)
  const margin = getMarginPercentage(product)
  const isLowStock = stock < LOW_STOCK_THRESHOLD
  const branch = branches.find(b => b.id === product.branchId)

  return (
    <TooltipProvider>
      <Card className="group relative overflow-hidden border border-gray-200/60 dark:border-gray-700/60 shadow-sm hover:shadow-md transition-all duration-300 bg-white dark:bg-gray-900">
        {/* Subtle top accent */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/80 via-blue-600/80 to-blue-500/80" />
        
        <CardContent className="p-4">
          {/* Top Section: Title + Actions */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white leading-tight mb-1.5 line-clamp-2">
                {product.name}
              </h3>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize border-gray-300/80 dark:border-gray-600/80 text-gray-700 dark:text-gray-300">
                  {product.category}
                </Badge>
                {branch && (
                  <Badge className="text-[10px] px-1.5 py-0 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
                    <Building2 size={9} className="mr-0.5" />
                    {branch.name}
                  </Badge>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-0.5">
              {canEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                      onClick={() => onEdit(product)}
                    >
                      <Edit size={13} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Editar</TooltipContent>
                </Tooltip>
              )}
              {isAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      onClick={() => onDelete(product.id)}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Eliminar</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Specs Row */}
          {(product.storage || product.ram || product.color) && (
            <div className="flex flex-wrap gap-1 mb-3">
              {product.storage && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-50/80 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-0">
                  💾 {product.storage}
                </Badge>
              )}
              {product.ram && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-50/60 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-0">
                  🧠 {product.ram}
                </Badge>
              )}
              {product.color && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-0 capitalize">
                  🎨 {product.color}
                </Badge>
              )}
            </div>
          )}

          {/* Price & Stock Grid */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* Price */}
            <div className="bg-green-50/70 dark:bg-green-950/20 rounded-lg p-2.5 border border-green-200/40 dark:border-green-800/40">
              <p className="text-[10px] text-green-700 dark:text-green-400 uppercase tracking-wide mb-0.5 font-medium">Precio</p>
              <p className="text-xl font-bold text-green-700 dark:text-green-400">
                {formatPrice(product.price)}
              </p>
              {product.cost && product.cost > 0 && (
                <p className="text-[10px] text-gray-600 dark:text-gray-400">
                  Costo: {formatPrice(product.cost)}
                </p>
              )}
            </div>

            {/* Stock */}
            <div className={`rounded-lg p-2.5 border ${
              stock === 0 
                ? 'bg-gray-50/70 dark:bg-gray-800/50 border-gray-200/40 dark:border-gray-700/40' 
                : isLowStock 
                  ? 'bg-orange-50/70 dark:bg-orange-950/20 border-orange-200/40 dark:border-orange-800/40' 
                  : 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-200/40 dark:border-blue-800/40'
            }`}>
              <p className={`text-[10px] uppercase tracking-wide mb-0.5 font-medium ${
                stock === 0 ? 'text-gray-600 dark:text-gray-400' : isLowStock ? 'text-orange-700 dark:text-orange-400' : 'text-blue-700 dark:text-blue-400'
              }`}>Stock</p>
              <div className="flex items-baseline gap-1.5">
                <p className={`text-xl font-bold ${
                  stock === 0 ? 'text-gray-500 dark:text-gray-400' : isLowStock ? 'text-orange-700 dark:text-orange-400' : 'text-blue-700 dark:text-blue-400'
                }`}>
                  {stock}
                </p>
                {product.trackByUnit && (
                  <Badge className="text-[9px] px-1 py-0 bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-0">
                    <Smartphone size={8} className="mr-0.5" />
                    {product.units?.length || 0}
                  </Badge>
                )}
                {product.hasVariants && (
                  <Badge className="text-[9px] px-1 py-0 bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-0">
                    <Package size={8} className="mr-0.5" />
                    {product.variants?.length || 0}
                  </Badge>
                )}
              </div>
              {isLowStock && stock > 0 && (
                <p className="text-[9px] text-orange-700 dark:text-orange-400 mt-0.5 font-medium">⚠️ Stock bajo</p>
              )}
              {stock === 0 && (
                <p className="text-[9px] text-gray-500 dark:text-gray-400 mt-0.5">Sin stock</p>
              )}
            </div>
          </div>

          {/* Margin Badge */}
          {margin && (
            <div className="mb-3">
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-green-50/80 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200/40 dark:border-green-800/40">
                <TrendingUp size={10} className="mr-1" />
                {margin}% margen
              </Badge>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center gap-1.5 pt-3 border-t border-gray-200/60 dark:border-gray-700/60">
            {/* Management Button */}
            {product.trackByUnit ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-[11px] border-blue-200/60 dark:border-blue-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-700 dark:text-blue-300"
                    onClick={() => onManageUnits?.(product)}
                    disabled={!canEdit}
                  >
                    <Smartphone size={13} className="mr-1" />
                    Unidades
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{canEdit ? 'Gestionar' : 'Ver'} Unidades</TooltipContent>
              </Tooltip>
            ) : product.hasVariants ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-[11px] border-blue-200/60 dark:border-blue-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-700 dark:text-blue-300"
                    onClick={() => onManageVariants?.(product)}
                    disabled={!canEdit}
                  >
                    <Package size={13} className="mr-1" />
                    Variantes
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{canEdit ? 'Gestionar' : 'Ver'} Variantes</TooltipContent>
              </Tooltip>
            ) : (
              <>
                {isAdmin && canEdit && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-[11px] border-gray-200/60 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300"
                        onClick={() => onAdjustInventory?.(product)}
                      >
                        <ArrowUpDown size={13} className="mr-1" />
                        Ajustar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Ajustar Inventario (Admin)</TooltipContent>
                  </Tooltip>
                )}
                {userRole === 'asesor' && canEdit && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-[11px] border-green-200/60 dark:border-green-800/60 hover:bg-green-50 dark:hover:bg-green-950/30 text-green-700 dark:text-green-300"
                        onClick={() => onAddStock?.(product)}
                      >
                        <TrendingUp size={13} className="mr-1" />
                        + Stock
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Agregar Stock</TooltipContent>
                  </Tooltip>
                )}
              </>
            )}

            {/* Transfer Button */}
            {isAdmin && branches.length > 1 && stock > 0 && canEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    className="h-8 px-3 text-[11px] bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white border-0 shadow-sm"
                    onClick={() => onTransferBranch?.(product)}
                  >
                    <ArrowLeftRight size={13} className="mr-1" />
                    Trasladar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Trasladar a Otra Sucursal</TooltipContent>
              </Tooltip>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
