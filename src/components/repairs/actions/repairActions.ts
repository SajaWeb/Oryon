import { projectId } from '../../../utils/supabase/info'
import { toast } from 'sonner@2.0.3'
import { RepairFormData, InvoiceFormData, Repair } from '../types'

export const createRepair = async (
  accessToken: string | null,
  formData: RepairFormData,
  uploadedImages: string[],
  customerId: number | null
) => {
  if (!accessToken) {
    throw new Error('No access token available')
  }

  const toastId = toast.loading('🔧 Creando orden de reparación...', {
    description: 'Por favor espera, estamos procesando tu solicitud'
  })

  try {
    // Upload images to Cloudinary if there are any
    let imageUrls: string[] = []
    if (uploadedImages.length > 0) {
      toast.loading('📸 Subiendo imágenes...', {
        id: toastId,
        description: `Subiendo ${uploadedImages.length} imagen${uploadedImages.length > 1 ? 'es' : ''}`
      })
      
      const uploadResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/upload-images`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            images: uploadedImages
          })
        }
      )

      const uploadData = await uploadResponse.json()
      if (uploadData.success) {
        imageUrls = uploadData.urls
        console.log('Images uploaded successfully:', imageUrls.length, 'images')
      } else {
        console.error('Error uploading images:', uploadData.error)
        toast.warning('⚠️ Error al subir las imágenes', {
          id: toastId,
          description: 'Se creará la orden sin imágenes',
          duration: 4000
        })
      }
    }

    toast.loading('💾 Guardando orden de reparación...', {
      id: toastId,
      description: 'Casi listo'
    })

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/repairs`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerName: formData.customerName,
          customerPhone: formData.customerPhone,
          customerEmail: formData.customerEmail,
          deviceType: formData.deviceType,
          deviceBrand: formData.deviceBrand,
          deviceModel: formData.deviceModel,
          imei: formData.imei || undefined,
          serialNumber: formData.serialNumber || undefined,
          problem: formData.problem,
          notes: formData.notes,
          customerId,
          estimatedCost: parseFloat(formData.estimatedCost),
          receivedDate: new Date().toISOString(),
          images: imageUrls, // Now using Cloudinary URLs instead of base64
          devicePasswordType: formData.devicePassword || formData.devicePattern.length > 0 ? formData.devicePasswordType : undefined,
          devicePassword: formData.devicePasswordType === 'text' ? formData.devicePassword : undefined,
          devicePattern: formData.devicePasswordType === 'pattern' && formData.devicePattern.length > 0 ? formData.devicePattern : undefined,
          branchId: formData.branchId
        })
      }
    )

    const data = await response.json()
    if (data.success) {
      toast.success('✅ Orden de reparación creada exitosamente', {
        id: toastId,
        description: `Orden #${data.repair?.id || 'nueva'} - ${formData.deviceBrand} ${formData.deviceModel}`,
        duration: 5000
      })
      return data.repair
    } else {
      console.error('Error saving repair:', data.error)
      toast.error('❌ Error al crear la orden de reparación', {
        id: toastId,
        description: data.error || 'Por favor intenta nuevamente',
        duration: 5000
      })
      throw new Error(data.error)
    }
  } catch (error) {
    console.error('Error saving repair:', error)
    toast.error('❌ Error al crear la orden de reparación', {
      id: toastId,
      description: 'Verifica tu conexión a internet',
      duration: 5000
    })
    throw error
  }
}

export const updateRepairStatus = async (
  accessToken: string | null,
  repairId: number,
  newStatus: string,
  notes: string,
  images: string[],
  userName: string
) => {
  if (!accessToken) {
    throw new Error('No access token available')
  }

  try {
    // Upload images to Cloudinary if there are any
    let imageUrls: string[] = []
    if (images.length > 0) {
      console.log('Uploading status change images to Cloudinary...')
      const uploadResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/upload-images`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            images: images
          })
        }
      )

      const uploadData = await uploadResponse.json()
      if (uploadData.success) {
        imageUrls = uploadData.urls
        console.log('Status change images uploaded successfully:', imageUrls.length, 'images')
      } else {
        console.error('Error uploading images:', uploadData.error)
        alert('Error al subir las imágenes. ¿Deseas continuar sin imágenes?')
      }
    }

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/repairs/${repairId}/status`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newStatus,
          notes,
          images: imageUrls, // Now using Cloudinary URLs instead of base64
          userName
        })
      }
    )

    if (!response.ok) {
      const text = await response.text()
      console.error('Server response error:', text)
      throw new Error(`Server error: ${response.status}`)
    }

    const data = await response.json()
    if (data.success) {
      return true
    } else {
      console.error('Error updating status:', data.error)
      throw new Error(data.error)
    }
  } catch (error) {
    console.error('Error updating status:', error)
    throw error
  }
}

export const createInvoiceForRepair = async (
  accessToken: string | null,
  repair: Repair,
  invoiceData: InvoiceFormData,
  userName: string
) => {
  if (!accessToken) {
    throw new Error('No access token available')
  }

  const toastId = toast.loading('Generando factura...', {
    description: 'Por favor espera mientras procesamos la información'
  })

  try {
    const totalAmount = 
      invoiceData.laborItems.reduce((sum, item) => sum + (item.hours * item.hourlyRate), 0) +
      invoiceData.parts.reduce((sum, part) => sum + (part.salePrice * part.quantity), 0)

    const items = [
      ...invoiceData.laborItems.map(item => ({
        productName: item.description,
        quantity: item.hours,
        price: item.hourlyRate,
        type: 'labor'
      })),
      ...invoiceData.parts.map(part => ({
        productName: part.description,
        quantity: part.quantity,
        price: part.salePrice,
        purchasePrice: part.purchaseCost,
        type: 'part'
      }))
    ]

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/repairs/${repair.id}/invoice`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items,
          notes: invoiceData.additionalNotes,
          totalAmount,
          userName
        })
      }
    )

    if (!response.ok) {
      const text = await response.text()
      console.error('Server response error:', text)
      throw new Error(`Server error: ${response.status}`)
    }

    const data = await response.json()
    if (data.success) {
      toast.success('Factura creada exitosamente', {
        id: toastId,
        description: `Factura #${data.sale.invoiceNumber} - Total: $${totalAmount.toLocaleString('es-CO')}`,
        duration: 5000
      })

      return {
        sale: data.sale,
        invoiceNumber: data.sale.invoiceNumber,
        totalAmount,
        items
      }
    } else {
      console.error('Error creating invoice:', data.error)
      toast.error('Error al crear la factura', {
        id: toastId,
        description: data.error || 'Ocurrió un error inesperado',
        duration: 5000
      })
      throw new Error(data.error)
    }
  } catch (error) {
    console.error('Error creating invoice:', error)
    toast.error('Error al crear la factura', {
      id: toastId,
      description: String(error),
      duration: 5000
    })
    throw error
  }
}
