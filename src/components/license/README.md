# License Components

Esta carpeta contiene todos los componentes relacionados con la gestión de licencias y suscripciones de Oryon App.

## Componentes

### ExtendLicenseSection.tsx
Componente principal para la extensión de licencias por tiempo adicional.

**Props:**
```typescript
interface ExtendLicenseSectionProps {
  accessToken: string          // Token de autenticación
  currentPlanId: string         // ID del plan actual (basico/pyme/enterprise)
  currentPlanName: string       // Nombre del plan actual
  currentExpiry: string         // Fecha ISO de vencimiento actual
  onLicenseExtended: () => void // Callback al extender exitosamente
}
```

**Características:**
- 4 opciones de duración (1, 3, 6, 12 meses)
- Descuento del 10% para 6+ meses
- Selección de país (Colombia/Internacional)
- Cálculo automático de precios y descuentos
- Preview de nueva fecha de vencimiento
- Integración con PSE y Paddle

**Uso:**
```tsx
<ExtendLicenseSection
  accessToken={token}
  currentPlanId="pyme"
  currentPlanName="Plan PYME"
  currentExpiry="2024-12-31T00:00:00.000Z"
  onLicenseExtended={() => {
    console.log('Licencia extendida!')
    reloadLicenseData()
  }}
/>
```

## Estructura de Precios

### Planes Base (por mes)
| Plan | Colombia (COP) | Internacional (USD) |
|------|----------------|---------------------|
| Básico | $50.000 | $20 |
| PYME | $90.000 | $35 |
| Enterprise | $160.000 | $60 |

### Duraciones
| Meses | Descuento | Badge |
|-------|-----------|-------|
| 1 | 0% | - |
| 3 | 0% | - |
| 6 | 10% | "10% OFF" + "Más popular" |
| 12 | 10% | "10% OFF" |

## Lógica de Negocio

### Cálculo de Precios
```typescript
const totalBeforeDiscount = basePrice * months
const discountAmount = totalBeforeDiscount * (discount / 100)
const finalPrice = totalBeforeDiscount - discountAmount
const perMonth = finalPrice / months
```

### Cálculo de Nueva Fecha
```typescript
// Si la licencia está activa, suma a la fecha actual
const currentDate = new Date(currentExpiry)
const newDate = new Date(currentDate)
newDate.setMonth(newDate.getMonth() + months)

// Si está expirada, suma desde hoy
if (currentDate < new Date()) {
  newDate = new Date()
  newDate.setMonth(newDate.getMonth() + months)
}
```

## Estados del Componente

### Loading States
- `loading`: true durante el procesamiento del pago
- Toast "Procesando pago..." mientras procesa
- Botón deshabilitado durante carga

### Success States
- Toast de éxito con duración extendida
- Callback `onLicenseExtended()` ejecutado
- Datos de licencia recargados

### Error States
- Toast de error con descripción
- Loading state reseteado
- Usuario puede reintentar

## Integración con Backend

### Endpoints Utilizados

#### 1. Crear Pago PSE (Colombia)
```
POST /make-server-4d437e50/license/extend/pse
Body: { planId, months, amount, discount }
```

#### 2. Crear Pago Paddle (Internacional)
```
POST /make-server-4d437e50/license/extend/paddle
Body: { planId, months, amount, discount }
```

#### 3. Extender Licencia
```
POST /make-server-4d437e50/license/extend
Body: { months }
```

## Diseño Visual

### Colores
- **Azul** (#2563eb): Elementos primarios, iconos, highlights
- **Verde** (#16a34a): Descuentos, ahorros, success states
- **Gris**: Texto secundario, borders
- **Degradados**: Blue-to-indigo para resúmenes

### Iconos (lucide-react)
- `Clock`: Header del componente
- `Calendar`: Fechas
- `Percent`: Descuentos
- `CreditCard`: Botón de pago
- `Globe` / `MapPin`: Selección de país
- `Info`: Alertas informativas
- `Zap`: Beneficios

### Layout
```
┌─────────────────────────┐
│ Header (Clock + Title)  │
├─────────────────────────┤
│ Current License Info    │ ← Alert azul
├─────────────────────────┤
│ Duration Options        │ ← Grid 2x2
│   [1M] [3M]            │
│   [6M*] [12M]          │
├─────────────────────────┤
│ Country Selection       │ ← Radio buttons
│   ○ Colombia            │
│   ● Internacional       │
├─────────────────────────┤
│ Purchase Summary        │ ← Card destacado
│   - Duration            │
│   - Base price          │
│   - Discount            │
│   - Final price         │
│   - New expiry date     │
├─────────────────────────┤
│ Discount Alert (if any) │ ← Alert verde
├─────────────────────────┤
│ [Purchase Button]       │ ← CTA principal
├─────────────────────────┤
│ Info Alert              │ ← Alert info
└─────────────────────────┘
```

## Testing

### Unit Tests Recomendados
```typescript
describe('ExtendLicenseSection', () => {
  it('calcula precios correctamente sin descuento')
  it('aplica 10% de descuento para 6 meses')
  it('aplica 10% de descuento para 12 meses')
  it('calcula nueva fecha correctamente')
  it('muestra precio en COP para Colombia')
  it('muestra precio en USD para Internacional')
  it('desabilita botón durante carga')
  it('ejecuta callback al extender exitosamente')
})
```

### Integration Tests Recomendados
```typescript
describe('License Extension Flow', () => {
  it('extiende licencia activa correctamente')
  it('extiende licencia expirada desde hoy')
  it('procesa pago PSE exitosamente')
  it('procesa pago Paddle exitosamente')
  it('maneja errores de pago correctamente')
  it('actualiza UI después de extensión')
})
```

## Mejoras Futuras

### Funcionalidad
- [ ] Cupones de descuento
- [ ] Opciones de 18 y 24 meses con descuentos mayores
- [ ] Renovación automática configurable
- [ ] Historial de extensiones
- [ ] Facturas descargables

### UX
- [ ] Animaciones de transición
- [ ] Comparador de opciones
- [ ] Calculadora interactiva
- [ ] Preview visual de timeline
- [ ] Recomendación inteligente de duración

### Técnico
- [ ] Retry logic para pagos fallidos
- [ ] Webhook handling
- [ ] Real-time payment status
- [ ] Rollback en caso de error
- [ ] A/B testing de precios

## Dependencias

```json
{
  "lucide-react": "^0.x.x",
  "sonner": "^2.0.3",
  "@/components/ui/*": "shadcn/ui"
}
```

## Convenciones de Código

- TypeScript strict mode
- Interfaces explícitas para props
- Async/await para llamadas API
- Try/catch para error handling
- Console.log para debugging
- Toast notifications para feedback
- Comentarios en lógica compleja

---

**Mantenedores**: Equipo de Desarrollo Oryon App  
**Última actualización**: Noviembre 2025  
**Estado**: ✅ Producción
