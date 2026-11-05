/**
 * Tipos de comercio, del lado del servidor.
 *
 * Las etiquetas, campos y categorías viven en el cliente
 * (src/config/businessTypes.ts). Aquí solo hace falta saber qué ids son
 * válidos y cómo calcular la clave del historial de un bien —placa, IMEI o
 * serial de marco— con la MISMA regla que el cliente.
 */

export const BUSINESS_TYPES = ['electronica', 'motos', 'carros', 'bicicletas'] as const
export type BusinessType = (typeof BUSINESS_TYPES)[number]
export const DEFAULT_BUSINESS_TYPE: BusinessType = 'electronica'

export function isBusinessType(value: unknown): value is BusinessType {
  return typeof value === 'string' && (BUSINESS_TYPES as readonly string[]).includes(value)
}

export function resolveBusinessType(value: unknown): BusinessType {
  return isBusinessType(value) ? value : DEFAULT_BUSINESS_TYPE
}

/** "abc-12d", "ABC 12D" y "ABC12D" son la misma placa. */
export function normalizeAssetKey(value?: unknown): string {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

/** Solo strings cortos y como mucho 20 claves: es texto libre que viene del cliente. */
export function sanitizeDetails(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, 20)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,31}$/.test(k)) continue
    if (v === null || v === undefined) continue
    if (typeof v !== 'string' && typeof v !== 'number') continue
    const s = String(v).trim().slice(0, 200)
    if (s) out[k] = s
  }
  return out
}

/** Clave del historial según el comercio. */
export function computeAssetKey(
  businessType: unknown,
  asset: { imei?: unknown; serialNumber?: unknown; assetDetails?: Record<string, unknown> }
): string {
  const type = resolveBusinessType(businessType)
  switch (type) {
    case 'motos':
    case 'carros':
      return normalizeAssetKey(asset.assetDetails?.plate)
    case 'bicicletas':
      return normalizeAssetKey(asset.serialNumber)
    default:
      return normalizeAssetKey(asset.imei) || normalizeAssetKey(asset.serialNumber)
  }
}
