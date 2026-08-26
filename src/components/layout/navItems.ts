import {
  ChartColumn,
  Wallet,
  CreditCard,
  LayoutDashboard,
  Package,
  ReceiptText,
  Settings,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

/**
 * Definición ÚNICA de navegación y permisos.
 *
 * Estaba duplicada en `App.tsx` (`hasAccess`) y en `Sidebar.tsx` (`allMenuItems.roles`),
 * con el riesgo evidente de que una se actualizara sin la otra. Ahora ambas leen de aquí.
 * Los `id` son los mismos que usa `currentView` en App.tsx: el enrutado interno no cambia.
 */
export type ViewId =
  | 'dashboard'
  | 'products'
  | 'repairs'
  | 'sales'
  | 'cash'
  | 'customers'
  | 'reports'
  | 'license'
  | 'settings'

export type Role = 'admin' | 'asesor' | 'tecnico'

export interface NavItem {
  id: ViewId
  label: string
  /** Etiqueta de la barra inferior de móvil: tiene que caber en ~60px. */
  shortLabel: string
  icon: LucideIcon
  section: 'Operación' | 'Administración'
  roles: Role[]
  /** Va en la barra inferior de móvil; el resto cae en la hoja "Más". */
  primary: boolean
  hint?: string
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Inicio', icon: LayoutDashboard, section: 'Operación', roles: ['admin'], primary: true },
  { id: 'products', label: 'Productos', shortLabel: 'Productos', icon: Package, section: 'Operación', roles: ['admin', 'asesor'], primary: true },
  { id: 'repairs', label: 'Reparaciones', shortLabel: 'OT', icon: Wrench, section: 'Operación', roles: ['admin', 'asesor', 'tecnico'], primary: true },
  { id: 'sales', label: 'Ventas', shortLabel: 'Ventas', icon: ReceiptText, section: 'Operación', roles: ['admin', 'asesor'], primary: true },
  { id: 'cash', label: 'Caja', shortLabel: 'Caja', icon: Wallet, section: 'Operación', roles: ['admin', 'asesor'], primary: true, hint: 'Apertura, movimientos y cierre' },
  /* Caja entra en la barra de móvil y Clientes sale: la caja se toca cada día, la
     ficha de un cliente se abre desde la OT o la venta. */
  { id: 'customers', label: 'Clientes', shortLabel: 'Clientes', icon: Users, section: 'Operación', roles: ['admin'], primary: false, hint: 'Directorio de clientes' },
  { id: 'reports', label: 'Reportes', shortLabel: 'Reportes', icon: ChartColumn, section: 'Administración', roles: ['admin'], primary: false, hint: 'Insights de negocio' },
  { id: 'license', label: 'Licencia', shortLabel: 'Licencia', icon: CreditCard, section: 'Administración', roles: ['admin'], primary: false, hint: 'Suscripción y facturación' },
  { id: 'settings', label: 'Configuración', shortLabel: 'Ajustes', icon: Settings, section: 'Administración', roles: ['admin'], primary: false, hint: 'Empresa, usuarios, documentos' },
]

export function normalizeRole(role?: string): Role {
  return role === 'admin' || role === 'tecnico' ? role : 'asesor'
}

export function itemsForRole(role?: string): NavItem[] {
  const r = normalizeRole(role)
  return NAV_ITEMS.filter((i) => i.roles.includes(r))
}

export function hasAccess(view: string, role?: string): boolean {
  const r = normalizeRole(role)
  return NAV_ITEMS.some((i) => i.id === view && i.roles.includes(r))
}

/** El técnico entra por OT y el asesor por ventas: es su primera pantalla del día. */
export function defaultViewForRole(role?: string): ViewId {
  const r = normalizeRole(role)
  if (r === 'tecnico') return 'repairs'
  if (r === 'asesor') return 'sales'
  return 'dashboard'
}

/**
 * Barra inferior: cinco destinos como máximo, para que cada celda conserve sus 44px.
 * Si el rol no llega a cinco primarios, se completa con lo que sí puede ver.
 */
export function bottomNavItems(role?: string): NavItem[] {
  const allowed = itemsForRole(role)
  const primary = allowed.filter((i) => i.primary)
  if (primary.length >= 5) return primary.slice(0, 5)
  return [...primary, ...allowed.filter((i) => !i.primary)].slice(0, 5)
}

/** Lo que no cupo abajo se ofrece en la hoja "Más". */
export function moreSheetItems(role?: string): NavItem[] {
  const inBar = new Set(bottomNavItems(role).map((i) => i.id))
  return itemsForRole(role).filter((i) => !inBar.has(i.id))
}

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  tecnico: 'Técnico',
  asesor: 'Asesor',
}

export function initialsOf(name?: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '··'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}
