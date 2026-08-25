import { useEffect, useState } from 'react'
import { ReceiptText, Wrench } from 'lucide-react'
import { projectId } from '../../utils/supabase/info'
import { Card, DataTable, EmptyState } from '../oryon'
import { useShell } from '../layout/AppShell'

/**
 * Actividad reciente. En escritorio es una tabla (hora · operación · referencia · monto),
 * en móvil una línea de tiempo con chip de icono por tipo de operación — así lo separan los
 * dos documentos de diseño.
 */
interface Activity {
  id: string
  type: 'repair' | 'sale'
  title: string
  subtitle: string
  timestamp: string
  status?: string
  amount?: number
}

const money = (n: number) => `$${Number(n).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`

/** Hora corta para la tabla; en el taller la fecha del día se da por supuesta. */
function shortTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const sameDay = d.toDateString() === new Date().toDateString()
  return sameDay
    ? d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
    : d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' })
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

  if (!loading && activities.length === 0) {
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
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)', textWrap: 'pretty' }}>
                    {a.title}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--text-mono-sm)',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {a.subtitle}
                    {a.amount ? ` · ${money(a.amount)}` : ''}
                  </span>
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
        rows={activities.map((a) => ({
          ...a,
          time: shortTime(a.timestamp),
          amountF: a.amount ? money(a.amount) : '—',
        }))}
        columns={[
          { key: 'time', label: 'Hora', mono: true, width: 80 },
          { key: 'title', label: 'Operación' },
          { key: 'subtitle', label: 'Referencia', muted: true, hideOnCompact: true },
          { key: 'amountF', label: 'Monto', mono: true, align: 'right' },
        ]}
      />
    </Card>
  )
}
