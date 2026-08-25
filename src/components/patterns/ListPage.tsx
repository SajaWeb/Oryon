import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight, ChevronsDown, Download, Search, SlidersHorizontal, X, type LucideIcon } from 'lucide-react'
import { Button, Card, DataTable, EmptyState, IconButton, Input, Select, type Column, type SelectOption } from '../oryon'
import { PageBody } from '../layout/PageBody'
import { BottomSheet } from '../layout/BottomSheet'
import { useShell } from '../layout/AppShell'
import { useListState } from '../../hooks/useListState'

/**
 * El listado del producto, en sus dos formas.
 *
 * Los dos documentos de diseño resuelven la misma pantalla de manera distinta y esa
 * diferencia es intencional, no un accidente de tamaño:
 *
 *  - escritorio/tablet → tabla densa dentro de una tarjeta sin padding, con pie de
 *    paginación y drawer de detalle al lado. El objetivo declarado es "ver treinta órdenes
 *    sin bajar el scroll".
 *  - móvil → tarjetas, filtros en hoja inferior con contador y carga incremental.
 *
 * Antes cada vista reimplementaba su versión (y ninguna tenía la de escritorio).
 */
export interface FilterSpec {
  id: string
  /** Etiqueta visible solo en la hoja de filtros de móvil. */
  label: string
  placeholder: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  /** `date` para rangos de fecha (ventas); por defecto, un desplegable. */
  type?: 'select' | 'date'
}

export interface ListPageProps<T extends Record<string, any>> {
  /** Filas ya filtradas y ordenadas por la vista. */
  rows: T[]
  columns: Column<T>[]
  /** Tarjeta de móvil para una fila. */
  renderCard: (row: T) => ReactNode
  search: { value: string; onChange: (v: string) => void; placeholder: string }
  filters?: FilterSpec[]
  onClearFilters: () => void
  primaryAction?: { label: string; icon?: LucideIcon; onClick: () => void }
  onExport?: () => void
  /** Acciones propias de la vista (historial de inventario, etc.), junto a la primaria. */
  secondaryActions?: ReactNode
  /** Cabecera de la tarjeta en escritorio: "Inventario · 9 productos, 5 con stock bajo". */
  tableTitle: string
  tableSubtitle?: string
  /** Resumen de móvil bajo el buscador: "Mostrando 6 de 43 órdenes". */
  countLabel: (shown: number, total: number) => string
  endLabel: (total: number) => string
  empty: { icon: LucideIcon; title: string; description: string }
  selectedId?: string | number | null
  onRowClick?: (row: T) => void
  rowKey?: string
  pageSize?: number
  chunkSize?: number
  /** Bloques extra sobre la lista (alertas de sucursal, de seguimiento…). */
  banner?: ReactNode
  /** Chips de estado sobre la lista en móvil (reparaciones). */
  chips?: ReactNode
}

function FilterControl({ filter, size }: { filter: FilterSpec; size: 'sm' | 'lg' }) {
  if (filter.type === 'date') {
    return (
      <Input
        type="date"
        size={size}
        value={filter.value}
        aria-label={filter.label}
        onChange={(e) => filter.onChange(e.target.value)}
      />
    )
  }
  return (
    <Select
      size={size}
      placeholder={filter.placeholder}
      value={filter.value}
      options={filter.options}
      onChange={(e) => filter.onChange(e.target.value)}
    />
  )
}

export function ListPage<T extends Record<string, any>>({
  rows,
  columns,
  renderCard,
  search,
  filters = [],
  onClearFilters,
  primaryAction,
  onExport,
  secondaryActions,
  tableTitle,
  tableSubtitle,
  countLabel,
  endLabel,
  empty,
  selectedId,
  onRowClick,
  rowKey = 'id',
  pageSize = 8,
  chunkSize = 6,
  banner,
  chips,
}: ListPageProps<T>) {
  const { isMobile, compact } = useShell()
  const [sheetOpen, setSheetOpen] = useState(false)

  const activeFilters = filters.filter((f) => f.value).length
  const resetKey = useMemo(
    () => `${search.value}|${filters.map((f) => f.value).join('|')}`,
    [search.value, filters],
  )
  const { desktop, mobile, slice } = useListState({
    total: rows.length,
    pageSize,
    chunkSize,
    isMobile,
    resetKey,
  })

  const visibleRows = slice(rows)
  const isEmpty = rows.length === 0

  const clearAll = () => {
    search.onChange('')
    onClearFilters()
  }

  /* ─────────────── MÓVIL ─────────────── */
  if (isMobile) {
    return (
      <>
        <PageBody gap={12}>
          {/* Acciones en su propia fila, alineadas a la derecha bajo el título del header:
              a 390px no caben junto al buscador sin desbordar. */}
          {(primaryAction || secondaryActions) && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              {secondaryActions}
              {primaryAction && (
                <Button variant="primary" size="lg" iconLeft={primaryAction.icon} onClick={primaryAction.onClick}>
                  {primaryAction.label}
                </Button>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              iconLeft={Search}
              size="lg"
              placeholder={search.placeholder}
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              suffix={
                search.value ? (
                  <button
                    type="button"
                    onClick={() => search.onChange('')}
                    aria-label="Limpiar búsqueda"
                    style={{ display: 'flex', color: 'var(--text-tertiary)', background: 'transparent', border: 0, cursor: 'pointer', padding: 0 }}
                  >
                    <X size={15} strokeWidth={2} />
                  </button>
                ) : undefined
              }
            />
            {filters.length > 0 && (
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                aria-label="Filtros"
                style={{
                  position: 'relative',
                  display: 'grid',
                  placeItems: 'center',
                  flex: '0 0 auto',
                  width: 'var(--tap-target)',
                  height: 'var(--control-height-lg)',
                  color: 'var(--text-secondary)',
                  background: 'var(--surface-card)',
                  border: 'var(--border-width) solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                }}
              >
                <SlidersHorizontal size={18} strokeWidth={1.8} />
                {activeFilters > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      minWidth: 17,
                      height: 17,
                      padding: '0 4px',
                      borderRadius: 'var(--radius-pill)',
                      background: 'var(--accent-fill)',
                      color: 'var(--text-on-accent)',
                      font: '700 10px/17px var(--font-mono)',
                      textAlign: 'center',
                    }}
                  >
                    {activeFilters}
                  </span>
                )}
              </button>
            )}
          </div>

          {chips}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-mono-sm)',
                color: 'var(--text-tertiary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {countLabel(mobile.shown, rows.length)}
            </span>
            {(activeFilters > 0 || search.value) && (
              <button
                type="button"
                onClick={clearAll}
                style={{
                  fontSize: 'var(--text-mono-sm)',
                  fontWeight: 'var(--fw-medium)',
                  color: 'var(--text-accent)',
                  background: 'transparent',
                  border: 0,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {banner}

          {isEmpty ? (
            <Card>
              <EmptyState
                icon={empty.icon}
                title={empty.title}
                description={empty.description}
                action={<Button onClick={clearAll}>Limpiar búsqueda y filtros</Button>}
              />
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {visibleRows.map((row, i) => (
                <div key={row[rowKey] ?? i}>{renderCard(row)}</div>
              ))}
            </div>
          )}

          {mobile.hasMore && (
            <Button size="lg" fullWidth iconLeft={ChevronsDown} onClick={mobile.loadMore}>
              Cargar más ({mobile.remaining} restantes)
            </Button>
          )}
          {!isEmpty && !mobile.hasMore && (
            <span
              style={{
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-mono-sm)',
                color: 'var(--text-disabled)',
              }}
            >
              {endLabel(rows.length)}
            </span>
          )}
        </PageBody>

        <BottomSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Filtros"
          footer={
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Button size="lg" fullWidth onClick={onClearFilters}>
                Limpiar
              </Button>
              <Button variant="primary" size="lg" fullWidth onClick={() => setSheetOpen(false)}>
                Ver {rows.length} resultados
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filters.map((f) => (
              <label key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span
                  style={{
                    fontSize: 'var(--text-caption)',
                    letterSpacing: 'var(--tr-caption)',
                    textTransform: 'uppercase',
                    fontWeight: 'var(--fw-semibold)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {f.label}
                </span>
                <FilterControl filter={f} size="lg" />
              </label>
            ))}
          </div>
        </BottomSheet>
      </>
    )
  }

  /* ─────────────── ESCRITORIO / TABLET ─────────────── */
  return (
    <PageBody gap={12}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 260px', minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px', minWidth: 0, maxWidth: 280 }}>
            <Input
              iconLeft={Search}
              size="sm"
              placeholder={search.placeholder}
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
            />
          </div>
          {filters.map((f) => (
            <div key={f.id} style={{ flex: '1 1 160px', minWidth: 0, maxWidth: 200 }}>
              <FilterControl filter={f} size="sm" />
            </div>
          ))}
          {(activeFilters > 0 || search.value) && (
            <Button size="sm" iconLeft={X} onClick={clearAll}>
              Limpiar
            </Button>
          )}
        </div>

        <div style={{ flex: '0 0 auto', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {secondaryActions}
          {onExport && <IconButton icon={Download} label="Exportar" variant="secondary" size="sm" onClick={onExport} />}
          {primaryAction && (
            <Button variant="primary" size="sm" iconLeft={primaryAction.icon} onClick={primaryAction.onClick}>
              {primaryAction.label}
            </Button>
          )}
        </div>
      </div>

      <Card
        padding={0}
        title={tableTitle}
        subtitle={tableSubtitle}
        footer={
          !isEmpty && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-mono-sm)',
                  color: 'var(--text-tertiary)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {desktop.rangeLabel}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconButton
                  icon={ChevronLeft}
                  label="Anterior"
                  size="sm"
                  disabled={desktop.page === 1}
                  onClick={desktop.prev}
                />
                {desktop.pages.map((p, i) =>
                  p === null ? (
                    <span key={`gap-${i}`} style={{ color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}>
                      ·
                    </span>
                  ) : (
                    <Button
                      key={p}
                      size="sm"
                      variant={p === desktop.page ? 'primary' : 'ghost'}
                      onClick={() => desktop.goTo(p)}
                      style={{ minWidth: 32 }}
                    >
                      {p}
                    </Button>
                  ),
                )}
                <IconButton
                  icon={ChevronRight}
                  label="Siguiente"
                  size="sm"
                  disabled={desktop.page === desktop.pageCount}
                  onClick={desktop.next}
                />
              </div>
            </div>
          )
        }
      >
        {banner && <div style={{ padding: '12px 16px 0' }}>{banner}</div>}
        {isEmpty ? (
          <EmptyState
            icon={empty.icon}
            title={empty.title}
            description={empty.description}
            action={<Button onClick={clearAll}>Limpiar búsqueda y filtros</Button>}
          />
        ) : (
          <DataTable
            columns={columns}
            rows={visibleRows}
            compact={compact}
            selectedId={selectedId}
            onRowClick={onRowClick}
            rowKey={rowKey}
          />
        )}
      </Card>
    </PageBody>
  )
}
