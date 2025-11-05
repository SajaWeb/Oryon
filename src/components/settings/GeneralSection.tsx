import { useState, useEffect } from 'react'
import { Printer, Package, Save, Upload, X, Globe } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Alert, AlertDescription } from '../ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { PrintConfig } from '../../utils/print'
import { projectId } from '../../utils/supabase/info'
import { TAX_ID_TYPES, getTaxIdType } from '../../utils/tax-id-types'

interface GeneralSectionProps {
  accessToken: string
  companyName: string
}

export function GeneralSection({ accessToken, companyName }: GeneralSectionProps) {
  const [printSuccess, setPrintSuccess] = useState('')
  const [stockSuccess, setStockSuccess] = useState('')
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5)
  const [printConfig, setPrintConfig] = useState<PrintConfig>({
    format: '80mm',
    companyName: companyName || 'Oryon App',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    taxId: '',
    taxIdType: 'NIT',
    companyLogo: '',
    website: '',
    socialMedia: '',
    warrantyNotes: '',
    welcomeMessage: '',
    farewellMessage: ''
  })

  useEffect(() => {
    loadPrintConfig()
    loadCompanySettings()
  }, [])

  useEffect(() => {
    setPrintConfig(prev => ({
      ...prev,
      companyName: companyName || 'Oryon App'
    }))
  }, [companyName])

  const loadPrintConfig = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/company/print-config`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )
      const data = await response.json()
      if (data.success && data.printConfig) {
        setPrintConfig({
          ...data.printConfig,
          taxIdType: data.printConfig.taxIdType || 'NIT',
          website: data.printConfig.website || '',
          socialMedia: data.printConfig.socialMedia || '',
          warrantyNotes: data.printConfig.warrantyNotes || '',
          welcomeMessage: data.printConfig.welcomeMessage || '',
          farewellMessage: data.printConfig.farewellMessage || ''
        })
        if (data.printConfig.companyLogo) {
          setLogoPreview(data.printConfig.companyLogo)
        }
      }
    } catch (error) {
      console.error('Error loading print config:', error)
    }
  }

  const loadCompanySettings = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/company/settings`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )
      const data = await response.json()
      if (data.success && data.settings) {
        setLowStockThreshold(data.settings.lowStockThreshold || 5)
      }
    } catch (error) {
      console.error('Error loading company settings:', error)
    }
  }

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      alert('El archivo es demasiado grande. El tamaño máximo es 2MB.')
      return
    }

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido.')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setLogoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    await uploadLogo(file)
  }

  const uploadLogo = async (file: File) => {
    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('logo', file)

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/company/logo`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: formData
        }
      )

      const data = await response.json()
      if (data.success && data.logoUrl) {
        const updatedConfig = {
          ...printConfig,
          companyLogo: data.logoUrl
        }
        setPrintConfig(updatedConfig)
        await savePrintConfigToBackend(updatedConfig)
        setPrintSuccess('Logo cargado exitosamente')
        setTimeout(() => setPrintSuccess(''), 3000)
      } else {
        alert('Error al subir el logo')
      }
    } catch (error) {
      console.error('Error uploading logo:', error)
      alert('Error al subir el logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleRemoveLogo = async () => {
    setLogoPreview('')
    const updatedConfig = {
      ...printConfig,
      companyLogo: ''
    }
    setPrintConfig(updatedConfig)
    await savePrintConfigToBackend(updatedConfig)
  }

  const savePrintConfigToBackend = async (config: PrintConfig) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/company/print-config`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(config)
        }
      )

      const data = await response.json()
      if (!data.success) {
        console.error('Error saving print config:', data.error)
      }
    } catch (error) {
      console.error('Error saving print config:', error)
    }
  }

  const handleSavePrintConfig = async () => {
    await savePrintConfigToBackend(printConfig)
    setPrintSuccess('Configuración de impresión guardada exitosamente')
    setTimeout(() => setPrintSuccess(''), 3000)
  }

  const saveStockSettings = async () => {
    try {
      setStockSuccess('')
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/company/settings`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            lowStockThreshold
          })
        }
      )
      const data = await response.json()
      if (data.success) {
        const { cache } = await import('../../utils/cache')
        cache.invalidatePattern('dashboard-stats')
        
        setStockSuccess('Configuración de stock guardada exitosamente')
        setTimeout(() => setStockSuccess(''), 5000)
      } else {
        alert('Error al guardar la configuración')
      }
    } catch (error) {
      console.error('Error saving stock settings:', error)
      alert('Error al guardar la configuración de stock')
    }
  }

  return (
    <div className="space-y-6">
      {/* Stock Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Package className="text-blue-600" size={24} />
            <CardTitle>Configuración de Inventario</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {stockSuccess && (
            <Alert className="bg-green-50 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-100 dark:border-green-800 mb-4">
              <AlertDescription>{stockSuccess}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <Label>Umbral de Stock Bajo</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Define cuándo un producto debe ser considerado con stock bajo
              </p>
              <Input
                type="number"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 0)}
                min="0"
                className="max-w-xs"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Se alertará cuando un producto tenga {lowStockThreshold} o menos unidades
              </p>
            </div>

            <Button onClick={saveStockSettings} className="w-full sm:w-auto">
              <Save size={16} className="mr-2" />
              Guardar Configuración de Inventario
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Print Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Printer className="text-blue-600" size={24} />
            <CardTitle>Configuración de Impresión</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {printSuccess && (
            <Alert className="bg-green-50 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-100 dark:border-green-800 mb-4">
              <AlertDescription>{printSuccess}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-6">
            {/* Logo */}
            <div>
              <Label>Logo de la Empresa</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Este logo aparecerá en tus facturas y recibos
              </p>
              {logoPreview ? (
                <div className="relative inline-block">
                  <img src={logoPreview} alt="Logo" className="h-24 object-contain border rounded" />
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
                  <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                  <Label htmlFor="logo-upload" className="cursor-pointer text-blue-600 hover:text-blue-700">
                    {uploadingLogo ? 'Subiendo...' : 'Haz clic para subir un logo'}
                  </Label>
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                    disabled={uploadingLogo}
                  />
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG hasta 2MB</p>
                </div>
              )}
            </div>

            {/* Format */}
            <div>
              <Label>Formato de Impresión</Label>
              <Select
                value={printConfig.format}
                onValueChange={(value: '80mm' | 'A4') => setPrintConfig({ ...printConfig, format: value })}
              >
                <SelectTrigger className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="80mm">Ticket 80mm (Impresora térmica)</SelectItem>
                  <SelectItem value="A4">Hoja A4 (Impresora estándar)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Company Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Dirección</Label>
                <Input
                  value={printConfig.companyAddress}
                  onChange={(e) => setPrintConfig({ ...printConfig, companyAddress: e.target.value })}
                  placeholder="Calle 123 #45-67"
                />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input
                  value={printConfig.companyPhone}
                  onChange={(e) => setPrintConfig({ ...printConfig, companyPhone: e.target.value })}
                  placeholder="+57 300 123 4567"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={printConfig.companyEmail}
                  onChange={(e) => setPrintConfig({ ...printConfig, companyEmail: e.target.value })}
                  placeholder="contacto@empresa.com"
                />
              </div>
              <div>
                <Label>Sitio Web</Label>
                <Input
                  value={printConfig.website}
                  onChange={(e) => setPrintConfig({ ...printConfig, website: e.target.value })}
                  placeholder="www.empresa.com"
                />
              </div>
            </div>

            {/* Tax Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <Globe className="text-blue-600" size={20} />
                <h3 className="font-medium">Información Tributaria</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Identificación Tributaria</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Selecciona según tu país (19 países disponibles)
                  </p>
                  <Select
                    value={printConfig.taxIdType}
                    onValueChange={(value) => setPrintConfig({ ...printConfig, taxIdType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {TAX_ID_TYPES.map((taxType) => (
                        <SelectItem key={taxType.value} value={taxType.value}>
                          {taxType.label} - {taxType.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {printConfig.taxIdType && getTaxIdType(printConfig.taxIdType) && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      📋 Formato: {getTaxIdType(printConfig.taxIdType)?.format}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Número de Identificación Tributaria</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {printConfig.taxIdType && getTaxIdType(printConfig.taxIdType)
                      ? `Ej: ${getTaxIdType(printConfig.taxIdType)?.example}`
                      : 'Selecciona un tipo primero'}
                  </p>
                  <Input
                    value={printConfig.taxId}
                    onChange={(e) => setPrintConfig({ ...printConfig, taxId: e.target.value })}
                    placeholder={
                      printConfig.taxIdType && getTaxIdType(printConfig.taxIdType)
                        ? getTaxIdType(printConfig.taxIdType)?.example
                        : '123456789'
                    }
                  />
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="space-y-4">
              <div>
                <Label>Mensaje de Bienvenida</Label>
                <Textarea
                  value={printConfig.welcomeMessage}
                  onChange={(e) => setPrintConfig({ ...printConfig, welcomeMessage: e.target.value })}
                  placeholder="¡Gracias por su compra!"
                  rows={2}
                />
              </div>
              <div>
                <Label>Mensaje de Despedida</Label>
                <Textarea
                  value={printConfig.farewellMessage}
                  onChange={(e) => setPrintConfig({ ...printConfig, farewellMessage: e.target.value })}
                  placeholder="Esperamos volver a verle pronto"
                  rows={2}
                />
              </div>
              <div>
                <Label>Notas de Garantía</Label>
                <Textarea
                  value={printConfig.warrantyNotes}
                  onChange={(e) => setPrintConfig({ ...printConfig, warrantyNotes: e.target.value })}
                  placeholder="Garantía de 90 días en reparaciones. No cubre daños por líquidos o golpes."
                  rows={3}
                />
              </div>
            </div>

            <Button onClick={handleSavePrintConfig} className="w-full sm:w-auto">
              <Save size={16} className="mr-2" />
              Guardar Configuración de Impresión
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
