import { Bike, Car, Gauge, Smartphone, type LucideIcon } from 'lucide-react'

/**
 * Perfiles de comercio: la fuente ÚNICA de todo lo que cambia entre un taller de
 * celulares, uno de motos, uno de carros y uno de bicicletas.
 *
 * El flujo es el mismo para todos —orden de servicio, estados, repuestos,
 * factura, caja, inventario, seguimiento por QR—. Lo que cambia es el
 * vocabulario y los datos del bien que entra a servicio. Nada fuera de este
 * archivo debería escribir "IMEI", "placa" o "celular" a mano.
 *
 * Compatibilidad: las órdenes conservan `deviceType`, `deviceBrand`,
 * `deviceModel`, `imei` y `serialNumber` —ahora con etiquetas según el
 * comercio—. Lo propio de cada comercio (placa, kilometraje, talla…) va en
 * `assetDetails`. Una empresa sin `businessType` es `electronica`: así se ven
 * hoy todas las existentes.
 */

export type BusinessTypeId = 'electronica' | 'motos' | 'carros' | 'bicicletas'

export const BUSINESS_TYPE_IDS: BusinessTypeId[] = ['electronica', 'motos', 'carros', 'bicicletas']

export const DEFAULT_BUSINESS_TYPE: BusinessTypeId = 'electronica'

export interface Option {
  value: string
  label: string
}

/**
 * Un campo propio del comercio. `key` es la clave dentro de `assetDetails`,
 * salvo que `source` diga que vive en una columna clásica de la orden.
 */
export interface FieldDef {
  key: string
  label: string
  type: 'text' | 'number' | 'select'
  options?: Option[]
  placeholder?: string
  hint?: string
  mono?: boolean
  uppercase?: boolean
  required?: boolean
  inputMode?: 'text' | 'numeric' | 'decimal'
  /** Sufijo para mostrar el valor ("km", "cc"). */
  unit?: string
  /** Columna clásica de la orden en vez de `assetDetails`. */
  source?: 'imei' | 'serialNumber'
  showOnPrint?: boolean
  showOnTracking?: boolean
}

export interface BusinessProfile {
  id: BusinessTypeId
  label: string
  /** Una línea para la tarjeta de selección. */
  tagline: string
  icon: LucideIcon
  /** Lo que se personaliza, para la landing y el selector. */
  highlights: string[]
  vocab: {
    /** "equipo", "moto", "vehículo", "bicicleta". */
    asset: string
    assetPlural: string
    /** "el" / "la": "Estado de tu moto", "Historial de este vehículo". */
    article: 'el' | 'la'
    /** Título del módulo de órdenes. */
    orders: string
    order: string
    technician: string
    problem: string
    problemPlaceholder: string
    business: string
  }
  assetTypes: Option[]
  brandPlaceholder: string
  modelPlaceholder: string
  /** Campos además de tipo, marca y modelo. Incluye el identificador. */
  assetFields: FieldDef[]
  /** Clave del campo que identifica al bien y alimenta el historial. */
  identifierKey: string
  /** PIN o patrón de desbloqueo: solo tiene sentido en electrónica. */
  devicePassword: boolean
  /** La etiqueta adhesiva: en vehículos se cuelga del llavero. */
  labelTitle: string
  productCategories: Option[]
  productNamePlaceholder: string
  /** Campos de ficha de producto además de nombre, precio y stock. */
  productSpecFields: FieldDef[]
  /** Cómo se llama el seguimiento por unidad individual. */
  unitTrackingLabel: string
  unitTrackingExamples: string
}

const COLOR: FieldDef = { key: 'color', label: 'Color', type: 'text', placeholder: 'Negro', showOnPrint: true }

const ELECTRONICA: BusinessProfile = {
  id: 'electronica',
  label: 'Celulares y electrónica',
  tagline: 'Celulares, tablets, computadores y consolas',
  icon: Smartphone,
  highlights: ['IMEI y número de serie', 'PIN o patrón de desbloqueo', 'Inventario por IMEI'],
  vocab: {
    asset: 'equipo',
    assetPlural: 'equipos',
    article: 'el',
    orders: 'Reparaciones',
    order: 'orden',
    technician: 'Técnico',
    problem: 'Falla reportada',
    problemPlaceholder: 'Lo que dice el cliente, con sus palabras.',
    business: 'taller',
  },
  assetTypes: [
    { value: 'celular', label: 'Celular' },
    { value: 'tablet', label: 'Tablet' },
    { value: 'laptop', label: 'Laptop' },
    { value: 'computador', label: 'Computador' },
    { value: 'consola', label: 'Consola' },
    { value: 'smartwatch', label: 'Smartwatch' },
    { value: 'otro', label: 'Otro' },
  ],
  brandPlaceholder: 'Apple',
  modelPlaceholder: 'iPhone 12',
  assetFields: [
    { key: 'imei', source: 'imei', label: 'IMEI', type: 'text', mono: true, inputMode: 'numeric', placeholder: '356938035643809', hint: 'Opcional', showOnPrint: true },
    { key: 'serialNumber', source: 'serialNumber', label: 'Número de serie', type: 'text', mono: true, placeholder: 'SN123456789', hint: 'Opcional', showOnPrint: true },
  ],
  identifierKey: 'imei',
  devicePassword: true,
  labelTitle: 'Etiqueta del equipo',
  productCategories: [
    { value: 'celulares', label: 'Celulares' },
    { value: 'accesorios', label: 'Accesorios' },
    { value: 'computadores', label: 'Computadores' },
    { value: 'perifericos', label: 'Periféricos' },
    { value: 'repuestos', label: 'Repuestos' },
  ],
  productNamePlaceholder: 'iPhone 15 Pro',
  // Almacenamiento, RAM y color son columnas propias del producto desde siempre.
  productSpecFields: [],
  unitTrackingLabel: 'IMEI/Serial',
  unitTrackingExamples: 'celulares, computadores, etc.',
}

const PLATE = (placeholder: string): FieldDef => ({
  key: 'plate',
  label: 'Placa',
  type: 'text',
  mono: true,
  uppercase: true,
  required: true,
  placeholder,
  hint: 'Con ella se encuentra el historial del vehículo',
  showOnPrint: true,
  showOnTracking: true,
})

const YEAR: FieldDef = { key: 'year', label: 'Año', type: 'number', inputMode: 'numeric', placeholder: '2022', showOnPrint: true, showOnTracking: true }

const MILEAGE: FieldDef = {
  key: 'mileage',
  label: 'Kilometraje',
  type: 'number',
  inputMode: 'numeric',
  mono: true,
  unit: 'km',
  placeholder: '45000',
  hint: 'Lo que marca el tablero al recibir',
  showOnPrint: true,
}

const MOTOS: BusinessProfile = {
  id: 'motos',
  label: 'Taller de motos',
  tagline: 'Mantenimiento y reparación de motocicletas',
  icon: Gauge,
  highlights: ['Historial por placa', 'Kilometraje en cada ingreso', 'Repuestos y lubricantes'],
  vocab: {
    asset: 'moto',
    assetPlural: 'motos',
    article: 'la',
    orders: 'Servicios',
    order: 'orden de servicio',
    technician: 'Mecánico',
    problem: 'Motivo de ingreso',
    problemPlaceholder: 'Mantenimiento de los 10.000 km, ruido en el motor…',
    business: 'taller',
  },
  assetTypes: [
    { value: 'calle', label: 'Calle' },
    { value: 'scooter', label: 'Scooter' },
    { value: 'enduro', label: 'Enduro / Trail' },
    { value: 'deportiva', label: 'Deportiva' },
    { value: 'electrica', label: 'Eléctrica' },
    { value: 'otro', label: 'Otro' },
  ],
  brandPlaceholder: 'Yamaha',
  modelPlaceholder: 'NMAX 155',
  assetFields: [
    PLATE('ABC12D'),
    YEAR,
    { key: 'engineCc', label: 'Cilindraje', type: 'number', inputMode: 'numeric', unit: 'cc', placeholder: '155', showOnPrint: true },
    MILEAGE,
    COLOR,
    { key: 'serialNumber', source: 'serialNumber', label: 'Número de chasis', type: 'text', mono: true, uppercase: true, hint: 'Opcional', showOnPrint: true },
  ],
  identifierKey: 'plate',
  devicePassword: false,
  labelTitle: 'Etiqueta de llavero',
  productCategories: [
    { value: 'repuestos', label: 'Repuestos' },
    { value: 'lubricantes', label: 'Lubricantes' },
    { value: 'llantas', label: 'Llantas' },
    { value: 'frenos', label: 'Frenos' },
    { value: 'electricos', label: 'Eléctricos' },
    { value: 'cascos-accesorios', label: 'Cascos y accesorios' },
  ],
  productNamePlaceholder: 'Kit de arrastre NMAX',
  productSpecFields: [
    { key: 'reference', label: 'Referencia', type: 'text', mono: true, placeholder: 'Código del fabricante' },
    { key: 'fitment', label: 'Aplicación', type: 'text', placeholder: 'NMAX 155, BWS 125…', hint: 'Modelos en los que sirve' },
  ],
  unitTrackingLabel: 'Serial',
  unitTrackingExamples: 'baterías, cascos, motos para la venta…',
}

const CARROS: BusinessProfile = {
  id: 'carros',
  label: 'Taller de carros',
  tagline: 'Mecánica automotriz, mantenimiento y diagnóstico',
  icon: Car,
  highlights: ['Historial por placa', 'VIN y kilometraje', 'Repuestos, filtros y baterías'],
  vocab: {
    asset: 'vehículo',
    assetPlural: 'vehículos',
    article: 'el',
    orders: 'Servicios',
    order: 'orden de servicio',
    technician: 'Mecánico',
    problem: 'Motivo de ingreso',
    problemPlaceholder: 'Cambio de aceite, revisión de frenos, testigo encendido…',
    business: 'taller',
  },
  assetTypes: [
    { value: 'automovil', label: 'Automóvil' },
    { value: 'camioneta', label: 'Camioneta' },
    { value: 'suv', label: 'SUV' },
    { value: 'pickup', label: 'Pickup' },
    { value: 'van', label: 'Van' },
    { value: 'otro', label: 'Otro' },
  ],
  brandPlaceholder: 'Chevrolet',
  modelPlaceholder: 'Onix',
  assetFields: [
    PLATE('ABC123'),
    YEAR,
    MILEAGE,
    {
      key: 'fuel',
      label: 'Combustible',
      type: 'select',
      options: [
        { value: 'gasolina', label: 'Gasolina' },
        { value: 'diesel', label: 'Diésel' },
        { value: 'gas', label: 'Gas' },
        { value: 'hibrido', label: 'Híbrido' },
        { value: 'electrico', label: 'Eléctrico' },
      ],
      showOnPrint: true,
    },
    COLOR,
    { key: 'serialNumber', source: 'serialNumber', label: 'VIN', type: 'text', mono: true, uppercase: true, hint: 'Opcional · 17 caracteres', showOnPrint: true },
  ],
  identifierKey: 'plate',
  devicePassword: false,
  labelTitle: 'Etiqueta de llavero',
  productCategories: [
    { value: 'repuestos', label: 'Repuestos' },
    { value: 'lubricantes-filtros', label: 'Lubricantes y filtros' },
    { value: 'llantas', label: 'Llantas' },
    { value: 'baterias', label: 'Baterías' },
    { value: 'frenos', label: 'Frenos' },
    { value: 'accesorios', label: 'Accesorios' },
  ],
  productNamePlaceholder: 'Filtro de aceite Onix',
  productSpecFields: [
    { key: 'reference', label: 'Referencia', type: 'text', mono: true, placeholder: 'Código del fabricante' },
    { key: 'fitment', label: 'Aplicación', type: 'text', placeholder: 'Onix 2020+, Spark GT…', hint: 'Modelos en los que sirve' },
  ],
  unitTrackingLabel: 'Serial/VIN',
  unitTrackingExamples: 'baterías, llantas, vehículos para la venta…',
}

const BICICLETAS: BusinessProfile = {
  id: 'bicicletas',
  label: 'Bicicletas',
  tagline: 'Taller y tienda de bicicletas',
  icon: Bike,
  highlights: ['Historial por serial de marco', 'Talla, rodado y transmisión', 'Repuestos y accesorios'],
  vocab: {
    asset: 'bicicleta',
    assetPlural: 'bicicletas',
    article: 'la',
    orders: 'Servicios',
    order: 'orden de servicio',
    technician: 'Mecánico',
    problem: 'Motivo de ingreso',
    problemPlaceholder: 'Mantenimiento general, ajuste de cambios, pinchazo…',
    business: 'taller',
  },
  assetTypes: [
    { value: 'ruta', label: 'Ruta' },
    { value: 'mtb', label: 'MTB' },
    { value: 'urbana', label: 'Urbana' },
    { value: 'electrica', label: 'Eléctrica' },
    { value: 'bmx', label: 'BMX' },
    { value: 'infantil', label: 'Infantil' },
    { value: 'otro', label: 'Otro' },
  ],
  brandPlaceholder: 'Trek',
  modelPlaceholder: 'Marlin 7',
  assetFields: [
    {
      key: 'serialNumber',
      source: 'serialNumber',
      label: 'Serial de marco',
      type: 'text',
      mono: true,
      uppercase: true,
      placeholder: 'WTU123C4567',
      hint: 'Bajo el eje del pedalier. Con él se encuentra el historial',
      showOnPrint: true,
      showOnTracking: true,
    },
    { key: 'size', label: 'Talla', type: 'text', placeholder: 'M / 54', showOnPrint: true },
    {
      key: 'wheel',
      label: 'Rodado',
      type: 'select',
      options: ['12', '16', '20', '24', '26', '27.5', '29', '700c'].map((v) => ({ value: v, label: v })),
      showOnPrint: true,
    },
    { key: 'drivetrain', label: 'Transmisión', type: 'text', placeholder: 'Shimano Deore 1x12', showOnPrint: true },
    COLOR,
  ],
  identifierKey: 'serialNumber',
  devicePassword: false,
  labelTitle: 'Etiqueta de la bicicleta',
  productCategories: [
    { value: 'repuestos', label: 'Repuestos' },
    { value: 'llantas', label: 'Llantas y neumáticos' },
    { value: 'transmision', label: 'Transmisión' },
    { value: 'accesorios', label: 'Accesorios' },
    { value: 'cascos-ropa', label: 'Cascos y ropa' },
  ],
  productNamePlaceholder: 'Cadena Shimano 12v',
  productSpecFields: [
    { key: 'reference', label: 'Referencia', type: 'text', mono: true, placeholder: 'Código del fabricante' },
    { key: 'fitment', label: 'Compatibilidad', type: 'text', placeholder: '12 velocidades, eje 148 mm…' },
  ],
  unitTrackingLabel: 'Serial de marco',
  unitTrackingExamples: 'bicicletas para la venta, componentes de alta gama…',
}

export const BUSINESS_PROFILES: Record<BusinessTypeId, BusinessProfile> = {
  electronica: ELECTRONICA,
  motos: MOTOS,
  carros: CARROS,
  bicicletas: BICICLETAS,
}

export const BUSINESS_PROFILE_LIST: BusinessProfile[] = BUSINESS_TYPE_IDS.map((id) => BUSINESS_PROFILES[id])

export function isBusinessType(value: unknown): value is BusinessTypeId {
  return typeof value === 'string' && (BUSINESS_TYPE_IDS as string[]).includes(value)
}

/** Siempre devuelve un perfil: lo desconocido o ausente es electrónica. */
export function getBusinessProfile(id?: string | null): BusinessProfile {
  return isBusinessType(id) ? BUSINESS_PROFILES[id] : BUSINESS_PROFILES[DEFAULT_BUSINESS_TYPE]
}

/**
 * Identificador comparable: "abc-12d", "ABC 12D" y "ABC12D" son la misma placa.
 * La misma regla vive en el servidor (business.ts) para calcular `assetKey`.
 */
export function normalizeAssetKey(value?: unknown): string {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

export interface AssetLike {
  deviceType?: string
  deviceBrand?: string
  deviceModel?: string
  imei?: string
  serialNumber?: string
  assetDetails?: Record<string, string>
}

/** Valor de un campo, venga de `assetDetails` o de una columna clásica. */
export function fieldValue(asset: AssetLike, field: FieldDef): string {
  if (field.source) return String(asset[field.source] ?? '')
  return String(asset.assetDetails?.[field.key] ?? '')
}

/** Valor listo para mostrar: con su etiqueta de opción y su unidad. */
export function formatFieldValue(asset: AssetLike, field: FieldDef): string {
  const raw = fieldValue(asset, field)
  if (!raw) return ''
  if (field.type === 'select') return field.options?.find((o) => o.value === raw)?.label ?? raw
  if (field.unit) {
    const n = Number(raw)
    return `${Number.isFinite(n) ? n.toLocaleString('es-CO') : raw} ${field.unit}`
  }
  return raw
}

export function identifierField(profile: BusinessProfile): FieldDef | undefined {
  return profile.assetFields.find((f) => f.key === profile.identifierKey)
}

/** El identificador de un bien según el comercio: placa, IMEI o serial. */
export function assetIdentifier(asset: AssetLike, profile: BusinessProfile): string {
  const field = identifierField(profile)
  return field ? fieldValue(asset, field) : ''
}

export function assetTypeLabel(profile: BusinessProfile, value?: string): string {
  if (!value) return ''
  return profile.assetTypes.find((t) => t.value === value)?.label ?? value
}

/** "Yamaha NMAX 155 · ABC12D": lo que se ve en listas y encabezados. */
export function assetSummary(asset: AssetLike, profile: BusinessProfile): string {
  const name = [asset.deviceBrand, asset.deviceModel].filter(Boolean).join(' ').trim()
  const id = profile.id === 'electronica' ? '' : assetIdentifier(asset, profile)
  return [name, id].filter(Boolean).join(' · ') || assetTypeLabel(profile, asset.deviceType) || '—'
}

/** "la moto" / "el vehículo". */
export function withArticle(profile: BusinessProfile): string {
  return `${profile.vocab.article} ${profile.vocab.asset}`
}

/** "tu moto", "tu equipo". */
export function yourAsset(profile: BusinessProfile): string {
  return `tu ${profile.vocab.asset}`
}

/** "este vehículo" / "esta moto". */
export function thisAsset(profile: BusinessProfile): string {
  return `${profile.vocab.article === 'la' ? 'esta' : 'este'} ${profile.vocab.asset}`
}

/** Primera letra en mayúscula. */
export const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/**
 * Clave del historial. Electrónica cae al número de serie cuando no hay IMEI
 * (un portátil no tiene). Debe dar lo mismo que `computeAssetKey` del servidor.
 */
export function computeAssetKey(asset: AssetLike, profile: BusinessProfile): string {
  const primary = normalizeAssetKey(assetIdentifier(asset, profile))
  if (primary) return primary
  return profile.id === 'electronica' ? normalizeAssetKey(asset.serialNumber) : ''
}

/** Etiqueta de una categoría de producto, sea del comercio que sea (datos viejos incluidos). */
export function productCategoryLabel(value?: string): string {
  if (!value) return ''
  for (const p of BUSINESS_PROFILE_LIST) {
    const hit = p.productCategories.find((c) => c.value === value)
    if (hit) return hit.label
  }
  return cap(value.replace(/-/g, ' '))
}

/** Categorías del comercio más las que ya existan en los datos, para no ocultar productos viejos. */
export function productCategoryOptions(profile: BusinessProfile, existing: Array<string | undefined> = []): Option[] {
  const known = new Set(profile.productCategories.map((c) => c.value))
  const extra = Array.from(new Set(existing.filter((v): v is string => Boolean(v) && !known.has(v as string))))
  return [...profile.productCategories, ...extra.map((v) => ({ value: v, label: productCategoryLabel(v) }))]
}
