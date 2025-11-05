/**
 * Product Filters Component
 * Search and filter controls for products list
 */

import { Search, Filter, Package, X } from 'lucide-react'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { PRODUCT_CATEGORIES } from './constants'
import type { Branch, ProductFilters as FilterState } from './types'

interface ProductFiltersProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  branches: Branch[]
  resultsCount: number
}

export function ProductFilters({ 
  filters, 
  onFiltersChange, 
  branches,
  resultsCount 
}: ProductFiltersProps) {
  const { searchTerm, categoryFilter, branchFilter } = filters

  const updateFilter = (key: keyof FilterState, value: string) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    onFiltersChange({
      searchTerm: '',
      categoryFilter: 'all',
      branchFilter: 'all'
    })
  }

  const hasActiveFilters = searchTerm || categoryFilter !== 'all' || branchFilter !== 'all'

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Buscar productos por nombre, descripción, IMEI, etc..."
            value={searchTerm}
            onChange={(e) => updateFilter('searchTerm', e.target.value)}
            className="pl-10 text-sm"
          />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={(value) => updateFilter('categoryFilter', value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter size={16} className="mr-2" />
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las Categorías</SelectItem>
              {PRODUCT_CATEGORIES.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Branch Filter */}
          <Select value={branchFilter} onValueChange={(value) => updateFilter('branchFilter', value)}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Package size={16} className="mr-2" />
              <SelectValue placeholder="Sucursal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las Sucursales</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600">Filtros activos:</span>
          
          {searchTerm && (
            <Badge variant="secondary" className="gap-1">
              Búsqueda: {searchTerm}
              <button 
                onClick={() => updateFilter('searchTerm', '')} 
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                aria-label="Eliminar filtro de búsqueda"
              >
                <X size={12} />
              </button>
            </Badge>
          )}
          
          {categoryFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1 capitalize">
              {PRODUCT_CATEGORIES.find(c => c.value === categoryFilter)?.label}
              <button 
                onClick={() => updateFilter('categoryFilter', 'all')} 
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                aria-label="Eliminar filtro de categoría"
              >
                <X size={12} />
              </button>
            </Badge>
          )}
          
          {branchFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {branches.find(b => b.id === branchFilter)?.name || 'Sucursal'}
              <button 
                onClick={() => updateFilter('branchFilter', 'all')} 
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                aria-label="Eliminar filtro de sucursal"
              >
                <X size={12} />
              </button>
            </Badge>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
          >
            Limpiar filtros
          </Button>
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        {resultsCount === 0 ? (
          'No se encontraron productos'
        ) : (
          `Mostrando ${resultsCount} producto${resultsCount !== 1 ? 's' : ''}`
        )}
      </div>
    </div>
  )
}
