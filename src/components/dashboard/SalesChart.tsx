import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { projectId } from '../../utils/supabase/info'
import { fetchWithCache } from '../../utils/cache'
import { Card, EmptyState } from '../oryon'
import { ReceiptText } from 'lucide-react'
import { useShell } from '../layout/AppShell'
import { useChartColors } from './useChartColors'

/**
 * Volumen de ventas. En móvil, los últimos 7 días (así lo pide el artboard: barras cortas,
 * una por día, con el número encima). En escritorio, los últimos 6 meses, que es el rango
 * con el que se mira el negocio desde el mostrador.
 *
 * El tooltip anterior era `bg-white` fijo: ilegible sobre grafito. Ahora usa superficies del
 * sistema y sigue al tema.
 */
interface Sale {
  createdAt: string
  total?: number
  status?: string
}

const money = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

export function SalesChart({ accessToken }: { accessToken: string }) {
  const { isMobile } = useShell()
  const c = useChartColors()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const data = await fetchWithCache(
          'dashboard-sales-series',
          async () => {
            const res = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/sales`,
              { headers: { Authorization: `Bearer ${accessToken}` } },
            )
            return res.json()
          },
          2 * 60 * 1000,
        )
        if (!cancelled && data?.success) {
          setSales(data.sales.map((s: string) => JSON.parse(s)).filter((s: Sale) => s.status !== 'cancelled'))
        }
      } catch (error) {
        console.error('Error fetching sales data:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [accessToken])

  const data = useMemo(() => {
    const now = new Date()

    if (isMobile) {
      const dayMs = 86400000
      const today = new Date(now)
      today.setHours(0, 0, 0, 0)
      const buckets = new Map<number, { ventas: number; ingresos: number }>()
      for (let i = 6; i >= 0; i--) buckets.set(today.getTime() - i * dayMs, { ventas: 0, ingresos: 0 })

      for (const sale of sales) {
        const d = new Date(sale.createdAt)
        d.setHours(0, 0, 0, 0)
        const slot = buckets.get(d.getTime())
        if (slot) {
          slot.ventas++
          slot.ingresos += sale.total || 0
        }
      }

      return [...buckets.entries()].map(([t, v]) => ({
        label: String(new Date(t).getDate()),
        ...v,
      }))
    }

    const months = new Map<string, { ventas: number; ingresos: number }>()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.set(d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }), { ventas: 0, ingresos: 0 })
    }
    for (const sale of sales) {
      const key = new Date(sale.createdAt).toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })
      const slot = months.get(key)
      if (slot) {
        slot.ventas++
        slot.ingresos += sale.total || 0
      }
    }
    return [...months.entries()].map(([label, v]) => ({ label, ...v }))
  }, [sales, isMobile])

  const hasData = data.some((d) => d.ventas > 0)

  if (!loading && !hasData) {
    return (
      <Card title={isMobile ? 'Ventas por día' : 'Ventas por mes'}>
        <EmptyState
          icon={ReceiptText}
          title="Sin ventas en el período"
          description="En cuanto se registre la primera factura aparecerá aquí el volumen por período."
        />
      </Card>
    )
  }

  return (
    <Card
      title={isMobile ? 'Ventas por día' : 'Ventas por mes'}
      subtitle={isMobile ? 'Últimos 7 días' : 'Últimos 6 meses'}
    >
      <div style={{ height: isMobile ? 140 : 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
            <CartesianGrid stroke={c.grid} strokeDasharray="2 5" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: c.grid }}
              tick={{ fill: c.axis, fontSize: 12, fontFamily: 'var(--font-mono)' }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: c.axis, fontSize: 12, fontFamily: 'var(--font-mono)' }}
            />
            <Tooltip
              cursor={{ fill: 'var(--surface-hover)' }}
              content={({ active, payload, label }: any) => {
                if (!active || !payload?.length) return null
                const row = payload[0].payload
                return (
                  <div
                    style={{
                      padding: '8px 10px',
                      background: 'var(--surface-raised)',
                      border: 'var(--border-width) solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-md)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 'var(--text-caption)',
                        letterSpacing: 'var(--tr-caption)',
                        textTransform: 'uppercase',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--text-mono)',
                        color: 'var(--text-primary)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {row.ventas} {row.ventas === 1 ? 'venta' : 'ventas'} · {money(row.ingresos)}
                    </div>
                  </div>
                )
              }}
            />
            <Bar dataKey="ventas" fill={c.series1} radius={[2, 2, 0, 0]} isAnimationActive={false} maxBarSize={44} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
