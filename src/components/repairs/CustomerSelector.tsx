import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Customer, RepairFormData } from './types'

interface CustomerSelectorProps {
  customers: Customer[]
  identificationTypes: string[]
  formData: RepairFormData
  onFormDataChange: (data: Partial<RepairFormData>) => void
  onCustomerSelect: (customerId: number) => void
}

export function CustomerSelector({
  customers,
  identificationTypes,
  formData,
  onFormDataChange,
  onCustomerSelect
}: CustomerSelectorProps) {
  const [customerMode, setCustomerMode] = useState<'select' | 'new'>('select')
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')

  const getFilteredCustomers = () => {
    if (!customerSearchTerm) return customers
    const search = customerSearchTerm.toLowerCase()
    return customers.filter(c => 
      c.name.toLowerCase().includes(search) ||
      c.phone.includes(search) ||
      (c.identificationNumber && c.identificationNumber.toLowerCase().includes(search))
    )
  }

  const handleCustomerSelect = (customerId: number) => {
    const customer = customers.find(c => c.id === customerId)
    if (customer) {
      setSelectedCustomerId(customerId)
      onCustomerSelect(customerId)
      onFormDataChange({
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        customerIdentificationType: customer.identificationType || '',
        customerIdentificationNumber: customer.identificationNumber || ''
      })
    }
  }

  const handleModeChange = (mode: 'select' | 'new') => {
    setCustomerMode(mode)
    if (mode === 'new') {
      setSelectedCustomerId(null)
      onFormDataChange({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        customerIdentificationType: '',
        customerIdentificationNumber: ''
      })
    } else if (selectedCustomerId) {
      handleCustomerSelect(selectedCustomerId)
    }
  }

  return (
    <div className="border rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4 bg-gray-50">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
        <h4 className="text-base sm:text-lg">Información del Cliente *</h4>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={customerMode === 'select' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleModeChange('select')}
            className="flex-1 sm:flex-none text-xs sm:text-sm h-8 sm:h-9"
          >
            <span className="hidden sm:inline">Seleccionar Existente</span>
            <span className="sm:hidden">Existente</span>
          </Button>
          <Button
            type="button"
            variant={customerMode === 'new' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleModeChange('new')}
            className="flex-1 sm:flex-none text-xs sm:text-sm h-8 sm:h-9"
          >
            <UserPlus size={14} className="mr-1" />
            <span className="hidden sm:inline">Crear Nuevo</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>
      </div>

      {customerMode === 'select' ? (
        <div className="space-y-3">
          <div>
            <Label htmlFor="customerSearch">Buscar Cliente</Label>
            <Input
              id="customerSearch"
              placeholder="Buscar por nombre, teléfono o identificación..."
              value={customerSearchTerm}
              onChange={(e) => setCustomerSearchTerm(e.target.value)}
              className="mb-2"
            />
          </div>
          <div className="border rounded-md bg-white max-h-48 overflow-y-auto">
            {getFilteredCustomers().length > 0 ? (
              getFilteredCustomers().map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleCustomerSelect(customer.id)}
                  className={`w-full text-left p-3 border-b last:border-b-0 hover:bg-gray-50 transition-colors ${
                    selectedCustomerId === customer.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p>{customer.name}</p>
                      <p className="text-sm text-gray-600">
                        {customer.phone}
                        {customer.identificationNumber && ` • ${customer.identificationType}: ${customer.identificationNumber}`}
                      </p>
                    </div>
                    {selectedCustomerId === customer.id && (
                      <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      </div>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                {customerSearchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}
              </div>
            )}
          </div>
          {selectedCustomerId && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">
                ✓ Cliente seleccionado: <span>{formData.customerName}</span>
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="customerName" className="text-sm sm:text-base">Nombre Completo *</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => onFormDataChange({ customerName: e.target.value })}
                required
                className="h-10 text-sm sm:text-base"
              />
            </div>
            <div>
              <Label htmlFor="customerPhone" className="text-sm sm:text-base">Teléfono *</Label>
              <Input
                id="customerPhone"
                value={formData.customerPhone}
                onChange={(e) => onFormDataChange({ customerPhone: e.target.value })}
                required
                className="h-10 text-sm sm:text-base"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="customerIdentificationType" className="text-sm sm:text-base">Tipo de Identificación</Label>
              <Select
                value={formData.customerIdentificationType}
                onValueChange={(value) => onFormDataChange({ customerIdentificationType: value })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Seleccionar tipo" />
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
              <Label htmlFor="customerIdentificationNumber" className="text-sm sm:text-base">Número de Identificación</Label>
              <Input
                id="customerIdentificationNumber"
                value={formData.customerIdentificationNumber}
                onChange={(e) => onFormDataChange({ customerIdentificationNumber: e.target.value })}
                placeholder="Ej: 1234567890"
                className="h-10 text-sm sm:text-base"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="customerEmail">Email</Label>
            <Input
              id="customerEmail"
              type="email"
              value={formData.customerEmail}
              onChange={(e) => onFormDataChange({ customerEmail: e.target.value })}
              placeholder="correo@ejemplo.com"
            />
          </div>
        </div>
      )}
    </div>
  )
}
