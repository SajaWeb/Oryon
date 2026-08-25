import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { IconButton } from '../oryon'

/**
 * Panel de detalle de escritorio: 400px, 320px en tablet. Es hermano del área con scroll,
 * no un modal: el diseño quiere poder mirar la tabla y la ficha a la vez.
 */
export function DetailDrawer({
  onClose,
  kind,
  title,
  meta,
  compact = false,
  children,
}: {
  onClose: () => void
  /** Micro-label en mayúsculas: "Detalle de producto", "Orden de trabajo", "Venta"… */
  kind: string
  title: ReactNode
  meta?: ReactNode
  compact?: boolean
  children: ReactNode
}) {
  return (
    <aside
      aria-label={kind}
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: '0 0 auto',
        width: compact ? 320 : 400,
        minHeight: 0,
        background: 'var(--surface-card)',
        borderLeft: 'var(--border-width) solid var(--border-default)',
        boxShadow: 'var(--shadow-lg)',
        animation: 'oryon-drawer 180ms var(--ease)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          flex: '0 0 auto',
          padding: '12px 14px',
          borderBottom: 'var(--border-width) solid var(--border-subtle)',
        }}
      >
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span
            style={{
              fontSize: 'var(--text-caption)',
              letterSpacing: 'var(--tr-caption)',
              textTransform: 'uppercase',
              fontWeight: 'var(--fw-semibold)',
              color: 'var(--text-tertiary)',
            }}
          >
            {kind}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-h4)',
              lineHeight: 'var(--lh-h4)',
              letterSpacing: 'var(--tr-h4)',
              fontWeight: 'var(--fw-semibold)',
              color: 'var(--text-primary)',
              textWrap: 'pretty',
            }}
          >
            {title}
          </span>
          {meta && <span style={{ fontSize: 'var(--text-small)', color: 'var(--text-secondary)' }}>{meta}</span>}
        </div>
        <IconButton icon={X} label="Cerrar" onClick={onClose} />
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {children}
      </div>
    </aside>
  )
}
