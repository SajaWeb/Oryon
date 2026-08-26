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
