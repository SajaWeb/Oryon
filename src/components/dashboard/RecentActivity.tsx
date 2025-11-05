import { useEffect, useState } from 'react'
import { projectId } from '../../utils/supabase/info'
import { Wrench, ShoppingCart, Clock, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'

interface Activity {
  id: string
  type: 'repair' | 'sale'
  title: string
  subtitle: string
  timestamp: string
  status?: string
  amount?: number
}

interface RecentActivityProps {
  accessToken: string
}

export function RecentActivity({ accessToken }: RecentActivityProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentActivity()
  }, [])

  const fetchRecentActivity = async () => {
    try {
      if (!accessToken) {
        console.error('❌ No access token available for recent activity request')
        return
      }
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/stats/recent-activity`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )
      
      if (!response.ok) {
        console.error('❌ Recent activity API error:', response.status)
        const errorText = await response.text()
        console.error('❌ Error details:', errorText)
        return
      }
      
      const data = await response.json()
      if (data.success) {
        setActivities(data.activities || [])
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'repair':
        return <Wrench className="text-orange-600" size={18} />
      case 'sale':
        return <ShoppingCart className="text-green-600" size={18} />
      default:
        return <Clock className="text-gray-600" size={18} />
    }
  }

  const getStatusBadge = (status?: string) => {
    if (!status) return null
    
    const statusConfig: Record<string, { label: string; color: string }> = {
      'Recibido': { label: 'Recibido', color: 'bg-blue-500' },
      'En diagnóstico': { label: 'En diagnóstico', color: 'bg-yellow-500' },
      'En reparación': { label: 'En reparación', color: 'bg-orange-500' },
      'Reparado': { label: 'Reparado', color: 'bg-green-500' },
      'Entregado': { label: 'Entregado', color: 'bg-gray-500' },
    }

    const config = statusConfig[status] || { label: status, color: 'bg-gray-500' }
    
    return (
      <Badge className={`${config.color} text-white text-xs`}>
        {config.label}
      </Badge>
    )
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Hace un momento'
    if (diffMins < 60) return `Hace ${diffMins} min`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `Hace ${diffHours}h`
    
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `Hace ${diffDays}d`
    
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Cargando actividad...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock size={20} />
          Actividad Reciente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <p>No hay actividad reciente</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{activity.title}</p>
                        <p className="text-sm text-gray-600 truncate">{activity.subtitle}</p>
                      </div>
                      {activity.status && getStatusBadge(activity.status)}
                    </div>
                    
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                      {activity.amount && (
                        <span className="text-xs text-green-600 font-medium">
                          ${activity.amount.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
