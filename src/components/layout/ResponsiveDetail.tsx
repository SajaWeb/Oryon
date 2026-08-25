import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useShell } from './AppShell'
import { DetailDrawer } from './DetailDrawer'
import { BottomSheet } from './BottomSheet'

/**
 * Un mismo detalle, dos superficies: drawer lateral en escritorio/tablet y hoja inferior en
 * móvil. Es la regla que separa los dos documentos del diseño, así que se resuelve una sola
 * vez aquí y no en cada vista.
 */
export function ResponsiveDetail({
  open,
  onClose,
  kind,
  title,
  meta,
  actions,
  children,
}: {
  open: boolean
  onClose: () => void
  kind: string
  title: ReactNode
  meta?: ReactNode
  /** En móvil quedan fijas al pie, fuera del scroll. */
  actions?: ReactNode
  children: ReactNode
}) {
  const { detailSlot, compact, isMobile } = useShell()

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onClose={onClose}
        footer={actions}
        header={
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
              paddingBottom: 12,
              borderBottom: 'var(--border-width) solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
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
                margin: '-10px -10px 0 0',
                color: 'var(--text-secondary)',
                background: 'transparent',
                border: 0,
                cursor: 'pointer',
              }}
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
      </BottomSheet>
    )
  }

  if (!open || !detailSlot) return null

  return createPortal(
    <DetailDrawer onClose={onClose} kind={kind} title={title} meta={meta} compact={compact}>
      {children}
      {actions}
    </DetailDrawer>,
    detailSlot,
  )
}
