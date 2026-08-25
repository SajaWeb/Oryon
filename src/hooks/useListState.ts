import { useCallback, useEffect, useMemo, useState } from 'react'

/**
 * Estado de un listado, unificado para las cuatro vistas de lista.
 *
 * Antes cada una traía su propia copia: el mismo algoritmo de paginación con ventana de 3
 * páginas y elipsis estaba pegado literal en `products/index.tsx`, `RepairsPagination.tsx`,
 * `Sales.tsx` y `Customers.tsx`. Y `repairs/hooks/usePagination.ts` no se podía reutilizar
 * porque estaba tipado a `Repair[]`.
 *
 * Además resuelve que escritorio y móvil paginan distinto según el diseño:
 *  - escritorio/tablet: páginas numeradas en el pie de la tarjeta,
 *  - móvil: carga incremental con "Cargar más (N restantes)".
 */
export interface ListStateOptions {
  /** Total de filas ya filtradas. */
  total: number
  /** Filas por página en escritorio. */
  pageSize?: number
  /** Filas por tanda en móvil. */
  chunkSize?: number
  isMobile: boolean
  /** Cambia cuando cambian búsqueda o filtros: reinicia la posición. */
  resetKey: unknown
}

export function useListState({
  total,
  pageSize = 8,
  chunkSize = 6,
  isMobile,
  resetKey,
}: ListStateOptions) {
  const [page, setPage] = useState(1)
  const [visible, setVisible] = useState(chunkSize)

  // Buscar o filtrar y quedarse en la página 7 no tiene sentido: se vuelve al principio.
  useEffect(() => {
    setPage(1)
    setVisible(chunkSize)
  }, [resetKey, chunkSize])

  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, pageCount)

  const desktop = useMemo(() => {
    const from = (safePage - 1) * pageSize
    const to = Math.min(from + pageSize, total)
    return {
      from,
      to,
      pageCount,
      page: safePage,
      rangeLabel: total ? `${from + 1}–${to} de ${total} registros` : '0 registros',
      /** Ventana de páginas con elipsis: 1 … 4 5 6 … 12 */
      pages: pageWindow(safePage, pageCount),
      goTo: (n: number) => setPage(Math.min(Math.max(1, n), pageCount)),
      prev: () => setPage((p) => Math.max(1, Math.min(p, pageCount) - 1)),
      next: () => setPage((p) => Math.min(pageCount, Math.min(p, pageCount) + 1)),
    }
  }, [safePage, pageCount, pageSize, total])

  const mobile = useMemo(() => {
    const shown = Math.min(visible, total)
    return {
      shown,
      remaining: Math.max(0, total - shown),
      hasMore: shown < total,
      loadMore: () => setVisible((v) => v + chunkSize),
    }
  }, [visible, total, chunkSize])

  const slice = useCallback(
    <T,>(rows: T[]): T[] =>
      isMobile ? rows.slice(0, mobile.shown) : rows.slice(desktop.from, desktop.to),
    [isMobile, mobile.shown, desktop.from, desktop.to],
  )

  return { desktop, mobile, slice }
}

/**
 * Páginas a mostrar: siempre la primera y la última, la actual con un vecino a cada lado,
 * y `null` donde va la elipsis.
 */
function pageWindow(current: number, count: number): (number | null)[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1)

  const pages: (number | null)[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(count - 1, current + 1)

  if (start > 2) pages.push(null)
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < count - 1) pages.push(null)
  pages.push(count)

  return pages
}
