import { useState } from 'react'
import { Users, Plus, Key, MapPin, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { Alert, AlertDescription } from '../ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Checkbox } from '../ui/checkbox'
import { projectId } from '../../utils/supabase/info'
import { toast } from 'sonner@2.0.3'

interface User {
  userId: string
  email: string
  name: string
  role: string
  createdAt: string
  active?: boolean
  assignedBranches?: string[]
}

interface Branch {
  id: string
  companyId: number
  name: string
  address: string
  phone: string
  isMain: boolean
  createdAt: string
}

interface UsersSectionProps {
  accessToken: string
  userProfile: any
  users: User[]
  branches: Branch[]
  onRefresh: () => void
}

export function UsersSection({ accessToken, userProfile, users, branches, onRefresh }: UsersSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [branchDialogOpen, setBranchDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedBranches, setSelectedBranches] = useState<string[]>([])
  const [newPassword, setNewPassword] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'asesor'
  })

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/company/users`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        }
      )

      const data = await response.json()

      if (!data.success) {
        toast.error('Error al crear usuario', {
          description: data.error || 'Error desconocido'
        })
        return
      }

      toast.success('Usuario creado exitosamente')
      setFormData({ email: '', password: '', name: '', role: 'asesor' })
      setDialogOpen(false)
      onRefresh()
    } catch (err) {
      console.error('Error creating user:', err)
      toast.error('Error al crear el usuario')
    }
  }

  const handleOpenPasswordDialog = (user: User) => {
    setSelectedUser(user)
    setNewPassword('')
    setPasswordDialogOpen(true)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser || !newPassword) return

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/company/users/${selectedUser.userId}/password`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ password: newPassword })
        }
      )

      const data = await response.json()
      if (data.success) {
        toast.success('Contraseña cambiada exitosamente')
        setPasswordDialogOpen(false)
        setSelectedUser(null)
        setNewPassword('')
      } else {
        toast.error('Error al cambiar contraseña')
      }
    } catch (error) {
      console.error('Error changing password:', error)
      toast.error('Error al cambiar contraseña')
    }
  }

  const handleOpenBranchDialog = (user: User) => {
    setSelectedUser(user)
    setSelectedBranches(user.assignedBranches || [])
    setBranchDialogOpen(true)
  }

  const handleSaveBranches = async () => {
    if (!selectedUser) return

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/company/users/${selectedUser.userId}/branches`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ branchIds: selectedBranches })
        }
      )

      const data = await response.json()

      if (!data.success) {
        toast.error('Error al asignar sucursales')
        return
      }

      toast.success('Sucursales asignadas correctamente')
      setBranchDialogOpen(false)
      setSelectedUser(null)
      onRefresh()
    } catch (error) {
      console.error('Error saving branches:', error)
      toast.error('Error al asignar sucursales')
    }
  }

  const toggleBranchSelection = (branchId: string) => {
    setSelectedBranches(prev => {
      if (prev.includes(branchId)) {
        return prev.filter(id => id !== branchId)
      } else {
        return [...prev, branchId]
      }
    })
  }

  const handleOpenDeleteDialog = (user: User) => {
    setSelectedUser(user)
    setDeleteDialogOpen(true)
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/company/users/${selectedUser.userId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        }
      )

      const data = await response.json()
      
      if (data.success) {
        toast.success('Usuario eliminado exitosamente')
        setDeleteDialogOpen(false)
        setSelectedUser(null)
        onRefresh()
      } else {
        toast.error('Error al eliminar usuario', {
          description: data.error || 'Error desconocido'
        })
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Error al eliminar usuario')
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-600 text-white'
      case 'tecnico':
        return 'bg-blue-600 text-white'
      case 'asesor':
        return 'bg-green-600 text-white'
      default:
        return 'bg-gray-600 text-white'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="text-blue-600" size={24} />
            <CardTitle>Gestión de Usuarios</CardTitle>
          </div>
          {userProfile?.role === 'admin' && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus size={16} className="mr-2" />
                  Nuevo Usuario
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                  <DialogDescription>
                    Agrega un nuevo usuario a tu empresa
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <Label>Nombre completo</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Juan Pérez"
                      required
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="usuario@ejemplo.com"
                      required
                    />
                  </div>
                  <div>
                    <Label>Contraseña</Label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <div>
                    <Label>Rol</Label>
                    <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="asesor">Asesor</SelectItem>
                        <SelectItem value="tecnico">Técnico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">Crear Usuario</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users.map((user) => {
            return (
              <div
                key={user.userId}
                className="border rounded-lg p-4 border-gray-200 dark:border-gray-700"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{user.name}</h3>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                    {user.assignedBranches && user.assignedBranches.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {user.assignedBranches.length} sucursal(es) asignada(s)
                      </p>
                    )}
                  </div>
                  {userProfile?.role === 'admin' && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenPasswordDialog(user)}
                      >
                        <Key size={16} className="mr-1" />
                        Cambiar Contraseña
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenBranchDialog(user)}
                      >
                        <MapPin size={16} className="mr-1" />
                        Sucursales
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => handleOpenDeleteDialog(user)}
                      >
                        <Trash2 size={16} className="mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {users.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No hay usuarios registrados
            </div>
          )}
        </div>
      </CardContent>

      {/* Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Contraseña</DialogTitle>
            <DialogDescription>
              Usuario: {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label>Nueva Contraseña</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Cambiar Contraseña</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Branch Assignment Dialog */}
      <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Sucursales</DialogTitle>
            <DialogDescription>
              Usuario: {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {branches.map((branch) => (
              <div key={branch.id} className="flex items-center space-x-2">
                <Checkbox
                  id={branch.id}
                  checked={selectedBranches.includes(branch.id)}
                  onCheckedChange={() => toggleBranchSelection(branch.id)}
                />
                <label
                  htmlFor={branch.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {branch.name}
                  {branch.isMain && (
                    <Badge variant="secondary" className="ml-2">Principal</Badge>
                  )}
                </label>
              </div>
            ))}
            {branches.length === 0 && (
              <p className="text-sm text-gray-500">No hay sucursales disponibles</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBranchDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveBranches}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación de Usuario</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">
                  ¿Estás seguro de que deseas eliminar a este usuario?
                </p>
                <div className="text-sm">
                  <p><strong>Nombre:</strong> {selectedUser?.name}</p>
                  <p><strong>Email:</strong> {selectedUser?.email}</p>
                  <p><strong>Rol:</strong> {selectedUser?.role}</p>
                </div>
                <p className="text-sm mt-3">
                  • El usuario será eliminado permanentemente del sistema
                </p>
                <p className="text-sm">
                  • Ya no podrá iniciar sesión en Oryon App
                </p>
                <p className="text-sm">
                  • Esta acción liberará una licencia de usuario
                </p>
              </div>
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              <Trash2 size={16} className="mr-2" />
              Eliminar Usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
