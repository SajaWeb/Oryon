# 📱 Guía: Generar Nuevos Códigos QR

## 🎯 Objetivo

Generar códigos QR con el nuevo formato de URLs (sin `#`) para todas las órdenes de reparación.

---

## 🆕 Formato Nuevo vs Antiguo

### ❌ Formato Antiguo (v1.x)
```
https://tu-dominio.com/#/tracking/companyId/repairId
```

### ✅ Formato Nuevo (v2.0)
```
https://tu-dominio.com/tracking/companyId/repairId
```

**IMPORTANTE**: El símbolo `#` ha sido **ELIMINADO**

---

## 🔧 Métodos de Generación

### Opción 1: Desde el Sistema Oryon (Automático)

El sistema ya genera automáticamente QRs con el nuevo formato.

**Cuándo se genera**:
- ✅ Al crear una nueva orden de reparación
- ✅ Al imprimir el recibo de recepción
- ✅ En la vista de detalles de la reparación

**No requiere acción adicional** - El sistema lo hace automáticamente.

---

### Opción 2: Regenerar QRs Existentes (Manual)

Si necesitas regenerar QRs para órdenes antiguas:

#### Paso 1: Obtener los IDs
```javascript
// En la consola del navegador (DevTools)
// Ir a la vista de reparaciones y obtener:
const companyId = "cmp_123456"  // ID de la empresa
const repairId = "rep_789012"   // ID de la reparación
```

#### Paso 2: Construir la URL
```javascript
const baseUrl = "https://tu-dominio.com"  // Tu dominio
const trackingUrl = `${baseUrl}/tracking/${companyId}/${repairId}`

console.log(trackingUrl)
// Resultado: https://tu-dominio.com/tracking/cmp_123456/rep_789012
```

#### Paso 3: Generar el QR

**Opción A: Generador Online**
1. Ir a: https://www.qr-code-generator.com/
2. Pegar la URL del paso 2
3. Descargar el QR en formato PNG o SVG
4. Tamaño recomendado: 200x200 px mínimo

**Opción B: Desde el código**
```javascript
import QRCode from 'qrcode'

async function generateQR(companyId, repairId) {
  const trackingUrl = `https://tu-dominio.com/tracking/${companyId}/${repairId}`
  
  // Como Data URL (para mostrar en pantalla)
  const qrDataUrl = await QRCode.toDataURL(trackingUrl, {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  })
  
  return qrDataUrl
}
```

---

## 📋 Script de Regeneración Masiva

Si necesitas regenerar QRs para múltiples órdenes:

```javascript
// regenerate-qr-codes.js
import QRCode from 'qrcode'
import fs from 'fs'

// Lista de reparaciones
const repairs = [
  { companyId: 'cmp_123', repairId: 'rep_456' },
  { companyId: 'cmp_123', repairId: 'rep_789' },
  // ... más reparaciones
]

const baseUrl = 'https://tu-dominio.com'

async function regenerateAll() {
  for (const repair of repairs) {
    const trackingUrl = `${baseUrl}/tracking/${repair.companyId}/${repair.repairId}`
    const filename = `qr_${repair.repairId}.png`
    
    await QRCode.toFile(filename, trackingUrl, {
      width: 300,
      margin: 2
    })
    
    console.log(`✓ Generado: ${filename}`)
  }
  
  console.log(`\n✓ Total generados: ${repairs.length}`)
}

regenerateAll()
```

**Uso**:
```bash
node regenerate-qr-codes.js
```

---

## 🖨️ Imprimir Nuevos QRs

### Para Recibos Nuevos

El sistema ya incluye automáticamente el QR en el recibo de recepción.

**Ubicación en el recibo**:
```
┌─────────────────────────────────┐
│      ORDEN DE REPARACIÓN        │
│                                 │
│  Cliente: Juan Pérez            │
│  Equipo: iPhone 12 Pro          │
│  Fecha: 05/11/2025              │
│                                 │
│  Escanea para rastrear:         │
│  ┌─────────────┐                │
│  │             │                │
│  │  [QR CODE]  │ ← AQUÍ         │
│  │             │                │
│  └─────────────┘                │
│                                 │
│  URL: oryon.app/tracking/...    │
└─────────────────────────────────┘
```

---

### Para Recibos Ya Impresos

Si ya entregaste el recibo con QR antiguo:

**Opción 1: Sticker con Nuevo QR**
1. Generar nuevo QR (método arriba)
2. Imprimir en sticker 3x3 cm
3. Pegar sobre el QR antiguo en el recibo del cliente

**Opción 2: Enviar Nuevo QR por Email/WhatsApp**
1. Generar QR como imagen
2. Enviar al cliente con mensaje:
   > "Hemos mejorado nuestro sistema de tracking. Aquí está su nuevo código QR para rastrear su reparación: [imagen]"

**Opción 3: No Hacer Nada**
El QR antiguo seguirá funcionando SI activas el script de compatibilidad:

```html
<!-- En index.html -->
<script src="/hash-to-path-redirect.js"></script>
```

---

## 📊 Checklist de Transición

### Para Órdenes Nuevas
- [x] Sistema genera QRs automáticamente con nuevo formato
- [x] URLs sin `#`
- [x] Testing de QR en móvil antes de imprimir

### Para Órdenes Existentes
- [ ] Identificar órdenes activas con QR antiguo
- [ ] Decidir estrategia:
  - [ ] Opción A: Regenerar todos los QRs
  - [ ] Opción B: Solo para órdenes importantes
  - [ ] Opción C: Mantener compatibilidad con script
- [ ] Comunicar cambios a clientes (si aplica)
- [ ] Actualizar documentación interna

---

## 🧪 Testing de QR

### Test Básico
1. Generar QR con URL de prueba:
   ```
   https://tu-dominio.com/tracking/test123/repair456
   ```

2. Escanear con móvil

3. Verificar que:
   - ✅ Abre directamente la URL
   - ✅ No hay redirecciones
   - ✅ Parámetros se detectan correctamente
   - ✅ Página carga información de la reparación

### Test en Diferentes Dispositivos
- [ ] iPhone con Safari
- [ ] Android con Chrome
- [ ] Google Lens
- [ ] Cámara nativa del teléfono
- [ ] Apps de mensajería (WhatsApp, Telegram)

---

## 💡 Mejores Prácticas

### Calidad del QR
1. **Tamaño mínimo**: 2cm x 2cm en impresión
2. **Tamaño recomendado**: 3cm x 3cm
3. **Resolución**: 300 DPI para impresión
4. **Margen**: Al menos 4 módulos de espacio en blanco alrededor

### Diseño
```javascript
// Configuración recomendada
{
  width: 300,              // 300px = buena calidad
  margin: 2,               // 2 módulos de margen
  errorCorrectionLevel: 'M', // Nivel medio de corrección
  color: {
    dark: '#000000',       // Negro puro
    light: '#FFFFFF'       // Blanco puro
  }
}
```

### Ubicación en el Recibo
- ✅ Visible y fácil de escanear
- ✅ No cerca de dobleces
- ✅ No en bordes que puedan cortarse
- ✅ Con texto explicativo: "Escanea para rastrear"
- ✅ Incluir URL legible debajo del QR

---

## 🔄 Compatibilidad con QRs Antiguos

### Opción 1: Mantener Compatibilidad Temporal

Activar script de redirección:

```html
<!-- En index.html -->
<script src="/hash-to-path-redirect.js"></script>
```

**Ventajas**:
- ✅ QRs antiguos siguen funcionando
- ✅ No necesitas regenerar nada
- ✅ Transición suave

**Desventajas**:
- ⚠️ Código adicional para mantener
- ⚠️ Una redirección extra (mínima)

### Opción 2: Migración Completa

No usar script de compatibilidad y regenerar todos los QRs.

**Ventajas**:
- ✅ Código más limpio
- ✅ Sin dependencias legacy
- ✅ Mejor rendimiento (sin redirección)

**Desventajas**:
- ⚠️ Requiere regenerar QRs
- ⚠️ Puede confundir clientes con 2 QRs

---

## 📞 FAQ

### ¿Los QR antiguos dejarán de funcionar?

**Con script de compatibilidad**: No, seguirán funcionando indefinidamente.

**Sin script**: Sí, los QR con `#` no funcionarán correctamente.

### ¿Debo informar a los clientes?

**Opción A** (Recomendado): Solo si regeneras el QR
- Envía nuevo QR por email/WhatsApp
- Explica que es una mejora del sistema

**Opción B**: No informar si usas script de compatibilidad
- Los QR antiguos siguen funcionando
- No hay impacto para el cliente

### ¿Cuánto tiempo mantener compatibilidad?

**Recomendación**: 3-6 meses
- Suficiente para que todas las órdenes antiguas se entreguen
- Luego puedes eliminar el script

### ¿El QR funciona offline?

Depende:
- ✅ Si el cliente visitó la página antes, puede funcionar offline (PWA)
- ❌ Para primera visita, necesita conexión

---

## 📝 Plantilla de Comunicación al Cliente

Si decides informar a clientes sobre nuevo QR:

```
Estimado/a [Nombre],

Hemos mejorado nuestro sistema de tracking de reparaciones 
para ofrecerte una mejor experiencia.

Tu nuevo código QR para rastrear tu reparación es:

[Imagen del QR]

También puedes visitar:
https://oryon-app.com/tracking/[companyId]/[repairId]

El QR anterior seguirá funcionando, pero te recomendamos 
usar el nuevo para una experiencia más rápida.

Gracias por tu preferencia.

Atentamente,
[Tu Empresa]
```

---

## ✅ Verificación Final

Antes de entregar un recibo con QR:

- [ ] URL tiene el formato correcto (sin `#`)
- [ ] QR se generó con alta calidad (300px+)
- [ ] QR está bien impreso (nítido, sin manchas)
- [ ] QR es escaneable en tu propio móvil
- [ ] URL debajo del QR es legible
- [ ] Texto explicativo incluido

---

**Última actualización**: 5 de Noviembre, 2025  
**Versión del sistema**: 2.0.0  
**Responsable**: Equipo Oryon App
