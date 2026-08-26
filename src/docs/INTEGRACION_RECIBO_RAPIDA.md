# Guía Rápida: Integración del Recibo de Pago

## 🚀 Implementación Rápida

### Paso 1: Importar el componente

En cualquier archivo donde manejes pagos (ej: `License.tsx`, `ExtendLicenseSection.tsx`):

```tsx
import { PaymentReceipt } from './PaymentReceipt'
```

### Paso 2: Agregar estado

```tsx
const [showReceipt, setShowReceipt] = useState(false)
const [paymentReceiptData, setPaymentReceiptData] = useState<any>(null)
```

### Paso 3: Después de un pago exitoso

```tsx
const handlePaymentSuccess = async () => {
  // ... tu lógica de pago ...
  
  if (paymentSuccessful) {
    // Preparar datos para el recibo
    setPaymentReceiptData({
      planId: 'pyme',
      planName: 'Plan PYME',
      amount: 189.00,
      currency: 'USD', // o 'COP'
      months: 6,
      discount: 10,
      status: 'success'
    })
    
    // Mostrar el recibo
    setShowReceipt(true)
  }
}
```

### Paso 4: Renderizar

```tsx
{showReceipt ? (
  <PaymentReceipt
    accessToken={accessToken}
    paymentData={paymentReceiptData}
    transactionId={`TXN-${Date.now()}`} // Opcional
    onComplete={() => {
      setShowReceipt(false)
      setPaymentReceiptData(null)
      // Recargar datos o volver al dashboard
      onLicenseExtended()
    }}
  />
) : (
  // Tu UI normal
  <div>
    {/* ... contenido ... */}
  </div>
)}
```

## 📋 Ejemplo Completo para ExtendLicenseSection

```tsx
import { useState } from 'react'
import { PaymentReceipt } from '../PaymentReceipt'

export function ExtendLicenseSection({ ... }) {
  const [showReceipt, setShowReceipt] = useState(false)
  const [paymentReceiptData, setPaymentReceiptData] = useState<any>(null)
  
  const handleExtendLicense = async () => {
    // ... tu lógica actual ...
    
    if (extendData.success) {
      // En lugar de solo toast.success, mostrar recibo
      setPaymentReceiptData({
        planId: currentPlanId,
        planName: currentPlanName,
        amount: pricing.finalPrice,
        currency: selectedCountry === 'colombia' ? 'COP' : 'USD',
        months: selectedOption.months,
        discount: selectedOption.discount,
        status: 'success'
      })
      setShowReceipt(true)
    }
  }
  
  // Si estamos mostrando el recibo, renderizarlo
  if (showReceipt && paymentReceiptData) {
    return (
      <PaymentReceipt
        accessToken={accessToken}
        paymentData={paymentReceiptData}
        onComplete={() => {
          setShowReceipt(false)
          setPaymentReceiptData(null)
          onLicenseExtended()
        }}
      />
    )
  }
  
  // Resto de tu componente normal
  return (
    <Card>
      {/* ... */}
    </Card>
  )
}
```

## 🎯 Props del Componente PaymentReceipt

```typescript
interface PaymentReceiptProps {
  // Token de autenticación (requerido)
  accessToken: string
  
  // Callback al completar (requerido)
  onComplete: () => void
  
  // OPCIÓN 1: Pasar datos directamente (más común)
  paymentData?: {
    planId: string         // 'basico' | 'pyme' | 'enterprise'
    planName: string       // 'Plan Básico' | 'Plan PYME' | 'Plan Enterprise'
    amount: number         // Monto pagado
    currency: string       // 'COP' | 'USD'
    months: number         // Duración
    discount?: number      // % de descuento (opcional)
    status: 'success' | 'failed' | 'pending'
  }
  
  // OPCIÓN 2: Cargar desde el servidor
  paymentIntentId?: string
  transactionId?: string
}
```

## 🔄 Flujo de Usuario

```
Usuario hace clic en "Comprar extensión"
           ↓
    Procesa el pago
           ↓
    Pago exitoso ✓
           ↓
setPaymentReceiptData(...) 
           ↓
  setShowReceipt(true)
           ↓
╔═══════════════════════════════╗
║   RECIBO DE PAGO MOSTRADO    ║
║                               ║
║  ✓ Fecha y hora              ║
║  ✓ Detalles del plan         ║
║  ✓ Monto pagado              ║
║  ✓ Mensaje de agradecimiento ║
║                               ║
║  [Descargar PDF] [Imprimir]  ║
╚═══════════════════════════════╝
           ↓
Usuario hace clic en "Volver"
           ↓
    onComplete() se ejecuta
           ↓
  setShowReceipt(false)
           ↓
 Vuelve a la vista normal
```

## 💡 Casos de Uso

### Caso 1: Extensión de Licencia (PSE - Colombia)

```tsx
setPaymentReceiptData({
  planId: 'pyme',
  planName: 'Plan PYME',
  amount: 486000,        // $486.000 COP
  currency: 'COP',
  months: 6,
  discount: 10,
  status: 'success'
})
```

**Resultado en recibo:**
- Total Pagado: $486.000 COP
- Duración: 6 meses
- Descuento: 10%
- Método de Pago: PSE

### Caso 2: Cambio de Plan (Paddle - Internacional)

```tsx
setPaymentReceiptData({
  planId: 'enterprise',
  planName: 'Plan Enterprise',
  amount: 60,            // $60 USD
  currency: 'USD',
  months: 1,
  discount: 0,
  status: 'success'
})
```

**Resultado en recibo:**
- Total Pagado: $60.00 USD
- Duración: 1 mes
- Sin descuento
- Método de Pago: Paddle

### Caso 3: Pago Rechazado

```tsx
setPaymentReceiptData({
  planId: 'basico',
  planName: 'Plan Básico',
  amount: 20,
  currency: 'USD',
  months: 1,
  discount: 0,
  status: 'failed'      // ⚠️ Estado: rechazado
})
```

**Resultado en recibo:**
- Badge rojo "✗ RECHAZADO"
- Mensaje de error
- Instrucciones para reintentar
- Sin mensaje de agradecimiento

## 🎨 Personalización del Recibo

Si necesitas personalizar el recibo, edita `/components/PaymentReceipt.tsx`:

### Cambiar colores:

```tsx
// Línea ~458 - Badge de estado exitoso
className="bg-green-600 hover:bg-green-700"

// Cambiar a:
className="bg-blue-600 hover:bg-blue-700"
```

### Cambiar el mensaje de agradecimiento:

```tsx
// Línea ~553
<p className="font-semibold mb-2">¡Gracias por tu compra! 🎉</p>

// Cambiar a:
<p className="font-semibold mb-2">¡Excelente elección! 🚀</p>
```

### Agregar más información:

```tsx
// Agregar dentro de "Detalles de la Compra"
<div className="flex justify-between items-center">
  <span className="text-gray-600">Tu información personalizada</span>
  <span className="font-semibold">Valor personalizado</span>
</div>
```

## 🐛 Solución de Problemas

### Problema: El recibo no se muestra

**Verificar:**
1. ¿`showReceipt` está en `true`?
2. ¿`paymentReceiptData` tiene todos los campos requeridos?
3. ¿`accessToken` es válido?

```tsx
console.log('Show Receipt:', showReceipt)
console.log('Receipt Data:', paymentReceiptData)
console.log('Access Token:', accessToken ? 'Present' : 'Missing')
```

### Problema: El PDF no se descarga

**Causa común:** Bloqueador de ventanas emergentes

**Solución:**
```tsx
// En handleDownloadPDF, agregar mensaje al usuario
toast.info('Por favor permite ventanas emergentes para descargar el PDF')
```

### Problema: Los datos no se muestran correctamente

**Verificar formato:**
```tsx
// Correcto ✅
amount: 189
currency: 'USD'

// Incorrecto ❌
amount: '$189 USD'  // No incluir símbolo ni moneda
currency: 'dollars' // Usar código de moneda
```

## 📱 Testing

### Test Manual:

1. **Test de Pago Exitoso:**
   - Hacer una compra
   - Verificar que el recibo se muestre
   - Verificar todos los datos
   - Probar descarga de PDF
   - Probar impresión
   - Probar botón "Volver"

2. **Test de Pago Rechazado:**
   - Simular pago rechazado
   - Verificar mensaje de error
   - Verificar que no haya mensaje de agradecimiento
   - Verificar opciones de reintento

3. **Test Responsive:**
   - Probar en móvil (< 640px)
   - Probar en tablet (640px - 1024px)
   - Probar en desktop (> 1024px)

### Test de Integración:

```tsx
// Mock de prueba
const testReceiptData = {
  planId: 'pyme',
  planName: 'Plan PYME',
  amount: 189,
  currency: 'USD',
  months: 6,
  discount: 10,
  status: 'success'
}

// Botón de prueba (solo para desarrollo)
<Button onClick={() => {
  setPaymentReceiptData(testReceiptData)
  setShowReceipt(true)
}}>
  🧪 Probar Recibo
</Button>
```

## ✅ Checklist de Implementación

Para implementar el recibo en tu módulo:

- [ ] Importar `PaymentReceipt` component
- [ ] Agregar estados `showReceipt` y `paymentReceiptData`
- [ ] Modificar lógica de pago para usar `setPaymentReceiptData`
- [ ] Agregar renderizado condicional
- [ ] Implementar `onComplete` callback
- [ ] Probar flujo completo
- [ ] Probar descarga de PDF
- [ ] Probar en móvil y desktop
- [ ] Verificar con pago exitoso
- [ ] Verificar con pago rechazado
- [ ] Verificar datos correctos (fecha, monto, plan)

## 🎓 Recursos Adicionales

- **Documentación completa:** `/PAYMENT_RECEIPT_IMPLEMENTATION.md`
- **Código del componente:** `/components/PaymentReceipt.tsx`
- **Endpoints del servidor:** `/supabase/functions/make-server-4d437e50/index.ts`
- **Ejemplos de integración:** Este documento

---

**Tiempo estimado de integración:** 15-30 minutos  
**Dificultad:** ⭐⭐☆☆☆ (Fácil)  
**Requiere cambios en servidor:** ✅ Ya implementados
