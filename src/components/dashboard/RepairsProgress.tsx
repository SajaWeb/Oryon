import { useEffect, useState } from 'react'
import { projectId } from '../../utils/supabase/info'
import { Card, DataTable, StatusBadge, type OTState } from '../oryon'
import { useShell } from '../layout/AppShell'
import { statusLabels } from '../repairs/constants'

/**
 * Estado de reparaciones. Los dos documentos de diseño lo resuelven distinto y aquí se
 * respeta: en escritorio es una tabla densa (estado · órdenes · % ) porque compite con la
 * gráfica de ingresos por el mismo ancho; en móvil son barras de progreso, que a 390px se
 * leen de un vistazo sin scroll horizontal.
 */
interface RepairsProgressProps {
  accessToken: string
}

interface Bucket {
  id: string
  label: string
  ds: OTState
  count: number
}

const EMPTY = { received: 0, diagnosing: 0, waiting_parts: 0, repairing: 0, completed: 0 }

export function RepairsProgress({ accessToken }: RepairsProgressProps) {
  const { isMobile } = useShell()
  const [counts, setCounts] = useState(EMPTY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const fetchRepairStats = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/repairs`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        )
        const data = await response.json()
        if (cancelled || !data.success) return

        const repairs = data.repairs.map((r: string) => JSON.parse(r))
        const active = repairs.filter((r: any) => r.status !== 'delivered' && r.status !== 'cancelled')
        const by = (status: string) => active.filter((r: any) => r.status === status).length

        setCounts({
          received: by('received'),
          diagnosing: by('diagnosing'),
          waiting_parts: by('waiting_parts'),
          repairing: by('repairing'),
          completed: by('completed'),
        })
      } catch (error) {
        console.error('Error fetching repair stats:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchRepairStats()
    return () => {
      cancelled = true
    }
  }, [accessToken])

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  const buckets: Bucket[] = [
    { id: 'received', label: statusLabels.received, ds: 'cola', count: counts.received },
    { id: 'diagnosing', label: statusLabels.diagnosing, ds: 'diagnostico', count: counts.diagnosing },
    { id: 'waiting_parts', label: statusLabels.waiting_parts, ds: 'esperando', count: counts.waiting_parts },
    { id: 'repairing', label: statusLabels.repairing, ds: 'reparacion', count: counts.repairing },
    { id: 'completed', label: statusLabels.completed, ds: 'listo', count: counts.completed },
  ]

  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100))
  const subtitle = loading ? 'Cargando…' : `${total} ${total === 1 ? 'orden activa' : 'órdenes activas'}`

  if (isMobile) {
    return (
      <Card title="Estado de reparaciones" subtitle={subtitle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {buckets.map((b) => (
            <div key={b.id} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 'var(--text-small)', color: 'var(--text-secondary)' }}>{b.label}</span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-mono-sm)',
                    fontWeight: 'var(--fw-medium)',
                    color: 'var(--text-primary)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {b.count} ({pct(b.count)}%)
                </span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-sunken)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${pct(b.count)}%`,
                    height: '100%',
                    background: `var(--state-${dsToVar(b.ds)})`,
                    transition: 'width var(--duration) var(--ease)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card padding={0} title="Estado de reparaciones" subtitle={subtitle}>
      <DataTable
        dense
        rowKey="id"
        emptyMessage="Sin OT en cola · todas las órdenes están cerradas."
        rows={buckets.map((b) => ({ ...b, n: String(b.count), p: `${pct(b.count)}%` }))}
        columns={[
          { key: 'label', label: 'Estado', render: (r: any) => <StatusBadge status={r.ds} label={r.label} size="sm" /> },
          { key: 'n', label: 'Órdenes', mono: true, align: 'right' },
          { key: 'p', label: '%', mono: true, align: 'right', muted: true },
        ]}
      />
    </Card>
  )
}

/** Los estados del design system no comparten nombre con los custom properties de color. */
function dsToVar(ds: OTState): string {
  const map: Record<OTState, string> = {
    cola: 'queued',
    diagnostico: 'diagnosis',
    reparacion: 'repair',
    esperando: 'waiting',
    listo: 'ready',
    entregado: 'delivered',
    cancelado: 'cancelled',
  }
  return map[ds]
}
