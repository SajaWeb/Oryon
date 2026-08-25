import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { LogOut, MessageCircle, TriangleAlert } from 'lucide-react'
import { IconButton, SidebarNav, type NavEntry } from '../oryon'
import { AppTopbar } from '../AppTopbar'
import { Logo } from '../brand/Logo'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { MobileHeader } from './MobileHeader'
import { BottomNav } from './BottomNav'
import { MoreSheet } from './MoreSheet'
import { PageHeaderProvider } from './PageHeaderContext'
import { ROLE_LABELS, initialsOf, itemsForRole, moreSheetItems, type ViewId } from './navItems'

const SIDEBAR_KEY = 'oryon-sidebar-collapsed'

/**
 * Contexto del shell. Lo consumen `ResponsiveDetail` (para saber en qué superficie
 * dibujarse) y `PageBody` (para el padding). `detailSlot` es el hueco a la derecha del área
 * con scroll: el drawer se teletransporta ahí con un portal, de modo que ocupa todo el alto
 * sin que cada vista tenga que reestructurar su layout.
 */
const ShellContext = createContext<{
  detailSlot: HTMLElement | null
  compact: boolean
  isMobile: boolean
}>({ detailSlot: null, compact: false, isMobile: false })

export const useShell = () => useContext(ShellContext)

function daysToExpiry(licenseInfo: any): number | null {
  if (!licenseInfo?.expiryDate) return null
  const diff = new Date(licenseInfo.expiryDate).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
}

export function AppShell({
  currentView,
  onViewChange,
  onLogout,
  userProfile,
  licenseInfo,
  children,
}: {
  currentView: string
  onViewChange: (view: ViewId) => void
  onLogout: () => void
  userProfile: any
  licenseInfo?: any
  children: ReactNode
}) {
  const { isMobile, compact } = useBreakpoint()
  const [moreOpen, setMoreOpen] = useState(false)
  const [detailSlot, setDetailSlot] = useState<HTMLElement | null>(null)
  const [userCollapsed, setUserCollapsed] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem(SIDEBAR_KEY) === '1',
  )

  // En tablet el rail va colapsado a la fuerza: 236px se comen el ancho que necesita la tabla.
  const collapsed = compact || userCollapsed
  const role = userProfile?.role
  const days = daysToExpiry(licenseInfo)

  const licenseHint =
    role === 'admin' && days !== null
      ? days === 0
        ? { text: 'Expirada · renueva ahora', tone: 'danger' as const }
        : days <= 7
          ? { text: `Vence en ${days} ${days === 1 ? 'día' : 'días'}`, tone: 'warning' as const }
          : null
      : null

  useEffect(() => {
    if (!isMobile) setMoreOpen(false)
  }, [isMobile])

  const navEntries = useMemo<NavEntry[]>(() => {
    const entries: NavEntry[] = []
    let section: string | null = null
    for (const item of itemsForRole(role)) {
      if (item.section !== section) {
        entries.push({ section: item.section })
        section = item.section
      }
      entries.push({ id: item.id, label: item.label, icon: item.icon })
    }
    return entries
  }, [role])

  const handleSupport = () => {
    const message =
      `Hola, vengo desde *Oryon App* y requiero soporte.%0A%0A` +
      `Nombre: ${userProfile?.name || 'Usuario'}%0A` +
      `Empresa: ${userProfile?.companyName || 'Sin nombre'}%0A` +
      `Rol: ${ROLE_LABELS[role] || 'Usuario'}`
    window.open(`https://wa.me/573004001077?text=${message}`, '_blank', 'noopener,noreferrer')
  }

  const toggleSidebar = () =>
    setUserCollapsed((c) => {
      const next = !c
      localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0')
      return next
    })

  const shellValue = useMemo(
    () => ({ detailSlot, compact, isMobile }),
    [detailSlot, compact, isMobile],
  )

  /* ─────────────── MÓVIL ─────────────── */
  if (isMobile) {
    return (
      <PageHeaderProvider>
        <ShellContext.Provider value={shellValue}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100dvh',
              overflow: 'hidden',
              background: 'var(--bg-base)',
              color: 'var(--text-primary)',
            }}
          >
            <MobileHeader currentView={currentView} />
            <main style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>{children}</main>
            <BottomNav
              currentView={currentView}
              onNavigate={onViewChange}
              onOpenMore={() => setMoreOpen(true)}
              moreOpen={moreOpen}
              role={role}
              moreViewIds={moreSheetItems(role).map((i) => i.id)}
            />
            <MoreSheet
              open={moreOpen}
              onClose={() => setMoreOpen(false)}
              currentView={currentView}
              onNavigate={onViewChange}
              onSupport={handleSupport}
              onLogout={onLogout}
              role={role}
              licenseHint={licenseHint}
            />
          </div>
        </ShellContext.Provider>
      </PageHeaderProvider>
    )
  }

  /* ─────────────── ESCRITORIO / TABLET ─────────────── */
  return (
    <PageHeaderProvider>
      <ShellContext.Provider value={shellValue}>
        <div
          style={{
            display: 'flex',
            height: '100vh',
            minHeight: 0,
            overflow: 'hidden',
            background: 'var(--bg-base)',
            color: 'var(--text-primary)',
          }}
        >
          <SidebarNav
            items={navEntries}
            activeId={currentView}
            collapsed={collapsed}
            onSelect={(id) => onViewChange(id as ViewId)}
            header={<Logo size={collapsed ? 22 : 24} markOnly={collapsed} />}
            footer={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {licenseHint && !collapsed && (
                  <button
                    type="button"
                    onClick={() => onViewChange('license')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 10px',
                      textAlign: 'left',
                      color: 'var(--text-primary)',
                      background:
                        licenseHint.tone === 'danger' ? 'var(--danger-subtle)' : 'var(--warning-subtle)',
                      border: `var(--border-width) solid color-mix(in srgb, var(--${
                        licenseHint.tone === 'danger' ? 'danger' : 'warning'
                      }) 30%, transparent)`,
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                    }}
                  >
                    <TriangleAlert
                      size={14}
                      color={`var(--${licenseHint.tone === 'danger' ? 'danger' : 'warning'})`}
                      style={{ flex: '0 0 auto' }}
                    />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--text-caption)', lineHeight: 'var(--lh-caption)' }}>
                      Licencia · {licenseHint.text}
                    </span>
                  </button>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span
                    title={userProfile?.name}
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      flex: '0 0 auto',
                      width: 28,
                      height: 28,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--text-mono-sm)',
                      fontWeight: 'var(--fw-medium)',
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-sunken)',
                      border: 'var(--border-width) solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {initialsOf(userProfile?.name)}
                  </span>
                  {!collapsed && (
                    <>
                      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        <span
                          style={{
                            fontSize: 'var(--text-small)',
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {userProfile?.name || 'Usuario'}
                        </span>
                        <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>
                          {ROLE_LABELS[role] || 'Usuario'}
                        </span>
                      </span>
                      <IconButton icon={MessageCircle} label="Soporte" size="sm" onClick={handleSupport} />
                      <IconButton icon={LogOut} label="Cerrar sesión" size="sm" onClick={onLogout} />
                    </>
                  )}
                </div>

                {collapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <IconButton icon={MessageCircle} label="Soporte" size="sm" onClick={handleSupport} />
                    <IconButton icon={LogOut} label="Cerrar sesión" size="sm" onClick={onLogout} />
                  </div>
                )}
              </div>
            }
          />

          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <AppTopbar
              currentView={currentView}
              userProfile={userProfile}
              collapsed={collapsed}
              onToggleSidebar={compact ? undefined : toggleSidebar}
            />
            <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
              <main style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>{children}</main>
              <div ref={setDetailSlot} style={{ display: 'flex', flex: '0 0 auto', minHeight: 0 }} />
            </div>
          </div>
        </div>
      </ShellContext.Provider>
    </PageHeaderProvider>
  )
}
