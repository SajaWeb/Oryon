/**
 * Caja: apertura, movimientos y arqueo de cierre.
 *
 * Una caja por sucursal y día. Las ventas NO se registran a mano: al cobrar, tanto
 * desde Ventas como desde «Facturar reparación», la venta queda sellada con el id
 * de la sesión abierta de esa sucursal. Lo único que se teclea son los movimientos
 * que no vienen de una venta —gastos, retiros, ingresos sueltos—.
 *
 * La distinción que hace que el arqueo sirva: solo el EFECTIVO se cuenta contra el
 * cajón. Tarjeta, transferencia, Nequi y Daviplata suman al día pero no al conteo
 * físico, y el crédito no ha entrado todavía: es cuenta por cobrar.
 */

/** Métodos que mueven dinero físico al cajón. */
export function isCashMethod(method?: string): boolean {
  return /efectivo/i.test(method ?? '')
}

/** El crédito se vende pero no se cobra: no entra en ninguna caja. */
export function isCredit(method?: string): boolean {
  return /cr[ée]dito/i.test(method ?? '')
}

export interface CashSession {
  id: string
  companyId: number
  branchId: string
  branchName?: string
  /** YYYY-MM-DD en la zona del taller. */
  date: string
  status: 'open' | 'closed'
  baseAmount: number
  openedByUserId: string
  openedByName: string
  openedAt: string
  closedByUserId?: string
  closedByName?: string
  closedAt?: string
  /** Lo que el operador contó físicamente al cerrar. */
  countedAmount?: number
  /** Lo que el sistema esperaba en el cajón. */
  expectedCash?: number
  /** contado − esperado. Negativo es faltante. */
  difference?: number
  closingNotes?: string
  closedByRole?: string
  /** Totales congelados al cerrar: anular después una venta no reescribe el cierre. */
  totalsSnapshot?: CashTotals
}

export interface CashMovement {
  id: string
  sessionId: string
  companyId: number
  branchId: string
  /** `in` suma al cajón, `out` resta. */
  type: 'in' | 'out'
  amount: number
  concept: string
  notes?: string
  createdByUserId: string
  createdByName: string
  createdAt: string
  /** Si el movimiento lo generó el sistema (p. ej. devolución de una venta anulada). */
  saleId?: number | string
  automatic?: boolean
}

export interface CashTotals {
  baseAmount: number
  /** Ventas cobradas en efectivo. */
  cashSales: number
  /** Ventas por cualquier otro método ya cobrado. */
  otherSales: number
  /** Ventas a crédito: vendidas, no cobradas. */
  creditSales: number
  /** Total facturado en la sesión, cobrado o no. */
  totalSales: number
  movementsIn: number
  movementsOut: number
  /** Lo que debería haber en el cajón: base + efectivo + entradas − salidas. */
  expectedCash: number
  salesCount: number
  byMethod: Record<string, number>
}

/** Clave del índice de la sesión abierta de una sucursal. */
export function openSessionKey(companyId: number, branchId: string): string {
  return `cash_open:${companyId}:${branchId}`
}

export function sessionKey(sessionId: string): string {
  return `cash_session:${sessionId}`
}

export function movementPrefix(sessionId: string): string {
  return `cash_movement:${sessionId}:`
}

/** Fecha local del taller. Sin esto, una venta de las 7pm en Colombia cae al día siguiente. */
export function businessDate(timeZone = 'America/Bogota', now: Date = new Date()): string {
  // en-CA da directamente YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

const num = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Cuadra la sesión a partir de sus ventas y movimientos.
 * Es una función pura para poder probarla sin base de datos.
 */
export function computeTotals(
  session: Pick<CashSession, 'baseAmount'>,
  sales: Array<{ total?: unknown; paymentMethod?: string }>,
  movements: Array<{ type: 'in' | 'out'; amount?: unknown }>
): CashTotals {
  let cashSales = 0
  let otherSales = 0
  let creditSales = 0
  const byMethod: Record<string, number> = {}

  for (const sale of sales) {
    const total = num(sale.total)
    const method = sale.paymentMethod || 'Sin especificar'
    byMethod[method] = (byMethod[method] ?? 0) + total

    if (isCredit(method)) creditSales += total
    else if (isCashMethod(method)) cashSales += total
    else otherSales += total
  }

  let movementsIn = 0
  let movementsOut = 0
  for (const movement of movements) {
    const amount = Math.abs(num(movement.amount))
    if (movement.type === 'in') movementsIn += amount
    else movementsOut += amount
  }

  const baseAmount = num(session.baseAmount)

  return {
    baseAmount,
    cashSales,
    otherSales,
    creditSales,
    totalSales: cashSales + otherSales + creditSales,
    movementsIn,
    movementsOut,
    expectedCash: baseAmount + cashSales + movementsIn - movementsOut,
    salesCount: sales.length,
    byMethod,
  }
}

/* ==================== PERMISOS Y CANDADOS ==================== */

export interface ProfileLike {
  role?: string
  branchId?: string
  assignedBranches?: string[]
}

export const STAFF_ROLES = ['admin', 'asesor', 'tecnico', 'cajero'] as const

export function isAdmin(profile?: ProfileLike | null): boolean {
  return profile?.role === 'admin'
}

/** Quién puede abrir, mover y cerrar caja, y cobrar. El técnico no. */
export function canHandleCash(profile?: ProfileLike | null): boolean {
  return profile?.role === 'admin' || profile?.role === 'asesor' || profile?.role === 'cajero'
}

/**
 * El administrador ve todas las sucursales. El resto, solo las asignadas
 * (o la heredada `branchId` de los perfiles antiguos). Sin ninguna asignada,
 * no tiene acceso a ninguna: antes este filtro vivía solo en el cliente.
 */
export function canAccessBranch(profile: ProfileLike | null | undefined, branchId?: string): boolean {
  if (!profile || !branchId) return false
  if (isAdmin(profile)) return true
  const assigned = Array.isArray(profile.assignedBranches) ? profile.assignedBranches : []
  if (assigned.includes(branchId)) return true
  return Boolean(profile.branchId) && profile.branchId === branchId
}

/** Una caja abierta de un día anterior: no admite más cobros, solo cerrarse. */
export function isStale(session: Pick<CashSession, 'date' | 'status'>, today: string = businessDate()): boolean {
  return session.status === 'open' && String(session.date) < today
}

export const PAYMENT_METHODS = ['Efectivo', 'Tarjeta', 'Transferencia', 'Nequi', 'Daviplata', 'Crédito'] as const

/** Devuelve el método canónico, o null si no es uno de los admitidos. */
export function normalizePaymentMethod(method?: unknown): string | null {
  const raw = String(method ?? '').trim()
  if (!raw) return null
  const plain = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  for (const m of PAYMENT_METHODS) {
    if (m.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === plain) return m
  }
  return null
}

/**
 * Arqueo ciego también en la API: quien no es administrador no recibe lo que
 * "debería haber" ni la diferencia, ni los agregados con los que calcularlo.
 */
export function sanitizeTotals(totals: CashTotals | null | undefined, admin: boolean): Partial<CashTotals> | null {
  if (!totals) return null
  if (admin) return totals
  return {
    baseAmount: totals.baseAmount,
    salesCount: totals.salesCount,
    movementsIn: totals.movementsIn,
    movementsOut: totals.movementsOut,
  }
}

export function sanitizeSession(session: CashSession, admin: boolean): Partial<CashSession> {
  if (admin) return session
  const { expectedCash: _e, difference: _d, totalsSnapshot: _t, ...rest } = session
  return rest
}

/** Versión ligera de una venta para listarla dentro de la caja. */
export function saleSummary(sale: any) {
  return {
    id: sale.id,
    invoiceNumber: sale.invoiceNumber,
    createdAt: sale.createdAt,
    customerName: sale.customerName,
    paymentMethod: sale.paymentMethod,
    total: num(sale.total),
    createdByName: sale.createdByName || sale.createdBy || '',
    type: sale.type,
    status: sale.status,
  }
}
