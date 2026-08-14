import { useState } from 'react'
import {
  LayoutDashboard,
  Package,
  Wrench,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  LogOut,
  CreditCard,
  Menu,
  MessageCircle,
  TriangleAlert,
} from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from './ui/sheet'
import { Logo, LogoMark } from './brand/Logo'

interface SidebarProps {
  currentView: string
  onViewChange: (view: string) => void
  onLogout: () => void
  userProfile: any
  licenseInfo?: any
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  tecnico: 'Técnico',
  asesor: 'Asesor',
}

export function Sidebar({
  currentView,
  onViewChange,
  onLogout,
  userProfile,
  licenseInfo,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)

  const getDaysRemaining = () => {
    if (!licenseInfo?.expiryDate) return 0
    const today = new Date()
    const expiry = new Date(licenseInfo.expiryDate)
    const diff = expiry.getTime() - today.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return Math.max(0, days)
  }

  const daysRemaining = getDaysRemaining()
  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 7

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
    { id: 'products', label: 'Productos', icon: Package, roles: ['admin', 'asesor'] },
    { id: 'repairs', label: 'Reparaciones', icon: Wrench, roles: ['admin', 'asesor', 'tecnico'] },
    { id: 'sales', label: 'Ventas', icon: ShoppingCart, roles: ['admin', 'asesor'] },
    { id: 'customers', label: 'Clientes', icon: Users, roles: ['admin'] },
    { id: 'reports', label: 'Reportes', icon: BarChart3, roles: ['admin'] },
    { id: 'license', label: 'Licencia', icon: CreditCard, roles: ['admin'] },
    { id: 'settings', label: 'Configuración', icon: Settings, roles: ['admin'] },
  ]

  const menuItems = allMenuItems.filter((item) =>
    item.roles.includes(userProfile?.role || 'asesor'),
  )

  const handleViewChange = (view: string) => {
    onViewChange(view)
    setIsOpen(false)
  }

  const handleLogout = () => {
    onLogout()
    setIsOpen(false)
  }

  const handleSupport = () => {
    const phone = '573004001077'
    const companyName = userProfile?.companyName || 'Sin nombre'
    const userName = userProfile?.name || 'Usuario'
    const userRole = ROLE_LABEL[userProfile?.role] || userProfile?.role || 'Usuario'

    const message =
      `Hola, vengo desde *Oryon App* y requiero soporte.%0A%0A` +
      `👤 *Nombre:* ${userName}%0A` +
      `🏢 *Empresa:* ${companyName}%0A` +
      `📋 *Rol:* ${userRole}`

    window.open(`https://wa.me/${phone}?text=${message}`, '_blank')
    setIsOpen(false)
  }

  const roleLabel = ROLE_LABEL[userProfile?.role] || userProfile?.role || ''

  /* Ítem de navegación: 32px de alto, activo en acento sutil con texto cian.
     El acento en el producto aparece contado: botón primario, ítem activo,
     foco de teclado y estado «listo». */
  const NavItem = ({ item }: { item: (typeof allMenuItems)[number] }) => {
    const Icon = item.icon
    const active = currentView === item.id
    return (
      <button
        onClick={() => handleViewChange(item.id)}
        className="oryon-nav-item"
        data-active={active}
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
          color: active ? 'var(--text-accent)' : 'var(--text-secondary)',
          background: active ? 'var(--accent-subtle)' : 'transparent',
          border: `var(--border-width) solid ${active ? 'var(--accent-subtle-border)' : 'transparent'}`,
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          overflow: 'hidden',
        }}
      >
        <Icon size={16} style={{ flex: '0 0 auto' }} />
        <span
          style={{
            flex: 1,
            minWidth: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.label}
        </span>
      </button>
    )
  }

  const SidebarContent = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--surface-card)',
        borderRight: 'var(--border-width) solid var(--border-subtle)',
        overflow: 'hidden',
      }}
    >
      {/* Cabecera a la altura de la topbar, para que las líneas continúen. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 'var(--topbar-height)',
          padding: '0 14px',
          flex: '0 0 auto',
          borderBottom: 'var(--border-width) solid var(--border-subtle)',
        }}
      >
        <Logo size={22} />
      </div>

      {userProfile?.role === 'admin' && isExpiringSoon && (
        <div style={{ padding: '10px 8px 0' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              padding: '10px 12px',
              background: 'var(--warning-subtle)',
              border: 'var(--border-width) solid color-mix(in srgb, var(--warning) 32%, transparent)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <TriangleAlert size={13} style={{ color: 'var(--warning)', flex: '0 0 auto' }} />
              <span
                style={{
                  fontSize: 'var(--text-caption)',
                  letterSpacing: 'var(--tr-caption)',
                  textTransform: 'uppercase',
                  fontWeight: 'var(--fw-semibold)',
                  color: 'var(--warning)',
                }}
              >
                Licencia por vencer
              </span>
            </div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-mono-sm)',
                color: 'var(--text-secondary)',
              }}
            >
              {daysRemaining} días restantes
            </span>
            <button
              onClick={() => handleViewChange('license')}
              style={{
                alignSelf: 'flex-start',
                background: 'none',
                border: 0,
                padding: 0,
                fontSize: 'var(--text-small)',
                color: 'var(--text-accent)',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Renovar ahora
            </button>
          </div>
        </div>
      )}

      <div className="scrollbar-thin" style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        <div
          style={{
            padding: '10px 8px 6px',
            fontSize: 'var(--text-caption)',
            letterSpacing: 'var(--tr-caption)',
            textTransform: 'uppercase',
            fontWeight: 'var(--fw-semibold)',
            color: 'var(--text-tertiary)',
          }}
        >
          Taller
        </div>
        {menuItems.map((item) => (
          <NavItem key={item.id} item={item} />
        ))}
      </div>

      <div
        style={{
          flex: '0 0 auto',
          padding: 8,
          borderTop: 'var(--border-width) solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 8px 10px',
            minWidth: 0,
          }}
        >
          <span
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 28,
              height: 28,
              flex: '0 0 auto',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 'var(--fw-semibold)',
              color: 'var(--text-secondary)',
              background: 'var(--bg-sunken)',
              border: 'var(--border-width) solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {(userProfile?.name || 'U')
              .split(' ')
              .slice(0, 2)
              .map((w: string) => w[0])
              .join('')
              .toUpperCase()}
          </span>
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontSize: 'var(--text-small)',
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {userProfile?.name}
            </span>
            <span
              style={{
                fontSize: 'var(--text-caption)',
                letterSpacing: 'var(--tr-caption)',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
              }}
            >
              {roleLabel}
            </span>
          </div>
        </div>

        <button onClick={handleSupport} className="oryon-nav-item" style={footerBtn}>
          <MessageCircle size={16} style={{ flex: '0 0 auto' }} />
          <span>Soporte</span>
        </button>
        <button onClick={handleLogout} className="oryon-nav-item" style={footerBtn}>
          <LogOut size={16} style={{ flex: '0 0 auto' }} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Barra móvil */}
      {/* `flex` va en la clase, no en el style: una regla inline le ganaría a
          lg:hidden y la barra móvil se quedaría visible en escritorio. */}
      <div
        className="flex lg:hidden"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          height: 'var(--topbar-height)',
          padding: '0 12px',
          background: 'var(--surface-card)',
          borderBottom: 'var(--border-width) solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Abrir menú"
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
                <Menu size={18} />
              </button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="gap-0 overflow-hidden p-0"
              style={{
                width: 'var(--sidebar-width)',
                background: 'var(--surface-card)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
              <SheetDescription className="sr-only">
                Menú principal de la aplicación Oryon
              </SheetDescription>
              <SidebarContent />
            </SheetContent>
          </Sheet>
          <LogoMark size={20} />
        </div>
        <span
          style={{
            fontSize: 'var(--text-caption)',
            letterSpacing: 'var(--tr-caption)',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}
        >
          {roleLabel}
        </span>
      </div>

      {/* Sidebar de escritorio */}
      <aside
        className="hidden lg:block"
        style={{ width: 'var(--sidebar-width)', flex: '0 0 auto', height: '100vh', position: 'sticky', top: 0 }}
      >
        <SidebarContent />
      </aside>
    </>
  )
}

const footerBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  height: 32,
  padding: '0 8px',
  marginBottom: 2,
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-body)',
  textAlign: 'left',
  color: 'var(--text-secondary)',
  background: 'transparent',
  border: 'var(--border-width) solid transparent',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
}
