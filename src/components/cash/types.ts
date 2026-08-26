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
}

export interface CashTotals {
  baseAmount: number
  cashSales: number
  otherSales: number
  creditSales: number
  totalSales: number
  movementsIn: number
  movementsOut: number
  expectedCash: number
  salesCount: number
  byMethod: Record<string, number>
}

export interface Branch {
  id: string
  name: string
}
