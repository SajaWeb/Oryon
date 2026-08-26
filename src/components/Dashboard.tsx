import { useEffect, useState } from 'react'
import { ChevronRight, Package, ReceiptText, TriangleAlert, Users, Wrench } from 'lucide-react'
import { Alert, Button, Card, EmptyState, Loading, MetricCard } from './oryon'
import { PageBody } from './layout/PageBody'
import { usePageHeader } from './layout/PageHeaderContext'
import { useShell } from './layout/AppShell'
import { RevenueCard } from './dashboard/RevenueCard'
import { LowStockDialog } from './dashboard/LowStockDialog'
import { RecentActivity } from './dashboard/RecentActivity'
import { RepairsProgress } from './dashboard/RepairsProgress'
import { SalesChart } from './dashboard/SalesChart'
import { ServerStatus } from './ServerStatus'
import { fetchWithCache, cache } from '../utils/cache'
import { makeAuthenticatedRequest } from '../utils/api'

/**
 * Panel del taller.
 *
 * Sigue los dos documentos de diseño, que ordenan la misma información de forma distinta:
 *
 *  escritorio/tablet → KPIs · alerta de stock · [ingresos 1.4fr | estado de OT 1fr] ·
 *                      actividad reciente · ventas por mes
 *  móvil            → KPIs 2×2 · ingresos · fila de alerta · estado de OT (barras) ·
 *                      ventas por día · actividad reciente
 *
 * El saludo por hora ya no se pinta aquí: viaja al header del shell vía `usePageHeader`,
 * que es donde el diseño pone el título de la vista.
 */
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

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

export function Dashboard({ accessToken, userProfile, onNavigate }: DashboardProps) {
  const { isMobile, compact } = useShell()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lowStockOpen, setLowStockOpen] = useState(false)

  const firstName = userProfile?.name?.split(' ')[0]

  const fetchStats = async (silent = false) => {
    try {
      silent ? setRefreshing(true) : setLoading(true)
      setError(null)

      if (!accessToken) throw new Error('No se pudo autenticar. Inicia sesión nuevamente.')

      const data = await fetchWithCache(
        `dashboard-stats-${userProfile?.companyId || 'default'}`,
        () => makeAuthenticatedRequest('/stats', accessToken, { method: 'GET' }),
        2 * 60 * 1000,
      )

      if (data.success) {
        setStats(data.stats)
      } else {
        setError(data.error || 'No se pudieron cargar las estadísticas')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las estadísticas')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(() => fetchStats(true), 5 * 60 * 1000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRefresh = () => {
    cache.invalidatePattern('dashboard-')
    fetchStats()
  }

  usePageHeader({
    title: firstName ? `${greeting()}, ${firstName}` : 'Dashboard',
    // El sello de hora lo pone el shell para todas las vistas por igual.
    subtitle: 'Resumen del negocio',
    eyebrow: 'Taller',
    onRefresh: handleRefresh,
    refreshing: refreshing || loading,
  })

  if (loading && !stats) {
    return (
      <PageBody>
        <Loading mode="screen" label="Preparando tu panel" />
      </PageBody>
    )
  }

  if (error) {
    return (
      <PageBody>
        <ServerStatus accessToken={accessToken} />
        <Card>
          <EmptyState
            variant="error"
            icon={TriangleAlert}
            title="No se pudo cargar el panel"
            description={error}
            action={<Button variant="primary" onClick={handleRefresh}>Reintentar</Button>}
          />
        </Card>
      </PageBody>
    )
  }

  const lowStock = stats?.lowStock || 0

  const kpis = [
    {
      label: 'Productos',
      value: stats?.totalProducts ?? 0,
      icon: Package,
      sublabel: 'En inventario',
      view: 'products',
    },
    {
      label: isMobile ? 'Reparac. activas' : 'Reparaciones activas',
      value: stats?.activeRepairs ?? 0,
      icon: Wrench,
      sublabel: `${stats?.totalRepairs ?? 0} en total`,
      view: 'repairs',
    },
    {
      label: 'Ventas totales',
      value: stats?.totalSales ?? 0,
      icon: ReceiptText,
      sublabel: 'Transacciones',
      view: 'sales',
    },
    {
      label: 'Clientes',
      value: stats?.totalCustomers ?? 0,
      icon: Users,
      sublabel: 'Registrados',
      view: 'customers',
    },
  ]

  const kpiGrid = (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${isMobile || compact ? 2 : 4},minmax(0,1fr))`,
        gap: 12,
      }}
    >
      {kpis.map((k) => (
        <MetricCard
          key={k.label}
          label={k.label}
          value={k.value}
          icon={k.icon}
          sublabel={k.sublabel}
          onClick={() => onNavigate?.(k.view)}
        />
      ))}
    </div>
  )

  /* ─────────────── MÓVIL ─────────────── */
  if (isMobile) {
    return (
      <>
        <PageBody gap={12}>
          {kpiGrid}
          <RevenueCard accessToken={accessToken} />

          {lowStock > 0 && (
            <button
              type="button"
              onClick={() => setLowStockOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '13px 14px',
                textAlign: 'left',
                background: 'var(--surface-card)',
                border: 'var(--border-width) solid var(--danger-subtle)',
                borderLeft: 'var(--border-width) solid var(--danger)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              <TriangleAlert size={18} color="var(--danger)" strokeWidth={1.7} style={{ flex: '0 0 auto' }} />
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono-display)',
                    fontSize: 'var(--text-caption)',
                    letterSpacing: 'var(--tr-caption)',
                    textTransform: 'uppercase',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  Alertas de stock
                </span>
                <span style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)' }}>
                  {lowStock} {lowStock === 1 ? 'producto requiere' : 'productos requieren'} atención
                </span>
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-h2)',
                  lineHeight: 'var(--lh-h2)',
                  letterSpacing: 'var(--tr-h2)',
                  fontWeight: 'var(--fw-semibold)',
                  color: 'var(--danger)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {lowStock}
              </span>
              <ChevronRight size={16} color="var(--text-tertiary)" strokeWidth={1.8} style={{ flex: '0 0 auto' }} />
            </button>
          )}

          <RepairsProgress accessToken={accessToken} />
          <SalesChart accessToken={accessToken} />
          <RecentActivity accessToken={accessToken} />
        </PageBody>

        <LowStockDialog
          open={lowStockOpen}
          onOpenChange={setLowStockOpen}
          accessToken={accessToken}
          onStockUpdated={fetchStats}
        />
      </>
    )
  }

  /* ─────────────── ESCRITORIO / TABLET ─────────────── */
  return (
    <>
      <PageBody>
        {kpiGrid}

        {lowStock > 0 && (
          <Alert
            variant="danger"
            title={`${lowStock} ${lowStock === 1 ? 'producto' : 'productos'} con stock bajo`}
          >
            Están en o por debajo del umbral configurado.{' '}
            <button
              type="button"
              onClick={() => setLowStockOpen(true)}
              style={{
                color: 'var(--text-accent)',
                background: 'transparent',
                border: 0,
                padding: 0,
                font: 'inherit',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Ver el detalle
            </button>
          </Alert>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: compact ? '1fr' : 'minmax(0,1.4fr) minmax(0,1fr)',
            gap: 12,
            alignItems: 'start',
          }}
        >
          <RevenueCard accessToken={accessToken} />
          <RepairsProgress accessToken={accessToken} />
        </div>

        <RecentActivity accessToken={accessToken} />
        <SalesChart accessToken={accessToken} />
      </PageBody>

      <LowStockDialog
        open={lowStockOpen}
        onOpenChange={setLowStockOpen}
        accessToken={accessToken}
        onStockUpdated={fetchStats}
      />
    </>
  )
}
