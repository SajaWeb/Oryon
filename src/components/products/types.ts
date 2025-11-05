/**
 * Product Module Types
 * Defines all TypeScript interfaces and types for the products module
 */

export interface Product {
  id: number
  name: string
  category: string
  price: number
  cost?: number
  storage?: string
  ram?: string
  color?: string
  description: string
  quantity?: number
  trackByUnit?: boolean
  hasVariants?: boolean
  units?: ProductUnit[]
  variants?: ProductVariant[]
  minStock?: number
  hideStockAlert?: boolean
  branchId: string
  createdAt?: string
  updatedAt?: string
}

export interface ProductUnit {
  id: number
  productId: number
  imei?: string
  serialNumber?: string
  status: 'available' | 'sold' | 'in_repair'
  createdAt?: string
}

export interface ProductVariant {
  id: number
  productId: number
  name: string
  sku?: string
  stock: number
  createdAt?: string
}

export interface Branch {
  id: string
  name: string
  address?: string
  isActive: boolean
}

export interface ProductFormData {
  name: string
  category: string
  price: string
  cost: string
  storage: string
  ram: string
  color: string
  description: string
  trackByUnit: boolean
  hasVariants: boolean
  quantity: string
  branchId: string
}

export interface UnitFormData {
  imei: string
  serialNumber: string
}

export interface VariantFormData {
  name: string
  stock: string
}

export interface InventoryAdjustmentData {
  type: 'add' | 'subtract'
  quantity: string
  reason: string
}

export interface BranchTransferData {
  targetBranchId: string
  quantity: string
  reason: string
}

export interface UnitsTransferData {
  targetBranchId: string
  unitIds: number[]
  reason: string
}

export interface ProductFilters {
  searchTerm: string
  categoryFilter: string
  branchFilter: string
}

export interface UserProfile {
  id: string
  name: string
  email: string
  role: 'admin' | 'asesor' | 'tecnico'
  branchId?: string // Deprecated: use assignedBranches instead
  assignedBranches?: string[] // Array of branch IDs the user can access
}

export interface ProductsProps {
  accessToken: string
  userRole?: string
  userProfile?: UserProfile
}

export interface ProductTransaction {
  id: number
  productId: number
  productName: string
  action: 'create' | 'edit' | 'adjust_inventory' | 'transfer' | 'add_unit' | 'add_variant' | 'update_variant' | 'delete' | 'delete_unit' | 'delete_variant'
  description: string
  userId: string
  userName: string
  userRole: string
  branchId: string
  branchName?: string
  companyId: string
  targetBranchId?: string
  targetBranchName?: string
  quantity?: number
  details?: string
  timestamp: string
}
