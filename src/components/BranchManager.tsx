import { useEffect, useState } from 'react'
import { projectId } from '../utils/supabase/info'
import { Plus, Building2, MapPin, Phone, Edit, Trash2, Star, Power } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { Switch } from './ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from './ui/dialog'
import { toast } from 'sonner@2.0.3'

interface Branch {
  id: string
  companyId: number
  name: string
  address: string
  phone: string
  isMain: boolean
  isActive: boolean
  createdAt: string
}

interface BranchManagerProps {
  accessToken: string
  userProfile: any
  licenseInfo: any
}

// Plan limits
const PLAN_LIMITS = {
  basico: { branches: 1, admins: 1, advisors: 1, technicians: 2 },
  pyme: { branches: 2, admins: 2, advisors: 4, technicians: 8 },
  enterprise: { branches: 4, admins: 4, advisors: 8, technicians: 16 }
}

export function BranchManager({ accessToken, userProfile, licenseInfo }: BranchManagerProps) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: ''
  })

  useEffect(() => {
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
        setBranches(data.branches || [])
      }
    } catch (error) {
      console.error('Error fetching branches:', error)
      toast.error('Error al cargar las sucursales')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Check plan limits
    const planId = licenseInfo?.planId || 'basico'
    const maxBranches = PLAN_LIMITS[planId as keyof typeof PLAN_LIMITS]?.branches || 1

    if (!editingBranch && branches.length >= maxBranches) {
      toast.error(`Tu plan ${planId} permite máximo ${maxBranches} sucursal${maxBranches > 1 ? 'es' : ''}`)
      return
    }

    try {
      const url = editingBranch
        ? `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/branches/${editingBranch.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/branches`

      const response = await fetch(url, {
        method: editingBranch ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        toast.success(editingBranch ? 'Sucursal actualizada' : 'Sucursal creada exitosamente')
        setDialogOpen(false)
        setFormData({ name: '', address: '', phone: '' })
        setEditingBranch(null)
        fetchBranches()
      } else {
        toast.error(data.error || 'Error al guardar la sucursal')
      }
    } catch (error) {
      console.error('Error saving branch:', error)
      toast.error('Error al guardar la sucursal')
    }
  }

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch)
    setFormData({
      name: branch.name,
      address: branch.address,
      phone: branch.phone
    })
    setDialogOpen(true)
  }

  const handleToggleActive = async (branchId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/branches/${branchId}/toggle-active`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ isActive: !currentStatus })
        }
      )

      const data = await response.json()

      if (data.success) {
        toast.success(`Sucursal ${!currentStatus ? 'activada' : 'desactivada'}`)
        fetchBranches()
      } else {
        toast.error(data.error || 'Error al cambiar estado de la sucursal')
      }
    } catch (error) {
      console.error('Error toggling branch status:', error)
      toast.error('Error al cambiar estado de la sucursal')
    }
  }

  const handleDelete = async (branchId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta sucursal? Los productos asociados también se eliminarán.')) {
      return
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/branches/${branchId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )

      const data = await response.json()

      if (data.success) {
        toast.success('Sucursal eliminada')
        fetchBranches()
      } else {
        toast.error(data.error || 'Error al eliminar la sucursal')
      }
    } catch (error) {
      console.error('Error deleting branch:', error)
      toast.error('Error al eliminar la sucursal')
    }
  }

  const handleOpenDialog = () => {
    setEditingBranch(null)
    setFormData({ name: '', address: '', phone: '' })
    setDialogOpen(true)
  }

  const planId = licenseInfo?.planId || 'basico'
  const maxBranches = PLAN_LIMITS[planId as keyof typeof PLAN_LIMITS]?.branches || 1
  const canAddMore = branches.length < maxBranches

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="text-blue-600" size={24} />
            <div>
              <CardTitle>Sucursales</CardTitle>
              <CardDescription>
                Gestiona las sucursales de tu empresa ({branches.length}/{maxBranches})
              </CardDescription>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenDialog} disabled={!canAddMore}>
                <Plus className="mr-2" size={18} />
                Nueva Sucursal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingBranch ? 'Editar Sucursal' : 'Nueva Sucursal'}
                </DialogTitle>
                <DialogDescription>
                  {editingBranch 
                    ? 'Actualiza los datos de la sucursal' 
                    : 'Crea una nueva sucursal para tu empresa'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nombre de la Sucursal *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej: Sucursal Centro"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Dirección</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Ej: Calle 123 #45-67"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Ej: +57 300 123 4567"
                    />
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingBranch ? 'Actualizar' : 'Crear'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!canAddMore && (
          <Alert className="mb-4">
            <AlertDescription>
              Has alcanzado el límite de sucursales para tu plan {planId}. 
              Mejora tu plan para crear más sucursales.
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Cargando sucursales...
          </div>
        ) : branches.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No hay sucursales registradas
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className="border dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="text-blue-600" size={20} />
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {branch.name}
                    </h3>
                    {branch.isMain && (
                      <Badge variant="outline" className="text-xs">
                        <Star className="mr-1" size={12} />
                        Principal
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(branch)}
                    >
                      <Edit size={16} />
                    </Button>
                    {!branch.isMain && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(branch.id)}
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </Button>
                    )}
                  </div>
                </div>
                {branch.address && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <MapPin size={14} />
                    <span>{branch.address}</span>
                  </div>
                )}
                {branch.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <Phone size={14} />
                    <span>{branch.phone}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-3 border-t dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={branch.isActive ? "default" : "secondary"} 
                      className="text-xs"
                    >
                      <Power className="mr-1" size={12} />
                      {branch.isActive ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`active-${branch.id}`} className="text-sm cursor-pointer">
                      {branch.isActive ? 'Desactivar' : 'Activar'}
                    </Label>
                    <Switch
                      id={`active-${branch.id}`}
                      checked={branch.isActive}
                      onCheckedChange={() => handleToggleActive(branch.id, branch.isActive)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
