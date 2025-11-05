import { useState } from 'react'
import { Repair } from '../types'

export function useRepairDialogs() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false)
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false)
  
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const openDetailDialog = (repair: Repair) => {
    setSelectedRepair(repair)
    setDetailDialogOpen(true)
  }

  const openStatusDialog = (repair: Repair) => {
    setSelectedRepair(repair)
    setDetailDialogOpen(false)
    setStatusDialogOpen(true)
  }

  const openHistoryDialog = (repair: Repair) => {
    setSelectedRepair(repair)
    setDetailDialogOpen(false)
    setHistoryDialogOpen(true)
  }

  const openInvoiceDialog = (repair: Repair) => {
    setSelectedRepair(repair)
    setDetailDialogOpen(false)
    setInvoiceDialogOpen(true)
  }

  const openImagePreview = (image: string) => {
    setPreviewImage(image)
    setImagePreviewOpen(true)
  }

  const closeAllDialogs = () => {
    setDialogOpen(false)
    setDetailDialogOpen(false)
    setStatusDialogOpen(false)
    setHistoryDialogOpen(false)
    setImagePreviewOpen(false)
    setInvoiceDialogOpen(false)
    setSelectedRepair(null)
    setPreviewImage(null)
  }

  return {
    // New repair dialog
    dialogOpen,
    setDialogOpen,
    
    // Detail dialog
    detailDialogOpen,
    setDetailDialogOpen,
    
    // Status dialog
    statusDialogOpen,
    setStatusDialogOpen,
    
    // History dialog
    historyDialogOpen,
    setHistoryDialogOpen,
    
    // Image preview
    imagePreviewOpen,
    setImagePreviewOpen,
    previewImage,
    
    // Invoice dialog
    invoiceDialogOpen,
    setInvoiceDialogOpen,
    
    // Selected repair
    selectedRepair,
    setSelectedRepair,
    
    // Actions
    openDetailDialog,
    openStatusDialog,
    openHistoryDialog,
    openInvoiceDialog,
    openImagePreview,
    closeAllDialogs
  }
}
