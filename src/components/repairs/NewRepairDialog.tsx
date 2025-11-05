import { useState, useEffect } from 'react'
import { Upload, X, Lock } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { PatternLock } from '../PatternLock'
import { CustomerSelector } from './CustomerSelector'
import { Customer, RepairFormData } from './types'
import { deviceTypes } from './constants'

interface Branch {
  id: string
  name: string
}

interface NewRepairDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customers: Customer[]
  identificationTypes: string[]
  branches: Branch[]
  userRole?: string
  onSubmit: (formData: RepairFormData, uploadedImages: string[], selectedCustomerId: number | null) => Promise<void>
}

export function NewRepairDialog({
  open,
  onOpenChange,
  customers,
  identificationTypes,
  branches,
  userRole,
  onSubmit
}: NewRepairDialogProps) {
  const [formData, setFormData] = useState<RepairFormData>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerIdentificationType: '',
    customerIdentificationNumber: '',
    deviceType: 'celular',
    deviceBrand: '',
    deviceModel: '',
    imei: '',
    serialNumber: '',
    problem: '',
    estimatedCost: '',
    notes: '',
    devicePasswordType: 'text',
    devicePassword: '',
    devicePattern: [],
    branchId: branches.length > 0 ? branches[0].id : undefined
  })
  
  // Update branchId when branches change
  useEffect(() => {
    if (branches.length > 0 && !formData.branchId) {
      setFormData(prev => ({ ...prev, branchId: branches[0].id }))
    }
  }, [branches])
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setUploadedImages(prev => [...prev, base64String])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleFormDataChange = (data: Partial<RepairFormData>) => {
    setFormData(prev => ({ ...prev, ...data }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit(formData, uploadedImages, selectedCustomerId)
      // Reset form
      setFormData({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        customerIdentificationType: '',
        customerIdentificationNumber: '',
        deviceType: 'celular',
        deviceBrand: '',
        deviceModel: '',
        imei: '',
        serialNumber: '',
        problem: '',
        estimatedCost: '',
        notes: '',
        devicePasswordType: 'text',
        devicePassword: '',
        devicePattern: []
      })
      setUploadedImages([])
      setSelectedCustomerId(null)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Nueva Orden de Reparación</DialogTitle>
          <DialogDescription className="text-sm">
            Registra una nueva orden de reparación con los datos del cliente y del equipo
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selector de Cliente */}
          <CustomerSelector
            customers={customers}
            identificationTypes={identificationTypes}
            formData={formData}
            onFormDataChange={handleFormDataChange}
            onCustomerSelect={setSelectedCustomerId}
          />

          {/* Selector de Sucursal */}
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <Label htmlFor="branchSelect">Sucursal *</Label>
            {userRole !== 'admin' && branches.length === 1 && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-2 mt-1">
                📍 Tu sucursal asignada: {branches[0].name}
              </p>
            )}
            <Select 
              value={formData.branchId} 
              onValueChange={(value) => handleFormDataChange({ branchId: value })}
            >
              <SelectTrigger id="branchSelect" className="mt-2">
                <SelectValue placeholder="Selecciona la sucursal" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              La orden de reparación se asignará a esta sucursal
            </p>
          </div>

          {/* Información del Equipo */}
          <div className="border-t pt-4 space-y-4">
            <h4 className="text-base sm:text-lg">Información del Equipo</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="deviceType">Tipo de Dispositivo</Label>
                <Select
                  value={formData.deviceType}
                  onValueChange={(value) => handleFormDataChange({ deviceType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {deviceTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="deviceBrand">Marca</Label>
                <Input
                  id="deviceBrand"
                  value={formData.deviceBrand}
                  onChange={(e) => handleFormDataChange({ deviceBrand: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="deviceModel">Modelo</Label>
                <Input
                  id="deviceModel"
                  value={formData.deviceModel}
                  onChange={(e) => handleFormDataChange({ deviceModel: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* IMEI/Serial */}
            <div className="border-t pt-4 space-y-4">
              <h4 className="text-sm sm:text-base">Identificación del Equipo (Opcional)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="imei">IMEI</Label>
                  <Input
                    id="imei"
                    value={formData.imei}
                    onChange={(e) => handleFormDataChange({ imei: e.target.value })}
                    placeholder="356938035643809"
                  />
                </div>
                <div>
                  <Label htmlFor="serialNumber">Número de Serie</Label>
                  <Input
                    id="serialNumber"
                    value={formData.serialNumber}
                    onChange={(e) => handleFormDataChange({ serialNumber: e.target.value })}
                    placeholder="SN123456789"
                  />
                </div>
              </div>
            </div>

            {/* Contraseña/Patrón */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock size={16} className="text-gray-600" />
                <h4 className="text-sm sm:text-base">Contraseña/Patrón del Equipo (Opcional)</h4>
              </div>
              <Tabs 
                value={formData.devicePasswordType} 
                onValueChange={(value) => handleFormDataChange({ 
                  devicePasswordType: value as 'text' | 'pattern', 
                  devicePassword: '', 
                  devicePattern: [] 
                })}
              >
                <TabsList className="grid w-full grid-cols-2 h-auto">
                  <TabsTrigger value="text" className="text-xs sm:text-sm py-2">PIN/Contraseña</TabsTrigger>
                  <TabsTrigger value="pattern" className="text-xs sm:text-sm py-2">Patrón</TabsTrigger>
                </TabsList>
                <TabsContent value="text" className="space-y-2">
                  <Label htmlFor="devicePassword">Contraseña o PIN</Label>
                  <Input
                    id="devicePassword"
                    type="text"
                    value={formData.devicePassword}
                    onChange={(e) => handleFormDataChange({ devicePassword: e.target.value })}
                    placeholder="Ej: 1234, contraseña123"
                  />
                  <p className="text-xs text-gray-500">Ingresa el PIN, contraseña o código de desbloqueo</p>
                </TabsContent>
                <TabsContent value="pattern" className="space-y-2">
                  <Label>Patrón de Desbloqueo</Label>
                  <div className="flex justify-center py-2">
                    <PatternLock
                      value={formData.devicePattern}
                      onPatternComplete={(pattern) => handleFormDataChange({ devicePattern: pattern })}
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center">Dibuja el patrón de desbloqueo del dispositivo</p>
                </TabsContent>
              </Tabs>
            </div>

            <div>
              <Label htmlFor="problem">Problema Reportado</Label>
              <Textarea
                id="problem"
                value={formData.problem}
                onChange={(e) => handleFormDataChange({ problem: e.target.value })}
                rows={3}
                required
              />
            </div>

            <div>
              <Label htmlFor="estimatedCost">Costo Estimado</Label>
              <Input
                id="estimatedCost"
                type="number"
                step="0.01"
                value={formData.estimatedCost}
                onChange={(e) => handleFormDataChange({ estimatedCost: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="notes">Notas Adicionales</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleFormDataChange({ notes: e.target.value })}
                rows={2}
              />
            </div>

            <div>
              <Label className="text-sm sm:text-base">Imágenes del Estado del Equipo</Label>
              <div className="mt-2">
                <label htmlFor="image-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-4 text-center hover:border-gray-400 transition-colors active:bg-gray-50">
                    <Upload className="mx-auto mb-2 text-gray-400" size={28} />
                    <p className="text-sm text-gray-600">Toca para subir imágenes</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG hasta 5MB</p>
                  </div>
                </label>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                  capture="environment"
                />
              </div>
              
              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-24 sm:h-24 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-md"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={submitting}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              {submitting ? (uploadedImages.length > 0 ? 'Subiendo imágenes...' : 'Guardando...') : 'Crear Orden'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
