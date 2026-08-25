import type { CSSProperties } from 'react'
import { Ellipsis } from 'lucide-react'
import { bottomNavItems, type ViewId } from './navItems'

/**
 * Barra de navegación inferior: la pieza que faltaba del layout móvil. Antes la navegación
 * en teléfono estaba a dos toques (hamburguesa → drawer) desde cualquier pantalla.
 * Cinco destinos + "Más", cada celda con 44px de alto y respetando el home indicator.
 */
export function BottomNav({
  currentView,
  onNavigate,
  onOpenMore,
  moreOpen,
  role,
  moreViewIds,
}: {
  currentView: string
  onNavigate: (view: ViewId) => void
  onOpenMore: () => void
  moreOpen: boolean
  role?: string
  /** Vistas que viven en "Más": mantienen el botón marcado mientras estás en ellas. */
  moreViewIds: string[]
}) {
  const items = bottomNavItems(role)
  const moreActive = moreOpen || moreViewIds.includes(currentView)

  const cell = (active: boolean): CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: '5px 2px',
    minHeight: 'var(--tap-target)',
    color: active ? 'var(--text-accent)' : 'var(--text-tertiary)',
    background: 'transparent',
    border: 0,
    cursor: 'pointer',
    transition: 'color var(--duration-fast) var(--ease)',
  })

  const label: CSSProperties = {
    fontSize: 10,
    lineHeight: '12px',
    fontWeight: 'var(--fw-medium)',
    whiteSpace: 'nowrap',
  }

  return (
    <nav
      aria-label="Navegación principal"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${items.length + 1},1fr)`,
        flex: '0 0 auto',
        padding: '7px 4px calc(7px + env(safe-area-inset-bottom))',
        background: 'var(--surface-card)',
        borderTop: 'var(--border-width) solid var(--border-subtle)',
      }}
    >
      {items.map(({ id, icon: Icon, shortLabel }) => {
        const active = currentView === id
        return (
          <button
            key={id}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => onNavigate(id)}
            style={cell(active)}
          >
            <Icon size={20} strokeWidth={1.7} />
            <span style={label}>{shortLabel}</span>
          </button>
        )
      })}

      <button
        type="button"
        aria-label="Más módulos"
        aria-expanded={moreOpen}
        onClick={onOpenMore}
        style={cell(moreActive)}
      >
        <Ellipsis size={20} strokeWidth={1.7} />
        <span style={label}>Más</span>
      </button>
    </nav>
  )
}
