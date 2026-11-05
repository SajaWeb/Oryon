/**
 * Product Module Constants
 * Defines all constant values used in the products module
 */

import type { BusinessProfile } from '../../config/businessTypes'

/* Las categorías de producto dependen del comercio: viven en
   config/businessTypes.ts (productCategories, productCategoryLabel,
   productCategoryOptions). */

/** Métodos de seguimiento de inventario, con ejemplos del comercio. */
export function trackingMethods(profile: BusinessProfile) {
  const isElectronics = profile.id === 'electronica'
  return [
    {
      id: 'simple',
      title: 'Por Cantidad Simple',
      description: isElectronics
        ? 'Para productos únicos sin variantes (cables, cargadores, etc.)'
        : 'Para productos que se cuentan por cantidad (filtros, aceites, repuestos…)',
    },
    {
      id: 'variants',
      title: 'Por Variantes (Colores)',
      description: isElectronics
        ? 'Para productos con diferentes colores o modelos (estuches, accesorios, etc.)'
        : 'Para productos con tallas, colores o medidas (cascos, llantas, ropa…)',
    },
    {
      id: 'units',
      title: `Por Unidades Individuales (${profile.unitTrackingLabel})`,
      description: `Para productos con ${profile.unitTrackingLabel} único (${profile.unitTrackingExamples})`,
    },
  ] as const
}

export const UNIT_STATUS = {
  available: 'Disponible',
  sold: 'Vendido',
  in_repair: 'En Reparación',
} as const

export const ITEMS_PER_PAGE = 12

export const LOW_STOCK_THRESHOLD = 5
