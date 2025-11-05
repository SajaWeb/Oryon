import { useEffect, useState } from 'react'
import { projectId } from '../utils/supabase/info'
import { Plus, Edit, User, RefreshCw, CreditCard, Download } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { toast } from 'sonner@2.0.3'
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

interface Customer {
  id: number
  name: string
  email: string
  phone: string
  address: string
  identificationType?: string
  identificationNumber?: string
  createdAt: string
}

interface CustomersProps {
  accessToken: string
  userRole?: string
}

export function Customers({ accessToken, userRole = 'admin' }: CustomersProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [identificationTypes, setIdentificationTypes] = useState<string[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    identificationType: '',
    identificationNumber: ''
  })

  useEffect(() => {
    fetchCustomers()
    fetchCompanySettings()
  }, [])

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
      } else {
        // Default types if not configured
        setIdentificationTypes([
          'Cédula de Ciudadanía',
          'NIT',
          'Pasaporte',
          'Cédula de Extranjería'
        ])
      }
    } catch (error) {
      console.error('Error fetching company settings:', error)
      setIdentificationTypes([
        'Cédula de Ciudadanía',
        'NIT',
        'Pasaporte',
        'Cédula de Extranjería'
      ])
    }
  }

  const fetchCustomers = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/customers`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )
      const data = await response.json()
      if (data.success) {
        const parsed = data.customers.map((c: string) => JSON.parse(c))
        setCustomers(parsed.sort((a: Customer, b: Customer) => b.id - a.id))
      } else {
        console.error('Error fetching customers:', data.error)
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingCustomer
        ? `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/customers/${editingCustomer.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/customers`

      const response = await fetch(url, {
        method: editingCustomer ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      if (data.success) {
        fetchCustomers()
        setDialogOpen(false)
        resetForm()
        toast.success(editingCustomer ? 'Cliente actualizado exitosamente' : 'Cliente creado exitosamente')
      } else {
        console.error('Error saving customer:', data.error)
        toast.error(data.error || 'Error al guardar el cliente')
      }
    } catch (error) {
      console.error('Error saving customer:', error)
      toast.error('Error al guardar el cliente')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      identificationType: '',
      identificationNumber: ''
    })
    setEditingCustomer(null)
  }

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      identificationType: customer.identificationType || '',
      identificationNumber: customer.identificationNumber || ''
    })
    setDialogOpen(true)
  }

  const handleExportCustomers = async () => {
    if (customers.length === 0) {
      toast.error('No hay clientes para exportar')
      return
    }

    setIsExporting(true)
    try {
      // Create a formatted export object with metadata
      const exportData = {
        exportDate: new Date().toISOString(),
        totalCustomers: customers.length,
        generatedBy: 'Oryon App',
        customers: customers.map(customer => ({
          id: customer.id,
          nombre: customer.name,
          email: customer.email,
          telefono: customer.phone,
          direccion: customer.address,
          tipoIdentificacion: customer.identificationType || '',
          numeroIdentificacion: customer.identificationNumber || '',
          fechaRegistro: customer.createdAt
        }))
      }

      // Create JSON file
      const jsonString = JSON.stringify(exportData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      // Create download link
      const link = document.createElement('a')
      link.href = url
      const timestamp = new Date().toISOString().split('T')[0]
      link.download = `clientes_backup_${timestamp}.json`
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.success(`${customers.length} clientes exportados exitosamente`)
    } catch (error) {
      console.error('Error exporting customers:', error)
      toast.error('Error al exportar clientes')
    } finally {
      setIsExporting(false)
    }
  }

  if (loading) {
    return <div className="p-8">Cargando...</div>
  }

  // Pagination logic
  const totalPages = Math.ceil(customers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedCustomers = customers.slice(startIndex, endIndex)

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-8 gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl mb-1 sm:mb-2">Clientes</h2>
          <p className="text-sm sm:text-base text-gray-600">Base de datos de clientes ({customers.length} {customers.length === 1 ? 'cliente' : 'clientes'})</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchCustomers} className="flex-1 sm:flex-none h-10 sm:h-auto">
            <RefreshCw size={18} className="mr-1 sm:mr-2" />
            <span className="text-xs sm:text-sm">Actualizar</span>
          </Button>
          {userRole === 'admin' && (
            <Button 
              variant="outline" 
              onClick={handleExportCustomers}
              disabled={isExporting || customers.length === 0}
              className="flex-1 sm:flex-none h-10 sm:h-auto"
            >
              <Download size={18} className="mr-1 sm:mr-2" />
              <span className="text-xs sm:text-sm">{isExporting ? 'Exportando...' : 'Exportar'}</span>
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button className="flex-1 sm:flex-none h-10 sm:h-auto">
                <Plus size={18} className="mr-1 sm:mr-2" />
                <span className="text-xs sm:text-sm">Nuevo</span>
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md w-[95vw] sm:w-full p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {editingCustomer ? 'Actualiza la información del cliente' : 'Registra un nuevo cliente en el sistema'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <Label htmlFor="name">Nombre Completo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="identificationType" className="text-sm sm:text-base">Tipo de Identificación</Label>
                  <Select
                    value={formData.identificationType}
                    onValueChange={(value) => setFormData({ ...formData, identificationType: value })}
                  >
                    <SelectTrigger id="identificationType" className="h-10">
                      <SelectValue placeholder="Seleccione tipo" />
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
                  <Label htmlFor="identificationNumber" className="text-sm sm:text-base">Número</Label>
                  <Input
                    id="identificationNumber"
                    value={formData.identificationNumber}
                    onChange={(e) => setFormData({ ...formData, identificationNumber: e.target.value })}
                    placeholder="Número"
                    className="h-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">
                {editingCustomer ? 'Actualizar' : 'Crear'} Cliente
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {paginatedCustomers.map((customer) => (
          <Card key={customer.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{customer.name}</CardTitle>
                    <p className="text-sm text-gray-600">Cliente #{customer.id}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditDialog(customer)}
                >
                  <Edit size={16} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {customer.identificationType && customer.identificationNumber && (
                <div>
                  <p className="text-sm text-gray-600">Identificación</p>
                  <p className="text-sm flex items-center gap-1">
                    <CreditCard size={14} className="text-gray-400" />
                    {customer.identificationType}: {customer.identificationNumber}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-sm">{customer.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Teléfono</p>
                <p className="text-sm">{customer.phone}</p>
              </div>
              {customer.address && (
                <div>
                  <p className="text-sm text-gray-600">Dirección</p>
                  <p className="text-sm">{customer.address}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Registrado</p>
                <p className="text-sm">{new Date(customer.createdAt).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {customers.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No hay clientes registrados. ¡Agrega tu primer cliente!
        </div>
      )}

      {/* Pagination */}
      {customers.length > itemsPerPage && (
        <div className="mt-8 flex justify-center">
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
  )
}
