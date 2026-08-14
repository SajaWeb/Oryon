import type { CSSProperties, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

/* ---------------------------------------------------------------------------
   Eyebrow — Martian Mono en mayúsculas pequeñas con tracking abierto.
   Marca el ritmo de la página como la numeración de un plano.
   --------------------------------------------------------------------------- */
export function Eyebrow({
  children,
  tone = 'accent',
  style,
}: {
  children: ReactNode
  tone?: 'accent' | 'muted'
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-mono-display)',
        fontSize: 11,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        color: tone === 'accent' ? 'var(--accent-400)' : 'var(--text-tertiary)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/* ---------------------------------------------------------------------------
   Section — bloque de landing con eyebrow, titular Archivo 900 y bajada.
   --------------------------------------------------------------------------- */
export function Section({
  id,
  eyebrow,
  title,
  intro,
  children,
  bordered = true,
  pad = 96,
  style,
}: {
  id?: string
  eyebrow?: ReactNode
  title?: ReactNode
  intro?: ReactNode
  children?: ReactNode
  bordered?: boolean
  pad?: number
  style?: CSSProperties
}) {
  return (
    <section
      id={id}
      style={{
        borderTop: bordered ? '1px solid var(--border-subtle)' : 'none',
        paddingBlock: `clamp(56px, 8vw, ${pad}px)`,
        ...style,
      }}
    >
      <div style={{ maxWidth: 1240, margin: '0 auto' }} className="px-6 md:px-10">
        {(eyebrow || title) && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              marginBottom: 44,
              maxWidth: 820,
            }}
          >
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            {title && (
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 900,
                  fontSize: 'clamp(28px, 4vw, 52px)',
                  lineHeight: 1.02,
                  letterSpacing: '-0.035em',
                  textTransform: 'uppercase',
                  margin: 0,
                }}
              >
                {title}
              </h2>
            )}
            {intro && (
              <p
                style={{
                  margin: 0,
                  fontSize: 16,
                  lineHeight: '25px',
                  color: 'var(--text-secondary)',
                  maxWidth: 620,
                  textWrap: 'pretty',
                }}
              >
                {intro}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------------------
   Grid — rejilla de líneas de 1px. Las tarjetas no llevan sombra ni radio:
   se separan con la línea sobre grafito.
   --------------------------------------------------------------------------- */
export function Grid({
  children,
  className = '',
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      className={`grid gap-px ${className}`}
      style={{
        background: 'var(--border-subtle)',
        border: '1px solid var(--border-subtle)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function GridCell({
  children,
  style,
}: {
  children: ReactNode
  style?: CSSProperties
}) {
  return <div style={{ background: 'var(--bg-base)', ...style }}>{children}</div>
}

/* ---------------------------------------------------------------------------
   MetricCard — KPI del producto. Valor en Archivo, delta en mono con flecha.
   --------------------------------------------------------------------------- */
export function MetricCard({
  label,
  value,
  unit,
  delta,
  deltaTone = 'neutral',
  sublabel,
  icon: Icon,
  style,
  onClick,
}: {
  label: ReactNode
  value: ReactNode
  unit?: ReactNode
  delta?: ReactNode
  deltaTone?: 'up' | 'down' | 'neutral'
  sublabel?: ReactNode
  icon?: LucideIcon
  style?: CSSProperties
  onClick?: () => void
}) {
  const dc =
    deltaTone === 'up'
      ? 'var(--success)'
      : deltaTone === 'down'
        ? 'var(--danger)'
        : 'var(--text-tertiary)'

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '14px 16px',
        background: 'var(--surface-card)',
        border: 'var(--border-width) solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        minWidth: 0,
        cursor: onClick ? 'pointer' : undefined,
        transition: 'border-color var(--duration-fast) var(--ease)',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 'var(--text-caption)',
            letterSpacing: 'var(--tr-caption)',
            textTransform: 'uppercase',
            fontWeight: 'var(--fw-semibold)',
            color: 'var(--text-tertiary)',
          }}
        >
          {label}
        </span>
        {Icon && <Icon size={14} style={{ color: 'var(--text-tertiary)', flex: '0 0 auto' }} />}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-h1)',
            lineHeight: 'var(--lh-h1)',
            letterSpacing: 'var(--tr-h1)',
            fontWeight: 'var(--fw-semibold)',
            color: 'var(--text-primary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-mono-size)',
              color: 'var(--text-tertiary)',
            }}
          >
            {unit}
          </span>
        )}
      </div>

      {(delta || sublabel) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 'var(--text-small)',
            color: 'var(--text-tertiary)',
          }}
        >
          {delta && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                color: dc,
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-mono-sm)',
              }}
            >
              {deltaTone === 'up' && <ArrowUpRight size={12} />}
              {deltaTone === 'down' && <ArrowDownRight size={12} />}
              {delta}
            </span>
          )}
          {sublabel && <span>{sublabel}</span>}
        </div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------------------
   KeyValue — ficha técnica. Los valores técnicos van en mono tabular.
   --------------------------------------------------------------------------- */
export interface KeyValueItem {
  label: ReactNode
  value: ReactNode
  mono?: boolean
}

export function KeyValue({
  items,
  columns = 1,
  style,
}: {
  items: KeyValueItem[]
  columns?: 1 | 2
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: columns === 2 ? '10px 24px' : 10,
        ...style,
      }}
    >
      {items.map((it, i) => (
        <div
          key={i}
          style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}
        >
          <span
            style={{
              fontSize: 'var(--text-caption)',
              letterSpacing: 'var(--tr-caption)',
              textTransform: 'uppercase',
              fontWeight: 'var(--fw-semibold)',
              color: 'var(--text-tertiary)',
              whiteSpace: 'nowrap',
            }}
          >
            {it.label}
          </span>
          <span
            style={{
              fontFamily: it.mono ? 'var(--font-mono)' : 'var(--font-sans)',
              fontSize: it.mono ? 'var(--text-mono-size)' : 'var(--text-body)',
              fontVariantNumeric: it.mono ? 'tabular-nums' : 'normal',
              color: 'var(--text-primary)',
              textAlign: 'right',
              minWidth: 0,
            }}
          >
            {it.value}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------------------
   DataTable — denso a propósito. Fila de 40px (32 en modo compacto),
   cabecera en caption con tracking, datos técnicos en mono tabular.
   --------------------------------------------------------------------------- */
export interface Column<T> {
  key: string
  label: ReactNode
  mono?: boolean
  muted?: boolean
  align?: 'left' | 'right' | 'center'
  width?: number
  render?: (row: T) => ReactNode
}

export function DataTable<T extends Record<string, any>>({
  columns,
  rows,
  dense = false,
  onRowClick,
  rowKey = 'id',
  emptyMessage = 'Sin resultados',
  style,
}: {
  columns: Column<T>[]
  rows: T[]
  dense?: boolean
  onRowClick?: (row: T) => void
  rowKey?: string
  emptyMessage?: ReactNode
  style?: CSSProperties
}) {
  const h = dense ? 32 : 'var(--row-height)'

  return (
    <div style={{ width: '100%', overflowX: 'auto', ...style }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 'var(--text-body)',
        }}
      >
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{
                  height: 34,
                  padding: '0 12px',
                  textAlign: c.align || 'left',
                  fontSize: 'var(--text-caption)',
                  letterSpacing: 'var(--tr-caption)',
                  textTransform: 'uppercase',
                  fontWeight: 'var(--fw-semibold)',
                  color: 'var(--text-tertiary)',
                  background: 'var(--bg-sunken)',
                  borderBottom: 'var(--border-width) solid var(--border-default)',
                  whiteSpace: 'nowrap',
                  width: c.width,
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  height: 88,
                  textAlign: 'center',
                  color: 'var(--text-tertiary)',
                  fontSize: 'var(--text-small)',
                }}
              >
                {emptyMessage}
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr
              key={r[rowKey] ?? i}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              className="oryon-row"
              style={{ cursor: onRowClick ? 'pointer' : 'default' }}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  style={{
                    height: h,
                    padding: '0 12px',
                    textAlign: c.align || 'left',
                    borderBottom: 'var(--border-width) solid var(--border-subtle)',
                    color: c.muted ? 'var(--text-secondary)' : 'var(--text-primary)',
                    fontFamily: c.mono ? 'var(--font-mono)' : 'var(--font-sans)',
                    fontSize: c.mono ? 'var(--text-mono-size)' : 'var(--text-body)',
                    fontVariantNumeric: c.mono ? 'tabular-nums' : 'normal',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
