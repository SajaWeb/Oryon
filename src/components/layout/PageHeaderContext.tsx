import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * `AppTopbar` deriva el título de un mapa estático por vista, que basta para el 90 % de los
 * casos. Este contexto cubre el resto: subtítulo dinámico ("actualizado 10:28", "31 órdenes")
 * y el botón de refresco, que hasta ahora vivía suelto dentro de cada vista.
 * Si una vista no declara nada, el shell cae al mapa de AppTopbar.
 */
export interface PageHeader {
  title?: string
  subtitle?: string
  /** Eyebrow en Martian Mono del header móvil; por defecto, el breadcrumb de la vista. */
  eyebrow?: string
  onRefresh?: () => void
  refreshing?: boolean
  /**
   * Momento en que la vista terminó de cargar. No lo pasa nadie: lo estampa el
   * propio hook al ver que `refreshing` pasa de true a false. Así el sello de
   * "actualizado 10:28" sale en todas las vistas sin que ninguna lo repita.
   */
  updatedAt?: Date | null
}

/** Hora corta para el sello del header. */
export function stampTime(date: Date): string {
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
}

const PageHeaderCtx = createContext<
  { header: PageHeader; setHeader: (h: PageHeader) => void } | undefined
>(undefined)

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<PageHeader>({})
  const value = useMemo(() => ({ header, setHeader }), [header])
  return <PageHeaderCtx.Provider value={value}>{children}</PageHeaderCtx.Provider>
}

export function usePageHeaderValue(): PageHeader {
  return useContext(PageHeaderCtx)?.header ?? {}
}

/**
 * Declara la cabecera de la vista actual. Llamar en el cuerpo del componente.
 *
 * `onRefresh` casi siempre es una función nueva en cada render. Si entrara tal cual en las
 * dependencias del efecto, cada `setHeader` provocaría un render, que crearía otra función,
 * que dispararía el efecto otra vez: bucle infinito. Por eso se guarda en una ref y hacia
 * fuera se expone un envoltorio estable que solo cambia si aparece o desaparece.
 */
export function usePageHeader({ title, subtitle, eyebrow, onRefresh, refreshing }: PageHeader) {
  const set = useContext(PageHeaderCtx)?.setHeader
  const refreshRef = useRef(onRefresh)
  refreshRef.current = onRefresh

  const hasRefresh = !!onRefresh
  const stableRefresh = useMemo(
    () => (hasRefresh ? () => refreshRef.current?.() : undefined),
    [hasRefresh],
  )

  /* El sello de hora se deduce del propio ciclo de carga: cuando `refreshing`
     baja de true a false, los datos acaban de llegar. Depende sólo de
     `refreshing`, así que no se realimenta con el render que provoca. */
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const wasRefreshing = useRef(false)
  useEffect(() => {
    if (wasRefreshing.current && !refreshing) setUpdatedAt(new Date())
    wasRefreshing.current = !!refreshing
  }, [refreshing])

  useEffect(() => {
    set?.({ title, subtitle, eyebrow, onRefresh: stableRefresh, refreshing, updatedAt })
  }, [set, title, subtitle, eyebrow, stableRefresh, refreshing, updatedAt])
}
