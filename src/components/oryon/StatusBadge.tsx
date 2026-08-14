import type { CSSProperties, HTMLAttributes } from 'react'

/**
 * Los siete estados de una orden de trabajo, ordenados por el flujo real del taller.
 *
 * El cian está reservado a la marca, así que ningún estado lo usa. Y ningún estado
 * transmite información solo por color: el badge siempre lleva la palabra.
 */
export const OT_STATES = {
  cola:        { label: 'En cola',             v: '--state-queued',    fg: '--state-queued-fg' },
  diagnostico: { label: 'En diagnóstico',      v: '--state-diagnosis', fg: '--state-diagnosis-fg' },
  reparacion:  { label: 'En reparación',       v: '--state-repair',    fg: '--state-repair-fg' },
  esperando:   { label: 'Esperando repuesto',  v: '--state-waiting',   fg: '--state-waiting-fg' },
  listo:       { label: 'Listo para entrega',  v: '--state-ready',     fg: '--state-ready-fg' },
  entregado:   { label: 'Entregado',           v: '--state-delivered', fg: '--state-delivered-fg' },
  cancelado:   { label: 'Cancelado',           v: '--state-cancelled', fg: '--state-cancelled-fg' },
} as const

export type OTState = keyof typeof OT_STATES

/**
 * Mapea los nombres de estado que ya usa el backend a los siete canónicos.
 * Se mantiene laxo a propósito: cualquier cosa desconocida cae en `cola`.
 */
const ALIASES: Record<string, OTState> = {
  // Claves que devuelve el backend (inglés, snake_case)
  received: 'cola',
  pending: 'cola',
  diagnosing: 'diagnostico',
  diagnosis: 'diagnostico',
  repairing: 'reparacion',
  in_progress: 'reparacion',
  waiting_parts: 'esperando',
  waiting_for_parts: 'esperando',
  completed: 'listo',
  ready: 'listo',
  repaired: 'listo',
  delivered: 'entregado',
  cancelled: 'cancelado',
  canceled: 'cancelado',

  // Etiquetas en español, tal como aparecen en la interfaz
  pendiente: 'cola',
  recibido: 'cola',
  en_cola: 'cola',
  diagnostico: 'diagnostico',
  en_diagnostico: 'diagnostico',
  en_revision: 'diagnostico',
  revision: 'diagnostico',
  reparacion: 'reparacion',
  en_reparacion: 'reparacion',
  en_proceso: 'reparacion',
  proceso: 'reparacion',
  esperando: 'esperando',
  esperando_repuesto: 'esperando',
  sin_repuesto: 'esperando',
  listo: 'listo',
  reparado: 'listo',
  completado: 'listo',
  terminado: 'listo',
  entregado: 'entregado',
  cancelado: 'cancelado',
  anulado: 'cancelado',
}

export function normalizeState(status?: string | null): OTState {
  if (!status) return 'cola'
  const key = status.toLowerCase().trim().replace(/[\s-]+/g, '_')
  if (key in OT_STATES) return key as OTState
  return ALIASES[key] ?? 'cola'
}

interface StatusBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  status?: string
  label?: string
  size?: 'sm' | 'md'
  style?: CSSProperties
}

export function StatusBadge({ status, label, size = 'md', style, ...rest }: StatusBadgeProps) {
  const key = normalizeState(status)
  const s = OT_STATES[key]
  const dot = `var(${s.v})`
  const fg = `var(${s.fg})`
  const sm = size === 'sm'

  return (
    <span
      {...rest}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: sm ? 20 : 24,
        padding: sm ? '0 7px' : '0 9px',
        fontSize: sm ? 'var(--text-caption)' : 'var(--text-small)',
        lineHeight: 1,
        fontWeight: 'var(--fw-medium)',
        color: fg,
        background: `color-mix(in srgb, ${dot} 10%, transparent)`,
        border: `var(--border-width) solid color-mix(in srgb, ${dot} 26%, transparent)`,
        borderRadius: 'var(--radius-sm)',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 'var(--radius-pill)',
          background: dot,
          flex: '0 0 auto',
        }}
      />
      {label || s.label}
    </span>
  )
}
