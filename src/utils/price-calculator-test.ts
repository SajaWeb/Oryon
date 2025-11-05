/**
 * Calculadora y Verificador de Precios - Oryon App
 * 
 * Este archivo contiene funciones de utilidad para calcular precios
 * de extensión de licencia con descuentos y casos de prueba.
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
  basico: { usd: 20, cop: 50000 },
  pyme: { usd: 35, cop: 90000 },
  enterprise: { usd: 60, cop: 160000 }
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
  country: 'colombia' | 'international'
): PriceCalculation | null {
  // Validar plan
  if (!PLAN_PRICES[planId]) {
    console.error(`Plan inválido: ${planId}`)
    return null
  }

  // Validar duración
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
export function formatPrice(amount: number, currency: 'COP' | 'USD'): string {
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
 * Ejecuta todos los casos de prueba
 */
export function runAllTests(): void {
  console.log('\n🧪 INICIANDO PRUEBAS DE CÁLCULO DE PRECIOS\n')

  const testCases = [
    // Colombia
    { planId: 'basico', months: 1, country: 'colombia' as const, expected: 50000 },
    { planId: 'basico', months: 6, country: 'colombia' as const, expected: 270000 },
    { planId: 'pyme', months: 1, country: 'colombia' as const, expected: 90000 },
    { planId: 'pyme', months: 6, country: 'colombia' as const, expected: 486000 },
    { planId: 'pyme', months: 12, country: 'colombia' as const, expected: 972000 },
    { planId: 'enterprise', months: 6, country: 'colombia' as const, expected: 864000 },
    { planId: 'enterprise', months: 12, country: 'colombia' as const, expected: 1728000 },
    
    // Internacional
    { planId: 'basico', months: 1, country: 'international' as const, expected: 20 },
    { planId: 'basico', months: 6, country: 'international' as const, expected: 108 },
    { planId: 'pyme', months: 1, country: 'international' as const, expected: 35 },
    { planId: 'pyme', months: 6, country: 'international' as const, expected: 189 },
    { planId: 'pyme', months: 12, country: 'international' as const, expected: 378 },
    { planId: 'enterprise', months: 6, country: 'international' as const, expected: 324 },
    { planId: 'enterprise', months: 12, country: 'international' as const, expected: 648 }
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
      console.log(`✅ Test ${index + 1}: PASADO - ${test.planId.toUpperCase()} ${test.months}m ${test.country} = ${formatPrice(calc.finalPrice, calc.currency)}`)
      passed++
    } else {
      console.log(`❌ Test ${index + 1}: FALLADO - ${test.planId.toUpperCase()} ${test.months}m ${test.country}`)
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

/**
 * Ejemplos de uso
 */
export function showExamples(): void {
  console.log('\n📋 EJEMPLOS DE CÁLCULOS\n')

  // Ejemplo 1: Plan PYME - 6 Meses (Colombia)
  console.log('Ejemplo 1: Plan PYME - 6 Meses (Colombia)')
  const example1 = calculateExtensionPrice('pyme', 6, 'colombia')
  if (example1) printCalculation(example1)

  // Ejemplo 2: Plan PYME - 6 Meses (Internacional)
  console.log('Ejemplo 2: Plan PYME - 6 Meses (Internacional)')
  const example2 = calculateExtensionPrice('pyme', 6, 'international')
  if (example2) printCalculation(example2)

  // Ejemplo 3: Plan Enterprise - 12 Meses (Colombia)
  console.log('Ejemplo 3: Plan Enterprise - 12 Meses (Colombia)')
  const example3 = calculateExtensionPrice('enterprise', 12, 'colombia')
  if (example3) printCalculation(example3)

  // Ejemplo 4: Plan Enterprise - 12 Meses (Internacional)
  console.log('Ejemplo 4: Plan Enterprise - 12 Meses (Internacional)')
  const example4 = calculateExtensionPrice('enterprise', 12, 'international')
  if (example4) printCalculation(example4)
}

/**
 * Genera tabla de precios completa
 */
export function generatePriceTable(): void {
  console.log('\n📊 TABLA COMPLETA DE PRECIOS\n')

  const plans = ['basico', 'pyme', 'enterprise']
  const durations = [1, 3, 6, 12]
  const countries: Array<'colombia' | 'international'> = ['colombia', 'international']

  countries.forEach(country => {
    const currency = country === 'colombia' ? 'COP' : 'USD'
    console.log(`\n🌍 ${country.toUpperCase()} (${currency})\n`)

    plans.forEach(planId => {
      console.log(`\n${planId.toUpperCase()}:`)
      console.log('─'.repeat(80))
      console.log('Duración | Base    | Descuento | Total   | Ahorro  | Por Mes')
      console.log('─'.repeat(80))

      durations.forEach(months => {
        const calc = calculateExtensionPrice(planId, months, country)
        if (calc) {
          const base = formatPrice(calc.totalBeforeDiscount, currency)
          const discount = `${calc.discount}%`
          const total = formatPrice(calc.finalPrice, currency)
          const savings = formatPrice(calc.savings, currency)
          const perMonth = formatPrice(calc.pricePerMonth, currency)

          console.log(`${months.toString().padStart(2)} meses | ${base.padEnd(15)} | ${discount.padEnd(9)} | ${total.padEnd(15)} | ${savings.padEnd(15)} | ${perMonth}`)
        }
      })
    })
  })

  console.log('\n')
}

// Ejecutar pruebas si se llama directamente
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  // Node.js environment
  console.log('🚀 Ejecutando verificación de precios...')
  runAllTests()
  showExamples()
  generatePriceTable()
}
