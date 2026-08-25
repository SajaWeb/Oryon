import type { CSSProperties, ReactNode } from 'react'
import { useShell } from './AppShell'

/**
 * Contenedor de contenido de una vista, con el ritmo del diseño: padding 16/16/20 en
 * escritorio y 14/16/20 en móvil, 14px de separación entre bloques y el ancho útil
 * limitado a --content-max (1440px).
 */
export function PageBody({
  children,
  style,
  gap = 14,
}: {
  children: ReactNode
  style?: CSSProperties
  gap?: number
}) {
  const { isMobile } = useShell()
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap,
        width: '100%',
        maxWidth: 'var(--content-max)',
        margin: '0 auto',
        minWidth: 0,
        padding: isMobile ? '14px 16px 20px' : '16px 16px 20px',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
