import { makeAuthenticatedRequest } from '../../utils/api'

/**
 * Cliente en un formulario (nueva orden, nueva venta): uno que ya existe o uno
 * que se va a crear. Es la ÚNICA definición; los dos formularios la comparten
 * para que se comporten igual y nadie tenga que aprender dos maneras.
 *
 * Lo que arregla frente a lo que había:
 *  - Nada de buscar por nombre: dos "Juan Pérez" son dos personas. Solo el
 *    teléfono o el documento identifican a alguien.
 *  - Nada de rellenos: antes se guardaba `phone: 'N/A'` y un correo inventado
 *    (`juan pérez@cliente.com`, con espacio). El segundo cliente sin teléfono
 *    chocaba con el primero como "teléfono duplicado: N/A".
 *  - Si eliges un cliente, es ese el que queda en la orden o la venta; no se
 *    vuelve a buscar otro con el mismo nombre al guardar.
 */

export interface Customer {
  id: number
  name: string
  phone?: string
  email?: string
  address?: string
  identificationType?: string
  identificationNumber?: string
}

export interface CustomerDraft {
  mode: 'existing' | 'new'
  /** Solo en modo `existing`. */
  customerId: number | null
  name: string
  phone: string
  email: string
  identificationType: string
  identificationNumber: string
  address: string
}

export const emptyCustomerDraft = (): CustomerDraft => ({
  mode: 'existing',
  customerId: null,
  name: '',
  phone: '',
  email: '',
  identificationType: '',
  identificationNumber: '',
  address: '',
})

/** Rellena el borrador con un cliente existente. */
export function draftFromCustomer(c: Customer): CustomerDraft {
  return {
    mode: 'existing',
    customerId: c.id,
    name: c.name ?? '',
    phone: cleanPlaceholder(c.phone),
    email: cleanPlaceholder(c.email),
    identificationType: c.identificationType ?? '',
    identificationNumber: c.identificationNumber ?? '',
    address: c.address ?? '',
  }
}

/** Los datos viejos traen 'N/A' y correos inventados: no son datos del cliente. */
function cleanPlaceholder(v?: string): string {
  const s = String(v ?? '').trim()
  if (!s || s.toUpperCase() === 'N/A' || /@cliente\.com$/i.test(s)) return ''
  return s
}

export const normalizePhone = (v?: string) => String(v ?? '').replace(/\D/g, '')
const normalizeDoc = (v?: string) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

/**
 * Cliente que ya existe con ese teléfono o documento. Sirve para avisar mientras
 * se escribe ("ya existe, ¿usarlo?") en vez de fallar al guardar.
 */
export function findDuplicate(customers: Customer[], draft: Pick<CustomerDraft, 'phone' | 'identificationNumber'>): { customer: Customer; field: 'phone' | 'document' } | null {
  const phone = normalizePhone(draft.phone)
  const doc = normalizeDoc(draft.identificationNumber)
  if (phone.length >= 7) {
    const hit = customers.find((c) => normalizePhone(c.phone) === phone)
    if (hit) return { customer: hit, field: 'phone' }
  }
  if (doc.length >= 5) {
    const hit = customers.find((c) => normalizeDoc(c.identificationNumber) === doc)
    if (hit) return { customer: hit, field: 'document' }
  }
  return null
}

export type CustomerErrors = Partial<Record<'customer' | 'name' | 'phone' | 'email', string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Mismas reglas en orden y en venta: nombre y teléfono; el resto, opcional. */
export function validateCustomerDraft(draft: CustomerDraft): CustomerErrors {
  const e: CustomerErrors = {}
  if (draft.mode === 'existing') {
    if (!draft.customerId) e.customer = 'Busca el cliente y tócalo, o elige «Crear cliente».'
    return e
  }
  if (!draft.name.trim()) e.name = 'Escribe el nombre del cliente.'
  if (normalizePhone(draft.phone).length < 7) e.phone = 'Escribe un teléfono válido: es como se le avisa.'
  if (draft.email.trim() && !EMAIL_RE.test(draft.email.trim())) e.email = 'El correo no parece válido.'
  return e
}

/**
 * Devuelve el cliente final: el elegido, o el recién creado. Si al crear resulta
 * que ya existía (otro usuario lo creó mientras tanto), se usa ese en vez de fallar.
 */
export async function resolveCustomer(
  accessToken: string | null,
  draft: CustomerDraft,
  customers: Customer[]
): Promise<{ customer: Customer; created: boolean }> {
  if (draft.mode === 'existing') {
    const c = customers.find((x) => x.id === draft.customerId)
    if (!c) throw new Error('El cliente elegido ya no existe. Vuelve a buscarlo.')
    return { customer: c, created: false }
  }

  const dup = findDuplicate(customers, draft)
  if (dup) return { customer: dup.customer, created: false }

  const payload: Record<string, string> = { name: draft.name.trim(), phone: draft.phone.trim() }
  if (draft.email.trim()) payload.email = draft.email.trim()
  if (draft.address.trim()) payload.address = draft.address.trim()
  if (draft.identificationNumber.trim()) {
    payload.identificationNumber = draft.identificationNumber.trim()
    if (draft.identificationType) payload.identificationType = draft.identificationType
  }

  try {
    const res = await makeAuthenticatedRequest<{ success: boolean; customer?: Customer; error?: string }>('/customers', accessToken, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (!res.success || !res.customer) throw new Error(res.error || 'No se pudo crear el cliente')
    return { customer: res.customer, created: true }
  } catch (err) {
    /* El servidor rechaza duplicados con 400. Si el duplicado no estaba en la
       lista local (la creó otro usuario), se recarga y se usa ese. */
    try {
      const fresh = await makeAuthenticatedRequest<{ success: boolean; customers: string[] }>('/customers', accessToken)
      const list = (fresh.customers ?? []).map((c) => (typeof c === 'string' ? JSON.parse(c) : c)) as Customer[]
      const hit = findDuplicate(list, draft)
      if (hit) return { customer: hit.customer, created: false }
    } catch {
      /* se informa el error original */
    }
    throw err
  }
}
