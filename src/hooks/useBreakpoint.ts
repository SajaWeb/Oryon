import { useEffect, useState } from 'react'

/**
 * Un único corte de responsive para toda la app.
 *
 * Antes convivían dos y no coincidían: `ui/use-mobile.ts` decía 768 y el shell decía 1024,
 * así que la tablet quedaba en tierra de nadie — sidebar de móvil con rejillas de escritorio.
 * Aquí se fija el contrato de los documentos de diseño:
 *
 *   mobile  (<768)      header propio + bottom nav + hojas inferiores
 *   tablet  (768–1023)  escritorio compacto: rail de 56px, KPIs a 2 columnas, drawer 320px
 *   desktop (≥1024)     sidebar 236px, tablas densas, drawer 400px
 *
 * `compact` es el mismo prop `compact` del documento de escritorio.
 */
export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

const TABLET_MIN = 768
const DESKTOP_MIN = 1024

function read(): Breakpoint {
  if (typeof window === 'undefined') return 'desktop'
  const w = window.innerWidth
  if (w < TABLET_MIN) return 'mobile'
  if (w < DESKTOP_MIN) return 'tablet'
  return 'desktop'
}

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(read)

  useEffect(() => {
    const queries = [
      window.matchMedia(`(min-width: ${TABLET_MIN}px)`),
      window.matchMedia(`(min-width: ${DESKTOP_MIN}px)`),
    ]
    const update = () => setBreakpoint(read())
    queries.forEach((q) => q.addEventListener('change', update))
    update()
    return () => queries.forEach((q) => q.removeEventListener('change', update))
  }, [])

  return {
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    compact: breakpoint === 'tablet',
  }
}
