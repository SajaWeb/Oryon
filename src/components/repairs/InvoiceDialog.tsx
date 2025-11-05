import { useState } from 'react'
import { Plus, Trash2, Printer, Info } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Alert, AlertDescription } from '../ui/alert'
import { Repair, InvoiceFormData, LaborItem, RepairPart } from './types'

interface InvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  repair: Repair | null
  onSubmit: (invoiceData: InvoiceFormData) => Promise<void>
}

export function InvoiceDialog({
  open,
  onOpenChange,
  repair,
  onSubmit
}: InvoiceDialogProps) {
  const [invoiceData, setInvoiceData] = useState<InvoiceFormData>({
    laborItems: [{ description: '', hours: 0, hourlyRate: 0 }],
    parts: [{ description: '', purchaseCost: 0, salePrice: 0, quantity: 1 }],
    additionalNotes: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const addLaborItem = () => {
    setInvoiceData({
      ...invoiceData,
      laborItems: [...invoiceData.laborItems, { description: '', hours: 0, hourlyRate: 0 }]
    })
  }

  const removeLaborItem = (index: number) => {
    setInvoiceData({
      ...invoiceData,
      laborItems: invoiceData.laborItems.filter((_, i) => i !== index)
    })
  }

  const updateLaborItem = (index: number, field: keyof LaborItem, value: any) => {
    const updated = [...invoiceData.laborItems]
    updated[index] = { ...updated[index], [field]: value }
    setInvoiceData({ ...invoiceData, laborItems: updated })
  }

  const addPart = () => {
    setInvoiceData({
      ...invoiceData,
      parts: [...invoiceData.parts, { description: '', purchaseCost: 0, salePrice: 0, quantity: 1 }]
    })
  }

  const removePart = (index: number) => {
    setInvoiceData({
      ...invoiceData,
      parts: invoiceData.parts.filter((_, i) => i !== index)
    })
  }

  const updatePart = (index: number, field: keyof RepairPart, value: any) => {
    const updated = [...invoiceData.parts]
    updated[index] = { ...updated[index], [field]: value }
    setInvoiceData({ ...invoiceData, parts: updated })
  }

  const calculateTotalCost = () => {
    const laborCost = invoiceData.laborItems.reduce((sum, item) => sum + (item.hours * item.hourlyRate), 0)
    const partsCost = invoiceData.parts.reduce((sum, part) => sum + (part.purchaseCost * part.quantity), 0)
    return laborCost + partsCost
  }

  const calculateInvoiceTotal = () => {
    const laborTotal = invoiceData.laborItems.reduce((sum, item) => sum + (item.hours * item.hourlyRate), 0)
    const partsTotal = invoiceData.parts.reduce((sum, part) => sum + (part.salePrice * part.quantity), 0)
    return laborTotal + partsTotal
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await onSubmit(invoiceData)
      // Reset form
      setInvoiceData({
        laborItems: [{ description: '', hours: 0, hourlyRate: 0 }],
        parts: [{ description: '', purchaseCost: 0, salePrice: 0, quantity: 1 }],
        additionalNotes: ''
      })
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  if (!repair) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Facturar Reparación - Orden #{repair.id}</DialogTitle>
          <DialogDescription>
            Ingresa los detalles de mano de obra y repuestos para generar la factura
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Alerta de impresión */}
          <Alert className="bg-blue-50 border-blue-200">
            <Printer className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-800">
              Al crear la factura, se generará automáticamente un ticket de impresión con todos los ajustes configurados por el administrador.
            </AlertDescription>
          </Alert>

          {/* Información del Cliente */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="mb-2">Información del Cliente</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Cliente:</p>
                <p>{repair.customerName}</p>
              </div>
              <div>
                <p className="text-gray-600">Teléfono:</p>
                <p>{repair.customerPhone}</p>
              </div>
              <div>
                <p className="text-gray-600">Equipo:</p>
                <p className="capitalize">
                  {repair.deviceType} {repair.deviceBrand} {repair.deviceModel}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Problema:</p>
                <p>{repair.problem}</p>
              </div>
            </div>
          </div>

          {/* Mano de Obra */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4>Mano de Obra</h4>
              <Button onClick={addLaborItem} size="sm" variant="outline">
                <Plus size={14} className="mr-1" />
                Agregar
              </Button>
            </div>
            <div className="space-y-3">
              {invoiceData.laborItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end border rounded-lg p-3">
                  <div className="col-span-5">
                    <Label>Descripción</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateLaborItem(index, 'description', e.target.value)}
                      placeholder="Ej: Reparación de pantalla"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Horas</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={item.hours || ''}
                      onChange={(e) => updateLaborItem(index, 'hours', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>$/Hora</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.hourlyRate || ''}
                      onChange={(e) => updateLaborItem(index, 'hourlyRate', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Subtotal</Label>
                    <p className="text-lg">${(item.hours * item.hourlyRate).toFixed(2)}</p>
                  </div>
                  <div className="col-span-1">
                    {invoiceData.laborItems.length > 1 && (
                      <Button
                        onClick={() => removeLaborItem(index)}
                        size="sm"
                        variant="destructive"
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Repuestos */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4>Repuestos y Materiales</h4>
              <Button onClick={addPart} size="sm" variant="outline">
                <Plus size={14} className="mr-1" />
                Agregar
              </Button>
            </div>
            <div className="space-y-3">
              {invoiceData.parts.map((part, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end border rounded-lg p-3">
                  <div className="col-span-4">
                    <Label>Descripción</Label>
                    <Input
                      value={part.description}
                      onChange={(e) => updatePart(index, 'description', e.target.value)}
                      placeholder="Ej: Pantalla LCD"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Cantidad</Label>
                    <Input
                      type="number"
                      value={part.quantity || ''}
                      onChange={(e) => updatePart(index, 'quantity', parseInt(e.target.value) || 1)}
                      placeholder="1"
                      min="1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Costo</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={part.purchaseCost || ''}
                      onChange={(e) => updatePart(index, 'purchaseCost', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>P. Venta</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={part.salePrice || ''}
                      onChange={(e) => updatePart(index, 'salePrice', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-1">
                    <Label>Subtotal</Label>
                    <p className="text-lg">${(part.salePrice * part.quantity).toFixed(2)}</p>
                  </div>
                  <div className="col-span-1">
                    {invoiceData.parts.length > 1 && (
                      <Button
                        onClick={() => removePart(index)}
                        size="sm"
                        variant="destructive"
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notas adicionales */}
          <div>
            <Label>Notas Adicionales</Label>
            <Textarea
              value={invoiceData.additionalNotes}
              onChange={(e) => setInvoiceData({ ...invoiceData, additionalNotes: e.target.value })}
              placeholder="Notas adicionales para la factura..."
              rows={3}
            />
          </div>

          {/* Resumen Total */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-200">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Total Mano de Obra:</span>
                <span>
                  ${invoiceData.laborItems.reduce((sum, item) => sum + (item.hours * item.hourlyRate), 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Total Repuestos:</span>
                <span>
                  ${invoiceData.parts.reduce((sum, part) => sum + (part.salePrice * part.quantity), 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-gray-700">Costo Total:</span>
                <span className="text-red-600">
                  ${calculateTotalCost().toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-lg border-t-2 border-blue-300 pt-2">
                <span>TOTAL A COBRAR:</span>
                <span className="text-green-600 text-2xl">
                  ${calculateInvoiceTotal().toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Margen de Ganancia:</span>
                <span className="text-blue-600">
                  ${(calculateInvoiceTotal() - calculateTotalCost()).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 justify-end border-t pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-green-600 hover:bg-green-700"
              disabled={calculateInvoiceTotal() === 0 || submitting}
            >
              {submitting ? 'Creando...' : 'Crear Factura y Marcar como Entregado'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
