import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { projectId } from '../../utils/supabase/info'
import { fetchWithCache } from '../../utils/cache'
import { Card } from '../oryon'
import { useShell } from '../layout/AppShell'
import { useChartColors } from './useChartColors'

/**
 * Ingresos totales — la tarjeta grande del panel.
 *
 * El diseño la define como cifra enorme en Archivo + delta contra el período anterior +
 * área de tendencia, con un segmentado 7d/30d/90d. Antes esta tarjeta pedía agregados a
 * `/stats/revenue`, que no devuelve serie temporal: no había forma de dibujar la tendencia
 * sin inventarla. Ahora deriva todo de `/sales` (mismo caché que el resto del panel), así
 * el total, el delta y la curva salen del mismo conjunto de datos y no pueden contradecirse.
 */
const WINDOWS = [
  { id: '7', label: '7d', days: 7, sublabel: 'vs 7 días previos' },
  { id: '30', label: '30d', days: 30, sublabel: 'vs 30 días previos' },
  { id: '90', label: '90d', days: 90, sublabel: 'vs 90 días previos' },
] as const

type WindowId = (typeof WINDOWS)[number]['id']

interface Sale {
  createdAt: string
  total?: number
  status?: string
}

const money = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

/** Formato compacto para la cifra grande: $18,45 M no rompe la caja a 390px. */
function moneyShort(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2).replace('.', ',')} M`
  if (n >= 1_000) return `$${Math.round(n / 1000)} K`
  return money(n)
}

function startOfDay(d: Date) {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

export function RevenueCard({ accessToken }: { accessToken: string }) {
  const { isMobile, compact } = useShell()
  const c = useChartColors()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [windowId, setWindowId] = useState<WindowId>('30')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        if (!accessToken) return
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
        console.error('Error fetching revenue series:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [accessToken])

  const win = WINDOWS.find((w) => w.id === windowId)!

  const { total, count, delta, deltaTone, series } = useMemo(() => {
    const today = startOfDay(new Date())
    const dayMs = 86400000
    const from = today.getTime() - (win.days - 1) * dayMs
    const prevFrom = from - win.days * dayMs

    const buckets = new Map<number, number>()
    for (let i = 0; i < win.days; i++) buckets.set(from + i * dayMs, 0)

    let current = 0
    let previous = 0
    let currentCount = 0

    for (const sale of sales) {
      const t = startOfDay(new Date(sale.createdAt)).getTime()
      if (Number.isNaN(t)) continue
      const amount = sale.total || 0
      if (t >= from) {
        current += amount
        currentCount++
        buckets.set(t, (buckets.get(t) || 0) + amount)
      } else if (t >= prevFrom) {
        previous += amount
      }
    }

    const growth = previous > 0 ? ((current - previous) / previous) * 100 : null

    return {
      total: current,
      count: currentCount,
      delta:
        growth === null
          ? null
          : `${growth >= 0 ? '+' : '−'}${Math.abs(growth).toFixed(1).replace('.', ',')}%`,
      deltaTone: growth === null ? 'neutral' : growth >= 0 ? 'up' : 'down',
      series: [...buckets.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([t, v]) => ({
          t,
          label: new Date(t).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
          ingresos: Math.round(v),
        })),
    }
  }, [sales, win.days])

  const deltaColor =
    deltaTone === 'up' ? 'var(--success)' : deltaTone === 'down' ? 'var(--danger)' : 'var(--text-tertiary)'
  const DeltaIcon = deltaTone === 'down' ? TrendingDown : TrendingUp

  return (
    <Card
      title="Ingresos totales"
      subtitle={loading ? 'Cargando…' : `${count} ${count === 1 ? 'venta' : 'ventas'} en el período`}
      actions={
        <div
          style={{
            display: 'flex',
            border: 'var(--border-width) solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          {WINDOWS.map((w) => {
            const active = w.id === windowId
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => setWindowId(w.id)}
                aria-pressed={active}
                style={{
                  padding: '5px 9px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-mono-sm)',
                  fontWeight: 'var(--fw-medium)',
                  color: active ? 'var(--text-accent)' : 'var(--text-secondary)',
                  background: active ? 'var(--accent-subtle)' : 'transparent',
                  border: 0,
                  cursor: 'pointer',
                  transition: 'background var(--duration-fast) var(--ease)',
                }}
              >
                {w.label}
              </button>
            )
          })}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: isMobile ? 'var(--text-h2)' : 'var(--text-h1)',
              lineHeight: isMobile ? 'var(--lh-h2)' : 'var(--lh-h1)',
              letterSpacing: isMobile ? 'var(--tr-h2)' : 'var(--tr-h1)',
              fontWeight: 'var(--fw-semibold)',
              color: 'var(--text-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}
            title={money(total)}
          >
            {isMobile ? moneyShort(total) : money(total)}
          </span>
          {delta && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-mono-sm)',
                fontWeight: 'var(--fw-medium)',
                color: deltaColor,
              }}
            >
              <DeltaIcon size={12} strokeWidth={2} />
              {delta}
            </span>
          )}
          <span style={{ fontSize: 'var(--text-small)', color: 'var(--text-tertiary)' }}>{win.sublabel}</span>
        </div>

        <div style={{ height: isMobile ? 112 : compact ? 140 : 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
              <defs>
                {/* El sistema prohíbe gradientes decorativos; este es el relleno plano
                    --accent-subtle expresado como un solo tono, sin degradado. */}
                <linearGradient id="oryon-revenue-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c.series1} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={c.series1} stopOpacity={0.18} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" hide />
              <YAxis hide domain={[0, 'dataMax']} />
              <Area
                type="linear"
                dataKey="ingresos"
                stroke={c.series1}
                strokeWidth={2}
                fill="url(#oryon-revenue-fill)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {series.length > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-mono-sm)',
              color: 'var(--text-disabled)',
            }}
          >
            <span>{series[0].label}</span>
            {!isMobile && series.length > 2 && <span>{series[Math.floor(series.length / 2)].label}</span>}
            <span>{series[series.length - 1].label}</span>
          </div>
        )}
      </div>
    </Card>
  )
}
