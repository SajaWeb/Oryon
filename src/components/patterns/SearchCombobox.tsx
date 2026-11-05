import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Input } from '../oryon'

/**
 * Buscador con resultados: un solo campo en vez de una lista larga a la vista.
 *
 * Con cientos de clientes o productos, mostrar todo en una caja con scroll
 * obliga a leer y a desplazarse. Aquí se escribe, aparecen unas pocas
 * coincidencias (las mejores primero) y se elige con el ratón, el dedo o el
 * teclado (↑ ↓ Enter, Esc para cerrar). Un lector de código de barras que
 * "teclea" un IMEI y pulsa Enter elige el primer resultado directamente.
 *
 * La lista va en el flujo del formulario (no flotante): dentro de un diálogo
 * con scroll o de una hoja inferior en móvil, un desplegable flotante se
 * recorta; esta no.
 */

export interface ComboOption<T> {
  key: string
  value: T
}

export function SearchCombobox<T>({
  query,
  onQueryChange,
  options,
  onSelect,
  renderOption,
  placeholder,
  ariaLabel,
  size = 'md',
  emptyText = 'Sin coincidencias.',
  footer,
  onFooterSelect,
  showWhenEmpty = true,
  autoFocus = false,
  invalid = false,
  disabled = false,
  hint,
}: {
  query: string
  onQueryChange: (q: string) => void
  /** Ya filtradas y ordenadas; se muestran tal cual. */
  options: ComboOption<T>[]
  onSelect: (value: T) => void
  renderOption: (value: T, active: boolean) => ReactNode
  placeholder: string
  ariaLabel: string
  size?: 'md' | 'lg'
  emptyText?: ReactNode
  /** Última fila fija, también navegable (p. ej. «Crear cliente "Ana"»). */
  footer?: ReactNode
  onFooterSelect?: () => void
  /** Al enfocar sin escribir nada, mostrar ya las opciones (p. ej. las más vendidas). */
  showWhenEmpty?: boolean
  autoFocus?: boolean
  invalid?: boolean
  disabled?: boolean
  /** Línea bajo la lista: "Mostrando 8 de 240…". */
  hint?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()
  const blurTimer = useRef<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const rows = options.length + (footer ? 1 : 0)
  const visible = open && !disabled && (query.trim() !== '' || showWhenEmpty) && (rows > 0 || query.trim() !== '')

  useEffect(() => {
    setActive(0)
  }, [query, options.length])

  // La fila activa siempre a la vista al moverse con el teclado.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-row="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const pick = (index: number) => {
    if (index < options.length) {
      onSelect(options[index].value)
    } else if (footer && onFooterSelect) {
      onFooterSelect()
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => (rows === 0 ? 0 : (i + 1) % rows))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (rows === 0 ? 0 : (i - 1 + rows) % rows))
    } else if (e.key === 'Enter') {
      // Enter nunca envía el formulario desde aquí: elige.
      e.preventDefault()
      if (visible && rows > 0) pick(active)
    } else if (e.key === 'Escape') {
      if (visible) {
        e.preventDefault()
        e.stopPropagation()
        setOpen(false)
      }
    }
  }

  const rowStyle = (isActive: boolean, first: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '9px 12px',
    minHeight: 'var(--tap-target)',
    textAlign: 'left',
    background: isActive ? 'var(--surface-hover)' : 'transparent',
    border: 0,
    borderTop: first ? 0 : 'var(--border-width) solid var(--border-subtle)',
    boxShadow: isActive ? 'inset 2px 0 0 var(--accent-fill)' : 'none',
    cursor: 'pointer',
    color: 'inherit',
    font: 'inherit',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Input
        size={size}
        value={query}
        onChange={(e) => {
          onQueryChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => {
          if (blurTimer.current) window.clearTimeout(blurTimer.current)
          setOpen(true)
        }}
        onBlur={() => {
          // Deja terminar el clic en una fila antes de cerrar.
          blurTimer.current = window.setTimeout(() => setOpen(false), 150)
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        iconLeft={Search}
        aria-label={ariaLabel}
        role="combobox"
        aria-expanded={visible}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={visible && rows > 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        autoFocus={autoFocus}
        invalid={invalid}
        disabled={disabled}
      />

      {visible && (
        <div
          onMouseDown={(e) => e.preventDefault() /* no quitar el foco del campo */}
          style={{
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--surface-raised)',
            border: 'var(--border-width) solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
          }}
        >
        {/* Solo los resultados hacen scroll; la acción del pie siempre se ve. */}
        <div ref={listRef} id={listId} role="listbox" aria-label={ariaLabel} style={{ maxHeight: 280, overflowY: 'auto' }}>
          {options.length === 0 && (
            <p style={{ margin: 0, padding: '12px', fontSize: 'var(--text-small)', color: 'var(--text-tertiary)' }}>{emptyText}</p>
          )}
          {options.map((o, i) => (
            <button
              key={o.key}
              id={`${listId}-${i}`}
              data-row={i}
              type="button"
              role="option"
              aria-selected={i === active}
              tabIndex={-1}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(i)}
              style={rowStyle(i === active, i === 0)}
            >
              {renderOption(o.value, i === active)}
            </button>
          ))}
        </div>
          {footer && (
            <button
              id={`${listId}-${options.length}`}
              data-row={options.length}
              type="button"
              role="option"
              aria-selected={active === options.length}
              tabIndex={-1}
              onMouseEnter={() => setActive(options.length)}
              onClick={() => pick(options.length)}
              style={{ ...rowStyle(active === options.length, false), borderTop: 'var(--border-width) solid var(--border-default)', color: 'var(--text-accent)' }}
            >
              {footer}
            </button>
          )}
          {hint && (
            <p style={{ margin: 0, padding: '7px 12px', fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)', borderTop: 'var(--border-width) solid var(--border-subtle)' }}>
              {hint}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Ordena por relevancia: primero lo que EMPIEZA por la búsqueda, luego lo que la
 * contiene en una palabra, luego en cualquier parte. Sin acentos ni mayúsculas.
 */
export function rankMatches<T>(items: T[], query: string, fields: (item: T) => Array<string | undefined | null>, limit = 8) {
  const q = fold(query)
  if (!q) return { results: items.slice(0, limit), total: items.length }
  const scored: Array<{ item: T; score: number }> = []
  for (const item of items) {
    let best = -1
    for (const raw of fields(item)) {
      const f = fold(raw)
      if (!f) continue
      if (f.startsWith(q)) best = Math.max(best, 3)
      else if (f.includes(` ${q}`)) best = Math.max(best, 2)
      else if (f.includes(q)) best = Math.max(best, 1)
    }
    if (best >= 0) scored.push({ item, score: best })
  }
  scored.sort((a, b) => b.score - a.score)
  return { results: scored.slice(0, limit).map((s) => s.item), total: scored.length }
}

export function fold(v?: string | null): string {
  return String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/** Para identificadores (IMEI, placa, teléfono): sin acentos, espacios ni guiones. */
export function compactKey(v?: string | null): string {
  return fold(v).replace(/[^a-z0-9]/g, '')
}

/**
 * Puntaje de una fila para una búsqueda: 0 si no coincide. Misma regla que el
 * buscador de los formularios, para que buscar se sienta igual en toda la app.
 *  - `fields`: texto (nombre, categoría…), sin acentos ni mayúsculas.
 *  - `keys`: identificadores (teléfono, IMEI, documento), comparados sin
 *    espacios ni guiones: "300 123-4567" encuentra 3001234567.
 */
export function matchScore(query: string, fields: Array<string | undefined | null>, keys: Array<string | undefined | null> = []): number {
  const q = fold(query)
  if (!q) return 1
  let best = 0
  for (const raw of fields) {
    const f = fold(raw)
    if (!f) continue
    if (f.startsWith(q)) best = Math.max(best, 4)
    else if (f.includes(` ${q}`)) best = Math.max(best, 3)
    else if (f.includes(q)) best = Math.max(best, 2)
  }
  const qk = compactKey(query)
  if (qk.length >= 3) {
    for (const raw of keys) {
      const k = compactKey(raw)
      if (k && k.includes(qk)) best = Math.max(best, k.startsWith(qk) ? 4 : 2)
    }
  }
  return best
}

/** Filtra y, si hay búsqueda, ordena por relevancia (estable: empata en el orden recibido). */
export function searchRows<T>(rows: T[], query: string, score: (row: T) => number): T[] {
  if (!fold(query)) return rows
  return rows
    .map((row, i) => ({ row, i, s: score(row) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.row)
}
