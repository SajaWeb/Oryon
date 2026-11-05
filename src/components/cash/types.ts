export interface CashSession {
  id: string
  companyId: number
  branchId: string
  branchName?: string
  date: string
  status: 'open' | 'closed'
  baseAmount: number
  openedByUserId: string
  openedByName: string
  openedAt: string
  closedByUserId?: string
  closedByName?: string
  closedAt?: string
  countedAmount?: number
  expectedCash?: number
  difference?: number
  closingNotes?: string
  closedByRole?: string
}

export interface CashMovement {
  id: string
  sessionId: string
  type: 'in' | 'out'
  amount: number
  concept: string
  notes?: string
  createdByName: string
  createdAt: string
  saleId?: number | string
  automatic?: boolean
}

/**
 * El servidor solo manda el desglose completo al administrador. Al cajero le
 * llegan base, cobros y movimientos: el arqueo es ciego también en la API.
 */
export interface CashTotals {
  baseAmount: number
  salesCount: number
  movementsIn: number
  movementsOut: number
  cashSales?: number
  otherSales?: number
  creditSales?: number
  totalSales?: number
  expectedCash?: number
  byMethod?: Record<string, number>
}

export interface CashSale {
  id: number
  invoiceNumber?: string
  createdAt: string
  customerName?: string
  paymentMethod?: string
  total: number
  createdByName?: string
  type?: string
}

export interface Branch {
  id: string
  name: string
}
