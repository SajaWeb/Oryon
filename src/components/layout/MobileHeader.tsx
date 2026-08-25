import { RefreshCw } from 'lucide-react'
import { VIEW_TITLES } from '../AppTopbar'
import { ThemeToggle } from '../ThemeToggle'
import { usePageHeaderValue } from './PageHeaderContext'

/**
 * Header del layout móvil. Aquí el título es el protagonista (Archivo 700/20px) con el
 * eyebrow en Martian Mono encima, como en los artboards de teléfono — al revés que la
 * topbar de escritorio, donde el título comparte fila con buscador y controles.
 * Reserva el notch con `env(safe-area-inset-top)`.
 */
export function MobileHeader({ currentView }: { currentView: string }) {
  const page = usePageHeaderValue()
  const fallback = VIEW_TITLES[currentView] || { title: currentView, breadcrumb: 'Oryon' }

  const title = page.title || fallback.title
  const eyebrow = page.eyebrow || fallback.breadcrumb

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        flex: '0 0 auto',
        padding: 'calc(12px + env(safe-area-inset-top)) 16px 12px',
        background: 'var(--bg-base)',
        borderBottom: 'var(--border-width) solid var(--border-subtle)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono-display)',
            fontSize: 'var(--text-caption)',
            lineHeight: 'var(--lh-caption)',
            letterSpacing: 'var(--tr-caption)',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}
        >
          {eyebrow}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-h3)',
            lineHeight: 'var(--lh-h3)',
            letterSpacing: 'var(--tr-h3)',
            fontWeight: 'var(--fw-bold)',
            color: 'var(--text-primary)',
            textWrap: 'pretty',
          }}
        >
          {title}
        </span>
        {page.subtitle && (
          <span style={{ fontSize: 'var(--text-small)', color: 'var(--text-tertiary)' }}>{page.subtitle}</span>
        )}
      </div>

      <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 4 }}>
        {page.onRefresh && (
          <button
            type="button"
            onClick={page.onRefresh}
            disabled={page.refreshing}
            aria-label="Actualizar"
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 'var(--tap-target)',
              height: 'var(--tap-target)',
              color: 'var(--text-secondary)',
              background: 'var(--surface-card)',
              border: 'var(--border-width) solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              cursor: page.refreshing ? 'default' : 'pointer',
              opacity: page.refreshing ? 0.6 : 1,
            }}
          >
            <RefreshCw
              size={18}
              strokeWidth={1.8}
              style={page.refreshing ? { animation: 'oryon-spin 900ms linear infinite' } : undefined}
            />
          </button>
        )}
        <ThemeToggle />
      </div>
    </header>
  )
}
