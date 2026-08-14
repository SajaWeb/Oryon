/**
 * Calculadora y Verificador de Precios - Oryon App
 * 
 * Precios oficiales en COP:
 * - 1 Sucursal (Plan Básico): $50.000 COP / mes
 * - 2 Sucursales (Plan PYME): $85.000 COP / mes
 * - 4 Sucursales (Plan Enterprise): $140.000 COP / mes
 */

export interface PlanPrices {
  usd: number
  cop: number
}

export interface DurationDiscount {
  months: number
  discount: number
}

// Precios base mensuales por plan
export const PLAN_PRICES: Record<string, PlanPrices> = {
  basico: { usd: 15, cop: 50000 },
  pyme: { usd: 25, cop: 85000 },
  enterprise: { usd: 40, cop: 140000 }
}

// Descuentos por duración
export const DURATION_DISCOUNTS: DurationDiscount[] = [
  { months: 1, discount: 0 },
  { months: 3, discount: 0 },
  { months: 6, discount: 10 },
  { months: 12, discount: 10 }
]

export interface PriceCalculation {
  basePrice: number
  months: number
  discount: number
  totalBeforeDiscount: number
  discountAmount: number
  finalPrice: number
  pricePerMonth: number
  savings: number
  currency: 'COP' | 'USD'
}

/**
 * Calcula el precio de extensión de licencia con descuento
 */
export function calculateExtensionPrice(
  planId: string,
  months: number,
  country: 'colombia' | 'international' = 'colombia'
): PriceCalculation | null {
  if (!PLAN_PRICES[planId]) {
    console.error(`Plan inválido: ${planId}`)
    return null
  }

  const durationConfig = DURATION_DISCOUNTS.find(d => d.months === months)
  if (!durationConfig) {
    console.error(`Duración inválida: ${months} meses`)
    return null
  }

  const prices = PLAN_PRICES[planId]
  const basePrice = country === 'colombia' ? prices.cop : prices.usd
  const discount = durationConfig.discount
  const currency = country === 'colombia' ? 'COP' : 'USD'

  const totalBeforeDiscount = basePrice * months
  const discountAmount = totalBeforeDiscount * (discount / 100)
  const finalPrice = totalBeforeDiscount - discountAmount
  const pricePerMonth = finalPrice / months
  const savings = discountAmount

  return {
    basePrice,
    months,
    discount,
    totalBeforeDiscount,
    discountAmount,
    finalPrice,
    pricePerMonth,
    savings,
    currency
  }
}

/**
 * Formatea el precio según la moneda
 */
export function formatPrice(amount: number, currency: 'COP' | 'USD' = 'COP'): string {
  if (currency === 'COP') {
    return `$${amount.toLocaleString('es-CO')} COP`
  } else {
    return `$${amount.toFixed(2)} USD`
  }
}

/**
 * Imprime un cálculo de precio de forma legible
 */
export function printCalculation(calc: PriceCalculation): void {
  console.log('\n' + '='.repeat(50))
  console.log(`Precio base mensual:     ${formatPrice(calc.basePrice, calc.currency)}`)
  console.log(`Meses:                   ${calc.months}`)
  console.log('-'.repeat(50))
  console.log(`Subtotal:               ${formatPrice(calc.totalBeforeDiscount, calc.currency)}`)
  if (calc.discount > 0) {
    console.log(`Descuento ${calc.discount}%:          -${formatPrice(calc.discountAmount, calc.currency)}`)
  }
  console.log('='.repeat(50))
  console.log(`TOTAL A PAGAR:          ${formatPrice(calc.finalPrice, calc.currency)}`)
  console.log(`Precio promedio/mes:    ${formatPrice(calc.pricePerMonth, calc.currency)}`)
  if (calc.savings > 0) {
    console.log(`💰 AHORRO:               ${formatPrice(calc.savings, calc.currency)}`)
  }
  console.log('='.repeat(50) + '\n')
}

/**
 * Ejecuta todos los casos de prueba con los precios vigentes
 */
export function runAllTests(): void {
  console.log('\n🧪 INICIANDO PRUEBAS DE CÁLCULO DE PRECIOS\n')

  const testCases = [
    // Colombia (1 sucursal 50k, 2 sucursales 85k, 4 sucursales 140k)
    { planId: 'basico', months: 1, country: 'colombia' as const, expected: 50000 },
    { planId: 'basico', months: 6, country: 'colombia' as const, expected: 270000 },
    { planId: 'pyme', months: 1, country: 'colombia' as const, expected: 85000 },
    { planId: 'pyme', months: 6, country: 'colombia' as const, expected: 459000 },
    { planId: 'pyme', months: 12, country: 'colombia' as const, expected: 918000 },
    { planId: 'enterprise', months: 1, country: 'colombia' as const, expected: 140000 },
    { planId: 'enterprise', months: 6, country: 'colombia' as const, expected: 756000 },
    { planId: 'enterprise', months: 12, country: 'colombia' as const, expected: 1512000 },
  ]

  let passed = 0
  let failed = 0

  testCases.forEach((test, index) => {
    const calc = calculateExtensionPrice(test.planId, test.months, test.country)
    
    if (!calc) {
      console.log(`❌ Test ${index + 1}: ERROR - No se pudo calcular`)
      failed++
      return
    }

    const isPassed = calc.finalPrice === test.expected
    
    if (isPassed) {
      console.log(`✅ Test ${index + 1}: PASADO - ${test.planId.toUpperCase()} ${test.months}m = ${formatPrice(calc.finalPrice, calc.currency)}`)
      passed++
    } else {
      console.log(`❌ Test ${index + 1}: FALLADO - ${test.planId.toUpperCase()} ${test.months}m`)
      console.log(`   Esperado: ${formatPrice(test.expected, calc.currency)}`)
      console.log(`   Obtenido: ${formatPrice(calc.finalPrice, calc.currency)}`)
      failed++
    }
  })

  console.log('\n' + '='.repeat(50))
  console.log(`📊 RESULTADOS: ${passed}/${testCases.length} pruebas pasadas`)
  if (failed > 0) {
    console.log(`⚠️  ${failed} pruebas fallidas`)
  } else {
    console.log('✅ ¡Todas las pruebas pasaron exitosamente!')
  }
  console.log('='.repeat(50) + '\n')
}

// Ejecutar pruebas si se llama directamente
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  runAllTests()
}
