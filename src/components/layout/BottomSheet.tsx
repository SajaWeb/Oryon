import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

/**
 * Hoja inferior del layout móvil: es la superficie donde el diseño de teléfono pone el
 * detalle de un registro y el panel de filtros. Velo grafito al 72 %, grabber, radio 6px
 * arriba y `oryon-sheet` a 220ms. El pie queda fuera del área con scroll para que las
 * acciones estén siempre a un pulgar de distancia.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  header,
  children,
  footer,
  maxHeight = '88%',
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  /** Cabecera completa; sustituye a `title` cuando hace falta más de una línea. */
  header?: ReactNode
  children: ReactNode
  footer?: ReactNode
  maxHeight?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, background: 'var(--overlay)', animation: 'oryon-fade 180ms var(--ease)' }}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          maxHeight,
          background: 'var(--surface-raised)',
          borderTop: 'var(--border-width) solid var(--border-default)',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          boxShadow: '0 -20px 48px -14px rgba(0,0,0,.75)',
          animation: 'oryon-sheet 220ms var(--ease)',
        }}
      >
        <div style={{ flex: '0 0 auto', padding: '10px 16px 0' }}>
          <div
            style={{
              width: 36,
              height: 4,
              margin: '0 auto 14px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--border-strong)',
            }}
          />
          {header ??
            (title && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  paddingBottom: 12,
                  borderBottom: 'var(--border-width) solid var(--border-subtle)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'var(--text-h4)',
                    lineHeight: 'var(--lh-h4)',
                    letterSpacing: 'var(--tr-h4)',
                    fontWeight: 'var(--fw-semibold)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {title}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar"
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    flex: '0 0 auto',
                    width: 'var(--tap-target)',
                    height: 'var(--tap-target)',
                    margin: '-10px -10px -10px 0',
                    color: 'var(--text-secondary)',
                    background: 'transparent',
                    border: 0,
                    cursor: 'pointer',
                  }}
                >
                  <X size={18} strokeWidth={2} />
                </button>
              </div>
            ))}
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 16px' }}>{children}</div>

        {footer ? (
          <div
            style={{
              flex: '0 0 auto',
              padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
              borderTop: 'var(--border-width) solid var(--border-subtle)',
              background: 'var(--surface-raised)',
            }}
          >
            {footer}
          </div>
        ) : (
          <div style={{ flex: '0 0 auto', height: 'env(safe-area-inset-bottom)' }} />
        )}
      </div>
    </div>
  )
}
