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
}

export interface InvoiceFormData {
  laborItems: LaborItem[]
  parts: RepairPart[]
  additionalNotes: string
}
