import { useEffect, useState } from 'react'
import { ClipboardList, DollarSign, History, Pencil, Plus, Printer, Tag, Trash2 } from 'lucide-react'
import { toast } from 'sonner@2.0.3'

// Hooks
import { useRepairs } from './hooks/useRepairs'
import { useBranches } from './hooks/useBranches'
import { useCustomers } from './hooks/useCustomers'
import { useCompanySettings } from './hooks/useCompanySettings'
import { useRepairDialogs } from './hooks/useRepairDialogs'

// Actions
import { createRepair, updateRepairStatus, createInvoiceForRepair } from './actions/repairActions'
import { handlePrintServiceOrder, handlePrintDeviceLabel, handlePrintInvoiceFromRepair } from './actions/printActions'

// UI Components
import { BranchAlert } from './ui/BranchAlert'
import { RepairListCard } from './ui/RepairListCard'
import { RepairDetailPanel } from './ui/RepairDetailPanel'
import { Button, StatusBadge, normalizeState, type Column } from '../oryon'
import { ListPage } from '../patterns/ListPage'
import { ResponsiveDetail } from '../layout/ResponsiveDetail'
import { useShell } from '../layout/AppShell'
import { usePageHeader } from '../layout/PageHeaderContext'
import { LoadingState } from './ui/LoadingState'
import { ErrorState } from './ui/ErrorState'

// Dialogs
import { NewRepairDialog } from './NewRepairDialog'
import { StatusChangeDialog } from './StatusChangeDialog'
import { StatusHistoryDialog } from './StatusHistoryDialog'
import { ImagePreviewDialog } from './ImagePreviewDialog'
import { InvoiceDialog } from './InvoiceDialog'

// Types and Utils
import { RepairFormData, InvoiceFormData, Repair } from './types'
import { filterRepairs } from './utils'
import { statusLabels } from './constants'

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  branchId?: string
  assignedBranches?: string[]
  companyId: string
}

interface RepairsProps {
  accessToken: string | null
  userName: string
  userRole?: string
  userProfile?: UserProfile
}

export function Repairs({ accessToken, userName, userRole, userProfile }: RepairsProps) {
  const { compact, isMobile } = useShell()

  // Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // Custom hooks
  const { repairs, loading, error, fetchRepairs, deleteRepair, setLoading, setError } = useRepairs(accessToken, userRole, userProfile)
  const { branches, fetchBranches, getAvailableBranches } = useBranches(accessToken)
  const { customers, fetchCustomers, findOrCreateCustomer } = useCustomers(accessToken)
  const { identificationTypes, fetchCompanySettings } = useCompanySettings(accessToken)
  const dialogs = useRepairDialogs()

  // La paginación (y la carga incremental de móvil) las resuelve useListState dentro de
  // ListPage, así que aquí solo queda el filtrado.
  const filteredRepairs = filterRepairs(repairs, searchTerm, filterStatus)

  usePageHeader({
    title: 'Reparaciones',
    subtitle: loading
      ? 'Cargando órdenes…'
      : `${filteredRepairs.length} de ${repairs.length} ${repairs.length === 1 ? 'orden' : 'órdenes'}`,
    eyebrow: 'Órdenes de trabajo',
    onRefresh: fetchRepairs,
    refreshing: loading,
  })


  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (!accessToken) {
        console.error('No access token available for repairs module')
        setError('No hay token de acceso disponible. Por favor recarga la página.')
        setLoading(false)
        return
      }
      
      try {
        setError(null)
        await Promise.all([
          fetchBranches(),
          fetchRepairs(),
          fetchCustomers(),
          fetchCompanySettings()
        ])
      } catch (error) {
        console.error('Error loading data:', error)
        setError('Error al cargar los datos. Por favor intenta de nuevo.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [accessToken, fetchBranches, fetchRepairs, fetchCustomers, fetchCompanySettings, setError, setLoading])

  // Handlers
  const handleSubmitNewRepair = async (
    formData: RepairFormData, 
    uploadedImages: string[],
    selectedCustomerId: number | null
  ) => {
    try {
      const customerId = await findOrCreateCustomer(formData, selectedCustomerId)
      await createRepair(accessToken, formData, uploadedImages, customerId)
      await fetchRepairs()
      dialogs.setDialogOpen(false)
      toast.success('✅ Orden de reparación creada exitosamente')
    } catch (error) {
      console.error('Error in handleSubmitNewRepair:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error al crear la orden de reparación'
      toast.error(errorMessage)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta orden de reparación?')) return

    const toastId = toast.loading('🗑️ Eliminando orden de reparación...', {
      description: 'Por favor espera'
    })

    try {
      await deleteRepair(id)
      toast.success('✅ Orden eliminada exitosamente', {
        id: toastId,
        description: 'La orden de reparación ha sido eliminada',
        duration: 4000
      })
    } catch (error) {
      console.error('Error deleting repair:', error)
      toast.error('❌ Error al eliminar la orden', {
        id: toastId,
        description: error instanceof Error ? error.message : 'Por favor intenta nuevamente',
        duration: 5000
      })
    }
  }

  const handleStatusChange = async (newStatus: string, notes: string, images: string[]) => {
    if (!dialogs.selectedRepair) return

    try {
      await updateRepairStatus(
        accessToken,
        dialogs.selectedRepair.id,
        newStatus,
        notes,
        images,
        userName
      )
      await fetchRepairs()
      dialogs.setStatusDialogOpen(false)
      dialogs.setSelectedRepair(null)
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Error al actualizar el estado: ' + String(error))
    }
  }

  const handleCreateInvoice = async (invoiceData: InvoiceFormData) => {
    if (!dialogs.selectedRepair) return

    try {
      const result = await createInvoiceForRepair(
        accessToken,
        dialogs.selectedRepair,
        invoiceData,
        userName
      )

      // Handle printing
      await handlePrintInvoiceFromRepair(
        dialogs.selectedRepair,
        result.invoiceNumber,
        result.totalAmount,
        result.items,
        invoiceData.additionalNotes,
        userName,
        accessToken
      )

      await fetchRepairs()
      dialogs.setInvoiceDialogOpen(false)
      dialogs.setSelectedRepair(null)
    } catch (error) {
      console.error('Error in handleCreateInvoice:', error)
    }
  }

  // Permissions
  const canDelete = userRole === 'admin' || userRole === 'administrador'

  // Loading state
  if (loading) {
    return <LoadingState />
  }

  // Error state
  if (error) {
    return <ErrorState error={error} accessToken={accessToken} />
  }

  const canInvoice = userRole === 'admin' || userRole === 'administrador' || userRole === 'asesor'
  const selected = dialogs.selectedRepair

  const columns: Column<Repair>[] = [
    { key: 'id', label: 'OT', mono: true, width: 70, render: (r) => `#${r.id}` },
    {
      key: 'status',
      label: 'Estado',
      render: (r) => <StatusBadge status={normalizeState(r.status)} label={statusLabels[r.status]} size="sm" />,
    },
    { key: 'device', label: 'Equipo', render: (r) => `${r.deviceBrand} ${r.deviceModel}` },
    { key: 'customerName', label: 'Cliente' },
    { key: 'problem', label: 'Falla reportada', muted: true, hideOnCompact: true },
    {
      key: 'branch',
      label: 'Sucursal',
      muted: true,
      hideOnCompact: true,
      render: (r) => branches.find((b) => b.id === r.branchId)?.name || '—',
    },
    {
      key: 'receivedDate',
      label: 'Recibido',
      mono: true,
      muted: true,
      hideOnCompact: true,
      render: (r) => {
        const d = new Date(r.receivedDate)
        return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO')
      },
    },
    {
      key: 'estimatedCost',
      label: 'Costo est.',
      mono: true,
      align: 'right',
      render: (r) => `$${Number(r.estimatedCost || 0).toLocaleString('es-CO')}`,
    },
  ]

  const statusChips = (
    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
      {[{ value: 'all', label: 'Todas' }, ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))].map(
        (chip) => {
          const active = filterStatus === chip.value
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => setFilterStatus(chip.value)}
              style={{
                flex: '0 0 auto',
                height: 30,
                padding: '0 10px',
                fontSize: 'var(--text-small)',
                fontWeight: active ? 'var(--fw-medium)' : 'var(--fw-regular)',
                color: active ? 'var(--text-accent)' : 'var(--text-secondary)',
                background: active ? 'var(--accent-subtle)' : 'var(--surface-card)',
                border: `var(--border-width) solid ${active ? 'var(--accent-subtle-border)' : 'var(--border-default)'}`,
                borderRadius: 'var(--radius-md)',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              {chip.label}
            </button>
          )
        },
      )}
    </div>
  )

  return (
    <>
      <ListPage<Repair>
        rows={filteredRepairs}
        columns={columns}
        rowKey="id"
        pageSize={12}
        selectedId={dialogs.detailDialogOpen ? selected?.id ?? null : null}
        onRowClick={(r) => dialogs.openDetailDialog(r)}
        renderCard={(r) => <RepairListCard repair={r} onOpen={() => dialogs.openDetailDialog(r)} />}
        search={{
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: 'Cliente, teléfono, marca, IMEI, #OT…',
        }}
        filters={[
          {
            id: 'status',
            label: 'Estado',
            placeholder: 'Todos los estados',
            value: filterStatus === 'all' ? '' : filterStatus,
            options: Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
            onChange: (v) => setFilterStatus(v || 'all'),
          },
        ]}
        onClearFilters={() => setFilterStatus('all')}
        primaryAction={{ label: 'Nueva orden', icon: Plus, onClick: () => dialogs.setDialogOpen(true) }}
        tableTitle="Órdenes de trabajo"
        tableSubtitle={`${filteredRepairs.length} de ${repairs.length} ${repairs.length === 1 ? 'orden' : 'órdenes'}`}
        countLabel={(shown, total) => `Mostrando ${shown} de ${total} órdenes`}
        endLabel={(total) => `Fin de la lista · ${total} órdenes`}
        empty={{
          icon: ClipboardList,
          title: repairs.length === 0 ? 'Sin órdenes' : 'Sin resultados',
          description:
            repairs.length === 0
              ? 'Aún no hay órdenes de trabajo. Crea la primera al recibir un equipo.'
              : 'Ninguna orden coincide con el estado o la búsqueda.',
        }}
        chips={isMobile ? statusChips : undefined}
        banner={
          userRole !== 'admin' && userProfile ? <BranchAlert userProfile={userProfile} /> : undefined
        }
      />

      <ResponsiveDetail
        open={dialogs.detailDialogOpen && selected != null}
        onClose={() => dialogs.setDetailDialogOpen(false)}
        kind="Orden de trabajo"
        title={selected ? `Orden #${selected.id}` : ''}
        meta={selected ? `${selected.deviceBrand} ${selected.deviceModel} · ${selected.customerName}` : undefined}
        actions={
          selected && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Button
                variant="primary"
                fullWidth
                iconLeft={Pencil}
                onClick={() => dialogs.openStatusDialog(selected)}
              >
                Cambiar estado
              </Button>
              <Button fullWidth iconLeft={History} onClick={() => dialogs.openHistoryDialog(selected)}>
                Historial
              </Button>
              <Button fullWidth iconLeft={Printer} onClick={() => handlePrintServiceOrder(selected, accessToken)}>
                Imprimir OT
              </Button>
              <Button fullWidth iconLeft={Tag} onClick={() => handlePrintDeviceLabel(selected, accessToken)}>
                Etiqueta
              </Button>
              {selected.status === 'completed' && !selected.invoiced && canInvoice && (
                <Button
                  variant="primary"
                  fullWidth
                  iconLeft={DollarSign}
                  style={{ gridColumn: '1 / -1' }}
                  onClick={() => dialogs.openInvoiceDialog(selected)}
                >
                  Facturar reparación
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="danger"
                  fullWidth
                  iconLeft={Trash2}
                  style={{ gridColumn: '1 / -1' }}
                  onClick={() => {
                    handleDelete(selected.id)
                    dialogs.setDetailDialogOpen(false)
                  }}
                >
                  Eliminar orden
                </Button>
              )}
            </div>
          )
        }
      >
        {selected && (
          <RepairDetailPanel
            repair={selected}
            branches={branches}
            columns={compact ? 1 : 2}
            onImageClick={dialogs.openImagePreview}
          />
        )}
      </ResponsiveDetail>

      {/* Dialogs */}
      <NewRepairDialog
        open={dialogs.dialogOpen}
        onOpenChange={dialogs.setDialogOpen}
        customers={customers}
        identificationTypes={identificationTypes}
        branches={getAvailableBranches(userRole, userProfile)}
        userRole={userRole}
        onSubmit={handleSubmitNewRepair}
      />

      <StatusChangeDialog
        open={dialogs.statusDialogOpen}
        onOpenChange={dialogs.setStatusDialogOpen}
        repair={dialogs.selectedRepair}
        onSubmit={handleStatusChange}
      />

      <StatusHistoryDialog
        open={dialogs.historyDialogOpen}
        onOpenChange={dialogs.setHistoryDialogOpen}
        repair={dialogs.selectedRepair}
        onImageClick={dialogs.openImagePreview}
      />

      <ImagePreviewDialog
        open={dialogs.imagePreviewOpen}
        onOpenChange={dialogs.setImagePreviewOpen}
        image={dialogs.previewImage}
      />

      <InvoiceDialog
        open={dialogs.invoiceDialogOpen}
        onOpenChange={dialogs.setInvoiceDialogOpen}
        repair={dialogs.selectedRepair}
        onSubmit={handleCreateInvoice}
      />
    </>
  )
}
