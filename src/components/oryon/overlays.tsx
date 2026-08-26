import { useEffect, useId, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from './controls'

/* ---------------------------------------------------------------------------
   Dialog — la superficie modal del sistema.

   Sigue el documento: velo de grafito al 55 %, panel sobre --surface-raised con
   borde de 1px y radio 6px, cabecera y pie separados por líneas, y el pie sobre
   --bg-sunken para que se lea como zona de control y no de datos.

   Dos añadidos sobre el documento, ambos por los formularios de alta:
   - `xl` (960px). Los tamaños del documento llegan a 720, que se queda corto para
     un formulario de dos columnas; el documento sí pide densidad.
   - El cuerpo tiene scroll propio, con la cabecera y el pie fijos. Un formulario
     largo no debe empujar las acciones fuera de la vista.
   --------------------------------------------------------------------------- */

const WIDTHS = { sm: 400, md: 520, lg: 720, xl: 960 } as const

export type DialogSize = keyof typeof WIDTHS

/** Elementos que pueden recibir foco dentro del panel. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Dialog({
  open = false,
  title,
  description,
  footer,
  onClose,
  size = 'md',
  children,
  style,
  bodyStyle,
  ...rest
}: {
  open?: boolean
  title?: ReactNode
  description?: ReactNode
  footer?: ReactNode
  onClose?: () => void
  size?: DialogSize
  children: ReactNode
  style?: CSSProperties
  bodyStyle?: CSSProperties
}) {
  const panel = useRef<HTMLDivElement | null>(null)
  const body = useRef<HTMLDivElement | null>(null)
  const restoreFocus = useRef<HTMLElement | null>(null)
  const titleId = useId()

  /* `onClose` suele llegar como arrow nueva en cada render. Guardarla en una ref
     mantiene el efecto de abajo dependiendo solo de `open`: si dependiera de la
     función, cada tecla pulsada lo volvería a ejecutar, devolvería el foco y el
     usuario no podría escribir más de un carácter seguido. */
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return

    restoreFocus.current = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    /* El foco entra en el primer control del CUERPO, no del panel: el primer
       elemento enfocable del panel es la X de cerrar, y abrir un formulario con el
       foco en «cerrar» invita a perder lo escrito. */
    const first = body.current?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? panel.current)?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeRef.current?.()
        return
      }
      /* Trampa de foco: sin ella el tabulador se va detrás del velo, a controles
         que el usuario no ve y no debería poder tocar. */
      if (e.key !== 'Tab' || !panel.current) return
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      )
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
      restoreFocus.current?.focus?.()
    }
    // Solo `open`: ver la nota de closeRef.
  }, [open])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '6vh 16px',
        background: 'color-mix(in srgb, var(--alu-950) 55%, transparent)',
        animation: 'oryon-fade 180ms var(--ease)',
      }}
    >
      <div
        {...rest}
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: WIDTHS[size] ?? WIDTHS.md,
          maxHeight: '88vh',
          background: 'var(--surface-raised)',
          border: 'var(--border-width) solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          outline: 'none',
          ...style,
        }}
      >
        {(title || onClose) && (
          <header
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              flex: '0 0 auto',
              padding: '14px 16px',
              borderBottom: 'var(--border-width) solid var(--border-subtle)',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              {title && (
                <h3
                  id={titleId}
                  style={{
                    margin: 0,
                    fontFamily: 'var(--font-display)',
                    fontSize: 'var(--text-h3)',
                    lineHeight: 'var(--lh-h3)',
                    letterSpacing: 'var(--tr-h3)',
                    fontWeight: 'var(--fw-semibold)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {title}
                </h3>
              )}
              {description && (
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: 'var(--text-small)',
                    lineHeight: 'var(--lh-small)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {description}
                </p>
              )}
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                style={{
                  display: 'inline-flex',
                  flex: '0 0 auto',
                  padding: 4,
                  color: 'var(--text-tertiary)',
                  background: 'transparent',
                  border: 0,
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                }}
              >
                <X size={16} strokeWidth={2} />
              </button>
            )}
          </header>
        )}

        <div ref={body} style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: 16, ...bodyStyle }}>
          {children}
        </div>

        {footer && (
          <footer
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 8,
              flex: '0 0 auto',
              padding: '12px 16px',
              borderTop: 'var(--border-width) solid var(--border-subtle)',
              background: 'var(--bg-sunken)',
              borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
            }}
          >
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------
   ConfirmDialog — confirmación de una acción que no se puede deshacer.

   Sustituye a `confirm()` del navegador, que además de salirse del sistema de
   diseño **congela la página entera** hasta que alguien lo cierre: si el usuario
   deja el equipo un momento, la app queda bloqueada, y en móvil el cuadro nativo
   aparece pegado a la barra de direcciones, lejos del pulgar.

   El botón peligroso no es el que tiene el foco al abrir: lo toma «Cancelar», que
   es la salida segura cuando alguien pulsa Enter por inercia.
   --------------------------------------------------------------------------- */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  loading = false,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean
  title: ReactNode
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
  /** Detalle extra: qué se va a borrar exactamente. */
  children?: ReactNode
}) {
  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onCancel}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={loading} disabled={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children ?? (
        <p style={{ margin: 0, fontSize: 'var(--text-body)', lineHeight: 'var(--lh-body)', color: 'var(--text-secondary)' }}>
          Esta acción no se puede deshacer.
        </p>
      )}
    </Dialog>
  )
}
