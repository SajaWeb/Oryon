import type { CSSProperties, FormEvent, ReactNode } from 'react'
import { Dialog, type DialogSize } from '../oryon'
import { BottomSheet } from './BottomSheet'
import { useBreakpoint } from '../../hooks/useBreakpoint'

/**
 * Un mismo formulario, dos superficies: modal centrado en escritorio y tablet,
 * hoja inferior en móvil. Es la misma regla que ya aplica ResponsiveDetail a las
 * fichas; aquí se aplica a los formularios de alta.
 *
 * En móvil no se usa un modal centrado a propósito: con el teclado abierto, un
 * cuadro flotante deja el campo activo tapado. La hoja inferior sube desde abajo y
 * deja las acciones fijas al pie, a un pulgar.
 *
 * Sobre `formId`: el pie vive fuera del <form> —en escritorio es una barra propia
 * sobre --bg-sunken—, así que el botón de guardar no puede enviarlo por
 * proximidad. Se enlazan por id, que es para lo que existe el atributo `form`.
 *
 *   <FormDialog formId="nuevo-producto" onSubmit={guardar}
 *     footer={<Button type="submit" form="nuevo-producto">Guardar</Button>}>
 */
export function FormDialog({
  open,
  onClose,
  title,
  description,
  footer,
  formId,
  onSubmit,
  size = 'xl',
  children,
  bodyStyle,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  /** Acciones. En móvil quedan fijas al pie, fuera del scroll. */
  footer?: ReactNode
  /** Si se pasa, el contenido se envuelve en un <form> con este id. */
  formId?: string
  onSubmit?: (e: FormEvent) => void
  size?: DialogSize
  children: ReactNode
  bodyStyle?: CSSProperties
}) {
  const { isMobile } = useBreakpoint()

  const body = formId ? (
    <form id={formId} onSubmit={onSubmit} noValidate>
      {children}
    </form>
  ) : (
    children
  )

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onClose={onClose}
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
              {description && (
                <span style={{ fontSize: 'var(--text-small)', lineHeight: 'var(--lh-small)', color: 'var(--text-secondary)' }}>
                  {description}
                </span>
              )}
            </div>
          </div>
        }
        footer={
          footer && (
            /* En escritorio el pie alinea a la derecha; en móvil se reparten el
               ancho, que es lo que hace grandes los objetivos táctiles. */
            <div style={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: '1fr', gap: 8 }}>
              {footer}
            </div>
          )
        }
      >
        {body}
      </BottomSheet>
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={footer}
      size={size}
      bodyStyle={bodyStyle}
    >
      {body}
    </Dialog>
  )
}
