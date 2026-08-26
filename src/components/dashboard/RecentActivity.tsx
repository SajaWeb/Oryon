import { useEffect, useState } from 'react'
import { ReceiptText, Wrench } from 'lucide-react'
import { projectId } from '../../utils/supabase/info'
import { Card, DataTable, EmptyState, Loading, StatusBadge, normalizeState } from '../oryon'
import { useShell } from '../layout/AppShell'
import { statusLabels } from '../repairs/constants'

/**
 * Actividad reciente. En escritorio es una tabla (hora · operación · referencia · monto),
 * en móvil una línea de tiempo con chip de icono por tipo de operación — así lo separan los
 * dos documentos de diseño.
 */
interface Activity {
  id: string
  type: 'repair' | 'sale'
  timestamp: string
  /** Número de OT o de factura. */
  orderNumber?: number | string
  status?: string
  device?: string
  problem?: string
  customerName?: string
  itemCount?: number
  amount?: number
  /** true en las OT: el monto es el presupuesto, no dinero cobrado. */
  estimated?: boolean
  /** Respaldo para respuestas del servidor anteriores a los campos de arriba. */
  title?: string
  subtitle?: string
}

const money = (n: number) => `$${Number(n).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`

/** Qué operación es. En una OT lo que importa es en qué punto está. */
function operationLabel(a: Activity): string {
  if (a.orderNumber === undefined) return a.title || (a.type === 'sale' ? 'Venta' : 'Orden de trabajo')
  return a.type === 'sale' ? `Venta #${a.orderNumber}` : `OT #${a.orderNumber}`
}

/** `deviceType` se guarda en minúscula ("celular"), y encabeza la referencia. */
const capitalize = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t)

/** Referencia: qué equipo entró y por qué, o a quién se le vendió. */
function referenceLabel(a: Activity): string {
  if (a.type === 'repair') {
    const partes = [a.device ? capitalize(a.device) : '', a.problem].filter(Boolean)
    return partes.length ? partes.join(' · ') : a.subtitle || '—'
  }
  const unidades = a.itemCount
  const detalle = unidades === undefined ? '' : `${unidades} ${unidades === 1 ? 'producto' : 'productos'}`
  const partes = [a.customerName, detalle].filter(Boolean)
  return partes.length ? partes.join(' · ') : a.subtitle || '—'
}

/** Hora corta para la tabla; en el taller la fecha del día se da por supuesta. */
function shortTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const sameDay = d.toDateString() === new Date().toDateString()
  return sameDay
    ? d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
    : d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' })
}

/**
 * El monto, distinguiendo lo cobrado de lo presupuestado.
 *
 * Una OT sin facturar lleva su estimado, y va rotulado: en una lista donde las
 * ventas son dinero real, una cifra pelada se lee como venta cerrada.
 */
function Amount({ activity }: { activity: Activity }) {
  if (!activity.amount) {
    return <span style={{ color: 'var(--text-disabled)' }}>—</span>
  }
  if (!activity.estimated) {
    return <>{money(activity.amount)}</>
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, color: 'var(--text-tertiary)' }}>
      {money(activity.amount)}
      <span
        style={{
          fontFamily: 'var(--font-mono-display)',
          fontSize: 'var(--text-caption)',
          letterSpacing: 'var(--tr-caption)',
          textTransform: 'uppercase',
          color: 'var(--text-disabled)',
        }}
      >
        estimado
      </span>
    </span>
  )
}

export function RecentActivity({ accessToken }: { accessToken: string }) {
  const { isMobile } = useShell()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const fetchRecentActivity = async () => {
      try {
        if (!accessToken) return
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/stats/recent-activity`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        )
        if (!response.ok) {
          console.error('Recent activity API error:', response.status)
          return
        }
        const data = await response.json()
        if (!cancelled && data.success) setActivities(data.activities || [])
      } catch (error) {
        console.error('Error fetching recent activity:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchRecentActivity()
    return () => {
      cancelled = true
    }
  }, [accessToken])

  const subtitle = loading
    ? 'Cargando…'
    : `Últimas ${activities.length} ${activities.length === 1 ? 'operación registrada' : 'operaciones registradas'}`

  if (loading) {
    return (
      <Card title="Actividad reciente" subtitle={subtitle}>
        <Loading width={80} minHeight={168} />
      </Card>
    )
  }

  if (activities.length === 0) {
    return (
      <Card title="Actividad reciente">
        <EmptyState
          icon={Wrench}
          title="Sin movimientos"
          description="Aún no se registran operaciones. Aparecerán aquí en cuanto se cree una OT o una venta."
        />
      </Card>
    )
  }

  if (isMobile) {
    return (
      <Card title="Actividad reciente" subtitle={subtitle}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {activities.map((a, i) => {
            const sale = a.type === 'sale'
            const Icon = sale ? ReceiptText : Wrench
            const tone = sale ? 'var(--success)' : 'var(--warning)'
            const bg = sale ? 'var(--success-subtle)' : 'var(--warning-subtle)'
            return (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  gap: 11,
                  padding: '9px 0',
                  borderBottom:
                    i === activities.length - 1 ? 'none' : 'var(--border-width) solid var(--border-subtle)',
                }}
              >
                <span
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    flex: '0 0 auto',
                    width: 26,
                    height: 26,
                    background: bg,
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <Icon size={13} color={tone} strokeWidth={1.8} />
                </span>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                      fontSize: 'var(--text-body)',
                      color: 'var(--text-primary)',
                      textWrap: 'pretty',
                    }}
                  >
                    {operationLabel(a)}
                    {a.type === 'repair' && a.status && (
                      <StatusBadge status={normalizeState(a.status)} label={statusLabels[a.status]} size="sm" />
                    )}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--text-mono-sm)',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {referenceLabel(a)}
                  </span>
                  {Boolean(a.amount) && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)' }}>
                      <Amount activity={a} />
                    </span>
                  )}
                </div>
                <span
                  style={{
                    flex: '0 0 auto',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-mono-sm)',
                    color: 'var(--text-disabled)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {shortTime(a.timestamp)}
                </span>
              </div>
            )
          })}
        </div>
      </Card>
    )
  }

  return (
    <Card padding={0} title="Actividad reciente" subtitle={subtitle}>
      <DataTable
        dense
        emptyMessage="Sin movimientos registrados."
        rows={activities.map((a) => ({ ...a, time: shortTime(a.timestamp) }))}
        columns={[
          { key: 'time', label: 'Hora', mono: true, width: 80 },
          {
            key: 'operation',
            label: 'Operación',
            /* En una OT el estado es la información: antes esta columna mostraba
               `deviceType`, o sea la categoría del aparato ("Celular"). */
            render: (a: Activity) => (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{ whiteSpace: 'nowrap' }}>{operationLabel(a)}</span>
                {a.type === 'repair' && a.status && (
                  <StatusBadge
                    status={normalizeState(a.status)}
                    label={statusLabels[a.status]}
                    size="sm"
                  />
                )}
              </span>
            ),
          },
          {
            key: 'reference',
            label: 'Referencia',
            muted: true,
            hideOnCompact: true,
            render: (a: Activity) => referenceLabel(a),
          },
          {
            key: 'amount',
            label: 'Monto',
            mono: true,
            align: 'right',
            render: (a: Activity) => <Amount activity={a} />,
          },
        ]}
      />
    </Card>
  )
}
