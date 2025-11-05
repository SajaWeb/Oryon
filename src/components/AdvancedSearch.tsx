import { useState } from 'react'
import { Search, Filter, X } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet'
import { Badge } from './ui/badge'

export interface SearchFilter {
  id: string
  label: string
  type: 'text' | 'select' | 'date' | 'number'
  options?: { value: string; label: string }[]
  placeholder?: string
}

interface AdvancedSearchProps {
  filters: SearchFilter[]
  onSearch: (values: Record<string, string>) => void
  onClear: () => void
  activeFilters?: Record<string, string>
}

export function AdvancedSearch({
  filters,
  onSearch,
  onClear,
  activeFilters = {}
}: AdvancedSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [values, setValues] = useState<Record<string, string>>(activeFilters)

  const activeFilterCount = Object.keys(activeFilters).filter(
    key => activeFilters[key]
  ).length

  const handleSearch = () => {
    onSearch(values)
    setIsOpen(false)
  }

  const handleClear = () => {
    setValues({})
    onClear()
    setIsOpen(false)
  }

  const handleRemoveFilter = (key: string) => {
    const newValues = { ...values }
    delete newValues[key]
    setValues(newValues)
    onSearch(newValues)
  }

  const renderFilterInput = (filter: SearchFilter) => {
    switch (filter.type) {
      case 'text':
        return (
          <Input
            id={filter.id}
            value={values[filter.id] || ''}
            onChange={(e) =>
              setValues({ ...values, [filter.id]: e.target.value })
            }
            placeholder={filter.placeholder || `Buscar por ${filter.label.toLowerCase()}`}
          />
        )
      case 'select':
        return (
          <select
            id={filter.id}
            value={values[filter.id] || ''}
            onChange={(e) =>
              setValues({ ...values, [filter.id]: e.target.value })
            }
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {filter.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )
      case 'date':
        return (
          <Input
            id={filter.id}
            type="date"
            value={values[filter.id] || ''}
            onChange={(e) =>
              setValues({ ...values, [filter.id]: e.target.value })
            }
          />
        )
      case 'number':
        return (
          <Input
            id={filter.id}
            type="number"
            value={values[filter.id] || ''}
            onChange={(e) =>
              setValues({ ...values, [filter.id]: e.target.value })
            }
            placeholder={filter.placeholder}
          />
        )
    }
  }

  return (
    <div className="space-y-3">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="w-full sm:w-auto relative">
            <Filter className="h-4 w-4 mr-2" />
            Filtros Avanzados
            {activeFilterCount > 0 && (
              <Badge
                variant="default"
                className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Búsqueda Avanzada</SheetTitle>
            <SheetDescription>
              Combina múltiples filtros para encontrar exactamente lo que buscas
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-4 mt-6">
            {filters.map((filter) => (
              <div key={filter.id}>
                <Label htmlFor={filter.id} className="mb-2 block">
                  {filter.label}
                </Label>
                {renderFilterInput(filter)}
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-6 pt-6 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClear}
            >
              Limpiar
            </Button>
            <Button className="flex-1" onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Active filters display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(activeFilters).map(([key, value]) => {
            if (!value) return null
            const filter = filters.find((f) => f.id === key)
            if (!filter) return null

            let displayValue = value
            if (filter.type === 'select') {
              const option = filter.options?.find((o) => o.value === value)
              displayValue = option?.label || value
            }

            return (
              <Badge
                key={key}
                variant="secondary"
                className="text-sm px-3 py-1 gap-2"
              >
                <span className="font-medium">{filter.label}:</span>
                <span>{displayValue}</span>
                <button
                  onClick={() => handleRemoveFilter(key)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}
