import type { CSSProperties } from 'react'
import { ChevronRight, LogOut, MessageCircle } from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import { moreSheetItems, type ViewId } from './navItems'

/**
 * Hoja "Más": los módulos que no caben en la barra inferior, más soporte y cierre de sesión.
 * Es el equivalente móvil del pie del sidebar.
 */
export function MoreSheet({
  open,
  onClose,
  currentView,
  onNavigate,
  onSupport,
  onLogout,
  role,
  licenseHint,
}: {
  open: boolean
  onClose: () => void
  currentView: string
  onNavigate: (view: ViewId) => void
  onSupport: () => void
  onLogout: () => void
  role?: string
  /** Aviso bajo "Licencia" cuando está por vencer o vencida. */
  licenseHint?: { text: string; tone: 'warning' | 'danger' } | null
}) {
  const items = moreSheetItems(role)

  const row: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    minHeight: 52,
    padding: '6px 0',
    textAlign: 'left',
    color: 'var(--text-primary)',
    background: 'transparent',
    border: 0,
    borderBottom: 'var(--border-width) solid var(--border-subtle)',
    cursor: 'pointer',
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Más módulos">
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {items.map(({ id, label, icon: Icon, hint }) => {
          const warn = id === 'license' ? licenseHint : null
          return (
            <button
              key={id}
              type="button"
              aria-current={currentView === id ? 'page' : undefined}
              onClick={() => {
                onNavigate(id)
                onClose()
              }}
              style={row}
            >
              <Icon size={19} strokeWidth={1.7} color="var(--text-accent)" style={{ flex: '0 0 auto' }} />
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 'var(--text-body)', fontWeight: 'var(--fw-medium)' }}>{label}</span>
                {(warn || hint) && (
                  <span
                    style={{
                      fontSize: 'var(--text-mono-sm)',
                      color: warn ? `var(--${warn.tone === 'danger' ? 'danger' : 'warning'})` : 'var(--text-tertiary)',
                    }}
                  >
                    {warn ? warn.text : hint}
                  </span>
                )}
              </span>
              <ChevronRight size={16} strokeWidth={1.8} color="var(--text-disabled)" style={{ flex: '0 0 auto' }} />
            </button>
          )
        })}

        <button type="button" onClick={onSupport} style={row}>
          <MessageCircle size={19} strokeWidth={1.7} color="var(--text-secondary)" style={{ flex: '0 0 auto' }} />
          <span style={{ flex: 1, fontSize: 'var(--text-body)', fontWeight: 'var(--fw-medium)' }}>Soporte</span>
          <ChevronRight size={16} strokeWidth={1.8} color="var(--text-disabled)" style={{ flex: '0 0 auto' }} />
        </button>

        <button
          type="button"
          onClick={onLogout}
          style={{ ...row, borderBottom: 0, color: 'var(--state-cancelled-fg)' }}
        >
          <LogOut size={19} strokeWidth={1.7} style={{ flex: '0 0 auto' }} />
          <span style={{ flex: 1, fontSize: 'var(--text-body)', fontWeight: 'var(--fw-medium)' }}>Cerrar sesión</span>
        </button>
      </div>
    </BottomSheet>
  )
}
