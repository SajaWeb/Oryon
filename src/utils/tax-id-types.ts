/**
 * Tipos de Identificación Tributaria de Latinoamérica
 * 
 * Este archivo contiene todos los tipos de identificación tributaria
 * utilizados en los países de Latinoamérica para su uso en facturación
 * e impresión de documentos.
 */

export interface TaxIdType {
  value: string
  label: string
  country: string
  countryCode: string
  description: string
  format?: string
  example?: string
}

export const TAX_ID_TYPES: TaxIdType[] = [
  // Argentina
  {
    value: 'CUIT',
    label: 'CUIT - Argentina',
    country: 'Argentina',
    countryCode: 'AR',
    description: 'Clave Única de Identificación Tributaria',
    format: 'XX-XXXXXXXX-X',
    example: '20-12345678-9'
  },
  {
    value: 'CUIL',
    label: 'CUIL - Argentina',
    country: 'Argentina',
    countryCode: 'AR',
    description: 'Código Único de Identificación Laboral',
    format: 'XX-XXXXXXXX-X',
    example: '20-12345678-9'
  },
  
  // Bolivia
  {
    value: 'NIT-BO',
    label: 'NIT - Bolivia',
    country: 'Bolivia',
    countryCode: 'BO',
    description: 'Número de Identificación Tributaria',
    format: 'XXXXXXXXX',
    example: '123456789'
  },
  
  // Brasil
  {
    value: 'CNPJ',
    label: 'CNPJ - Brasil',
    country: 'Brasil',
    countryCode: 'BR',
    description: 'Cadastro Nacional da Pessoa Jurídica',
    format: 'XX.XXX.XXX/XXXX-XX',
    example: '12.345.678/0001-90'
  },
  {
    value: 'CPF',
    label: 'CPF - Brasil',
    country: 'Brasil',
    countryCode: 'BR',
    description: 'Cadastro de Pessoas Físicas',
    format: 'XXX.XXX.XXX-XX',
    example: '123.456.789-10'
  },
  
  // Chile
  {
    value: 'RUT-CL',
    label: 'RUT - Chile',
    country: 'Chile',
    countryCode: 'CL',
    description: 'Rol Único Tributario',
    format: 'XX.XXX.XXX-X',
    example: '12.345.678-9'
  },
  
  // Colombia
  {
    value: 'NIT-CO',
    label: 'NIT - Colombia',
    country: 'Colombia',
    countryCode: 'CO',
    description: 'Número de Identificación Tributaria',
    format: 'XXX.XXX.XXX-X',
    example: '900.123.456-7'
  },
  {
    value: 'RUT-CO',
    label: 'RUT - Colombia',
    country: 'Colombia',
    countryCode: 'CO',
    description: 'Registro Único Tributario',
    format: 'XXX.XXX.XXX-X',
    example: '900.123.456-7'
  },
  
  // Costa Rica
  {
    value: 'CJ',
    label: 'Cédula Jurídica - Costa Rica',
    country: 'Costa Rica',
    countryCode: 'CR',
    description: 'Cédula de Persona Jurídica',
    format: 'X-XXX-XXXXXX',
    example: '3-101-123456'
  },
  
  // Cuba
  {
    value: 'NIT-CU',
    label: 'NIT - Cuba',
    country: 'Cuba',
    countryCode: 'CU',
    description: 'Número de Identificación Tributaria',
    format: 'XXXXXXXXXXX',
    example: '12345678901'
  },
  
  // Ecuador
  {
    value: 'RUC-EC',
    label: 'RUC - Ecuador',
    country: 'Ecuador',
    countryCode: 'EC',
    description: 'Registro Único de Contribuyentes',
    format: 'XXXXXXXXXXXXX',
    example: '1234567890001'
  },
  
  // El Salvador
  {
    value: 'NIT-SV',
    label: 'NIT - El Salvador',
    country: 'El Salvador',
    countryCode: 'SV',
    description: 'Número de Identificación Tributaria',
    format: 'XXXX-XXXXXX-XXX-X',
    example: '1234-567890-123-4'
  },
  
  // Guatemala
  {
    value: 'NIT-GT',
    label: 'NIT - Guatemala',
    country: 'Guatemala',
    countryCode: 'GT',
    description: 'Número de Identificación Tributaria',
    format: 'XXXXXXX-X',
    example: '1234567-8'
  },
  
  // Honduras
  {
    value: 'RTN',
    label: 'RTN - Honduras',
    country: 'Honduras',
    countryCode: 'HN',
    description: 'Registro Tributario Nacional',
    format: 'XXXXXXXXXXXX',
    example: '123456789012'
  },
  
  // México
  {
    value: 'RFC',
    label: 'RFC - México',
    country: 'México',
    countryCode: 'MX',
    description: 'Registro Federal de Contribuyentes',
    format: 'XXXX######XXX',
    example: 'ABC123456XYZ'
  },
  
  // Nicaragua
  {
    value: 'RUC-NI',
    label: 'RUC - Nicaragua',
    country: 'Nicaragua',
    countryCode: 'NI',
    description: 'Registro Único de Contribuyente',
    format: 'XXX-XXXXXX-XXXX-X',
    example: '123-456789-0123-4'
  },
  
  // Panamá
  {
    value: 'RUC-PA',
    label: 'RUC - Panamá',
    country: 'Panamá',
    countryCode: 'PA',
    description: 'Registro Único de Contribuyente',
    format: 'X-XXX-XXXXX',
    example: '1-234-56789'
  },
  
  // Paraguay
  {
    value: 'RUC-PY',
    label: 'RUC - Paraguay',
    country: 'Paraguay',
    countryCode: 'PY',
    description: 'Registro Único de Contribuyentes',
    format: 'XXXXXXXX-X',
    example: '12345678-9'
  },
  
  // Perú
  {
    value: 'RUC-PE',
    label: 'RUC - Perú',
    country: 'Perú',
    countryCode: 'PE',
    description: 'Registro Único de Contribuyentes',
    format: 'XXXXXXXXXXX',
    example: '12345678901'
  },
  
  // República Dominicana
  {
    value: 'RNC',
    label: 'RNC - República Dominicana',
    country: 'República Dominicana',
    countryCode: 'DO',
    description: 'Registro Nacional del Contribuyente',
    format: 'XXX-XXXXX-X',
    example: '123-45678-9'
  },
  
  // Uruguay
  {
    value: 'RUT-UY',
    label: 'RUT - Uruguay',
    country: 'Uruguay',
    countryCode: 'UY',
    description: 'Registro Único Tributario',
    format: 'XXXXXXXXXXXX',
    example: '123456789012'
  },
  
  // Venezuela
  {
    value: 'RIF',
    label: 'RIF - Venezuela',
    country: 'Venezuela',
    countryCode: 'VE',
    description: 'Registro de Información Fiscal',
    format: 'X-XXXXXXXX-X',
    example: 'J-12345678-9'
  },
  
  // Genérico
  {
    value: 'TAX-ID',
    label: 'TAX ID - Genérico',
    country: 'Internacional',
    countryCode: 'XX',
    description: 'Identificación Tributaria Genérica',
    format: 'Variable',
    example: '123456789'
  }
]

/**
 * Obtiene un tipo de ID tributaria por su código
 */
export function getTaxIdType(value: string): TaxIdType | undefined {
  return TAX_ID_TYPES.find(type => type.value === value)
}

/**
 * Obtiene todos los tipos de ID tributaria de un país específico
 */
export function getTaxIdTypesByCountry(countryCode: string): TaxIdType[] {
  return TAX_ID_TYPES.filter(type => type.countryCode === countryCode)
}

/**
 * Agrupa los tipos de ID tributaria por país
 */
export function groupTaxIdTypesByCountry(): Record<string, TaxIdType[]> {
  return TAX_ID_TYPES.reduce((acc, type) => {
    if (!acc[type.country]) {
      acc[type.country] = []
    }
    acc[type.country].push(type)
    return acc
  }, {} as Record<string, TaxIdType[]>)
}

/**
 * Valida el formato básico de un número de identificación tributaria
 * Nota: Esta es una validación básica, cada país tiene reglas específicas
 */
export function validateTaxId(value: string, type: string): boolean {
  if (!value || !type) return false
  
  const taxIdType = getTaxIdType(type)
  if (!taxIdType) return false
  
  // Remover caracteres no alfanuméricos para validación básica
  const cleanValue = value.replace(/[^a-zA-Z0-9]/g, '')
  
  // Validación mínima: debe tener al menos 6 caracteres
  return cleanValue.length >= 6
}

/**
 * Formatea un número de identificación tributaria según su tipo
 * Nota: Esta es una función básica, puede necesitar ajustes por país
 */
export function formatTaxId(value: string, type: string): string {
  if (!value || !type) return value
  
  const taxIdType = getTaxIdType(type)
  if (!taxIdType || !taxIdType.format) return value
  
  // Esta es una implementación básica
  // En producción, se debería implementar el formateo específico por tipo
  return value
}
