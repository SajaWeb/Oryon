import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

/* ---------------------------------------------------------------------------
   SidebarNav — 236px, 56px colapsado. La transición solo anima el ancho:
   el sistema no mueve nada más.
   --------------------------------------------------------------------------- */
export type NavEntry =
  | { section: string; id?: never }
  | { id: string; label: string; icon: LucideIcon; count?: number | null; section?: never }

export function SidebarNav({
  items,
  activeId,
  collapsed = false,
  header,
  footer,
  onSelect,
  style,
}: {
  items: NavEntry[]
  activeId?: string
  collapsed?: boolean
  header?: ReactNode
  footer?: ReactNode
  onSelect?: (id: string) => void
  style?: CSSProperties
}) {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <nav
      aria-label="Navegación principal"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)',
        flex: '0 0 auto',
        height: '100%',
        background: 'var(--surface-card)',
        borderRight: 'var(--border-width) solid var(--border-subtle)',
        transition: 'width var(--duration) var(--ease)',
        ...style,
      }}
    >
      {header && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flex: '0 0 auto',
            height: 'var(--topbar-height)',
            padding: collapsed ? '0 12px' : '0 14px',
            borderBottom: 'var(--border-width) solid var(--border-subtle)',
            overflow: 'hidden',
          }}
        >
          {header}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 8 }}>
        {items.map((entry) => {
          if ('section' in entry && entry.section) {
            return (
              <div
                key={`s-${entry.section}`}
                style={{
                  padding: collapsed ? '12px 6px 4px' : '14px 8px 6px',
                  fontSize: 'var(--text-caption)',
                  letterSpacing: 'var(--tr-caption)',
                  textTransform: 'uppercase',
                  fontWeight: 'var(--fw-semibold)',
                  color: 'var(--text-tertiary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                {/* Colapsado no cabe la palabra, pero el hueco tiene que seguir marcando el corte. */}
                {collapsed ? '·' : entry.section}
              </div>
            )
          }

          const item = entry as Extract<NavEntry, { id: string }>
          const { icon: Icon } = item
          const active = item.id === activeId
          const hover = hovered === item.id

          return (
            <button
              key={item.id}
              type="button"
              title={collapsed ? item.label : undefined}
              aria-current={active ? 'page' : undefined}
              onClick={() => onSelect?.(item.id)}
              onMouseEnter={() => setHovered(item.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                height: 32,
                padding: '0 8px',
                marginBottom: 2,
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-body)',
                fontWeight: active ? 'var(--fw-medium)' : 'var(--fw-regular)',
                textAlign: 'left',
                color: active ? 'var(--text-accent)' : hover ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: active ? 'var(--accent-subtle)' : hover ? 'var(--surface-hover)' : 'transparent',
                border: `var(--border-width) solid ${active ? 'var(--accent-subtle-border)' : 'transparent'}`,
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'background var(--duration-fast) var(--ease), color var(--duration-fast) var(--ease)',
                overflow: 'hidden',
              }}
            >
              <Icon size={16} strokeWidth={1.8} style={{ flex: '0 0 auto' }} />
              {!collapsed && (
                <>
                  <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.label}
                  </span>
                  {item.count != null && (
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--text-mono-sm)',
                        color: active ? 'var(--text-accent)' : 'var(--text-tertiary)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {item.count}
                    </span>
                  )}
                </>
              )}
            </button>
          )
        })}
      </div>

      {footer && (
        <div style={{ flex: '0 0 auto', padding: 8, borderTop: 'var(--border-width) solid var(--border-subtle)' }}>
          {footer}
        </div>
      )}
    </nav>
  )
}

/* ---------------------------------------------------------------------------
   Tabs — subrayado de 2px en el acento, sin cápsulas ni fondos.
   Scroll horizontal en vez de wrap: con 5 pestañas en 390px, envolver rompía
   la altura del contenedor (era el bug de la pantalla de Configuración).
   --------------------------------------------------------------------------- */
export interface TabItem {
  id: string
  label: string
  count?: number | null
}

export function Tabs({
  items,
  value,
  onChange,
  style,
}: {
  items: TabItem[]
  value: string
  onChange?: (id: string) => void
  style?: CSSProperties
}) {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: 2,
        borderBottom: 'var(--border-width) solid var(--border-subtle)',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        ...style,
      }}
    >
      {items.map((it) => {
        const active = it.id === value
        const hover = hovered === it.id
        return (
          <button
            key={it.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange?.(it.id)}
            onMouseEnter={() => setHovered(it.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              flex: '0 0 auto',
              height: 36,
              padding: '0 12px',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-body)',
              fontWeight: active ? 'var(--fw-medium)' : 'var(--fw-regular)',
              color: active || hover ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: 'transparent',
              border: 0,
              borderBottom: `2px solid ${active ? 'var(--accent-fill)' : 'transparent'}`,
              marginBottom: -1,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transition: 'color var(--duration-fast) var(--ease)',
            }}
          >
            {it.label}
            {it.count != null && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-mono-sm)',
                  color: 'var(--text-tertiary)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {it.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
