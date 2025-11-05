import { useState, useEffect } from 'react'
import { CreditCard, FileText, X, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { Alert, AlertDescription } from '../ui/alert'
import { projectId } from '../../utils/supabase/info'

interface DocumentsSectionProps {
  accessToken: string
  identificationTypes: string[]
  setIdentificationTypes: (types: string[]) => void
}

export function DocumentsSection({ 
  accessToken, 
  identificationTypes,
  setIdentificationTypes
}: DocumentsSectionProps) {
  const [newIdType, setNewIdType] = useState('')
  const [idSuccess, setIdSuccess] = useState('')
  const [invoiceSuccess, setInvoiceSuccess] = useState('')
  const [invoiceConfig, setInvoiceConfig] = useState({
    prefix: 'FACT',
    startNumber: 1
  })

  useEffect(() => {
    loadInvoiceConfig()
  }, [])

  const loadInvoiceConfig = async () => {
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
      if (data.success && data.invoiceConfig) {
        setInvoiceConfig({
          prefix: data.invoiceConfig.prefix || 'FACT',
          startNumber: data.invoiceConfig.startNumber || 1
        })
      }
    } catch (error) {
      console.error('Error loading invoice config:', error)
    }
  }

  const handleAddIdType = () => {
    if (newIdType.trim() && !identificationTypes.includes(newIdType.trim())) {
      const updatedTypes = [...identificationTypes, newIdType.trim()]
      setIdentificationTypes(updatedTypes)
      setNewIdType('')
    }
  }

  const handleRemoveIdType = (type: string) => {
    setIdentificationTypes(identificationTypes.filter(t => t !== type))
  }

  const handleSaveIdTypes = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/company/settings`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            identificationTypes
          })
        }
      )

      const data = await response.json()
      if (data.success) {
        setIdSuccess('Tipos de identificación guardados exitosamente')
        setTimeout(() => setIdSuccess(''), 3000)
      }
    } catch (error) {
      console.error('Error saving identification types:', error)
    }
  }

  const handleSaveInvoiceConfig = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/company/invoice-config`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(invoiceConfig)
        }
      )

      const data = await response.json()
      if (data.success) {
        setInvoiceSuccess('Configuración de facturación guardada exitosamente')
        setTimeout(() => setInvoiceSuccess(''), 3000)
      }
    } catch (error) {
      console.error('Error saving invoice config:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Customer Identification Types */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CreditCard className="text-blue-600" size={24} />
            <CardTitle>Tipos de Identificación de Clientes</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {idSuccess && (
            <Alert className="bg-green-50 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-100 dark:border-green-800 mb-4">
              <AlertDescription>{idSuccess}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <Label>Tipos de Identificación Disponibles</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Configura los tipos de documento que tus clientes pueden usar
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {identificationTypes.map((type) => (
                  <Badge key={type} variant="secondary" className="text-sm px-3 py-1.5">
                    {type}
                    <button
                      onClick={() => handleRemoveIdType(type)}
                      className="ml-2 hover:text-red-600"
                    >
                      <X size={14} />
                    </button>
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  value={newIdType}
                  onChange={(e) => setNewIdType(e.target.value)}
                  placeholder="Nuevo tipo de identificación"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddIdType()}
                />
                <Button onClick={handleAddIdType}>Agregar</Button>
              </div>
            </div>

            <Button onClick={handleSaveIdTypes} className="w-full sm:w-auto">
              <Save size={16} className="mr-2" />
              Guardar Tipos de Identificación
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileText className="text-blue-600" size={24} />
            <CardTitle>Configuración de Facturación</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {invoiceSuccess && (
            <Alert className="bg-green-50 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-100 dark:border-green-800 mb-4">
              <AlertDescription>{invoiceSuccess}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <Label>Consecutivo de Facturación</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Configura el prefijo y número inicial de tus facturas
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Prefijo</Label>
                <Input
                  value={invoiceConfig.prefix}
                  onChange={(e) => setInvoiceConfig({ ...invoiceConfig, prefix: e.target.value })}
                  placeholder="FACT"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Ejemplo: FACT, INV, VTA
                </p>
              </div>

              <div>
                <Label>Número Inicial</Label>
                <Input
                  type="number"
                  value={invoiceConfig.startNumber}
                  onChange={(e) => setInvoiceConfig({ ...invoiceConfig, startNumber: parseInt(e.target.value) || 1 })}
                  placeholder="1"
                  min="1"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Las facturas iniciarán desde este número
                </p>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Vista Previa:</strong> {invoiceConfig.prefix}-{String(invoiceConfig.startNumber).padStart(6, '0')}
              </p>
            </div>

            <Button onClick={handleSaveInvoiceConfig} className="w-full sm:w-auto">
              <Save size={16} className="mr-2" />
              Guardar Configuración de Facturación
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
