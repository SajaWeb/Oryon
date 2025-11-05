import { Repair } from './types'

export function filterRepairs(
  repairs: Repair[],
  searchTerm: string,
  filterStatus: string
): Repair[] {
  let filtered = repairs

  // Filtro por texto de búsqueda
  if (searchTerm.trim()) {
    const search = searchTerm.toLowerCase()
    filtered = filtered.filter(repair => 
      repair.customerName.toLowerCase().includes(search) ||
      repair.customerPhone.includes(search) ||
      repair.id.toString().includes(search) ||
      repair.deviceBrand.toLowerCase().includes(search) ||
      repair.deviceModel.toLowerCase().includes(search) ||
      repair.deviceType.toLowerCase().includes(search) ||
      (repair.imei && repair.imei.toLowerCase().includes(search)) ||
      (repair.serialNumber && repair.serialNumber.toLowerCase().includes(search))
    )
  }

  // Filtro por estado
  if (filterStatus !== 'all') {
    filtered = filtered.filter(repair => repair.status === filterStatus)
  }

  return filtered
}
