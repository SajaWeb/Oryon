export interface StatusLog {
  timestamp: string
  userId: string
  userName: string
  previousStatus: string | null
  newStatus: string
  notes: string
  images: string[]
}

export interface RepairPart {
  description: string
  purchaseCost: number
  salePrice: number
  quantity: number
}

export interface LaborItem {
  description: string
  hours: number
  hourlyRate: number
}

export interface Repair {
  id: number
  companyId: number
  branchId?: string
  customerName: string
  customerPhone: string
  deviceType: string
  deviceBrand: string
  deviceModel: string
  imei?: string
  serialNumber?: string
  productId?: number
  unitId?: number
  problem: string
  status: string
  estimatedCost: number
  receivedDate: string
  notes: string
  images: string[]
  statusLogs: StatusLog[]
  devicePassword?: string
  devicePasswordType?: 'text' | 'pattern'
  devicePattern?: number[]
  invoiced?: boolean
  invoiceId?: number
  customerId?: number
  /* El servidor guarda el cuerpo del alta tal cual, así que estos dos sí viajan
     en la orden aunque no estuvieran declarados. Faltaban en el tipo y por eso
     printActions llevaba dos errores de compilación desde hacía tiempo. */
  customerEmail?: string
  assignedTo?: string
  /** Datos propios del comercio: placa, kilometraje, talla… (ver config/businessTypes). */
  assetDetails?: Record<string, string>
  /** Identificador normalizado del bien; une las visitas en el historial. */
  assetKey?: string
}

/** Una visita anterior del mismo bien, tal como la devuelve /repairs/asset-history. */
export interface AssetHistoryEntry {
  id: number
  createdAt: string
  status: string
  customerId?: number
  customerName: string
  customerPhone?: string
  customerEmail?: string
  deviceType?: string
  deviceBrand?: string
  deviceModel?: string
  imei?: string
  serialNumber?: string
  assetDetails: Record<string, string>
  problem?: string
  estimatedCost?: number
  invoicedTotal?: number
}

export interface Customer {
  id: number
  name: string
  email: string
  phone: string
  address: string
  identificationType?: string
  identificationNumber?: string
}

export interface RepairFormData {
  customerName: string
  customerPhone: string
  customerEmail: string
  customerIdentificationType: string
  customerIdentificationNumber: string
  deviceType: string
  deviceBrand: string
  deviceModel: string
  imei: string
  serialNumber: string
  problem: string
  estimatedCost: string
  notes: string
  devicePasswordType: 'text' | 'pattern'
  devicePassword: string
  devicePattern: number[]
  branchId?: string
  assetDetails: Record<string, string>
}

export interface InvoiceFormData {
  laborItems: LaborItem[]
  parts: RepairPart[]
  additionalNotes: string
  /** Cómo paga el cliente. Antes el servidor lo fijaba en 'efectivo' sin preguntar. */
  paymentMethod: string
}
