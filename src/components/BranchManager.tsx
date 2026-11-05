import { useEffect, useState } from 'react'
import { Building2, MapPin, Pencil, Phone, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner@2.0.3'
import { projectId } from '../utils/supabase/info'
import { Alert, Badge, Button, Card, ConfirmDialog, Dialog, EmptyState, FormField, IconButton, Input, Loading, Switch } from './oryon'
import { useBreakpoint } from '../hooks/useBreakpoint'

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

const PLAN_LIMITS: Record<string, number> = { basico: 1, pyme: 2, enterprise: 4 }
const PLAN_LABELS: Record<string, string> = { basico: 'Básico', pyme: 'Pyme', enterprise: 'Enterprise' }

export function BranchManager({ accessToken, licenseInfo }: BranchManagerProps) {
  const { isMobile } = useBreakpoint()
  const size = isMobile ? 'lg' : 'md'
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [formData, setFormData] = useState({ name: '', address: '', phone: '' })
  const [pendingDelete, setPendingDelete] = useState<Branch | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)

  const api = (path: string, init?: RequestInit) =>
    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4d437e50${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${accessToken}`, ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
    }).then((r) => r.json())

  const fetchBranches = async () => {
    try {
      const data = await api('/branches')
      if (data.success) setBranches(data.branches || [])
    } catch (error) {
      console.error('Error fetching branches:', error)
      toast.error('No se pudieron cargar las sucursales')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchBranches()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const planId = licenseInfo?.planId || 'basico'
  const maxBranches = PLAN_LIMITS[planId] ?? 1
  const canAddMore = branches.length < maxBranches

  const openNew = () => {
    setEditingBranch(null)
    setFormData({ name: '', address: '', phone: '' })
    setDialogOpen(true)
  }

  const openEdit = (branch: Branch) => {
    setEditingBranch(branch)
    setFormData({ name: branch.name, address: branch.address, phone: branch.phone })
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return void toast.error('Escribe el nombre de la sucursal')
    if (!editingBranch && !canAddMore) return void toast.error(`Tu plan permite ${maxBranches} ${maxBranches === 1 ? 'sucursal' : 'sucursales'}`)
    setSaving(true)
    try {
      const data = await api(editingBranch ? `/branches/${editingBranch.id}` : '/branches', {
        method: editingBranch ? 'PUT' : 'POST',
        body: JSON.stringify({ ...formData, name: formData.name.trim() }),
      })
      if (!data.success) throw new Error(data.error)
      toast.success(editingBranch ? 'Sucursal actualizada' : 'Sucursal creada')
      setDialogOpen(false)
      void fetchBranches()
    } catch (error) {
      console.error('Error saving branch:', error)
      toast.error('No se pudo guardar la sucursal', { description: error instanceof Error ? error.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (branch: Branch) => {
    setToggling(branch.id)
    try {
      const data = await api(`/branches/${branch.id}/toggle-active`, { method: 'PUT', body: JSON.stringify({ isActive: !branch.isActive }) })
      if (!data.success) throw new Error(data.error)
      toast.success(`${branch.name} ${branch.isActive ? 'desactivada' : 'activada'}`)
      void fetchBranches()
    } catch (error) {
      console.error('Error toggling branch status:', error)
      toast.error('No se pudo cambiar el estado', { description: error instanceof Error ? error.message : undefined })
    } finally {
      setToggling(null)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      const data = await api(`/branches/${pendingDelete.id}`, { method: 'DELETE' })
      if (!data.success) throw new Error(data.error)
      toast.success(`${pendingDelete.name} eliminada`)
      setPendingDelete(null)
      void fetchBranches()
    } catch (error) {
      console.error('Error deleting branch:', error)
      toast.error('No se pudo eliminar la sucursal', { description: error instanceof Error ? error.message : undefined })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card
      title="Sucursales"
      subtitle={`${branches.length} de ${maxBranches} en tu plan ${PLAN_LABELS[planId] ?? planId}`}
      actions={
        <Button variant="primary" size="sm" iconLeft={Plus} onClick={openNew} disabled={!canAddMore}>
          Nueva sucursal
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {!canAddMore && !loading && (
          <Alert variant="info" title="Llegaste al límite de tu plan">
            Para abrir otra sucursal, cambia de plan en Licencia.
          </Alert>
        )}

        {loading ? (
          <Loading minHeight={160} width={88} label="Cargando sucursales" />
        ) : branches.length === 0 ? (
          <EmptyState icon={Building2} title="Sin sucursales" description="Crea la primera con «Nueva sucursal»." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'repeat(2, minmax(0,1fr))', gap: 12 }}>
            {branches.map((branch) => (
              <div
                key={branch.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  padding: 14,
                  background: 'var(--surface-card)',
                  border: 'var(--border-width) solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  opacity: branch.isActive ? 1 : 0.7,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
                    <span style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-primary)' }}>{branch.name}</span>
                    {branch.isMain && <Badge tone="accent">Principal</Badge>}
                    {!branch.isActive && <Badge tone="neutral">Inactiva</Badge>}
                  </span>
                  <span style={{ display: 'flex', gap: 2 }}>
                    <IconButton icon={Pencil} label={`Editar ${branch.name}`} size="sm" onClick={() => openEdit(branch)} />
                    {!branch.isMain && <IconButton icon={Trash2} label={`Eliminar ${branch.name}`} size="sm" onClick={() => setPendingDelete(branch)} />}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={13} color="var(--text-tertiary)" /> {branch.address || <span style={{ color: 'var(--text-tertiary)' }}>Sin dirección</span>}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)' }}>
                    <Phone size={13} color="var(--text-tertiary)" /> {branch.phone || <span style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-tertiary)' }}>Sin teléfono</span>}
                  </span>
                </div>
                <div style={{ paddingTop: 10, borderTop: 'var(--border-width) solid var(--border-subtle)' }}>
                  <Switch
                    checked={branch.isActive}
                    onChange={() => toggleActive(branch)}
                    disabled={toggling === branch.id}
                    label={branch.isActive ? 'Activa · recibe ventas y órdenes' : 'Inactiva · no aparece para vender'}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={dialogOpen}
        onClose={saving ? undefined : () => setDialogOpen(false)}
        title={editingBranch ? `Editar ${editingBranch.name}` : 'Nueva sucursal'}
        description={editingBranch ? 'Los cambios se ven en documentos impresos desde ahora.' : 'Cada sucursal tiene su inventario y su caja.'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="sucursal-form" variant="primary" loading={saving} disabled={saving}>
              {editingBranch ? 'Guardar' : 'Crear sucursal'}
            </Button>
          </>
        }
      >
        <form id="sucursal-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FormField label="Nombre" required>
            <Input size={size} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Sede Centro" autoFocus />
          </FormField>
          <FormField label="Dirección">
            <Input size={size} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Calle 123 # 45-67" />
          </FormField>
          <FormField label="Teléfono">
            <Input size={size} mono inputMode="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="300 123 4567" />
          </FormField>
        </form>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`¿Eliminar ${pendingDelete?.name ?? 'la sucursal'}?`}
        description="También se eliminan los productos de esta sucursal. No se puede deshacer."
        confirmLabel="Eliminar sucursal"
        loading={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </Card>
  )
}
