/**
 * Product Module Constants
 * Defines all constant values used in the products module
 */

export const PRODUCT_CATEGORIES = [
  { value: 'celulares', label: 'Celulares' },
  { value: 'accesorios', label: 'Accesorios' },
  { value: 'computadores', label: 'Computadores' },
  { value: 'perifericos', label: 'Periféricos' },
] as const

export const TRACKING_METHODS = [
  {
    id: 'simple',
    title: 'Por Cantidad Simple',
    description: 'Para productos únicos sin variantes (cables, cargadores, etc.)',
  },
  {
    id: 'variants',
    title: 'Por Variantes (Colores)',
    description: 'Para productos con diferentes colores o modelos (estuches, accesorios, etc.)',
  },
  {
    id: 'units',
    title: 'Por Unidades Individuales (IMEI/Serial)',
    description: 'Para productos con IMEI/Serial único (celulares, computadores, etc.)',
  },
] as const

export const UNIT_STATUS = {
  available: 'Disponible',
  sold: 'Vendido',
  in_repair: 'En Reparación',
} as const

export const ITEMS_PER_PAGE = 12

export const LOW_STOCK_THRESHOLD = 5
