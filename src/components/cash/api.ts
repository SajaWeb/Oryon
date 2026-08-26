import { makeAuthenticatedRequest } from '../../utils/api'
import type { CashMovement, CashSession, CashTotals } from './types'

/** El servidor devuelve este código cuando se intenta cobrar sin caja abierta. */
export const CASH_SESSION_REQUIRED = 'CASH_SESSION_REQUIRED'

export interface SessionState {
  success: boolean
  session: CashSession | null
  totals?: CashTotals
  movements?: CashMovement[]
  /** Solo quien la abrió, o un administrador. */
  canClose?: boolean
}

export const getSession = (token: string, branchId: string) =>
  makeAuthenticatedRequest<SessionState>(`/cash/session?branchId=${encodeURIComponent(branchId)}`, token)

export const openSession = (token: string, branchId: string, baseAmount: number) =>
  makeAuthenticatedRequest<{ success: boolean; session: CashSession; error?: string }>('/cash/session/open', token, {
    method: 'POST',
    body: JSON.stringify({ branchId, baseAmount }),
  })

export const closeSession = (token: string, sessionId: string, countedAmount: number, notes: string) =>
  makeAuthenticatedRequest<{ success: boolean; session: CashSession; totals: CashTotals; error?: string }>(
    '/cash/session/close',
    token,
    { method: 'POST', body: JSON.stringify({ sessionId, countedAmount, notes }) }
  )

export const addMovement = (
  token: string,
  sessionId: string,
  movement: { type: 'in' | 'out'; amount: number; concept: string; notes?: string }
) =>
  makeAuthenticatedRequest<{ success: boolean; totals: CashTotals; movements: CashMovement[]; error?: string }>(
    '/cash/movement',
    token,
    { method: 'POST', body: JSON.stringify({ sessionId, ...movement }) }
  )

export const getHistory = (token: string) =>
  makeAuthenticatedRequest<{ success: boolean; sessions: CashSession[] }>('/cash/sessions', token)
