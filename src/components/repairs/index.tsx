import { useEffect, useState } from 'react'
import { toast } from 'sonner@2.0.3'

// Hooks
import { useRepairs } from './hooks/useRepairs'
import { useBranches } from './hooks/useBranches'
import { useCustomers } from './hooks/useCustomers'
import { useCompanySettings } from './hooks/useCompanySettings'
import { usePagination } from './hooks/usePagination'
import { useRepairDialogs } from './hooks/useRepairDialogs'

// Actions
import { createRepair, updateRepairStatus, createInvoiceForRepair } from './actions/repairActions'
import { handlePrintServiceOrder, handlePrintDeviceLabel, handlePrintInvoiceFromRepair } from './actions/printActions'

// UI Components
import { RepairsHeader } from './ui/RepairsHeader'
import { RepairsList } from './ui/RepairsList'
import { RepairsPagination } from './ui/RepairsPagination'
import { BranchAlert } from './ui/BranchAlert'
import { TrackingAlert } from './ui/TrackingAlert'
import { LoadingState } from './ui/LoadingState'
import { ErrorState } from './ui/ErrorState'

// Dialogs
import { RepairFilters } from './RepairFilters'
import { NewRepairDialog } from './NewRepairDialog'
import { RepairDetailsDialog } from './RepairDetailsDialog'
import { StatusChangeDialog } from './StatusChangeDialog'
import { StatusHistoryDialog } from './StatusHistoryDialog'
import { ImagePreviewDialog } from './ImagePreviewDialog'
import { InvoiceDialog } from './InvoiceDialog'

// Types and Utils
import { RepairFormData, InvoiceFormData } from './types'
import { filterRepairs } from './utils'

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
  // Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // Custom hooks
  const { repairs, loading, error, fetchRepairs, deleteRepair, setLoading, setError } = useRepairs(accessToken, userRole, userProfile)
  const { branches, fetchBranches, getAvailableBranches } = useBranches(accessToken)
  const { customers, fetchCustomers, findOrCreateCustomer } = useCustomers(accessToken)
  const { identificationTypes, fetchCompanySettings } = useCompanySettings(accessToken)
  const dialogs = useRepairDialogs()

  // Filtered and paginated repairs
  const filteredRepairs = filterRepairs(repairs, searchTerm, filterStatus)
  const { 
    currentPage, 
    totalPages, 
    paginatedItems, 
    goToPage, 
    nextPage, 
    previousPage,
    setCurrentPage 
  } = usePagination(filteredRepairs)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterStatus, setCurrentPage])

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

  return (
    <div className="p-4 sm:p-8">
      <RepairsHeader onNewRepair={() => dialogs.setDialogOpen(true)} />

      <RepairFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
      />

      {userRole !== 'admin' && userProfile && (
        <BranchAlert userProfile={userProfile} />
      )}

      <TrackingAlert />

      <RepairsList
        repairs={paginatedItems}
        onViewDetails={dialogs.openDetailDialog}
        onChangeStatus={dialogs.openStatusDialog}
        onCreateInvoice={dialogs.openInvoiceDialog}
        onDelete={handleDelete}
        canDelete={canDelete}
        branches={branches}
        userRole={userRole}
        searchTerm={searchTerm}
        filterStatus={filterStatus}
      />

      {/* Pagination */}
      {filteredRepairs.length > 15 && (
        <RepairsPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          onPrevious={previousPage}
          onNext={nextPage}
        />
      )}

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

      <RepairDetailsDialog
        open={dialogs.detailDialogOpen}
        onOpenChange={dialogs.setDetailDialogOpen}
        repair={dialogs.selectedRepair}
        onChangeStatus={() => dialogs.openStatusDialog(dialogs.selectedRepair!)}
        onViewHistory={() => dialogs.openHistoryDialog(dialogs.selectedRepair!)}
        onCreateInvoice={() => dialogs.openInvoiceDialog(dialogs.selectedRepair!)}
        onImageClick={dialogs.openImagePreview}
        onPrintServiceOrder={() => handlePrintServiceOrder(dialogs.selectedRepair!, accessToken)}
        onPrintDeviceLabel={() => handlePrintDeviceLabel(dialogs.selectedRepair!, accessToken)}
        branches={branches}
        userRole={userRole}
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
    </div>
  )
}
