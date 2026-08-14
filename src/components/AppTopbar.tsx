import { Bell, Building2, Search } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'

const VIEW_TITLES: Record<string, { title: string; breadcrumb: string }> = {
  dashboard: { title: 'Dashboard', breadcrumb: 'Resumen' },
  products: { title: 'Productos', breadcrumb: 'Inventario' },
  repairs: { title: 'Reparaciones', breadcrumb: 'Órdenes de trabajo' },
  sales: { title: 'Ventas', breadcrumb: 'Caja' },
  customers: { title: 'Clientes', breadcrumb: 'Directorio' },
  reports: { title: 'Reportes', breadcrumb: 'Análisis' },
  license: { title: 'Licencia', breadcrumb: 'Cuenta' },
  settings: { title: 'Configuración', breadcrumb: 'Cuenta' },
}

interface AppTopbarProps {
  currentView: string
  userProfile: any
}

/**
 * Topbar de 52px. Es la pieza que faltaba del shell: hasta ahora el contenido
 * empezaba pegado al borde de la ventana y la marca solo vivía en el sidebar.
 */
export function AppTopbar({ currentView, userProfile }: AppTopbarProps) {
  const meta = VIEW_TITLES[currentView] || { title: currentView, breadcrumb: 'Oryon' }
  const branch = userProfile?.companyName || 'Oryon'

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        height: 'var(--topbar-height)',
        padding: '0 16px',
        flex: '0 0 auto',
        background: 'var(--surface-card)',
        borderBottom: 'var(--border-width) solid var(--border-subtle)',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 'var(--text-caption)',
            letterSpacing: 'var(--tr-caption)',
            textTransform: 'uppercase',
            fontWeight: 'var(--fw-semibold)',
            color: 'var(--text-tertiary)',
          }}
        >
          {meta.breadcrumb}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-h4)',
            fontWeight: 'var(--fw-semibold)',
            letterSpacing: 'var(--tr-h4)',
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
          }}
        >
          {meta.title}
        </div>
      </div>

      {/* Buscador global: OT, cliente o IMEI — los tres identificadores del taller. */}
      <div className="hidden md:block" style={{ flex: 1, maxWidth: 340, position: 'relative' }}>
        <Search
          size={14}
          style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-tertiary)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="search"
          placeholder="Buscar OT, cliente o IMEI"
          style={{
            width: '100%',
            height: 'var(--control-height-sm)',
            padding: '0 10px 0 30px',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-small)',
            color: 'var(--text-primary)',
            background: 'var(--bg-sunken)',
            border: 'var(--border-width) solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            outline: 'none',
          }}
        />
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <ThemeToggle />

        <button
          aria-label="Notificaciones"
          className="oryon-nav-item"
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 32,
            height: 32,
            color: 'var(--text-secondary)',
            background: 'transparent',
            border: 0,
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
          }}
        >
          <Bell size={16} />
        </button>

        <div
          className="hidden sm:flex"
          style={{
            alignItems: 'center',
            gap: 8,
            paddingLeft: 10,
            marginLeft: 4,
            borderLeft: 'var(--border-width) solid var(--border-subtle)',
            minWidth: 0,
          }}
        >
          <Building2 size={14} style={{ color: 'var(--text-tertiary)', flex: '0 0 auto' }} />
          <span
            style={{
              fontSize: 'var(--text-small)',
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 180,
            }}
          >
            {branch}
          </span>
        </div>
      </div>
    </header>
  )
}
