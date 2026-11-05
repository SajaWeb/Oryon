import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Clock,
  Gift,
  PackageX,
  PhoneCall,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { projectId } from '../utils/supabase/info'
import {
  Alert,
  Badge,
  Card,
  DataTable,
  EmptyState,
  Loading,
  MetricCard,
  StatusBadge,
  Tabs,
  normalizeState,
  OT_STATES,
  type BadgeTone,
  type Column,
  type TabItem,
} from './oryon'
import { PageBody } from './layout/PageBody'
import { usePageHeader } from './layout/PageHeaderContext'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { useChartColors } from './dashboard/useChartColors'
import { useBusiness } from '../utils/BusinessContext'
import { cap, productCategoryLabel } from '../config/businessTypes'
import { statusLabels } from './repairs/constants'
import {
  ChartTooltip,
  FigureRow,
  HeroFigure,
  Legend,
  RankedBars,
  SegmentedBar,
  SegmentedControl,
  compactMoney,
  money,
  monoStyle,
  pct,
} from './reports/parts'

/**
 * Reportes.
 *
 * Cada pestaña responde UNA pregunta y la responde arriba, en grande:
 *   Ganancias  → ¿cuánto me quedó?
 *   Ventas     → ¿cuánto y qué vendí?
 *   Inventario → ¿qué tengo quieto?
 *   Órdenes    → ¿qué está esperando y cuánto tardo?
 *   Clientes   → ¿quién compra y a quién perdí?
 *
 * Todo con el sistema Oryon: tarjetas y tablas del sistema, cifras en mono,
 * un solo acento, sin gradientes ni emojis. Los gráficos leen sus colores de
 * useChartColors, que sigue al tema; el par ingresos/ganancia está validado
 * para daltonismo y contraste en oscuro y en claro.
 */

interface ReportsProps {
  accessToken: string
}

type Period = '7' | '30'

interface DayRow {
  key: string
  label: string
  ventas: number
  ingresos: number
  ganancia: number
  costo: number
}

/* "2026-11-05" se lee como medianoche UTC: en Colombia eso es el día anterior.
   A mediodía local la fecha no se corre. */
const dayLabel = (ymd: string) =>
  new Date(`${ymd}T12:00:00`)
    .toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
    .replace(' de ', ' ')
    .replace('.', '')

const count = (n: number) => Math.round(n || 0).toLocaleString('es-CO')

export function Reports({ accessToken }: ReportsProps) {
  const { isMobile, compact } = useBreakpoint()
  const { profile } = useBusiness()
  const chart = useChartColors()

  const [tab, setTab] = useState('profits')
  // En teléfono, 30 barras por día no se leen: se arranca en la semana.
  const [period, setPeriod] = useState<Period>(() => (isMobile ? '7' : '30'))
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [failed, setFailed] = useState(false)
  const [reports, setReports] = useState<any>(null)

  const fetchReports = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/reports`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await response.json()
      if (data.success) {
        setReports(data.reports)
        setFailed(false)
      } else {
        setFailed(true)
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refresh = async () => {
    setRefreshing(true)
    await fetchReports()
    setRefreshing(false)
  }

  usePageHeader({
    title: 'Reportes',
    subtitle: 'Lo que dicen tus números, sin hojas de cálculo',
    eyebrow: 'Análisis',
    onRefresh: refresh,
    refreshing: refreshing || loading,
  })

  /* ── Datos derivados ─────────────────────────────────────────────── */

  const allDays: DayRow[] = useMemo(() => {
    const entries = Object.entries(reports?.salesByDay ?? {}) as Array<[string, any]>
    return entries
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        key: date,
        label: dayLabel(date),
        ventas: v.count || 0,
        ingresos: v.revenue || 0,
        ganancia: v.profit || 0,
        costo: (v.revenue || 0) - (v.profit || 0),
      }))
  }, [reports])

  const days = useMemo(() => allDays.slice(-Number(period)), [allDays, period])

  const totals = useMemo(() => {
    const revenue = days.reduce((s, d) => s + d.ingresos, 0)
    const profit = days.reduce((s, d) => s + d.ganancia, 0)
    const sales = days.reduce((s, d) => s + d.ventas, 0)
    const cost = revenue - profit
    const best = days.reduce<DayRow | null>((b, d) => (!b || d.ingresos > b.ingresos ? d : b), null)
    return {
      revenue,
      profit,
      cost,
      sales,
      margin: revenue > 0 ? (profit / revenue) * 100 : 0,
      ticket: sales > 0 ? revenue / sales : 0,
      profitPerSale: sales > 0 ? profit / sales : 0,
      roi: cost > 0 ? (profit / cost) * 100 : 0,
      best: best && best.ingresos > 0 ? best : null,
    }
  }, [days])

  if (loading) {
    return (
      <PageBody>
        <Loading mode="screen" label="Reuniendo tus cifras" />
      </PageBody>
    )
  }

  if (failed || !reports) {
    return (
      <PageBody>
        <Card padding={0}>
          <EmptyState
            variant="error"
            icon={ReceiptText}
            title="No se pudieron cargar los reportes"
            description="Revisa la conexión y vuelve a intentarlo con el botón de actualizar."
          />
        </Card>
      </PageBody>
    )
  }

  const monthly = reports.monthlyComparison
  const growth: number = monthly?.growth ?? 0
  const periodLabel = period === '7' ? 'últimos 7 días' : 'últimos 30 días'
  const cols = (n: number) => `repeat(${isMobile ? 1 : compact ? Math.min(n, 2) : n}, minmax(0, 1fr))`
  const grid = (n: number, gap = 12) => ({ display: 'grid', gridTemplateColumns: cols(n), gap }) as const

  const tabs: TabItem[] = [
    { id: 'profits', label: 'Ganancias' },
    { id: 'sales', label: 'Ventas' },
    { id: 'inventory', label: 'Inventario' },
    { id: 'repairs', label: profile.vocab.orders },
    { id: 'customers', label: 'Clientes' },
  ]
  const usesPeriod = tab === 'profits' || tab === 'sales'

  /* Ejes del sistema: mono, tinta terciaria, sin líneas de tick. */
  const axisTick = { fill: chart.axis, fontSize: 11, fontFamily: 'var(--font-mono)' }
  const xAxisProps = {
    dataKey: 'label',
    tickLine: false,
    axisLine: { stroke: chart.grid },
    tick: axisTick,
    interval: 'preserveStartEnd' as const,
    minTickGap: 18,
  }

  return (
    <PageBody>
      {/* ── Mes contra mes: el contexto de todo lo demás ─────────────── */}
      {monthly && (
        <div style={grid(3)}>
          <MetricCard
            label="Este mes"
            value={money(monthly.thisMonth.revenue)}
            icon={CalendarDays}
            sublabel={`${count(monthly.thisMonth.count)} ${monthly.thisMonth.count === 1 ? 'venta' : 'ventas'}`}
          />
          <MetricCard
            label="Mes anterior"
            value={money(monthly.lastMonth.revenue)}
            icon={CalendarDays}
            sublabel={`${count(monthly.lastMonth.count)} ${monthly.lastMonth.count === 1 ? 'venta' : 'ventas'}`}
          />
          <MetricCard
            label="Crecimiento"
            value={`${growth >= 0 ? '+' : '−'}${pct(Math.abs(growth))}`}
            icon={growth >= 0 ? TrendingUp : TrendingDown}
            delta={growth >= 0 ? 'Sube' : 'Baja'}
            deltaTone={growth > 0 ? 'up' : growth < 0 ? 'down' : 'neutral'}
            sublabel="frente al mes anterior"
          />
        </div>
      )}

      <Tabs items={tabs} value={tab} onChange={setTab} />

      {/* Un solo filtro, encima de lo que filtra. */}
      {usesPeriod && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--text-small)', color: 'var(--text-tertiary)' }}>
            Ventas cobradas y a crédito, sin las anuladas · {periodLabel}
          </span>
          <SegmentedControl<Period>
            label="Período"
            value={period}
            onChange={setPeriod}
            options={[
              { value: '7', label: '7 días' },
              { value: '30', label: '30 días' },
            ]}
          />
        </div>
      )}

      {tab === 'profits' && (
        <ProfitsTab
          days={days}
          totals={totals}
          periodLabel={periodLabel}
          chart={chart}
          xAxisProps={xAxisProps}
          axisTick={axisTick}
          grid={grid}
          isMobile={isMobile}
        />
      )}

      {tab === 'sales' && (
        <SalesTab reports={reports} days={days} totals={totals} chart={chart} xAxisProps={xAxisProps} axisTick={axisTick} grid={grid} isMobile={isMobile} />
      )}

      {tab === 'inventory' && <InventoryTab reports={reports} grid={grid} compact={compact || isMobile} />}

      {tab === 'repairs' && <RepairsTab reports={reports} grid={grid} compact={compact || isMobile} />}

      {tab === 'customers' && <CustomersTab reports={reports} grid={grid} compact={compact || isMobile} />}
    </PageBody>
  )
}

/* ══════════════════════════ Ganancias ══════════════════════════ */

function marginRead(margin: number): { tone: BadgeTone; label: string; variant: 'success' | 'warning' | 'danger'; title: string; body: string } {
  if (margin >= 30)
    return {
      tone: 'success',
      label: 'Excelente',
      variant: 'success',
      title: 'Margen saludable',
      body: 'Tu margen está por encima del 30%. Mantén el ritmo y amplía lo que más deja.',
    }
  if (margin >= 20)
    return {
      tone: 'warning',
      label: 'Aceptable',
      variant: 'warning',
      title: 'Margen aceptable',
      body: 'Hay espacio para mejorar. Revisa qué productos y servicios dejan menos y ajusta su precio.',
    }
  return {
    tone: 'danger',
    label: 'Bajo',
    variant: 'danger',
    title: 'Margen bajo',
    body: 'Menos del 20% de cada venta se queda en el negocio. Revisa precios de venta y costos de compra.',
  }
}

function ProfitsTab({ days, totals, periodLabel, chart, xAxisProps, axisTick, grid, isMobile }: any) {
  const hasData = totals.revenue > 0
  const read = marginRead(totals.margin)
  const losing = hasData && totals.profit <= 0

  if (!hasData) {
    return (
      <Card padding={0}>
        <EmptyState icon={Wallet} title={`Sin ventas en los ${periodLabel}`} description="En cuanto se cobre la primera venta verás aquí cuánto te queda de cada peso." />
      </Card>
    )
  }

  const per100 = Math.round(Math.max(0, totals.margin))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'minmax(0,1.6fr) minmax(0,1fr)', gap: 12 }}>
        <Card padding={isMobile ? 16 : 24} bodyStyle={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
          <HeroFigure
            eyebrow={`Ganancia neta · ${periodLabel}`}
            value={money(totals.profit)}
            tone={losing ? 'danger' : 'default'}
            aside={
              <Badge tone={read.tone} dot>
                Margen {pct(totals.margin)} · {read.label}
              </Badge>
            }
          >
            <SegmentedBar
              segments={[
                { key: 'cost', label: 'Costo de mercancía', value: totals.cost, color: chart.neutral },
                { key: 'profit', label: 'Ganancia', value: Math.max(0, totals.profit), color: chart.profit },
              ]}
            />
            <p style={{ margin: 0, fontSize: 'var(--text-small)', color: 'var(--text-secondary)', textWrap: 'pretty' }}>
              De cada <span style={monoStyle}>$100</span> que vendes, te quedan <span style={{ ...monoStyle, color: 'var(--text-primary)' }}>${per100}</span>.
            </p>
          </HeroFigure>

          {/* La lectura del margen va pegada a la cifra que explica. */}
          <div style={{ marginTop: 'auto' }}>
            {losing ? (
              <Alert variant="danger" title="No estás generando ganancia">
                Lo vendido no cubre lo que costó. Revisa que los costos de tus productos estén bien registrados y que los precios de
                venta los cubran.
              </Alert>
            ) : (
              <Alert variant={read.variant} title={read.title}>
                {read.body}
              </Alert>
            )}
          </div>
        </Card>

        <Card title="Desglose" subtitle={cap(periodLabel)}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <FigureRow label="Ingresos" value={money(totals.revenue)} hint={`${count(totals.sales)} ventas`} />
            <FigureRow label="Costo de mercancía" value={`−${money(totals.cost)}`} hint={`${pct(totals.revenue > 0 ? (totals.cost / totals.revenue) * 100 : 0)} de lo vendido`} />
            <FigureRow label="Ganancia neta" value={money(totals.profit)} strong />
            <FigureRow label="Ganancia por venta" value={money(totals.profitPerSale)} />
            <FigureRow label="Retorno sobre el costo" value={pct(totals.roi)} hint="Lo que ganas por cada peso invertido en mercancía" />
          </div>
        </Card>
      </div>

      <Card
        title="Ingresos y ganancia por día"
        subtitle="Pasa el cursor sobre un día para ver sus cifras"
        actions={
          !isMobile && (
            <Legend
              items={[
                { label: 'Ingresos', color: chart.revenue },
                { label: 'Ganancia', color: chart.profit },
              ]}
            />
          )
        }
      >
        {isMobile && (
          <div style={{ marginBottom: 10 }}>
            <Legend
              items={[
                { label: 'Ingresos', color: chart.revenue },
                { label: 'Ganancia', color: chart.profit },
              ]}
            />
          </div>
        )}
        <div style={{ height: isMobile ? 220 : 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={days} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barGap={2} barCategoryGap={days.length > 14 ? '18%' : '28%'}>
              <CartesianGrid stroke={chart.grid} vertical={false} />
              <XAxis {...xAxisProps} />
              <YAxis tickLine={false} axisLine={false} tick={axisTick} tickFormatter={compactMoney} width={64} />
              <Tooltip cursor={{ fill: 'var(--surface-hover)' }} content={<ChartTooltip />} />
              <Bar dataKey="ingresos" name="Ingresos" fill={chart.revenue} radius={[2, 2, 0, 0]} maxBarSize={22} isAnimationActive={false} />
              <Bar dataKey="ganancia" name="Ganancia" fill={chart.profit} radius={[2, 2, 0, 0]} maxBarSize={22} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

        <Card title="Qué mover para ganar más" subtitle="Cuatro palancas, de la más rápida a la más lenta">
          <ol style={{ margin: 0, padding: 0, listStyle: 'none', ...grid(4, 16) }}>
            {[
              ['Precios', 'Sube el precio de lo que más se vende: la demanda ya está probada.'],
              ['Compras', 'Negocia descuentos por volumen en los repuestos que más rotan.'],
              ['Inventario', 'Liquida lo que lleva semanas quieto: es plata detenida.'],
              ['Costos ocultos', 'Registra el costo de cada producto; sin él, el margen se infla.'],
            ].map(([k, v], i) => (
              <li key={k} style={{ display: 'flex', gap: 12 }}>
                <span style={{ ...monoStyle, fontSize: 'var(--text-mono-sm)', color: 'var(--text-accent)', paddingTop: 2 }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 'var(--text-body)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-primary)' }}>{k}</span>
                  <span style={{ fontSize: 'var(--text-small)', color: 'var(--text-secondary)', textWrap: 'pretty' }}>{v}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
    </div>
  )
}

/* ══════════════════════════ Ventas ══════════════════════════ */

function SalesTab({ reports, days, totals, chart, xAxisProps, axisTick, grid, isMobile }: any) {
  const products = (reports.topProducts ?? []) as Array<{ name: string; quantity: number; revenue: number }>
  const methodsRaw = Object.entries(reports.paymentMethods ?? {}) as Array<[string, number]>
  const methodsTotal = methodsRaw.reduce((s, [, n]) => s + n, 0)
  const methods = methodsRaw
    .sort((a, b) => b[1] - a[1])
    .map(([name, n]) => ({ key: name, label: name, value: n, display: `${count(n)} · ${pct(methodsTotal ? (n / methodsTotal) * 100 : 0, 0)}` }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={grid(3)}>
        <MetricCard label="Ventas" value={count(totals.sales)} icon={ReceiptText} sublabel={`${money(totals.revenue)} facturados`} />
        <MetricCard label="Ticket promedio" value={money(totals.ticket)} icon={Wallet} sublabel="Lo que deja cada venta" />
        <MetricCard
          label="Mejor día"
          value={totals.best ? totals.best.label : '—'}
          icon={TrendingUp}
          sublabel={totals.best ? `${money(totals.best.ingresos)} · ${count(totals.best.ventas)} ventas` : 'Sin ventas en el período'}
        />
      </div>

      <Card title="Ventas por día" subtitle="Número de ventas; el cursor muestra lo facturado">
        {totals.sales === 0 ? (
          <EmptyState icon={ReceiptText} title="Sin ventas en el período" description="Cambia a 30 días o registra la primera venta." />
        ) : (
          <div style={{ height: isMobile ? 200 : 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barCategoryGap="24%">
                <CartesianGrid stroke={chart.grid} vertical={false} />
                <XAxis {...xAxisProps} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={axisTick} width={32} />
                <Tooltip
                  cursor={{ fill: 'var(--surface-hover)' }}
                  content={({ active, payload, label }: any) =>
                    active && payload?.length ? (
                      <ChartTooltip
                        active
                        label={label}
                        payload={[
                          { name: 'Ventas', color: chart.series1, dataKey: 'v', display: count(payload[0].payload.ventas) },
                          { name: 'Facturado', dataKey: 'i', display: money(payload[0].payload.ingresos) },
                        ]}
                      />
                    ) : null
                  }
                />
                <Bar dataKey="ventas" name="Ventas" fill={chart.series1} radius={[2, 2, 0, 0]} maxBarSize={28} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div style={grid(2)}>
        <Card title="Productos más vendidos" subtitle="Por ingresos, últimos 30 días">
          {products.length === 0 ? (
            <EmptyState icon={ReceiptText} title="Sin productos vendidos" description="Aquí aparece el top 10 en cuanto haya ventas." />
          ) : (
            <RankedBars
              items={products.map((p, i) => ({
                key: `${p.name}-${i}`,
                label: p.name,
                detail: `${count(p.quantity)} ${p.quantity === 1 ? 'unidad' : 'unidades'}`,
                value: p.revenue,
              }))}
            />
          )}
        </Card>

        <Card title="Métodos de pago" subtitle="Cuántas ventas entraron por cada uno">
          {methods.length === 0 ? (
            <EmptyState icon={Wallet} title="Sin pagos registrados" />
          ) : (
            <RankedBars items={methods} format={count} />
          )}
        </Card>
      </div>
    </div>
  )
}

/* ══════════════════════════ Inventario ══════════════════════════ */

function InventoryTab({ reports, grid, compact }: any) {
  const rows = ((reports.lowRotationProducts ?? []) as any[]).map((p, i) => ({ ...p, id: `${p.name}-${i}` }))
  const neverSold = rows.filter((p) => !p.lastSold).length
  const stuckValue = rows.reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.stock) || 0), 0)

  const columns: Column<any>[] = [
    { key: 'name', label: 'Producto', render: (p) => <span style={{ color: 'var(--text-primary)' }}>{p.name}</span> },
    { key: 'category', label: 'Categoría', muted: true, hideOnCompact: true, render: (p) => productCategoryLabel(p.category) || '—' },
    { key: 'stock', label: 'Stock', mono: true, align: 'right', width: 70, render: (p) => count(p.stock) },
    { key: 'price', label: 'Precio', mono: true, align: 'right', hideOnCompact: true, render: (p) => money(p.price) },
    {
      key: 'days',
      label: 'Sin venta',
      align: 'right',
      render: (p) =>
        p.lastSold ? (
          <Badge tone={p.daysWithoutSale > 60 ? 'danger' : 'warning'}>{count(p.daysWithoutSale)} días</Badge>
        ) : (
          <Badge tone="danger">Nunca</Badge>
        ),
    },
    {
      key: 'tip',
      label: 'Sugerencia',
      muted: true,
      hideOnCompact: true,
      render: (p) => `${Math.min(30, Math.max(5, Math.floor((p.daysWithoutSale || 60) / 2)))}% de descuento`,
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={grid(3)}>
        <MetricCard label="Baja rotación" value={count(rows.length)} icon={PackageX} sublabel="Sin venta en 30 días" />
        <MetricCard label="Nunca vendidos" value={count(neverSold)} icon={Gift} sublabel="Desde que se cargaron" />
        <MetricCard label="Valor detenido" value={money(stuckValue)} icon={Wallet} sublabel="A precio de venta" />
      </div>

      <Card title="Productos quietos" subtitle="Candidatos a promoción o liquidación" padding={0}>
        {rows.length === 0 ? (
          <EmptyState icon={PackageX} title="Todo rota bien" description="Ningún producto lleva más de 30 días sin venderse." />
        ) : (
          <DataTable columns={columns} rows={rows} compact={compact} />
        )}
      </Card>
    </div>
  )
}

/* ══════════════════════════ Órdenes ══════════════════════════ */

function RepairsTab({ reports, grid, compact }: any) {
  const { profile } = useBusiness()
  const plural = profile.vocab.assetPlural
  const ready = (reports.readyRepairs ?? []) as any[]
  const avg = Number(reports.avgRepairTime) || 0
  const byStatus = Object.entries(reports.repairsByStatus ?? {}) as Array<[string, number]>
  const active = byStatus.filter(([s]) => !['delivered', 'cancelled'].includes(s)).reduce((a, [, n]) => a + n, 0)
  const statusTotal = byStatus.reduce((a, [, n]) => a + n, 0)
  const common = (reports.commonRepairTypes ?? []) as Array<{ type: string; count: number }>
  const readyWord = profile.vocab.article === 'la' ? 'listas' : 'listos'

  /* El orden de los estados es el del flujo, no el del tamaño: así se lee el embudo. */
  const order = Object.keys(OT_STATES)
  const statusItems = byStatus
    .map(([s, n]) => ({ s, n, k: normalizeState(s) }))
    .sort((a, b) => order.indexOf(a.k) - order.indexOf(b.k))
    .map(({ s, n, k }) => ({
      key: s,
      label: <StatusBadge status={s} label={statusLabels[s] ?? OT_STATES[k].label} size="sm" />,
      value: n,
      display: `${count(n)} · ${pct(statusTotal ? (n / statusTotal) * 100 : 0, 0)}`,
      color: `var(${OT_STATES[k].v})`,
    }))

  const readyColumns: Column<any>[] = [
    { key: 'customerName', label: 'Cliente', render: (r) => <span style={{ color: 'var(--text-primary)' }}>{r.customerName}</span> },
    { key: 'device', label: cap(profile.vocab.asset), muted: true, hideOnCompact: true, render: (r) => [r.deviceBrand, r.deviceModel || r.deviceType].filter(Boolean).join(' ') || '—' },
    {
      key: 'daysWaiting',
      label: 'Esperando',
      align: 'right',
      render: (r) => (
        <Badge tone={r.daysWaiting > 7 ? 'danger' : r.daysWaiting > 3 ? 'warning' : 'neutral'}>
          {count(r.daysWaiting)} {r.daysWaiting === 1 ? 'día' : 'días'}
        </Badge>
      ),
    },
    { key: 'estimatedCost', label: 'Valor', mono: true, align: 'right', hideOnCompact: true, render: (r) => money(r.estimatedCost) },
    {
      key: 'phone',
      label: 'Llamar',
      align: 'right',
      render: (r) =>
        r.customerPhone ? (
          <a
            href={`tel:${r.customerPhone}`}
            aria-label={`Llamar a ${r.customerName}`}
            style={{ ...monoStyle, minHeight: compact ? 'var(--tap-target)' : undefined, minWidth: compact ? 'var(--tap-target)' : undefined, justifyContent: 'flex-end', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-mono-sm)', color: 'var(--text-accent)', textDecoration: 'none' }}
          >
            <PhoneCall size={compact ? 16 : 13} />
            {compact ? <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{r.customerPhone}</span> : r.customerPhone}
          </a>
        ) : (
          '—'
        ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={grid(3)}>
        <MetricCard
          label="Tiempo promedio"
          value={avg.toLocaleString('es-CO', { maximumFractionDigits: 1 })}
          unit="días"
          icon={Clock}
          delta={avg > 7 ? 'Por encima de 7 días' : undefined}
          deltaTone={avg > 7 ? 'down' : 'neutral'}
          sublabel="De la recepción a la entrega"
        />
        <MetricCard label={`${cap(plural)} ${readyWord}`} value={count(ready.length)} icon={PhoneCall} sublabel="Esperando que el cliente pase" />
        <MetricCard label="Órdenes en curso" value={count(active)} icon={Wrench} sublabel="Sin entregar ni cancelar" />
      </div>

      {ready.some((r) => r.daysWaiting > 7) && (
        <Alert variant="warning" title="Hay clientes que no han pasado por lo suyo">
          {ready.filter((r) => r.daysWaiting > 7).length} {ready.filter((r) => r.daysWaiting > 7).length === 1 ? 'orden lleva' : 'órdenes llevan'} más de una
          semana lista para entregar. Una llamada hoy libera espacio y cobra el saldo.
        </Alert>
      )}

      <Card title={`${cap(plural)} ${readyWord} para entregar`} subtitle="Las que más llevan esperando, primero" padding={0}>
        {ready.length === 0 ? (
          <EmptyState icon={PhoneCall} title="Nada pendiente de entrega" description={`Cuando ${profile.vocab.article === 'la' ? 'una' : 'un'} ${profile.vocab.asset} quede ${readyWord === 'listas' ? 'lista' : 'listo'}, aparecerá aquí con el teléfono del cliente.`} />
        ) : (
          <DataTable columns={readyColumns} rows={ready} compact={compact} />
        )}
      </Card>

      <div style={grid(2)}>
        <Card title="Órdenes por estado" subtitle="En el orden del flujo">
          {statusItems.length === 0 ? (
            <EmptyState icon={Wrench} title="Sin órdenes todavía" />
          ) : (
            <RankedBars items={statusItems} format={count} max={7} />
          )}
        </Card>

        <Card title="Lo que más llega" subtitle="Te dice qué repuestos tener a mano">
          {common.length === 0 ? (
            <EmptyState icon={Wrench} title="Aún no hay suficientes órdenes" />
          ) : (
            <RankedBars
              items={common.map((c, i) => ({ key: `${c.type}-${i}`, label: c.type, value: c.count, display: `${count(c.count)} ${c.count === 1 ? 'caso' : 'casos'}` }))}
              format={count}
            />
          )}
        </Card>
      </div>
    </div>
  )
}

/* ══════════════════════════ Clientes ══════════════════════════ */

function CustomersTab({ reports, grid, compact }: any) {
  const top = (reports.topCustomers ?? []) as any[]
  const inactive = ((reports.inactiveCustomers ?? []) as any[]).map((c, i) => ({ ...c, id: `${c.name}-${i}` }))
  const atRisk = inactive.reduce((s, c) => s + (Number(c.totalSpent) || 0), 0)
  const topTotal = top.reduce((s, c) => s + (Number(c.totalSpent) || 0), 0)

  const inactiveColumns: Column<any>[] = [
    { key: 'name', label: 'Cliente', render: (c) => <span style={{ color: 'var(--text-primary)' }}>{c.name}</span> },
    { key: 'totalSpent', label: 'Compró', mono: true, align: 'right', render: (c) => money(c.totalSpent) },
    {
      key: 'daysInactive',
      label: 'Sin volver',
      align: 'right',
      render: (c) => <Badge tone={c.daysInactive > 120 ? 'danger' : 'warning'}>{count(c.daysInactive)} días</Badge>,
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={grid(3)}>
        <MetricCard label="Mejores clientes" value={money(topTotal)} icon={Users} sublabel={`Lo que compraron tus ${count(top.length)} mejores`} />
        <MetricCard label="Clientes inactivos" value={count(inactive.length)} icon={Clock} sublabel="Más de 60 días sin volver" />
        <MetricCard label="Valor en riesgo" value={money(atRisk)} icon={TrendingDown} sublabel="Lo que gastaron los inactivos" />
      </div>

      {inactive.length > 0 && (
        <Alert variant="info" title="Oportunidad de reactivación">
          Un mensaje con un descuento del 15% a los inactivos que más gastaron suele traer de vuelta a varios. Empieza por los de arriba de la tabla.
        </Alert>
      )}

      <div style={grid(2)}>
        <Card title="Quién más compra" subtitle="Ventas y órdenes facturadas">
          {top.length === 0 ? (
            <EmptyState icon={Users} title="Sin clientes con compras" />
          ) : (
            <RankedBars
              items={top.map((c, i) => ({
                key: `${c.name}-${i}`,
                label: c.name,
                detail: [
                  `${count(c.purchaseCount)} ${c.purchaseCount === 1 ? 'compra' : 'compras'}`,
                  c.repairCount ? `${count(c.repairCount)} ${c.repairCount === 1 ? 'orden' : 'órdenes'}` : '',
                ]
                  .filter(Boolean)
                  .join(' · '),
                value: Number(c.totalSpent) || 0,
              }))}
            />
          )}
        </Card>

        <Card title="Clientes que no han vuelto" subtitle="Ordenados por lo que gastaron" padding={0}>
          {inactive.length === 0 ? (
            <EmptyState icon={Users} title="Todos tus clientes están activos" />
          ) : (
            <DataTable columns={inactiveColumns} rows={[...inactive].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))} compact={compact} />
          )}
        </Card>
      </div>
    </div>
  )
}

export default Reports
