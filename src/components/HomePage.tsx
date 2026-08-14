import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Building2,
  Camera,
  Check,
  ChartNoAxesColumn,
  Package,
  QrCode,
  ShieldUser,
  Smartphone,
  UserRound,
  Wrench,
  Zap,
} from 'lucide-react'
import { Logo } from './brand/Logo'
import {
  Column,
  DataTable,
  Eyebrow,
  Grid,
  GridCell,
  KeyValue,
  MetricCard,
  Section,
  StatusBadge,
} from './oryon'

interface HomePageProps {
  onNavigateToLogin: () => void
}

/* ===========================================================================
   Botones de la landing.
   No se usa el Button de shadcn: aquí el primario es relleno cian con tinta
   #04181D (11.6:1) y el secundario es superficie con borde de 1px, tal como
   los define el sistema de diseño.
   =========================================================================== */
function CTAButton({
  children,
  onClick,
  variant = 'secondary',
  size = 'md',
  iconRight,
  iconLeft,
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary'
  size?: 'md' | 'lg'
  iconRight?: React.ReactNode
  iconLeft?: React.ReactNode
}) {
  const primary = variant === 'primary'
  return (
    <button
      type="button"
      onClick={onClick}
      className="oryon-cta"
      data-variant={variant}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: size === 'lg' ? 8 : 6,
        height: size === 'lg' ? 'var(--control-height-lg)' : 'var(--control-height)',
        padding: size === 'lg' ? '0 18px' : '0 12px',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-body)',
        fontWeight: 'var(--fw-medium)',
        lineHeight: 1,
        color: primary ? 'var(--text-on-accent)' : 'var(--text-primary)',
        background: primary ? 'var(--accent-fill)' : 'var(--surface-card)',
        border: `1px solid ${primary ? 'var(--accent-fill)' : 'var(--border-default)'}`,
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'background var(--duration-fast) var(--ease), border-color var(--duration-fast) var(--ease)',
      }}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  )
}

/* =========================================================================== */
function SiteNav({ onNavigateToLogin }: { onNavigateToLogin: () => void }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const go = (id: string) => {
    const el = document.getElementById(id)
    if (el) window.scrollTo({ top: el.offsetTop - 70, behavior: 'smooth' })
  }

  const linkStyle: React.CSSProperties = {
    fontSize: 13,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono-display)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    background: 'none',
    border: 0,
    padding: 0,
  }

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: scrolled
          ? 'color-mix(in srgb, var(--alu-950) 92%, transparent)'
          : 'transparent',
        backdropFilter: scrolled ? 'blur(8px)' : undefined,
        borderBottom: `1px solid ${scrolled ? 'var(--border-subtle)' : 'transparent'}`,
        transition:
          'background var(--duration) var(--ease), border-color var(--duration) var(--ease)',
      }}
    >
      <div
        className="mx-auto flex items-center gap-6 px-6 py-4 md:px-10"
        style={{ maxWidth: 1240 }}
      >
        <Logo size={26} />

        <nav className="ml-4 hidden gap-6 lg:flex">
          {[
            ['Producto', 'producto'],
            ['Flujo', 'flujo'],
            ['Seguimiento', 'qr'],
            ['Roles', 'roles'],
            ['Planes', 'planes'],
          ].map(([label, id]) => (
            <button key={id} style={linkStyle} onClick={() => go(id)}>
              {label}
            </button>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        <button style={linkStyle} onClick={onNavigateToLogin} className="hidden sm:block">
          Entrar
        </button>
        <CTAButton variant="primary" onClick={onNavigateToLogin} iconRight={<ArrowRight size={16} />}>
          Comenzar
        </CTAButton>
      </div>
    </header>
  )
}

/* ===========================================================================
   El panel del hero es el producto real compuesto con los primitivos —
   no una captura de pantalla. La única imagen de la landing es el producto.
   =========================================================================== */
interface OTRow {
  id: string
  cliente: string
  estado: string
  t: string
}

function HeroPanel() {
  const rows: OTRow[] = [
    { id: 'OT-2419', cliente: 'Marcela Ríos', estado: 'reparacion', t: '2d 04h' },
    { id: 'OT-2418', cliente: 'Taller Andino', estado: 'esperando', t: '5d 11h' },
    { id: 'OT-2417', cliente: 'Diego Salas', estado: 'listo', t: '1d 02h' },
    { id: 'OT-2416', cliente: 'Luz Ayala', estado: 'entregado', t: '3d 18h' },
  ]

  const cols: Column<OTRow>[] = [
    { key: 'id', label: 'OT', mono: true, width: 88 },
    { key: 'cliente', label: 'Cliente' },
    {
      key: 'estado',
      label: 'Estado',
      width: 170,
      render: (r) => <StatusBadge status={r.estado} size="sm" />,
    },
    { key: 't', label: 'En taller', mono: true, align: 'right', width: 92 },
  ]

  return (
    <div
      style={{
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--surface-card)',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-sunken)',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: 'var(--accent-400)',
            flex: '0 0 auto',
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--text-tertiary)',
          }}
        >
          oryon · panel del taller
        </span>
      </div>

      <div
        className="grid grid-cols-3 gap-px"
        style={{ background: 'var(--border-subtle)' }}
      >
        <MetricCard
          label="OT abiertas"
          value="38"
          delta="+6"
          sublabel="esta semana"
          style={{ border: 0, borderRadius: 0, boxShadow: 'none' }}
        />
        <MetricCard
          label="Tiempo prom."
          value="2,4"
          unit="días"
          delta="-8%"
          deltaTone="up"
          style={{ border: 0, borderRadius: 0, boxShadow: 'none' }}
        />
        <MetricCard
          label="Sin repuesto"
          value="7"
          delta="+3"
          deltaTone="down"
          style={{ border: 0, borderRadius: 0, boxShadow: 'none' }}
        />
      </div>

      <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <DataTable columns={cols} rows={rows} dense />
      </div>
    </div>
  )
}

function Hero({ onNavigateToLogin }: { onNavigateToLogin: () => void }) {
  return (
    <section style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Retícula de plano técnico: la única textura del sistema. */}
      <div className="oryon-grid-texture" style={{ position: 'absolute', inset: 0, opacity: 0.5 }} />

      <div
        className="relative mx-auto px-6 pb-20 pt-14 md:px-10 md:pb-24"
        style={{ maxWidth: 1240 }}
      >
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Eyebrow>Software para talleres técnicos</Eyebrow>

            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: 'clamp(30px, 3.6vw, 54px)',
                lineHeight: 0.98,
                letterSpacing: '-0.045em',
                textTransform: 'uppercase',
                overflowWrap: 'break-word',
                margin: '20px 0 0',
              }}
            >
              Controla órdenes,
              <br />
              inventario y sucursales
              <br />
              <span style={{ color: 'var(--accent-400)' }}>sin complicarte</span>
            </h1>

            <p
              style={{
                margin: '26px 0 0',
                maxWidth: 520,
                fontSize: 16,
                lineHeight: '25px',
                color: 'var(--text-secondary)',
                textWrap: 'pretty',
              }}
            >
              Crea órdenes en segundos con foto y patrón del equipo, dale a tu cliente un QR
              para rastrear su reparación, controla inventario y varias sucursales desde un
              solo lugar, y toma decisiones con reportes reales.
            </p>

            <div className="mt-8 flex flex-wrap gap-2.5">
              <CTAButton
                variant="primary"
                size="lg"
                onClick={onNavigateToLogin}
                iconRight={<ArrowRight size={16} />}
              >
                Comenzar ahora
              </CTAButton>
              <CTAButton
                size="lg"
                onClick={() => {
                  const el = document.getElementById('producto')
                  if (el) window.scrollTo({ top: el.offsetTop - 70, behavior: 'smooth' })
                }}
              >
                Ver el producto
              </CTAButton>
            </div>

            <div
              className="mt-10 flex flex-wrap gap-7 pt-6"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              {[
                ['Admin', 've todo el negocio'],
                ['Asesor', 'recibe y entrega'],
                ['Técnico', 'repara y reporta'],
              ].map(([a, b]) => (
                <div key={a}>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 800,
                      fontSize: 18,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {a}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    {b}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <HeroPanel />
        </div>
      </div>
    </section>
  )
}

/* =========================================================================== */
function Claims() {
  const d: [string, string][] = [
    ['Cero', 'caos'],
    ['Cero', 'reclamos'],
    ['Más', 'ventas'],
  ]
  return (
    <div
      style={{
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-sunken)',
      }}
    >
      <div
        className="mx-auto grid grid-cols-1 px-6 sm:grid-cols-3 md:px-10"
        style={{ maxWidth: 1240 }}
      >
        {d.map(([a, b], i) => (
          <div
            key={b}
            className={i ? 'sm:border-l sm:pl-8' : ''}
            style={{
              padding: '30px 0',
              borderColor: 'var(--border-subtle)',
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: 'clamp(28px, 3.4vw, 40px)',
                letterSpacing: '-0.04em',
                textTransform: 'uppercase',
                color: i === 2 ? 'var(--accent-400)' : 'var(--text-primary)',
              }}
            >
              {a}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: 'clamp(28px, 3.4vw, 40px)',
                letterSpacing: '-0.04em',
                textTransform: 'uppercase',
                color: 'var(--text-primary)',
              }}
            >
              {b}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* =========================================================================== */
function Modulos() {
  const m = [
    [Camera, 'Órdenes en segundos', 'Foto del equipo, patrón de desbloqueo, falla reportada y presupuesto. La OT queda cerrada antes de que el cliente salga del mostrador.'],
    [QrCode, 'QR para el cliente', 'Cada orden genera un código. El cliente escanea y ve en qué va su reparación, sin llamar al taller.'],
    [Package, 'Inventario controlado', 'Stock por SKU, mínimos, costo y proveedor. Traslados entre sucursales, variantes y unidades con seguimiento individual.'],
    [Building2, 'Varias sucursales', 'Un solo lugar para todas las sedes: órdenes, stock y caja consolidados o por sucursal.'],
    [ChartNoAxesColumn, 'Reportes reales', 'Tiempo promedio, carga por técnico, margen por reparación. Decides con datos, no con memoria.'],
    [ShieldUser, 'Roles y permisos', 'Admin, asesor y técnico ven exactamente lo que les toca. Ni un dato de más.'],
  ] as const

  return (
    <Section
      id="producto"
      eyebrow="Módulos"
      title={
        <>
          Todo el taller
          <br />
          en un solo tablero
        </>
      }
      intro="Oryon no es un CRM adaptado. Está hecho para el flujo específico de un taller de reparación de electrónica."
    >
      <Grid className="sm:grid-cols-2 lg:grid-cols-3">
        {m.map(([Icon, t, d]) => (
          <GridCell key={t} style={{ padding: '28px 26px', minHeight: 200 }}>
            <Icon size={20} style={{ color: 'var(--accent-400)' }} />
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 18,
                letterSpacing: '-0.02em',
                marginTop: 18,
              }}
            >
              {t}
            </div>
            <p
              style={{
                margin: '10px 0 0',
                fontSize: 14,
                lineHeight: '21px',
                color: 'var(--text-secondary)',
                textWrap: 'pretty',
              }}
            >
              {d}
            </p>
          </GridCell>
        ))}
      </Grid>
    </Section>
  )
}

/* =========================================================================== */
function Flujo() {
  const pasos: [string, string, string, string][] = [
    ['01', 'cola', 'En cola', 'El equipo entra con foto, patrón y checklist firmado.'],
    ['02', 'diagnostico', 'En diagnóstico', 'El técnico documenta la falla y arma el presupuesto.'],
    ['03', 'reparacion', 'En reparación', 'Se descuenta el repuesto del inventario automáticamente.'],
    ['04', 'esperando', 'Esperando repuesto', 'Si no hay stock, la orden se bloquea y el cliente se entera.'],
    ['05', 'listo', 'Listo para entrega', 'Aviso automático y saldo calculado.'],
    ['06', 'entregado', 'Entregado', 'Comprobante firmado y garantía activa.'],
  ]

  return (
    <Section
      id="flujo"
      eyebrow="El flujo"
      title="Seis estados. Cero preguntas."
      intro="El mismo lenguaje para el mostrador, el técnico y el dueño. Nadie tiene que abrir un chat para saber en qué va un equipo."
    >
      <Grid className="sm:grid-cols-2 lg:grid-cols-3">
        {pasos.map(([n, st, t, d]) => (
          <GridCell key={n} style={{ padding: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono-display)',
                  fontSize: 11,
                  letterSpacing: '0.10em',
                  color: 'var(--text-tertiary)',
                }}
              >
                {n}
              </span>
              <StatusBadge status={st} size="sm" />
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 17,
                letterSpacing: '-0.02em',
                marginTop: 16,
              }}
            >
              {t}
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: '19px', color: 'var(--text-secondary)' }}>
              {d}
            </p>
          </GridCell>
        ))}
      </Grid>
    </Section>
  )
}

/* =========================================================================== */
function QR() {
  const pasos = [
    'Se crea la orden y se imprime el comprobante con el código.',
    'El cliente escanea y ve el estado, el presupuesto y la fecha estimada.',
    'Cada cambio de estado se refleja al instante. Sin llamadas.',
  ]

  return (
    <Section
      id="qr"
      eyebrow="Seguimiento"
      title="El cliente se rastrea solo"
      intro="Un código por orden. El mismo que va impreso en el comprobante de recepción."
    >
      <div className="grid items-center gap-8 lg:grid-cols-2">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            background: 'var(--border-subtle)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {pasos.map((p, i) => (
            <div
              key={i}
              style={{
                background: 'var(--bg-base)',
                padding: '22px 24px',
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono-display)',
                  fontSize: 11,
                  letterSpacing: '0.10em',
                  color: 'var(--accent-400)',
                  marginTop: 2,
                  flex: '0 0 auto',
                }}
              >
                {'0' + (i + 1)}
              </span>
              <span style={{ fontSize: 15, lineHeight: '23px', color: 'var(--text-secondary)' }}>
                {p}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              width: '100%',
              maxWidth: 320,
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--surface-card)',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--bg-sunken)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Smartphone size={14} style={{ color: 'var(--text-tertiary)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)' }}>
                oryon.app/tracking/2419
              </span>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700 }}>
                  OT-2419
                </span>
                <StatusBadge status="reparacion" size="sm" />
              </div>

              <KeyValue
                items={[
                  { label: 'Equipo', value: 'iPhone 12 · 128 GB' },
                  { label: 'Recibido', value: '12/08 09:14', mono: true },
                  { label: 'Entrega est.', value: '15/08', mono: true },
                  { label: 'Presupuesto', value: '$ 418.000', mono: true },
                ]}
              />

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  border: '1px solid var(--accent-subtle-border)',
                  background: 'var(--accent-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <QrCode size={18} style={{ color: 'var(--accent-400)', flex: '0 0 auto' }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Guarda este enlace: se actualiza solo.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}

/* =========================================================================== */
interface InvRow {
  sku: string
  n: string
  s: string
  min: string
  c: string
}

function Producto() {
  const [tab, setTab] = useState<'ot' | 'inv' | 'rec'>('ot')

  const rows: InvRow[] = [
    { sku: 'PANT-OLED-A2172', n: 'Pantalla OLED iPhone 12', s: '0', min: '2', c: '285.000' },
    { sku: 'BAT-SM-S21', n: 'Batería Galaxy S21', s: '6', min: '3', c: '62.000' },
    { sku: 'BIS-LAT-5420-L', n: 'Bisagra izq. Latitude 5420', s: '1', min: '2', c: '96.000' },
  ]

  const inv: Column<InvRow>[] = [
    { key: 'sku', label: 'SKU', mono: true, width: 190 },
    { key: 'n', label: 'Repuesto' },
    { key: 's', label: 'Stock', mono: true, align: 'right', width: 80 },
    { key: 'min', label: 'Mínimo', mono: true, align: 'right', muted: true, width: 80 },
    {
      key: 'e',
      label: '',
      width: 130,
      render: (r) =>
        r.s === '0' ? (
          <StatusBadge status="cancelado" label="Sin stock" size="sm" />
        ) : Number(r.s) <= Number(r.min) ? (
          <StatusBadge status="esperando" label="Bajo mínimo" size="sm" />
        ) : (
          <StatusBadge status="listo" label="Disponible" size="sm" />
        ),
    },
    { key: 'c', label: 'Costo', mono: true, align: 'right', width: 110, render: (r) => '$ ' + r.c },
  ]

  const tabs: [typeof tab, string, string][] = [
    ['ot', 'Orden de trabajo', 'Historial, repuestos, cobro y cliente en una sola vista.'],
    ['inv', 'Inventario', 'Stock real, mínimos y costo por proveedor.'],
    ['rec', 'Recepción', 'Foto, patrón y checklist físico en el mostrador.'],
  ]

  return (
    <Section
      eyebrow="Dentro del producto"
      title="Denso a propósito"
      intro="Tu técnico no quiere tarjetas bonitas con aire. Quiere ver treinta órdenes sin bajar el scroll."
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:items-start">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {tabs.map(([id, t, d]) => {
            const active = tab === id
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  textAlign: 'left',
                  padding: '18px 20px',
                  background: active ? 'var(--surface-card)' : 'transparent',
                  border: `1px solid ${active ? 'var(--border-default)' : 'transparent'}`,
                  borderLeft: `2px solid ${active ? 'var(--accent-400)' : 'var(--border-subtle)'}`,
                  borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 16,
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    letterSpacing: '-0.015em',
                  }}
                >
                  {t}
                </div>
                <div style={{ fontSize: 13, lineHeight: '19px', color: 'var(--text-tertiary)', marginTop: 4 }}>
                  {d}
                </div>
              </button>
            )
          })}
        </div>

        <div
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <h4
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-h4)',
                letterSpacing: 'var(--tr-h4)',
                fontWeight: 'var(--fw-semibold)',
                margin: 0,
              }}
            >
              {tab === 'inv'
                ? 'Inventario de repuestos'
                : tab === 'rec'
                  ? 'Recepción de equipo'
                  : 'OT-2419 · iPhone 12'}
            </h4>
            {tab === 'ot' && <StatusBadge status="reparacion" size="sm" />}
          </div>

          {tab === 'inv' && <DataTable columns={inv} rows={rows} rowKey="sku" />}

          {tab === 'ot' && (
            <div style={{ padding: 16 }}>
              <KeyValue
                columns={2}
                items={[
                  { label: 'IMEI', value: '356938035643809', mono: true },
                  { label: 'Técnico', value: 'J. Ramírez' },
                  { label: 'Ingreso', value: '12/08 09:14', mono: true },
                  { label: 'Presupuesto', value: '$ 418.000', mono: true },
                  { label: 'Repuesto', value: 'PANT-OLED-A2172', mono: true },
                  { label: 'Sucursal', value: 'Sede Centro' },
                ]}
              />
            </div>
          )}

          {tab === 'rec' && (
            <div className="grid gap-3.5 p-4 sm:grid-cols-2">
              <KeyValue
                items={[
                  { label: 'Cliente', value: 'Marcela Ríos' },
                  { label: 'Teléfono', value: '+57 311 458 2290', mono: true },
                ]}
              />
              <KeyValue
                items={[
                  { label: 'Patrón', value: '1-4-7-8', mono: true },
                  { label: 'Checklist', value: '4 de 5 verificados' },
                ]}
              />
            </div>
          )}
        </div>
      </div>
    </Section>
  )
}

/* =========================================================================== */
function Roles() {
  const r = [
    [ShieldUser, 'Admin', 'Ve el negocio completo: todas las sucursales, caja, márgenes, inventario y usuarios.', ['Reportes consolidados', 'Gestión de sucursales', 'Precios y usuarios']],
    [UserRound, 'Asesor', 'Atiende el mostrador: recibe equipos, cobra y entrega.', ['Crear órdenes con foto y patrón', 'Cobros y abonos', 'Entrega con comprobante']],
    [Wrench, 'Técnico', 'Solo lo que tiene en el banco.', ['Sus órdenes asignadas', 'Diagnóstico y repuestos', 'Cambios de estado']],
  ] as const

  return (
    <Section
      id="roles"
      eyebrow="Permisos"
      title="Cada quien ve lo suyo"
      intro="Tres roles listos desde el primer día. Ni un dato de más para nadie."
    >
      <Grid className="sm:grid-cols-2 lg:grid-cols-3">
        {r.map(([Icon, t, d, items]) => (
          <GridCell
            key={t}
            style={{ padding: '30px 26px', display: 'flex', flexDirection: 'column', gap: 18, minHeight: 250 }}
          >
            <Icon size={20} style={{ color: 'var(--accent-400)' }} />
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: 24,
                  letterSpacing: '-0.03em',
                  textTransform: 'uppercase',
                }}
              >
                {t}
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: '21px', color: 'var(--text-secondary)' }}>
                {d}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 'auto' }}>
              {items.map((x) => (
                <div
                  key={x}
                  style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 13, color: 'var(--text-tertiary)' }}
                >
                  <Check size={14} style={{ color: 'var(--accent-400)', marginTop: 2, flex: '0 0 auto' }} />
                  {x}
                </div>
              ))}
            </div>
          </GridCell>
        ))}
      </Grid>
    </Section>
  )
}

/* =========================================================================== */
function Planes({ onNavigateToLogin }: { onNavigateToLogin: () => void }) {
  const planes = [
    {
      nombre: 'Básico',
      clave: 'Starter',
      desc: 'Para empezar tu negocio',
      destacado: false,
      items: ['1 sucursal', '1 administrador', '1 asesor', '2 técnicos', 'Soporte por email'],
    },
    {
      nombre: 'Pyme',
      clave: 'Growth',
      desc: 'Para negocios en crecimiento',
      destacado: true,
      items: ['2 sucursales', '2 administradores', '4 asesores', '8 técnicos', 'Soporte prioritario'],
    },
    {
      nombre: 'Enterprise',
      clave: 'Enterprise',
      desc: 'Para empresas establecidas',
      destacado: false,
      items: ['4 sucursales', '4 administradores', '8 asesores', '16 técnicos', 'Soporte 24/7'],
    },
  ]

  return (
    <Section
      id="planes"
      eyebrow="Planes"
      title="Crece sin cambiar de sistema"
      intro="Desde emprendedores hasta empresas establecidas. El plan se amplía cuando abres una sede más, no antes."
    >
      <Grid className="sm:grid-cols-2 lg:grid-cols-3">
        {planes.map((p) => (
          <GridCell key={p.nombre} style={{ display: 'flex', flexDirection: 'column' }}>
            {/* La barra cian es una de las cinco apariciones contadas del acento. */}
            <div style={{ height: 2, background: p.destacado ? 'var(--accent-400)' : 'transparent' }} />
            <div style={{ padding: '28px 26px', display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 800,
                      fontSize: 24,
                      letterSpacing: '-0.03em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {p.nombre}
                  </div>
                  {p.destacado && (
                    <span
                      style={{
                        fontFamily: 'var(--font-mono-display)',
                        fontSize: 10,
                        letterSpacing: '0.10em',
                        textTransform: 'uppercase',
                        color: 'var(--accent-400)',
                        border: '1px solid var(--accent-subtle-border)',
                        background: 'var(--accent-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '3px 7px',
                      }}
                    >
                      Más popular
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 6 }}>{p.desc}</div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    marginTop: 14,
                  }}
                >
                  Plan {p.clave}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {p.items.map((x) => (
                  <div
                    key={x}
                    style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 13, color: 'var(--text-secondary)' }}
                  >
                    <Check size={14} style={{ color: 'var(--accent-400)', marginTop: 2, flex: '0 0 auto' }} />
                    {x}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 'auto', paddingTop: 6 }}>
                <CTAButton
                  variant={p.destacado ? 'primary' : 'secondary'}
                  onClick={onNavigateToLogin}
                  iconRight={<ArrowRight size={16} />}
                >
                  Empezar
                </CTAButton>
              </div>
            </div>
          </GridCell>
        ))}
      </Grid>
    </Section>
  )
}

/* =========================================================================== */
function CTA({ onNavigateToLogin }: { onNavigateToLogin: () => void }) {
  return (
    <section style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-sunken)' }}>
      <div
        className="mx-auto grid gap-12 px-6 py-20 md:px-10 md:py-24 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-end"
        style={{ maxWidth: 1240 }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: 'clamp(38px, 6vw, 84px)',
            lineHeight: 0.94,
            letterSpacing: '-0.045em',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          Cero caos.
          <br />
          Cero reclamos.
          <br />
          <span style={{ color: 'var(--accent-400)' }}>Más ventas.</span>
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p style={{ margin: 0, fontSize: 16, lineHeight: '25px', color: 'var(--text-secondary)' }}>
            Monta tu taller, importa tu inventario y crea la primera orden el mismo día.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <CTAButton
              variant="primary"
              size="lg"
              onClick={onNavigateToLogin}
              iconRight={<ArrowRight size={16} />}
            >
              Comenzar ahora
            </CTAButton>
            <CTAButton size="lg" onClick={onNavigateToLogin}>
              Ya tengo cuenta
            </CTAButton>
          </div>
        </div>
      </div>
    </section>
  )
}

/* =========================================================================== */
function SiteFooter() {
  const col = (t: string, items: string[]) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        style={{
          fontFamily: 'var(--font-mono-display)',
          fontSize: 10,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
        }}
      >
        {t}
      </div>
      {items.map((i) => (
        <span key={i} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {i}
        </span>
      ))}
    </div>
  )

  return (
    <footer style={{ borderTop: '1px solid var(--border-subtle)' }}>
      <div
        className="mx-auto grid gap-10 px-6 pb-8 pt-14 md:px-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]"
        style={{ maxWidth: 1240 }}
      >
        <div>
          <Logo size={26} />
          <p style={{ margin: '16px 0 0', maxWidth: 280, fontSize: 13, lineHeight: '20px', color: 'var(--text-tertiary)' }}>
            Software de gestión para talleres técnicos de celulares, computadores y electrónica.
          </p>
        </div>
        {col('Producto', ['Órdenes de trabajo', 'Seguimiento con QR', 'Inventario', 'Sucursales', 'Reportes'])}
        {col('Empresa', ['Sobre Oryon', 'Contacto', 'Estado del servicio'])}
        {col('Legal', ['Términos', 'Privacidad', 'Tratamiento de datos'])}
      </div>

      <div
        className="mx-auto flex flex-wrap justify-between gap-3 px-6 pb-10 pt-5 md:px-10"
        style={{ maxWidth: 1240, borderTop: '1px solid var(--border-subtle)' }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)' }}>
          © {new Date().getFullYear()} Oryon S.A.S.
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)' }}>
          Sistema de gestión integral
        </span>
      </div>
    </footer>
  )
}

/* ===========================================================================
   HomePage — landing pública de Oryon.
   Va siempre en grafito (data-theme="dark"), independientemente del tema que
   el usuario tenga guardado: el kit de marca es dark-first y no lleva toggle.
   =========================================================================== */
export function HomePage({ onNavigateToLogin }: HomePageProps) {
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // App.tsx resuelve las rutas públicas (/tracking, /reset-password) antes de
    // llegar aquí; esto solo evita el parpadeo mientras decide.
    const pathname = window.location.pathname || '/'
    if (pathname.startsWith('/tracking') || pathname.startsWith('/reset-password')) {
      setIsChecking(false)
      return
    }
    setIsChecking(false)
  }, [])

  if (isChecking) {
    return (
      <div
        data-theme="dark"
        style={{
          minHeight: '100vh',
          background: 'var(--bg-base)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <Zap size={28} style={{ color: 'var(--accent-400)', animation: 'oryon-spin 900ms linear infinite' }} />
          <p style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 13, marginTop: 12 }}>
            Cargando Oryon…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      data-theme="dark"
      style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      <SiteNav onNavigateToLogin={onNavigateToLogin} />
      <Hero onNavigateToLogin={onNavigateToLogin} />
      <Claims />
      <Modulos />
      <Flujo />
      <QR />
      <Producto />
      <Roles />
      <Planes onNavigateToLogin={onNavigateToLogin} />
      <CTA onNavigateToLogin={onNavigateToLogin} />
      <SiteFooter />
    </div>
  )
}
