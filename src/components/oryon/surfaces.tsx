import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { CircleCheck, Info, OctagonAlert, TriangleAlert, X } from 'lucide-react'

/* ---------------------------------------------------------------------------
   Card — superficie del producto: borde 1px, radio 4px, sombra sm.
   `padding={0}` cuando el cuerpo es una tabla, para que la fila llegue al borde.
   El pie va sobre --bg-sunken: así se lee como zona de control, no de datos.
   --------------------------------------------------------------------------- */
export function Card({
  title,
  subtitle,
  actions,
  footer,
  padding = 16,
  tone = 'default',
  children,
  style,
  bodyStyle,
  ...rest
}: Omit<HTMLAttributes<HTMLElement>, 'title' | 'style'> & {
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  footer?: ReactNode
  padding?: number
  tone?: 'default' | 'sunken'
  style?: CSSProperties
  bodyStyle?: CSSProperties
}) {
  return (
    <section
      {...rest}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: tone === 'sunken' ? 'var(--bg-sunken)' : 'var(--surface-card)',
        border: 'var(--border-width) solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        boxShadow: tone === 'sunken' ? 'none' : 'var(--shadow-sm)',
        minWidth: 0,
        ...style,
      }}
    >
      {(title || actions) && (
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: `12px ${padding || 16}px`,
            borderBottom: 'var(--border-width) solid var(--border-subtle)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            {title && (
              <h4
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-h4)',
                  lineHeight: 'var(--lh-h4)',
                  letterSpacing: 'var(--tr-h4)',
                  fontWeight: 'var(--fw-semibold)',
                  margin: 0,
                  color: 'var(--text-primary)',
                }}
              >
                {title}
              </h4>
            )}
            {subtitle && (
              <div
                style={{
                  fontSize: 'var(--text-small)',
                  lineHeight: 'var(--lh-small)',
                  color: 'var(--text-tertiary)',
                  marginTop: 2,
                }}
              >
                {subtitle}
              </div>
            )}
          </div>
          {actions && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>{actions}</div>
          )}
        </header>
      )}

      <div style={{ padding, flex: 1, minWidth: 0, ...bodyStyle }}>{children}</div>

      {footer && (
        <footer
          style={{
            padding: `10px ${padding || 16}px`,
            borderTop: 'var(--border-width) solid var(--border-subtle)',
            background: 'var(--bg-sunken)',
            borderRadius: '0 0 var(--radius-md) var(--radius-md)',
          }}
        >
          {footer}
        </footer>
      )}
    </section>
  )
}

/* ---------------------------------------------------------------------------
   Badge — etiqueta de 11px en mayúsculas. El fondo se resuelve con color-mix
   sobre el propio tono, así funciona igual en grafito y en claro sin duplicar
   valores en los tokens.
   --------------------------------------------------------------------------- */
const TONES = {
  neutral: 'var(--alu-500)',
  accent: 'var(--accent-fill)',
  info: 'var(--info)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  success: 'var(--success)',
} as const

export type BadgeTone = keyof typeof TONES

export function Badge({
  tone = 'neutral',
  dot = false,
  children,
  style,
  ...rest
}: Omit<HTMLAttributes<HTMLSpanElement>, 'style'> & {
  tone?: BadgeTone
  dot?: boolean
  style?: CSSProperties
}) {
  const c = TONES[tone]
  return (
    <span
      {...rest}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 20,
        padding: '0 7px',
        fontSize: 'var(--text-caption)',
        lineHeight: 1,
        fontWeight: 'var(--fw-semibold)',
        letterSpacing: 'var(--tr-caption)',
        textTransform: 'uppercase',
        color: c,
        background: `color-mix(in srgb, ${c} 12%, transparent)`,
        border: `var(--border-width) solid color-mix(in srgb, ${c} 28%, transparent)`,
        borderRadius: 'var(--radius-sm)',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {dot && <span style={{ width: 5, height: 5, borderRadius: 'var(--radius-pill)', background: c }} />}
      {children}
    </span>
  )
}

/* ---------------------------------------------------------------------------
   Alert — qué pasó y luego qué hacer. Anclado al contexto, nunca flotante:
   el sistema no tiene toasts propios.
   --------------------------------------------------------------------------- */
const ALERTS = {
  info: { c: 'var(--info)', bg: 'var(--info-subtle)', Icon: Info },
  warning: { c: 'var(--warning)', bg: 'var(--warning-subtle)', Icon: TriangleAlert },
  danger: { c: 'var(--danger)', bg: 'var(--danger-subtle)', Icon: OctagonAlert },
  success: { c: 'var(--success)', bg: 'var(--success-subtle)', Icon: CircleCheck },
} as const

export type AlertVariant = keyof typeof ALERTS

export function Alert({
  variant = 'info',
  title,
  children,
  onDismiss,
  style,
  ...rest
}: Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'style'> & {
  variant?: AlertVariant
  title?: ReactNode
  onDismiss?: () => void
  style?: CSSProperties
}) {
  const { c, bg, Icon } = ALERTS[variant]
  return (
    <div
      role="status"
      {...rest}
      style={{
        display: 'flex',
        gap: 10,
        padding: '10px 12px',
        background: bg,
        border: `var(--border-width) solid color-mix(in srgb, ${c} 30%, transparent)`,
        borderRadius: 'var(--radius-md)',
        ...style,
      }}
    >
      <Icon size={16} color={c} strokeWidth={1.8} style={{ marginTop: 2, flex: '0 0 auto' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <div style={{ fontSize: 'var(--text-body)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-primary)' }}>
            {title}
          </div>
        )}
        {children && (
          <div
            style={{
              fontSize: 'var(--text-small)',
              lineHeight: 'var(--lh-small)',
              color: 'var(--text-secondary)',
              marginTop: title ? 2 : 0,
            }}
          >
            {children}
          </div>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar"
          style={{
            display: 'inline-flex',
            alignSelf: 'flex-start',
            padding: 2,
            color: 'var(--text-tertiary)',
            background: 'transparent',
            border: 0,
            borderRadius: 'var(--radius-xs)',
            cursor: 'pointer',
          }}
        >
          <X size={14} strokeWidth={2} />
        </button>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------------------
   EmptyState — "Sin OT en cola · Todas las órdenes están asignadas".
   Nombra el hecho y ofrece la salida; nunca se disculpa.
   --------------------------------------------------------------------------- */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = 'empty',
  style,
}: {
  icon: LucideIcon
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  variant?: 'empty' | 'error'
  style?: CSSProperties
}) {
  const err = variant === 'error'
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '40px 24px',
        textAlign: 'center',
        ...style,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          color: err ? 'var(--danger)' : 'var(--text-tertiary)',
          background: err ? 'var(--danger-subtle)' : 'var(--bg-sunken)',
          border: `var(--border-width) solid ${
            err ? 'color-mix(in srgb, var(--danger) 30%, transparent)' : 'var(--border-subtle)'
          }`,
          borderRadius: 'var(--radius-md)',
        }}
      >
        <Icon size={18} strokeWidth={1.8} />
      </span>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-h4)',
          lineHeight: 'var(--lh-h4)',
          fontWeight: 'var(--fw-semibold)',
          color: 'var(--text-primary)',
        }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            maxWidth: 380,
            fontSize: 'var(--text-small)',
            lineHeight: 'var(--lh-small)',
            color: 'var(--text-secondary)',
            textWrap: 'pretty',
          }}
        >
          {description}
        </div>
      )}
      {action && <div style={{ marginTop: 4 }}>{action}</div>}
    </div>
  )
}
