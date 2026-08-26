import { Building2, PanelLeft, RefreshCw } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { stampTime, usePageHeaderValue } from './layout/PageHeaderContext'

/** Título y eyebrow de cada vista. Lo comparten la topbar de escritorio y el header móvil. */
export const VIEW_TITLES: Record<string, { title: string; breadcrumb: string }> = {
  dashboard: { title: 'Dashboard', breadcrumb: 'Resumen' },
  products: { title: 'Productos', breadcrumb: 'Inventario' },
  repairs: { title: 'Reparaciones', breadcrumb: 'Órdenes de trabajo' },
  /* 'Caja' dejó de servir como breadcrumb de Ventas: ahora es una vista propia. */
  sales: { title: 'Ventas', breadcrumb: 'Facturación' },
  cash: { title: 'Caja', breadcrumb: 'Operación' },
  customers: { title: 'Clientes', breadcrumb: 'Directorio' },
  reports: { title: 'Reportes', breadcrumb: 'Análisis' },
  license: { title: 'Licencia', breadcrumb: 'Cuenta' },
  settings: { title: 'Configuración', breadcrumb: 'Cuenta' },
}

interface AppTopbarProps {
  currentView: string
  userProfile: any
  /** Nombre real de la empresa. Viene de `company:<id>.name`, no del perfil. */
  companyName?: string
  /** Solo en escritorio: en tablet el rail está colapsado a la fuerza y no se ofrece. */
  onToggleSidebar?: () => void
  collapsed?: boolean
}

/**
 * Topbar de 52px. Es la pieza que faltaba del shell: hasta ahora el contenido
 * empezaba pegado al borde de la ventana y la marca solo vivía en el sidebar.
 */
export function AppTopbar({ currentView, userProfile, companyName, onToggleSidebar, collapsed }: AppTopbarProps) {
  const meta = VIEW_TITLES[currentView] || { title: currentView, breadcrumb: 'Oryon' }
  /* Antes esto era `userProfile?.companyName || 'Oryon'`, y ningún perfil guarda
     ese campo: el rótulo decía "Oryon" en todas las cuentas, como si así se
     llamara el taller. El nombre vive en el registro de la empresa. */
  const empresa = companyName || userProfile?.companyName || ''
  // La vista puede matizar la cabecera: subtítulo vivo ("actualizado 10:28") y refresco.
  const page = usePageHeaderValue()

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
      {onToggleSidebar && (
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
          title={collapsed ? 'Expandir menú' : 'Contraer menú'}
          className="oryon-nav-item"
          style={{
            display: 'grid',
            placeItems: 'center',
            flex: '0 0 auto',
            width: 32,
            height: 32,
            marginRight: -4,
            color: 'var(--text-secondary)',
            background: 'transparent',
            border: 0,
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
          }}
        >
          <PanelLeft size={16} />
        </button>
      )}

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

      {(page.subtitle || page.updatedAt) && (
        <span
          className="hidden lg:block"
          style={{
            minWidth: 0,
            maxWidth: 360,
            fontSize: 'var(--text-small)',
            color: 'var(--text-tertiary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {page.subtitle}
          {page.updatedAt && `${page.subtitle ? ' · ' : ''}actualizado ${stampTime(page.updatedAt)}`}
        </span>
      )}

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {page.onRefresh && (
          <button
            type="button"
            onClick={page.onRefresh}
            disabled={page.refreshing}
            aria-label="Actualizar"
            title="Actualizar"
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
              cursor: page.refreshing ? 'default' : 'pointer',
              opacity: page.refreshing ? 0.6 : 1,
            }}
          >
            <RefreshCw
              size={16}
              style={page.refreshing ? { animation: 'oryon-spin 900ms linear infinite' } : undefined}
            />
          </button>
        )}

        <ThemeToggle />

        {empresa && (
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
            {empresa}
          </span>
        </div>
        )}
      </div>
    </header>
  )
}
