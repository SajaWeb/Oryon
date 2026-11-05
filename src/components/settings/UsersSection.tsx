import { useState } from 'react'
import { KeyRound, MapPin, Plus, Trash2, UserRound } from 'lucide-react'
import { toast } from 'sonner@2.0.3'
import { Badge, Button, Card, ConfirmDialog, Dialog, EmptyState, FormField, IconButton, Input, KeyValue, PasswordInput, Select } from '../oryon'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { ROLE_LABELS } from '../layout/navItems'
import { projectId } from '../../utils/supabase/info'
import { MIN_PASSWORD_LENGTH } from '../../utils/password-strength'

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

/* Qué ve cada rol, en una línea: ayuda a elegir el correcto al crear. */
const ROLE_HINTS: Record<string, string> = {
  admin: 'Todo: sucursales, caja, reportes, usuarios y configuración.',
  asesor: 'Mostrador: órdenes, ventas, caja e inventario de sus sucursales.',
  cajero: 'Solo ventas y caja de sus sucursales.',
  tecnico: 'Solo las órdenes de trabajo.',
}

const ROLE_OPTIONS = ['admin', 'asesor', 'cajero', 'tecnico'].map((r) => ({ value: r, label: ROLE_LABELS[r] ?? r }))

export function UsersSection({ accessToken, userProfile, users, branches, onRefresh }: UsersSectionProps) {
  const { isMobile } = useBreakpoint()
  const size = isMobile ? 'lg' : 'md'
  const isAdmin = userProfile?.role === 'admin'

  const [createOpen, setCreateOpen] = useState(false)
  const [passwordFor, setPasswordFor] = useState<User | null>(null)
  const [branchesFor, setBranchesFor] = useState<User | null>(null)
  const [deleteFor, setDeleteFor] = useState<User | null>(null)
  const [busy, setBusy] = useState(false)
  const [selectedBranches, setSelectedBranches] = useState<string[]>([])
  const [newPassword, setNewPassword] = useState('')
  const [formData, setFormData] = useState({ email: '', password: '', name: '', role: 'asesor' })

  const api = (path: string, init?: RequestInit) =>
    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4d437e50${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${accessToken}`, ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
    }).then((r) => r.json())

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }

  const createUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`La contraseña necesita al menos ${MIN_PASSWORD_LENGTH} caracteres`)
      return
    }
    void run(async () => {
      try {
        const data = await api('/company/users', { method: 'POST', body: JSON.stringify(formData) })
        if (!data.success) {
          toast.error('No se pudo crear el usuario', { description: data.error })
          return
        }
        toast.success(`${formData.name} ya puede entrar a Oryon`)
        setFormData({ email: '', password: '', name: '', role: 'asesor' })
        setCreateOpen(false)
        onRefresh()
      } catch (err) {
        console.error('Error creating user:', err)
        toast.error('No se pudo crear el usuario')
      }
    })
  }

  const changePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordFor) return
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      toast.error(`La contraseña necesita al menos ${MIN_PASSWORD_LENGTH} caracteres`)
      return
    }
    void run(async () => {
      try {
        const data = await api(`/company/users/${passwordFor.userId}/password`, { method: 'PUT', body: JSON.stringify({ password: newPassword }) })
        if (!data.success) throw new Error(data.error)
        toast.success(`Contraseña de ${passwordFor.name} actualizada`)
        setPasswordFor(null)
        setNewPassword('')
      } catch (error) {
        console.error('Error changing password:', error)
        toast.error('No se pudo cambiar la contraseña')
      }
    })
  }

  const saveBranches = () =>
    run(async () => {
      if (!branchesFor) return
      try {
        const data = await api(`/company/users/${branchesFor.userId}/branches`, { method: 'PUT', body: JSON.stringify({ branchIds: selectedBranches }) })
        if (!data.success) throw new Error(data.error)
        toast.success('Sucursales actualizadas')
        setBranchesFor(null)
        onRefresh()
      } catch (error) {
        console.error('Error saving branches:', error)
        toast.error('No se pudieron asignar las sucursales')
      }
    })

  const deleteUser = () =>
    run(async () => {
      if (!deleteFor) return
      try {
        const data = await api(`/company/users/${deleteFor.userId}`, { method: 'DELETE' })
        if (!data.success) {
          toast.error('No se pudo eliminar el usuario', { description: data.error })
          return
        }
        toast.success(`${deleteFor.name} fue eliminado`)
        setDeleteFor(null)
        onRefresh()
      } catch (error) {
        console.error('Error deleting user:', error)
        toast.error('No se pudo eliminar el usuario')
      }
    })

  const branchNames = (u: User) => {
    if (u.role === 'admin') return 'Todas las sucursales'
    const names = (u.assignedBranches ?? []).map((id) => branches.find((b) => b.id === id)?.name).filter(Boolean)
    return names.length ? names.join(', ') : 'Sin sucursal asignada'
  }

  return (
    <Card
      title="Usuarios"
      subtitle={`${users.length} ${users.length === 1 ? 'persona' : 'personas'} con acceso a la empresa`}
      padding={0}
      actions={
        isAdmin && (
          <Button variant="primary" size="sm" iconLeft={Plus} onClick={() => setCreateOpen(true)}>
            Nuevo usuario
          </Button>
        )
      }
    >
      {users.length === 0 ? (
        <EmptyState icon={UserRound} title="Sin usuarios" description="Invita a tu equipo con «Nuevo usuario»." />
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {users.map((user, i) => {
            const noBranch = user.role !== 'admin' && !(user.assignedBranches ?? []).length
            return (
              <li
                key={user.userId}
                style={{
                  display: 'flex',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '12px 16px',
                  borderTop: i === 0 ? 0 : 'var(--border-width) solid var(--border-subtle)',
                  opacity: user.active === false ? 0.6 : 1,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 'var(--text-body)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-primary)' }}>{user.name}</span>
                    <Badge tone={user.role === 'admin' ? 'accent' : 'neutral'}>{ROLE_LABELS[user.role] ?? user.role}</Badge>
                    {user.active === false && <Badge tone="neutral">Inactivo</Badge>}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--text-secondary)', overflowWrap: 'anywhere' }}>{user.email}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-caption)', color: noBranch ? 'var(--warning)' : 'var(--text-tertiary)' }}>
                    <MapPin size={12} /> {branchNames(user)}
                  </span>
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: 4, flex: '0 0 auto' }}>
                    <IconButton
                      icon={KeyRound}
                      label={`Cambiar la contraseña de ${user.name}`}
                      onClick={() => {
                        setNewPassword('')
                        setPasswordFor(user)
                      }}
                    />
                    {user.role !== 'admin' && (
                      <IconButton
                        icon={MapPin}
                        label={`Sucursales de ${user.name}`}
                        onClick={() => {
                          setSelectedBranches(user.assignedBranches || [])
                          setBranchesFor(user)
                        }}
                      />
                    )}
                    {user.userId !== userProfile?.userId && (
                      <IconButton icon={Trash2} label={`Eliminar a ${user.name}`} onClick={() => setDeleteFor(user)} />
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* Nuevo usuario */}
      <Dialog
        open={createOpen}
        onClose={busy ? undefined : () => setCreateOpen(false)}
        title="Nuevo usuario"
        description="Le llega acceso con el correo y la contraseña que escribas aquí."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" form="nuevo-usuario" variant="primary" loading={busy} disabled={busy}>
              Crear usuario
            </Button>
          </>
        }
      >
        <form id="nuevo-usuario" onSubmit={createUser} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FormField label="Nombre completo" required>
            <Input size={size} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Juan Pérez" required autoComplete="off" />
          </FormField>
          <FormField label="Correo" required>
            <Input size={size} type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="usuario@empresa.com" required autoComplete="off" />
          </FormField>
          <FormField label="Contraseña" required hint={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}>
            <PasswordInput size={size} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} autoComplete="new-password" />
          </FormField>
          <FormField label="Rol" hint={ROLE_HINTS[formData.role]}>
            <Select size={size} value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} options={ROLE_OPTIONS} />
          </FormField>
        </form>
      </Dialog>

      {/* Contraseña */}
      <Dialog
        open={passwordFor != null}
        onClose={busy ? undefined : () => setPasswordFor(null)}
        title="Cambiar contraseña"
        description={passwordFor ? `${passwordFor.name} · ${passwordFor.email}` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPasswordFor(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" form="cambiar-clave" variant="primary" loading={busy} disabled={busy}>
              Cambiar
            </Button>
          </>
        }
      >
        <form id="cambiar-clave" onSubmit={changePassword}>
          <FormField label="Nueva contraseña" hint={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}>
            <PasswordInput size={size} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" autoFocus />
          </FormField>
        </form>
      </Dialog>

      {/* Sucursales */}
      <Dialog
        open={branchesFor != null}
        onClose={busy ? undefined : () => setBranchesFor(null)}
        title="Sucursales"
        description={branchesFor ? `Dónde puede trabajar ${branchesFor.name}` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setBranchesFor(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={saveBranches} loading={busy} disabled={busy}>
              Guardar
            </Button>
          </>
        }
      >
        {branches.length === 0 ? (
          <p style={{ margin: 0, fontSize: 'var(--text-small)', color: 'var(--text-tertiary)' }}>No hay sucursales creadas.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', border: 'var(--border-width) solid var(--border-default)', borderRadius: 'var(--radius-md)' }}>
            {branches.map((b, i) => {
              const on = selectedBranches.includes(b.id)
              return (
                <label
                  key={b.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    minHeight: 'var(--tap-target)',
                    background: on ? 'var(--accent-subtle)' : 'transparent',
                    borderTop: i === 0 ? 0 : 'var(--border-width) solid var(--border-subtle)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => setSelectedBranches((p) => (p.includes(b.id) ? p.filter((x) => x !== b.id) : [...p, b.id]))}
                    style={{ width: 16, height: 16, accentColor: 'var(--accent-fill)' }}
                  />
                  <span style={{ flex: 1, fontSize: 'var(--text-body)', color: 'var(--text-primary)' }}>{b.name}</span>
                  {b.isMain && <Badge tone="neutral">Principal</Badge>}
                </label>
              )
            })}
          </div>
        )}
      </Dialog>

      {/* Eliminar */}
      <ConfirmDialog
        open={deleteFor != null}
        title={`¿Eliminar a ${deleteFor?.name ?? ''}?`}
        description="Ya no podrá entrar a Oryon y se libera su cupo del plan. No se puede deshacer."
        confirmLabel="Eliminar usuario"
        loading={busy}
        onConfirm={deleteUser}
        onCancel={() => setDeleteFor(null)}
      >
        {deleteFor && (
          <KeyValue
            items={[
              { label: 'Correo', value: deleteFor.email, mono: true },
              { label: 'Rol', value: ROLE_LABELS[deleteFor.role] ?? deleteFor.role },
            ]}
          />
        )}
      </ConfirmDialog>
    </Card>
  )
}
