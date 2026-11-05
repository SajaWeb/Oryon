import { Repair } from './types'
import { normalizeAssetKey } from '../../config/businessTypes'

export function filterRepairs(
  repairs: Repair[],
  searchTerm: string,
  filterStatus: string
): Repair[] {
  let filtered = repairs

  // Filtro por texto de búsqueda
  if (searchTerm.trim()) {
    const search = searchTerm.toLowerCase()
    const compactSearch = normalizeAssetKey(searchTerm)
    filtered = filtered.filter(repair => 
      repair.customerName.toLowerCase().includes(search) ||
      repair.customerPhone.includes(search) ||
      repair.id.toString().includes(search) ||
      repair.deviceBrand.toLowerCase().includes(search) ||
      repair.deviceModel.toLowerCase().includes(search) ||
      repair.deviceType.toLowerCase().includes(search) ||
      (repair.imei && repair.imei.toLowerCase().includes(search)) ||
      (repair.serialNumber && repair.serialNumber.toLowerCase().includes(search)) ||
      // Placa, color, talla…; y la clave normalizada, para que "abc-12d" encuentre ABC12D.
      Object.values(repair.assetDetails ?? {}).some((v) => String(v).toLowerCase().includes(search)) ||
      (repair.assetKey && compactSearch.length >= 3 && repair.assetKey.includes(compactSearch))
    )
  }

  // Filtro por estado
  if (filterStatus !== 'all') {
    filtered = filtered.filter(repair => repair.status === filterStatus)
  }

  return filtered
}
