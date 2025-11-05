# Verificación de Precios - Oryon App

## ✅ Precios Base Mensuales CORRECTOS

### Colombia (PSE - Pesos Colombianos)
| Plan | Precio/Mes | Código |
|------|------------|--------|
| **Básico** | $50.000 COP | `priceCOP: 50000` |
| **PYME** | $90.000 COP | `priceCOP: 90000` |
| **Enterprise** | $160.000 COP | `priceCOP: 160000` |

### Internacional (Paddle - Dólares)
| Plan | Precio/Mes | Código |
|------|------------|--------|
| **Básico** | $20 USD | `priceUSD: 20` |
| **PYME** | $35 USD | `priceUSD: 35` |
| **Enterprise** | $60 USD | `priceUSD: 60` |

## 📊 Cálculos de Extensión de Licencia

### Ejemplo 1: Plan PYME - 6 Meses (Colombia)
```
Precio base mensual:     $90.000 COP
Meses:                   6
────────────────────────────────────
Subtotal:               $540.000 COP
Descuento 10%:          -$54.000 COP
════════════════════════════════════
TOTAL A PAGAR:          $486.000 COP
Precio promedio/mes:     $81.000 COP
💰 AHORRO:               $54.000 COP
```

### Ejemplo 2: Plan PYME - 6 Meses (Internacional)
```
Precio base mensual:     $35 USD
Meses:                   6
───────────────────────────────
Subtotal:               $210 USD
Descuento 10%:          -$21 USD
═══════════════════════════════
TOTAL A PAGAR:          $189 USD
Precio promedio/mes:  $31.50 USD
💰 AHORRO:               $21 USD
```

### Ejemplo 3: Plan Básico - 12 Meses (Colombia)
```
Precio base mensual:     $50.000 COP
Meses:                   12
────────────────────────────────────
Subtotal:               $600.000 COP
Descuento 10%:          -$60.000 COP
════════════════════════════════════
TOTAL A PAGAR:          $540.000 COP
Precio promedio/mes:     $45.000 COP
💰 AHORRO:               $60.000 COP
```

### Ejemplo 4: Plan Enterprise - 12 Meses (Colombia)
```
Precio base mensual:     $160.000 COP
Meses:                   12
─────────────────────────────────────
Subtotal:              $1.920.000 COP
Descuento 10%:          -$192.000 COP
═════════════════════════════════════
TOTAL A PAGAR:         $1.728.000 COP
Precio promedio/mes:     $144.000 COP
💰 AHORRO:               $192.000 COP
```

### Ejemplo 5: Plan Enterprise - 12 Meses (Internacional)
```
Precio base mensual:     $60 USD
Meses:                   12
───────────────────────────────
Subtotal:               $720 USD
Descuento 10%:          -$72 USD
═══════════════════════════════
TOTAL A PAGAR:          $648 USD
Precio promedio/mes:     $54 USD
💰 AHORRO:               $72 USD
```

## 🔍 Verificación en Código

### Archivo: `/components/License.tsx` (líneas 55-121)
```typescript
const plans: Plan[] = [
  {
    id: 'basico',
    name: 'Plan Básico',
    priceUSD: 20,
    priceCOP: 50000,  ✅ CORRECTO
    // ...
  },
  {
    id: 'pyme',
    name: 'Plan PYME',
    priceUSD: 35,
    priceCOP: 90000,  ✅ CORRECTO
    // ...
  },
  {
    id: 'enterprise',
    name: 'Plan Enterprise',
    priceUSD: 60,
    priceCOP: 160000, ✅ CORRECTO
    // ...
  }
]
```

### Archivo: `/components/license/ExtendLicenseSection.tsx` (línea ~55)
```typescript
const planPrices: Record<string, { usd: number; cop: number }> = {
  basico: { usd: 20, cop: 50000 },    ✅ CORRECTO
  pyme: { usd: 35, cop: 90000 },      ✅ CORRECTO
  enterprise: { usd: 60, cop: 160000 } ✅ CORRECTO
}
```

## 📋 Tabla Completa de Precios con Descuentos

### Colombia (COP) - Todos los Planes y Duraciones

#### Plan Básico ($50.000/mes)
| Duración | Sin Descuento | Descuento | Total | Ahorro | Precio/Mes |
|----------|---------------|-----------|-------|--------|------------|
| 1 mes | $50.000 | 0% | $50.000 | $0 | $50.000 |
| 3 meses | $150.000 | 0% | $150.000 | $0 | $50.000 |
| 6 meses | $300.000 | 10% | $270.000 | $30.000 | $45.000 |
| 12 meses | $600.000 | 10% | $540.000 | $60.000 | $45.000 |

#### Plan PYME ($90.000/mes)
| Duración | Sin Descuento | Descuento | Total | Ahorro | Precio/Mes |
|----------|---------------|-----------|-------|--------|------------|
| 1 mes | $90.000 | 0% | $90.000 | $0 | $90.000 |
| 3 meses | $270.000 | 0% | $270.000 | $0 | $90.000 |
| 6 meses | $540.000 | 10% | $486.000 | $54.000 | $81.000 |
| 12 meses | $1.080.000 | 10% | $972.000 | $108.000 | $81.000 |

#### Plan Enterprise ($160.000/mes)
| Duración | Sin Descuento | Descuento | Total | Ahorro | Precio/Mes |
|----------|---------------|-----------|-------|--------|------------|
| 1 mes | $160.000 | 0% | $160.000 | $0 | $160.000 |
| 3 meses | $480.000 | 0% | $480.000 | $0 | $160.000 |
| 6 meses | $960.000 | 10% | $864.000 | $96.000 | $144.000 |
| 12 meses | $1.920.000 | 10% | $1.728.000 | $192.000 | $144.000 |

### Internacional (USD) - Todos los Planes y Duraciones

#### Plan Básico ($20/mes)
| Duración | Sin Descuento | Descuento | Total | Ahorro | Precio/Mes |
|----------|---------------|-----------|-------|--------|------------|
| 1 mes | $20 | 0% | $20 | $0 | $20.00 |
| 3 meses | $60 | 0% | $60 | $0 | $20.00 |
| 6 meses | $120 | 10% | $108 | $12 | $18.00 |
| 12 meses | $240 | 10% | $216 | $24 | $18.00 |

#### Plan PYME ($35/mes)
| Duración | Sin Descuento | Descuento | Total | Ahorro | Precio/Mes |
|----------|---------------|-----------|-------|--------|------------|
| 1 mes | $35 | 0% | $35 | $0 | $35.00 |
| 3 meses | $105 | 0% | $105 | $0 | $35.00 |
| 6 meses | $210 | 10% | $189 | $21 | $31.50 |
| 12 meses | $420 | 10% | $378 | $42 | $31.50 |

#### Plan Enterprise ($60/mes)
| Duración | Sin Descuento | Descuento | Total | Ahorro | Precio/Mes |
|----------|---------------|-----------|-------|--------|------------|
| 1 mes | $60 | 0% | $60 | $0 | $60.00 |
| 3 meses | $180 | 0% | $180 | $0 | $60.00 |
| 6 meses | $360 | 10% | $324 | $36 | $54.00 |
| 12 meses | $720 | 10% | $648 | $72 | $54.00 |

## 💡 Reglas de Negocio

### Descuentos Aplicados:
- ✅ **0% descuento**: 1 mes, 3 meses
- ✅ **10% descuento**: 6 meses, 12 meses

### Fórmula de Cálculo:
```typescript
const totalBeforeDiscount = basePrice * months
const discountAmount = totalBeforeDiscount * (discount / 100)
const finalPrice = totalBeforeDiscount - discountAmount
const perMonth = finalPrice / months
```

### Validación de Montos:
```typescript
// Colombia: números sin decimales
const copFormat = price.toLocaleString('es-CO') // "540.000"

// Internacional: con 2 decimales
const usdFormat = price.toFixed(2) // "189.00"
```

## 🎯 Puntos de Verificación

Para asegurar que los precios sean correctos:

1. ✅ **License.tsx** - Precios base definidos correctamente
2. ✅ **ExtendLicenseSection.tsx** - Precios en objeto planPrices correctos
3. ✅ **Cálculo de descuentos** - 10% aplicado correctamente para 6+ meses
4. ✅ **Formato de moneda** - COP sin decimales, USD con decimales
5. ✅ **UI correcta** - Muestra precios según país seleccionado

## 🚨 Errores Comunes a Evitar

❌ **NO hacer esto:**
```typescript
// Mezclar precios de Colombia e Internacional
pyme: { usd: 35, cop: 35000 } // ❌ INCORRECTO

// Olvidar separador de miles en Colombia
priceCOP: 90000 // ❌ Correcto en código pero display debe ser "90.000"

// Usar decimales en COP
priceCOP: 90000.00 // ❌ INCORRECTO
```

✅ **SÍ hacer esto:**
```typescript
// Precios correctos por país
pyme: { usd: 35, cop: 90000 } // ✅ CORRECTO

// Formatear correctamente en UI
{selectedCountry === 'colombia' 
  ? `$${price.toLocaleString('es-CO')} COP`  // $90.000 COP
  : `$${price.toFixed(2)} USD`                // $35.00 USD
}
```

## 📞 Contacto para Cambios de Precio

Si necesitas modificar los precios:

1. Actualiza `/components/License.tsx` (líneas 55-121)
2. Actualiza `/components/license/ExtendLicenseSection.tsx` (línea ~55)
3. Actualiza esta documentación
4. Verifica cálculos en la UI
5. Prueba con ambos países (Colombia e Internacional)

---

**Última verificación**: Noviembre 2025  
**Estado**: ✅ Todos los precios verificados y correctos  
**Próxima revisión**: Mensual o al cambiar tarifas
