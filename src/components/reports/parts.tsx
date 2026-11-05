import { useState, type CSSProperties, type ReactNode } from 'react'

/**
 * Piezas de Reportes, hechas con el sistema Oryon:
 * bordes de 1px, esquinas ≤4px, sin gradientes, cifras en mono, un solo acento.
 *
 * Reglas de visualización aplicadas (y por qué):
 *  - Los rankings van en UN color: el largo de la barra ya dice cuánto; teñir
 *    por posición gastaría el color en repetir lo mismo.
 *  - Los textos van en tinta del sistema, nunca en el color de la serie.
 *  - Rejilla en línea continua y tenue; nada de punteados.
 *  - Todo valor que se ve en un tooltip se ve también escrito en la tarjeta.
 */

export const money = (n: number) => `$${Math.round(n || 0).toLocaleString('es-CO')}`

/** $1,2 M · $350 k · $900 — para ticks de eje, donde no cabe la cifra entera. */
export function compactMoney(n: number): string {
  const v = Math.abs(n || 0)
  const sign = n < 0 ? '−' : ''
  if (v >= 1_000_000) return `${sign}$${(v / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`
  if (v >= 1_000) return `${sign}$${Math.round(v / 1_000).toLocaleString('es-CO')} k`
  return `${sign}$${Math.round(v)}`
}

export const pct = (n: number, digits = 1) =>
  `${(Number.isFinite(n) ? n : 0).toLocaleString('es-CO', { maximumFractionDigits: digits, minimumFractionDigits: digits })}%`

const caption: CSSProperties = {
  fontSize: 'var(--text-caption)',
  letterSpacing: 'var(--tr-caption)',
  textTransform: 'uppercase',
  fontWeight: 'var(--fw-semibold)',
  color: 'var(--text-tertiary)',
}

const mono: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontVariantNumeric: 'tabular-nums',
}

/* ───────────────────────── Tooltip de gráficos ───────────────────────── */

/** El de Recharts por defecto es una caja blanca fija: ilegible sobre grafito. */
export function ChartTooltip({
  active,
  payload,
  label,
  format = money,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string; display?: string }>
  label?: ReactNode
  format?: (n: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        minWidth: 150,
        padding: '8px 10px',
        background: 'var(--surface-raised)',
        border: 'var(--border-width) solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <div style={caption}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey ?? p.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span aria-hidden style={{ width: 8, height: 8, borderRadius: 'var(--radius-xs)', background: p.color ?? 'transparent', flex: '0 0 auto' }} />
          <span style={{ flex: 1, fontSize: 'var(--text-small)', color: 'var(--text-secondary)' }}>{p.name}</span>
          <span style={{ ...mono, fontSize: 'var(--text-mono-size)', color: 'var(--text-primary)' }}>{p.display ?? format(Number(p.value) || 0)}</span>
        </div>
      ))}
    </div>
  )
}

/** Leyenda HTML: con dos o más series siempre hay leyenda, y no depende solo del color. */
export function Legend({ items }: { items: Array<{ label: string; color: string; value?: string }> }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
      {items.map((i) => (
        <span key={i.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          <span aria-hidden style={{ width: 10, height: 10, borderRadius: 'var(--radius-xs)', background: i.color }} />
          {i.label}
          {i.value && <span style={{ ...mono, fontSize: 'var(--text-mono-sm)', color: 'var(--text-primary)' }}>{i.value}</span>}
        </span>
      ))}
    </div>
  )
}

/* ───────────────────────── Barras de ranking ───────────────────────── */

export interface RankedItem {
  key: string
  label: ReactNode
  /** Línea secundaria bajo la etiqueta ("12 vendidos"). */
  detail?: ReactNode
  value: number
  /** Lo que se escribe a la derecha. Por defecto, el valor en pesos. */
  display?: string
  /** Solo cuando el color SIGNIFICA algo (estado de una OT). Si no, todas iguales. */
  color?: string
}

/**
 * Ranking horizontal en HTML: etiqueta, cifra y barra. Lee mejor que un donut
 * cuando los valores se parecen, y las etiquetas largas no se cortan.
 */
export function RankedBars({
  items,
  color = 'var(--accent-fill)',
  format = money,
  max: maxItems = 10,
}: {
  items: RankedItem[]
  color?: string
  format?: (n: number) => string
  max?: number
}) {
  const shown = items.slice(0, maxItems)
  const top = Math.max(...shown.map((i) => i.value), 0) || 1
  const [hover, setHover] = useState<string | null>(null)

  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {shown.map((item, idx) => {
        const width = Math.max(2, (item.value / top) * 100)
        const dim = hover !== null && hover !== item.key
        return (
          <li
            key={item.key}
            onMouseEnter={() => setHover(item.key)}
            onMouseLeave={() => setHover(null)}
            style={{ display: 'flex', flexDirection: 'column', gap: 6, opacity: dim ? 0.55 : 1, transition: 'opacity var(--duration-fast) var(--ease)' }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
              <span style={{ ...mono, width: 20, flex: '0 0 auto', fontSize: 'var(--text-mono-sm)', color: 'var(--text-tertiary)' }}>
                {String(idx + 1).padStart(2, '0')}
              </span>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
                {item.detail && <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>{item.detail}</span>}
              </span>
              <span style={{ ...mono, flex: '0 0 auto', fontSize: 'var(--text-mono-size)', color: 'var(--text-primary)' }}>
                {item.display ?? format(item.value)}
              </span>
            </div>
            <div aria-hidden style={{ marginLeft: 30, height: 6, background: 'var(--bg-sunken)', borderRadius: 'var(--radius-xs)', overflow: 'hidden' }}>
              <div style={{ width: `${width}%`, height: '100%', background: item.color ?? color, borderRadius: 'var(--radius-xs)' }} />
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/* ───────────────────────── Barra segmentada (parte-todo) ───────────────────────── */

export interface Segment {
  key: string
  label: string
  value: number
  color: string
}

/**
 * Parte-todo con pocas partes: una barra alta con huecos de 2px entre segmentos,
 * y debajo la leyenda con cifra y porcentaje de cada uno.
 */
export function SegmentedBar({ segments, height = 14, format = money }: { segments: Segment[]; height?: number; format?: (n: number) => string }) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0)
  if (total <= 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        role="img"
        aria-label={segments.map((s) => `${s.label}: ${format(s.value)}`).join(', ')}
        style={{ display: 'flex', gap: 2, height }}
      >
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <div key={s.key} title={`${s.label} · ${format(s.value)}`} style={{ flex: s.value, minWidth: 3, background: s.color, borderRadius: 'var(--radius-xs)' }} />
          ))}
      </div>
      <Legend items={segments.map((s) => ({ label: s.label, color: s.color, value: `${format(s.value)} · ${pct((s.value / total) * 100, 0)}` }))} />
    </div>
  )
}

/* ───────────────────────── Selector de período ───────────────────────── */

/**
 * Control segmentado. Va en UNA fila por encima de todo lo que filtra: cambia
 * a la vez cifras y gráficos de la pestaña, no cada tarjeta por su cuenta.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      style={{
        display: 'inline-flex',
        padding: 2,
        gap: 2,
        background: 'var(--bg-sunken)',
        border: 'var(--border-width) solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            style={{
              ...mono,
              height: 28,
              padding: '0 12px',
              fontSize: 'var(--text-mono-sm)',
              color: on ? 'var(--text-primary)' : 'var(--text-tertiary)',
              background: on ? 'var(--surface-raised)' : 'transparent',
              border: `var(--border-width) solid ${on ? 'var(--border-strong)' : 'transparent'}`,
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'color var(--duration-fast) var(--ease), background var(--duration-fast) var(--ease)',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/* ───────────────────────── Cifra principal ───────────────────────── */

/**
 * La cifra que responde la pregunta de la pestaña ("¿cuánto gané?"). Archivo en
 * negra con tracking cerrado, como los titulares de la marca: es lo llamativo de
 * la página, y lo es por jerarquía, no por decoración.
 */
export function HeroFigure({
  eyebrow,
  value,
  tone = 'default',
  aside,
  children,
}: {
  eyebrow: ReactNode
  value: string
  tone?: 'default' | 'danger'
  aside?: ReactNode
  children?: ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono-display)',
            fontSize: 'var(--text-caption)',
            letterSpacing: 'var(--tr-caption)',
            textTransform: 'uppercase',
            color: 'var(--text-accent)',
          }}
        >
          {eyebrow}
        </span>
        {aside}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 'var(--fw-black)',
          fontSize: 'clamp(40px, 6vw, 64px)',
          lineHeight: 0.95,
          letterSpacing: 'var(--tr-display)',
          color: tone === 'danger' ? 'var(--danger)' : 'var(--text-primary)',
          overflowWrap: 'anywhere',
        }}
      >
        {value}
      </div>
      {children}
    </div>
  )
}

/** Fila etiqueta / cifra para desgloses dentro de una tarjeta. */
export function FigureRow({ label, value, hint, strong }: { label: ReactNode; value: ReactNode; hint?: ReactNode; strong?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 12,
        padding: '9px 0',
        borderTop: 'var(--border-width) solid var(--border-subtle)',
      }}
    >
      <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        <span style={{ fontSize: 'var(--text-small)', color: strong ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{label}</span>
        {hint && <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>{hint}</span>}
      </span>
      <span style={{ ...mono, fontSize: strong ? 'var(--text-body-lg)' : 'var(--text-mono-size)', color: 'var(--text-primary)', fontWeight: strong ? 'var(--fw-semibold)' : undefined }}>
        {value}
      </span>
    </div>
  )
}

export const captionStyle = caption
export const monoStyle = mono
