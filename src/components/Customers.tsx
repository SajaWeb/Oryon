import { useEffect, useState } from 'react'
import { projectId } from '../utils/supabase/info'
import { Plus, Edit, User, Users, Pencil, Phone, RefreshCw, CreditCard, Download } from 'lucide-react'
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
// Oryon con alias: esta vista aún usa los primitivos shadcn en el formulario.
import { Button as OryonButton, KeyValue, Loading, type Column } from './oryon'
import { ListPage } from './patterns/ListPage'
import { ResponsiveDetail } from './layout/ResponsiveDetail'
import { useShell } from './layout/AppShell'
import { usePageHeader } from './layout/PageHeaderContext'
import { CustomerListCard } from './customers/CustomerListCard'

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
  const { compact } = useShell()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [identificationTypes, setIdentificationTypes] = useState<string[]>([])
  const [isExporting, setIsExporting] = useState(false)
  // La vista no tenía ni búsqueda ni filtros: con el directorio paginado y sin buscador,
  // encontrar a alguien era imposible desde un teléfono.
  const [searchTerm, setSearchTerm] = useState('')
  const [idTypeFilter, setIdTypeFilter] = useState('')
  const [sortBy, setSortBy] = useState('recientes')
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null)
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

  const initialsOfName = (name: string) => {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean)
    if (!parts.length) return '··'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }

  const filteredCustomers = (() => {
    const q = searchTerm.trim().toLowerCase()
    let rows = customers.filter((c) => {
      if (idTypeFilter && c.identificationType !== idTypeFilter) return false
      if (!q) return true
      return (
        c.name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.identificationNumber?.toLowerCase().includes(q)
      )
    })
    if (sortBy === 'nombre') rows = [...rows].sort((a, b) => a.name.localeCompare(b.name, 'es'))
    if (sortBy === 'recientes') {
      rows = [...rows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
    return rows
  })()

  const customerColumns: Column<Customer>[] = [
    { key: 'id', label: 'ID', mono: true, width: 60 },
    { key: 'name', label: 'Nombre' },
    {
      key: 'identificationType',
      label: 'Identificación',
      muted: true,
      hideOnCompact: true,
      render: (c) => c.identificationType || '—',
    },
    {
      key: 'identificationNumber',
      label: 'Número',
      mono: true,
      muted: true,
      render: (c) => c.identificationNumber || '—',
    },
    { key: 'phone', label: 'Teléfono', mono: true, render: (c) => c.phone || '—' },
    { key: 'email', label: 'Email', muted: true, hideOnCompact: true, render: (c) => c.email || '—' },
    { key: 'address', label: 'Dirección', muted: true, hideOnCompact: true, render: (c) => c.address || '—' },
    {
      key: 'createdAt',
      label: 'Registrado',
      mono: true,
      muted: true,
      align: 'right',
      render: (c) => {
        const d = new Date(c.createdAt)
        return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO')
      },
    },
  ]

  usePageHeader({
    title: 'Clientes',
    subtitle: loading
      ? 'Cargando directorio…'
      : `${filteredCustomers.length} de ${customers.length} ${customers.length === 1 ? 'cliente' : 'clientes'}`,
    eyebrow: 'Directorio',
    onRefresh: fetchCustomers,
    refreshing: loading,
  })

  if (loading) {
    return <Loading mode="screen" label="Cargando directorio" />
  }

  return (
    <>
      <ListPage<Customer>
        rows={filteredCustomers}
        columns={customerColumns}
        rowKey="id"
        selectedId={detailCustomer?.id ?? null}
        onRowClick={(c) => setDetailCustomer((cur) => (cur?.id === c.id ? null : c))}
        renderCard={(c) => (
          <CustomerListCard
            customer={c}
            initials={initialsOfName(c.name)}
            onOpen={() => setDetailCustomer(c)}
          />
        )}
        search={{
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: 'Nombre, cédula, teléfono, email…',
        }}
        filters={[
          {
            id: 'idType',
            label: 'Tipo de identificación',
            placeholder: 'Todos los tipos',
            value: idTypeFilter,
            options: identificationTypes.map((t) => ({ value: t, label: t })),
            onChange: setIdTypeFilter,
          },
          {
            id: 'sort',
            label: 'Orden',
            placeholder: 'Más recientes',
            value: sortBy === 'recientes' ? '' : sortBy,
            options: [{ value: 'nombre', label: 'Nombre A-Z' }],
            onChange: (v) => setSortBy(v || 'recientes'),
          },
        ]}
        onClearFilters={() => {
          setIdTypeFilter('')
          setSortBy('recientes')
        }}
        primaryAction={{ label: 'Nuevo cliente', icon: Plus, onClick: () => setDialogOpen(true) }}
        onExport={userRole === 'admin' ? handleExportCustomers : undefined}
        tableTitle="Clientes registrados"
        tableSubtitle={`${filteredCustomers.length} ${filteredCustomers.length === 1 ? 'cliente' : 'clientes'}`}
        countLabel={(shown, total) => `Mostrando ${shown} de ${total} clientes`}
        endLabel={(total) => `Fin de la lista · ${total} clientes`}
        empty={{
          icon: Users,
          title: customers.length === 0 ? 'Sin clientes' : 'Sin resultados',
          description:
            customers.length === 0
              ? 'Aún no hay clientes registrados. Crea el primero para poder facturar.'
              : 'Ningún cliente coincide con la búsqueda o el filtro.',
        }}
      />

      <ResponsiveDetail
        open={detailCustomer != null}
        onClose={() => setDetailCustomer(null)}
        kind="Cliente"
        title={detailCustomer?.name ?? ''}
        meta={detailCustomer ? `Cliente #${detailCustomer.id}` : undefined}
        actions={
          detailCustomer && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <OryonButton
                variant="primary"
                fullWidth
                iconLeft={Pencil}
                onClick={() => {
                  openEditDialog(detailCustomer)
                  setDetailCustomer(null)
                }}
              >
                Editar
              </OryonButton>
              {detailCustomer.phone && (
                <OryonButton
                  fullWidth
                  iconLeft={Phone}
                  onClick={() => window.open(`tel:${detailCustomer.phone}`)}
                >
                  Llamar
                </OryonButton>
              )}
            </div>
          )
        }
      >
        {detailCustomer && (
          <KeyValue
            layout="stacked"
            columns={compact ? 1 : 2}
            items={[
              { label: 'Tipo de identificación', value: detailCustomer.identificationType || '—' },
              { label: 'Número', value: detailCustomer.identificationNumber || '—', mono: true },
              { label: 'Teléfono', value: detailCustomer.phone || '—', mono: true },
              { label: 'Email', value: detailCustomer.email || '—' },
              { label: 'Dirección', value: detailCustomer.address || '—' },
              {
                label: 'Registrado',
                value: (() => {
                  const d = new Date(detailCustomer.createdAt)
                  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO')
                })(),
                mono: true,
              },
            ]}
          />
        )}
      </ResponsiveDetail>

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open)
        if (!open) resetForm()
      }}>
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
    </>
  )
}
