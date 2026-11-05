import { projectId } from '../../../utils/supabase/info'
import { toast } from 'sonner@2.0.3'
import {
  printDeviceLabel,
  printInvoice,
  printServiceOrder,
  type DeviceLabelData,
  type InvoiceData,
  type PrintConfig,
  type ServiceOrderData,
} from '../../../utils/printing'
import { Repair } from '../types'
import { trackingUrl as buildTrackingUrl } from '../../../utils/whatsapp'
import { statusLabels } from '../constants'
import {
  assetIdentifier,
  assetTypeLabel,
  cap,
  formatFieldValue,
  getBusinessProfile,
  identifierField,
} from '../../../config/businessTypes'

export const handlePrintServiceOrder = async (
  repair: Repair,
  accessToken: string | null
) => {
  if (!accessToken) {
    toast.error('No hay token de acceso disponible')
    return
  }

  try {
    // Obtener configuración de impresión
    const configResponse = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/company/print-config`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    )
    
    const configData = await configResponse.json()
    if (!configData.success || !configData.printConfig) {
      toast.error('No se ha configurado la impresión. Por favor configura los datos de impresión en Configuración.')
      return
    }

    const printConfig: PrintConfig = configData.printConfig
    // Generate tracking URL with company ID to avoid conflicts between companies
    // BrowserRouter format: clean URLs without hash
    const trackingUrl = buildTrackingUrl(repair.companyId, repair.id)
    
    // El vocabulario sale del comercio de la empresa (lo manda el servidor en printConfig).
    const profile = getBusinessProfile(printConfig.businessType)
    const assetRows = profile.assetFields
      .filter((f) => f.showOnPrint)
      .map((f) => ({ label: f.label, value: formatFieldValue(repair, f), mono: f.mono }))
      .filter((r) => r.value)

    const serviceOrderData: ServiceOrderData = {
      orderNumber: `#${repair.id}`,
      date: new Date(repair.receivedDate).toLocaleString('es-CO'),
      customerName: repair.customerName,
      customerPhone: repair.customerPhone,
      customerEmail: repair.customerEmail,
      device: assetTypeLabel(profile, repair.deviceType),
      brand: repair.deviceBrand,
      model: repair.deviceModel,
      serialNumber: repair.serialNumber || repair.imei,
      assetLabel: cap(profile.vocab.asset),
      assetRows,
      problemLabel: profile.vocab.problem,
      technicianLabel: profile.vocab.technician,
      problem: repair.problem,
      observations: repair.notes,
      estimatedCost: repair.estimatedCost,
      status: statusLabels[repair.status],
      trackingUrl
    }
    
    await printServiceOrder(serviceOrderData, printConfig)
  } catch (error) {
    console.error('Error printing service order:', error)
    toast.error('Error al imprimir la orden de servicio')
  }
}

export const handlePrintDeviceLabel = async (
  repair: Repair,
  accessToken: string | null
) => {
  if (!accessToken) {
    toast.error('No hay token de acceso disponible')
    return
  }

  try {
    // Obtener configuración de impresión
    const configResponse = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/company/print-config`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    )
    
    const configData = await configResponse.json()
    if (!configData.success || !configData.printConfig) {
      toast.error('No se ha configurado la impresión. Por favor configura los datos de impresión en Configuración.')
      return
    }

    const printConfig: PrintConfig = configData.printConfig
    const profile = getBusinessProfile(printConfig.businessType)
    
    const deviceLabelData: DeviceLabelData = {
      orderNumber: `#${repair.id}`,
      customerName: repair.customerName,
      customerPhone: repair.customerPhone,
      problem: repair.problem,
      devicePassword: repair.devicePassword,
      devicePasswordType: repair.devicePasswordType,
      title: profile.labelTitle,
      identifier: (() => {
        const field = identifierField(profile)
        const value = assetIdentifier(repair, profile)
        return field && value ? { label: field.label, value } : undefined
      })(),
      showPassword: profile.devicePassword,
      problemLabel: profile.vocab.problem,
    }
    
    /* La etiqueta no toma formato: siempre va en rollo de 55 mm, porque es un
       adhesivo que se pega al equipo. */
    printDeviceLabel(deviceLabelData)
  } catch (error) {
    console.error('Error printing device label:', error)
    toast.error('Error al imprimir la etiqueta')
  }
}

export const handlePrintInvoiceFromRepair = async (
  repair: Repair,
  invoiceNumber: string,
  totalAmount: number,
  items: any[],
  additionalNotes: string,
  userName: string,
  accessToken: string | null,
  paymentMethod: string = 'Efectivo'
) => {
  if (!accessToken) {
    return
  }

  try {
    const configResponse = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/company/print-config`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    )
    
    const configData = await configResponse.json()
    if (configData.success && configData.printConfig) {
      const printConfig: PrintConfig = configData.printConfig
      
      const printData: InvoiceData = {
        invoiceNumber: invoiceNumber,
        date: new Date().toLocaleString('es-CO'),
        customerName: repair.customerName,
        customerPhone: repair.customerPhone,
        items: items.map(item => ({
          name: item.productName,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity
        })),
        subtotal: totalAmount,
        total: totalAmount,
        paymentMethod,
        notes: additionalNotes,
        // Additional repair information
        repairOrderNumber: `#${repair.id}`,
        deviceInfo: [
          assetTypeLabel(getBusinessProfile(printConfig.businessType), repair.deviceType),
          repair.deviceBrand,
          repair.deviceModel,
          // La placa o el serial sí van en la factura de un taller; el IMEI nunca fue.
          printConfig.businessType && printConfig.businessType !== 'electronica'
            ? assetIdentifier(repair, getBusinessProfile(printConfig.businessType))
            : '',
        ]
          .filter(Boolean)
          .join(' ')
          .trim(),
        deviceLabel: cap(getBusinessProfile(printConfig.businessType).vocab.asset),
        technicianName: repair.assignedTo || userName,
        technicianLabel: getBusinessProfile(printConfig.businessType).vocab.technician
      }
      
      /* La factura se descarga como PDF, igual que en el punto de venta: sin
         ventana emergente —que el móvil bloquea— ni diálogo del navegador.
         La impresión de la OT no cambia: esa sí funciona bien como está. */
      printInvoice(printData, printConfig)
      toast.success('Factura descargada en PDF', {
        description: `${invoiceNumber} · ${printData.total.toLocaleString('es-CO')}`,
        duration: 6000
      })
    } else {
      toast.warning('Configuración de impresión no disponible', {
        description: 'Por favor configura la impresora en Ajustes > General'
      })
    }
  } catch (configError) {
    console.error('Error loading print config:', configError)
    toast.error('Error al cargar configuración de impresión', {
      description: 'No se pudo acceder a los ajustes de impresora'
    })
  }
}
