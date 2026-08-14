import { LucideIcon } from 'lucide-react'

/**
 * KPI del dashboard, con la anatomía de MetricCard del sistema de diseño:
 * label en caption con tracking, valor en Archivo tabular, sublabel en pie.
 *
 * El color ya no llega como clase de Tailwind desde el llamador: se elige un
 * `tone` y el componente lo resuelve contra los tokens. Así los siete estados
 * de OT y los cuatro de feedback son la única fuente de color del tablero.
 */
export type StatTone = 'accent' | 'ready' | 'repair' | 'waiting' | 'diagnosis' | 'danger'

const TONES: Record<StatTone, string> = {
  accent: 'var(--accent-400)',
  ready: 'var(--state-ready)',
  repair: 'var(--state-repair)',
  waiting: 'var(--state-waiting)',
  diagnosis: 'var(--state-diagnosis)',
  danger: 'var(--danger)',
}

interface StatCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  tone?: StatTone
  subtitle?: string
  onClick?: () => void
  className?: string
}

export function StatCard({
  title,
  value,
  icon: Icon,
  tone = 'accent',
  subtitle,
  onClick,
  className,
}: StatCardProps) {
  const c = TONES[tone]

  return (
    <div
      className={`oryon-stat ${className || ''}`}
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
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span
          style={{
            fontSize: 'var(--text-caption)',
            letterSpacing: 'var(--tr-caption)',
            textTransform: 'uppercase',
            fontWeight: 'var(--fw-semibold)',
            color: 'var(--text-tertiary)',
          }}
        >
          {title}
        </span>
        <Icon size={14} style={{ color: c, flex: '0 0 auto' }} />
      </div>

      <div
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
      </div>

      {subtitle && (
        <div style={{ fontSize: 'var(--text-small)', color: 'var(--text-tertiary)' }}>{subtitle}</div>
      )}
    </div>
  )
}
