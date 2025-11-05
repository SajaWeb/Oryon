import { useState, useEffect } from 'react'
import { CheckCircle, Clock, AlertCircle, Package, Truck, Search } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Label } from './ui/label'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { statusLabels, statusColors } from './repairs/constants'
import { projectId, publicAnonKey } from '../utils/supabase/info'

interface TrackingPageProps {
  companyId?: string | null
  repairId?: string | null
}

interface RepairTracking {
  id: number
  customerName: string
  deviceType: string
  deviceBrand: string
  deviceModel: string
  problem: string
  status: string
  estimatedCost: number
  receivedDate: string
  images?: string[]
  statusLogs?: Array<{
    timestamp: string
    newStatus: string
    notes: string
    images: string[]
  }>
}

const statusIcons: Record<string, any> = {
  received: Clock,
  diagnosed: AlertCircle,
  'in-progress': Package,
  'waiting-parts': Clock,
  completed: CheckCircle,
  delivered: Truck,
  cancelled: AlertCircle
}

export function TrackingPage({ companyId, repairId }: TrackingPageProps) {
  console.log('🎨 TrackingPage component rendering...')
  console.log('   Company ID received:', companyId)
  console.log('   Repair ID received:', repairId)
  
  const [repair, setRepair] = useState<RepairTracking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchCode, setSearchCode] = useState('')

  console.log('📊 TrackingPage state:', { repair, loading, error })

  useEffect(() => {
    console.log('TrackingPage useEffect triggered')
    console.log('  companyId:', companyId)
    console.log('  repairId:', repairId)
    
    if (companyId && repairId) {
      console.log('  → Fetching repair tracking with both IDs (new format)')
      fetchRepairTracking()
    } else if (repairId && !companyId) {
      console.log('  → Fetching repair tracking with legacy format (old QR code)')
      fetchLegacyRepairTracking()
    } else {
      console.log('  → No IDs provided, showing search form')
      setLoading(false)
    }
  }, [companyId, repairId])

  const fetchRepairTracking = async () => {
    if (!companyId || !repairId) return
    
    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/tracking/${companyId}/${repairId}`
      console.log('Fetching tracking data from:', url)
      console.log('Project ID:', projectId)
      console.log('Company ID:', companyId)
      console.log('Repair ID:', repairId)
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      })
      
      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Response error text:', errorText)
        throw new Error('Orden no encontrada')
      }

      const data = await response.json()
      console.log('Response data:', data)
      
      if (data.success) {
        setRepair(data.repair)
      } else {
        setError(data.error || 'Error al cargar la orden')
      }
    } catch (err) {
      console.error('Error fetching repair tracking:', err)
      setError('No se pudo cargar la información de la orden')
    } finally {
      setLoading(false)
    }
  }

  const fetchLegacyRepairTracking = async () => {
    if (!repairId) return
    
    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/tracking-legacy/${repairId}`
      console.log('⚠️ Fetching LEGACY tracking data from:', url)
      console.log('Project ID:', projectId)
      console.log('Repair ID (legacy):', repairId)
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      })
      
      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Response error text:', errorText)
        throw new Error('Orden no encontrada')
      }

      const data = await response.json()
      console.log('Response data:', data)
      
      if (data.success) {
        setRepair(data.repair)
        // Show a warning that this is an old QR code
        console.warn('⚠️ Using legacy QR code format. Please generate new QR codes with company ID.')
      } else {
        setError(data.error || 'Error al cargar la orden')
      }
    } catch (err) {
      console.error('Error fetching legacy repair tracking:', err)
      setError('No se pudo cargar la información de la orden')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    if (searchCode.trim()) {
      // Parse search code: could be "companyId/repairId" or just "repairId" (legacy)
      const parts = searchCode.trim().split('/')
      if (parts.length === 2) {
        // New format with company ID
        window.history.pushState({}, '', `/tracking/${parts[0]}/${parts[1]}`)
        window.location.reload()
      } else if (parts.length === 1) {
        // Legacy format - just repair ID
        window.history.pushState({}, '', `/tracking/${parts[0]}`)
        window.location.reload()
      } else {
        setError('Formato de código inválido')
        setLoading(false)
      }
    }
  }

  // If no repairId, show search form
  if (!repairId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Seguimiento de Reparación</CardTitle>
            <CardDescription>
              Ingresa tu código de seguimiento para ver el estado de tu reparación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="trackingCode">Código de Seguimiento</Label>
                <Input
                  id="trackingCode"
                  placeholder="Ej: 1/12345 o 12345"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="text-center text-lg"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Escanea el código QR de tu orden o ingresa el código manualmente
                </p>
              </div>
              <Button 
                onClick={handleSearch} 
                className="w-full"
                size="lg"
                disabled={!searchCode.trim()}
              >
                <Search className="mr-2 h-4 w-4" />
                Buscar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información...</p>
        </div>
      </div>
    )
  }

  if (error || !repair) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>{error || 'Orden no encontrada'}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const StatusIcon = statusIcons[repair.status] || Clock
  const sortedLogs = [...(repair.statusLogs || [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl mb-2 text-gray-800">Seguimiento de Reparación</h1>
          <p className="text-gray-600">Orden #{repair.id}</p>
        </div>

        {/* Estado Actual */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Estado Actual</CardTitle>
                <CardDescription>Tu equipo está en proceso</CardDescription>
              </div>
              <StatusIcon size={48} className="text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <Badge className={`${statusColors[repair.status]} text-xl px-6 py-3`}>
              {statusLabels[repair.status]}
            </Badge>
          </CardContent>
        </Card>

        {/* Información del Equipo */}
        <Card>
          <CardHeader>
            <CardTitle>Información del Equipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-600">Cliente</Label>
                <p className="text-lg">{repair.customerName}</p>
              </div>
              <div>
                <Label className="text-gray-600">Dispositivo</Label>
                <p className="text-lg capitalize">
                  {repair.deviceType} {repair.deviceBrand} {repair.deviceModel}
                </p>
              </div>
              <div>
                <Label className="text-gray-600">Problema Reportado</Label>
                <p className="text-lg">{repair.problem}</p>
              </div>
              <div>
                <Label className="text-gray-600">Costo Estimado</Label>
                <p className="text-2xl text-green-600">${repair.estimatedCost.toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-gray-600">Fecha de Recepción</Label>
                <p className="text-lg">{new Date(repair.receivedDate).toLocaleDateString('es-CO')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Imágenes del Equipo */}
        {repair.images && repair.images.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Imágenes del Equipo</CardTitle>
              <CardDescription>Fotos tomadas al momento de la recepción</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {repair.images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Equipo ${idx + 1}`}
                    className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-all cursor-pointer"
                    onClick={() => window.open(img, '_blank')}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Historial de Estados */}
        {sortedLogs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Historial de la Reparación</CardTitle>
              <CardDescription>Seguimiento detallado del proceso</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sortedLogs.map((log, idx) => {
                  const LogIcon = statusIcons[log.newStatus] || Clock
                  return (
                    <div key={idx} className="flex gap-4 pb-4 border-b last:border-b-0">
                      <div className="flex-shrink-0">
                        <div className={`${statusColors[log.newStatus]} p-2 rounded-full`}>
                          <LogIcon size={20} className="text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={statusColors[log.newStatus]}>
                            {statusLabels[log.newStatus]}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {new Date(log.timestamp).toLocaleString('es-CO')}
                          </span>
                        </div>
                        {log.notes && (
                          <p className="text-gray-700 mt-1">{log.notes}</p>
                        )}
                        {log.images && log.images.length > 0 && (
                          <div className="grid grid-cols-4 gap-2 mt-2">
                            {log.images.map((img, imgIdx) => (
                              <img
                                key={imgIdx}
                                src={img}
                                alt={`Actualización ${imgIdx + 1}`}
                                className="w-full h-16 object-cover rounded cursor-pointer hover:opacity-80"
                                onClick={() => window.open(img, '_blank')}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-gray-600 text-sm py-4">
          <p>Si tienes alguna pregunta, no dudes en contactarnos</p>
          <p className="mt-2 text-xs text-gray-500">Oryon App - Sistema de Gestión de Reparaciones</p>
        </div>
      </div>
    </div>
  )
}
