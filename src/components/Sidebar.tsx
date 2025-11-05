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
  X,
  MessageCircle
} from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from './ui/sheet'
import { Button } from './ui/button'

interface SidebarProps {
  currentView: string
  onViewChange: (view: string) => void
  onLogout: () => void
  userProfile: any
  licenseInfo?: any
}

export function Sidebar({ currentView, onViewChange, onLogout, userProfile, licenseInfo }: SidebarProps) {
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

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter(item => 
    item.roles.includes(userProfile?.role || 'asesor')
  )

  const handleViewChange = (view: string) => {
    onViewChange(view)
    setIsOpen(false) // Close mobile menu after selection
  }

  const handleLogout = () => {
    onLogout()
    setIsOpen(false)
  }

  const handleSupport = () => {
    const phone = '573004001077'
    const companyName = userProfile?.companyName || 'Sin nombre'
    const userName = userProfile?.name || 'Usuario'
    const userRole = userProfile?.role === 'admin' ? 'Administrador' : 
                     userProfile?.role === 'tecnico' ? 'Técnico' : 
                     userProfile?.role === 'asesor' ? 'Asesor' : userProfile?.role || 'Usuario'
    
    const message = `Hola, vengo desde *Oryon App* y requiero soporte.%0A%0A` +
                    `👤 *Nombre:* ${userName}%0A` +
                    `🏢 *Empresa:* ${companyName}%0A` +
                    `📋 *Rol:* ${userRole}`
    
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank')
    setIsOpen(false)
  }

  // Sidebar content component (shared between desktop and mobile)
  const SidebarContent = () => (
    <div className="bg-gray-900 dark:bg-gray-950 text-white h-full flex flex-col overflow-hidden">
      <div className="p-4 flex-shrink-0">
        <div className="mb-6">
          <h1 className="text-2xl mb-1">Oryon App</h1>
          <p className="text-sm text-gray-300 dark:text-gray-400">Gestión integral</p>
        </div>
        
        {/* License Warning for Admin */}
        {userProfile?.role === 'admin' && isExpiringSoon && (
          <div className="mb-4 bg-yellow-900 border border-yellow-600 rounded-lg p-3">
            <p className="text-xs text-yellow-200 mb-1">⚠️ Licencia por vencer</p>
            <p className="text-xs text-yellow-100">{daysRemaining} días restantes</p>
            <button
              onClick={() => handleViewChange('license')}
              className="text-xs text-yellow-300 hover:text-yellow-100 underline mt-1"
            >
              Renovar ahora
            </button>
          </div>
        )}
      </div>

      {/* Scrollable navigation area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 scrollbar-thin">
        <nav className="space-y-2 pb-4">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => handleViewChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  currentView === item.id
                    ? 'bg-blue-600 dark:bg-blue-700 text-white'
                    : 'text-gray-300 dark:text-gray-400 hover:bg-gray-800 dark:hover:bg-gray-800'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Fixed bottom section with safe area for mobile */}
      <div className="flex-shrink-0 p-4 pt-3 pb-6 border-t border-gray-800 dark:border-gray-700 bg-gray-900 dark:bg-gray-950">
        <div className="px-3 py-2 mb-3 bg-gray-800 dark:bg-gray-800/50 rounded-lg">
          <p className="text-sm truncate">{userProfile?.name}</p>
          <p className="text-xs text-gray-400 truncate">{userProfile?.email}</p>
          <p className="text-xs text-gray-500 dark:text-gray-600 mt-1">
            {userProfile?.role === 'admin' ? 'Administrador' : 
             userProfile?.role === 'tecnico' ? 'Técnico' : 
             userProfile?.role === 'asesor' ? 'Asesor' : userProfile?.role}
          </p>
        </div>
        <button
          onClick={handleSupport}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 dark:text-gray-400 hover:bg-gray-800 dark:hover:bg-gray-800/70 transition-colors mb-2 active:scale-95"
        >
          <MessageCircle size={20} />
          <span>Soporte</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 dark:text-gray-400 hover:bg-gray-800 dark:hover:bg-gray-800/70 transition-colors active:scale-95"
        >
          <LogOut size={20} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Menu Button - Fixed at top */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-gray-900 dark:bg-gray-950 text-white p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-gray-800 dark:hover:bg-gray-800">
                <Menu size={24} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-gray-900 dark:bg-gray-950 border-gray-800 dark:border-gray-700 h-full gap-0 overflow-hidden">
              <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
              <SheetDescription className="sr-only">
                Menú principal de la aplicación Oryon App
              </SheetDescription>
              <SidebarContent />
            </SheetContent>
          </Sheet>
          <div>
            <h1 className="text-lg">Oryon App</h1>
          </div>
        </div>
        <div className="text-xs text-gray-400">
          {userProfile?.role === 'admin' ? 'Admin' : 
           userProfile?.role === 'tecnico' ? 'Técnico' : 
           userProfile?.role === 'asesor' ? 'Asesor' : ''}
        </div>
      </div>

      {/* Desktop Sidebar - Hidden on mobile */}
      <aside className="hidden lg:block w-64 min-h-screen">
        <SidebarContent />
      </aside>
    </>
  )
}
