import { useEffect, useState } from 'react'
import { projectId } from '../utils/supabase/info'
import { Package, Wrench, DollarSign, Users, AlertCircle, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import { Button } from './ui/button'
import { StatCard } from './dashboard/StatCard'
import { RevenueCard } from './dashboard/RevenueCard'
import { LowStockDialog } from './dashboard/LowStockDialog'
import { RecentActivity } from './dashboard/RecentActivity'
import { RepairsProgress } from './dashboard/RepairsProgress'
import { SalesChart } from './dashboard/SalesChart'
import { ServerStatus } from './ServerStatus'
import { fetchWithCache, cache } from '../utils/cache'
import { makeAuthenticatedRequest, getErrorMessage, isAuthError } from '../utils/api'

interface Stats {
  totalProducts: number
  totalRepairs: number
  activeRepairs: number
  totalSales: number
  totalRevenue: number
  totalCustomers: number
  lowStock: number
}

interface DashboardProps {
  accessToken: string
  userProfile?: any
  onNavigate?: (view: string) => void
}

export function Dashboard({ accessToken, userProfile, onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lowStockDialogOpen, setLowStockDialogOpen] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Function to get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return '¡Buenos días'
    if (hour < 18) return '¡Buenas tardes'
    return '¡Buenas noches'
  }

  // Get first name from full name
  const getFirstName = (fullName: string) => {
    return fullName?.split(' ')[0] || fullName
  }

  useEffect(() => {
    fetchStats()
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchStats(true)
    }, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchStats = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      setError(null)
      
      // Validate we have a token before making the request
      if (!accessToken) {
        console.error('❌ No access token available for stats request')
        throw new Error('No se pudo autenticar. Por favor, inicia sesión nuevamente.')
      }
      
      console.log('📊 Fetching stats with token:', accessToken.substring(0, 20) + '...')
      
      // Use cache with 2 minute TTL for dashboard stats
      const data = await fetchWithCache(
        `dashboard-stats-${userProfile?.companyId || 'default'}`,
        async () => {
          return await makeAuthenticatedRequest('/stats', accessToken, { method: 'GET' })
        },
        2 * 60 * 1000 // 2 minutes cache
      )
      
      if (data.success) {
        setStats(data.stats)
        setLastUpdated(new Date())
      } else {
        console.error('Error fetching stats:', data.error)
        setError(data.error || 'Error al cargar estadísticas')
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      setError(error instanceof Error ? error.message : 'Error al cargar estadísticas')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    // Clear cache and fetch fresh data
    cache.invalidatePattern('dashboard-stats')
    fetchStats()
  }

  if (loading) {
    return (
      <div className="p-4 md:p-5">
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl mb-2">
            {userProfile?.name ? (
              <>
                {getGreeting()}, {getFirstName(userProfile.name)}! 👋
              </>
            ) : (
              'Dashboard'
            )}
          </h2>
          <p style={{ fontSize: 'var(--text-small)', color: 'var(--text-tertiary)' }}>Vista general de tu negocio</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10" style={{ borderBottom: '2px solid var(--accent-400)' }}></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 md:p-5 space-y-4">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl mb-2">
            {userProfile?.name ? (
              <>
                {getGreeting()}, {getFirstName(userProfile.name)}! 👋
              </>
            ) : (
              'Dashboard'
            )}
          </h2>
          <p style={{ fontSize: 'var(--text-small)', color: 'var(--text-tertiary)' }}>Vista general de tu negocio</p>
        </div>
        
        <ServerStatus accessToken={accessToken} />
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Un tono por KPI, tomado de los estados de OT — no colores sueltos.
  const cards = [
    {
      title: 'Productos',
      value: stats?.totalProducts || 0,
      icon: Package,
      tone: 'accent' as const,
      subtitle: 'En inventario',
      onClick: () => onNavigate?.('products')
    },
    {
      title: 'Reparaciones activas',
      value: stats?.activeRepairs || 0,
      icon: Wrench,
      tone: 'repair' as const,
      subtitle: `${stats?.totalRepairs || 0} en total`,
      onClick: () => onNavigate?.('repairs')
    },
    {
      title: 'Ventas totales',
      value: stats?.totalSales || 0,
      icon: DollarSign,
      tone: 'ready' as const,
      subtitle: 'Transacciones realizadas',
      onClick: () => onNavigate?.('sales')
    },
    {
      title: 'Clientes',
      value: stats?.totalCustomers || 0,
      icon: Users,
      tone: 'diagnosis' as const,
      subtitle: 'Registrados',
      onClick: () => onNavigate?.('customers')
    }
  ]

  return (
    <div className="p-4 md:p-5">
      <div className="mb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              className="mb-1.5"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-h2)',
                lineHeight: 'var(--lh-h2)',
                letterSpacing: 'var(--tr-h2)',
                fontWeight: 'var(--fw-bold)',
              }}
            >
              {userProfile?.name ? (
                <>
                  {getGreeting()}, {getFirstName(userProfile.name)}! 👋
                </>
          ) : (
            'Dashboard'
          )}
            </h2>
            <div
              className="flex flex-wrap items-center gap-3"
              style={{ fontSize: 'var(--text-small)', color: 'var(--text-tertiary)' }}
            >
              <p style={{ margin: 0, fontSize: 'inherit' }}>Aquí tienes un resumen de tu negocio</p>
              {lastUpdated && (
                <span className="oryon-tabular" style={{ fontSize: 'var(--text-mono-sm)' }}>
                  · Actualizado {lastUpdated.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Actualizando...' : 'Actualizar'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {cards.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            icon={card.icon}
            tone={card.tone}
            subtitle={card.subtitle}
            onClick={card.onClick}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        <RevenueCard accessToken={accessToken} />

        {(stats?.lowStock || 0) > 0 ? (
          <StatCard
            title="Alertas de stock"
            value={stats?.lowStock || 0}
            icon={AlertCircle}
            tone="danger"
            subtitle="Productos requieren atención"
            onClick={() => setLowStockDialogOpen(true)}
          />
        ) : (
          <RepairsProgress accessToken={accessToken} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        <RecentActivity accessToken={accessToken} />
        {(stats?.lowStock || 0) > 0 && (
          <RepairsProgress accessToken={accessToken} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-3">
        <SalesChart accessToken={accessToken} />
      </div>

      <LowStockDialog
        open={lowStockDialogOpen}
        onOpenChange={setLowStockDialogOpen}
        accessToken={accessToken}
        onStockUpdated={fetchStats}
      />
    </div>
  )
}
