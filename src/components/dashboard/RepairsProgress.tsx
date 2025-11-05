import { useEffect, useState } from 'react'
import { projectId } from '../../utils/supabase/info'
import { Wrench, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'
import { statusLabels } from '../repairs/constants'

interface RepairsProgressProps {
  accessToken: string
}

interface RepairStats {
  total: number
  received: number
  diagnosing: number
  waiting_parts: number
  repairing: number
  completed: number
  delivered: number
  cancelled: number
}

export function RepairsProgress({ accessToken }: RepairsProgressProps) {
  const [stats, setStats] = useState<RepairStats>({
    total: 0,
    received: 0,
    diagnosing: 0,
    waiting_parts: 0,
    repairing: 0,
    completed: 0,
    delivered: 0,
    cancelled: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRepairStats()
  }, [])

  const fetchRepairStats = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/repairs`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )
      const data = await response.json()
      if (data.success) {
        const repairs = data.repairs.map((r: string) => JSON.parse(r))
        
        // Count active repairs (excluding delivered and cancelled)
        const activeRepairs = repairs.filter((r: any) => 
          r.status !== 'delivered' && r.status !== 'cancelled'
        )
        
        const newStats = {
          total: activeRepairs.length,
          received: activeRepairs.filter((r: any) => r.status === 'received').length,
          diagnosing: activeRepairs.filter((r: any) => r.status === 'diagnosing').length,
          waiting_parts: activeRepairs.filter((r: any) => r.status === 'waiting_parts').length,
          repairing: activeRepairs.filter((r: any) => r.status === 'repairing').length,
          completed: activeRepairs.filter((r: any) => r.status === 'completed').length,
          delivered: repairs.filter((r: any) => r.status === 'delivered').length,
          cancelled: repairs.filter((r: any) => r.status === 'cancelled').length
        }
        
        setStats(newStats)
      }
    } catch (error) {
      console.error('Error fetching repair stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusPercentage = (count: number) => {
    if (stats.total === 0) return 0
    return Math.round((count / stats.total) * 100)
  }

  const statusData = [
    { label: statusLabels.received, count: stats.received, color: 'bg-blue-500' },
    { label: statusLabels.diagnosing, count: stats.diagnosing, color: 'bg-yellow-500' },
    { label: statusLabels.waiting_parts, count: stats.waiting_parts, color: 'bg-orange-500' },
    { label: statusLabels.repairing, count: stats.repairing, color: 'bg-purple-500' },
    { label: statusLabels.completed, count: stats.completed, color: 'bg-green-500' }
  ]

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench size={20} />
            Estado de Reparaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Cargando...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (stats.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench size={20} />
            Estado de Reparaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-gray-500">
            <CheckCircle className="mx-auto mb-2 text-gray-400" size={48} />
            <p>No hay reparaciones activas</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench size={20} />
          Estado de Reparaciones
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Reparaciones activas</span>
            <span className="font-medium">{stats.total}</span>
          </div>
          
          {statusData.map((status) => (
            <div key={status.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{status.label}</span>
                <span className="font-medium">
                  {status.count} ({getStatusPercentage(status.count)}%)
                </span>
              </div>
              <Progress 
                value={getStatusPercentage(status.count)} 
                className="h-2"
                indicatorClassName={status.color}
              />
            </div>
          ))}
          
          {(stats.delivered > 0 || stats.cancelled > 0) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Entregadas: {stats.delivered}</span>
                <span>Canceladas: {stats.cancelled}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
