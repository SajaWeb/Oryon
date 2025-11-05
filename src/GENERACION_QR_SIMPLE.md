# Guía Simple para Generar Códigos QR de Tracking

## 🎯 Formato de URL para QR

Todos los códigos QR de tracking deben usar el siguiente formato:

```
https://TU-DOMINIO.com/tracking/COMPANY_ID/REPAIR_ID
```

### Ejemplo Real:
```
https://oryon-app.vercel.app/tracking/1/123
```

Donde:
- `1` = Company ID (ID de la empresa)
- `123` = Repair ID (ID de la orden de reparación)

## 📱 Cómo Generar el QR

### Opción 1: Usando un Generador Online

1. Ve a cualquier generador de QR online como:
   - https://www.qr-code-generator.com/
   - https://www.qrcode-monkey.com/
   - https://www.qrstuff.com/

2. Selecciona "URL" o "Website"

3. Pega la URL completa:
   ```
   https://TU-DOMINIO.com/tracking/COMPANY_ID/REPAIR_ID
   ```

4. Genera y descarga el QR

5. Imprime o envía el QR al cliente

### Opción 2: En el Sistema Oryon App

El sistema Oryon App puede generar automáticamente el QR cuando:
- Se crea una nueva orden de reparación
- Se imprime el recibo de la orden

El QR se genera automáticamente con el formato correcto.

## ✅ Verificación

Para verificar que tu QR funciona correctamente:

1. **Escanea el QR con tu móvil**
2. **Debe abrir directamente la página de tracking**
3. **NO debe redirigir a login ni homepage**
4. **Debe mostrar la información de la reparación**

## 📋 Checklist

Antes de imprimir o enviar el QR, verifica:

- [ ] La URL tiene el formato correcto: `/tracking/COMPANY_ID/REPAIR_ID`
- [ ] NO tiene `#` en la URL
- [ ] El COMPANY_ID es correcto
- [ ] El REPAIR_ID es correcto
- [ ] El QR escanea correctamente desde móvil
- [ ] Muestra la información de la reparación

## 🔧 Variables Dinámicas

En tu sistema, las variables se generan automáticamente:

```javascript
const companyId = userProfile.company_id  // ID de la empresa
const repairId = repair.id                 // ID de la orden
const qrUrl = `https://TU-DOMINIO.com/tracking/${companyId}/${repairId}`
```

## ⚠️ IMPORTANTE

### ✅ URLs CORRECTAS (BrowserRouter):
```
https://dominio.com/tracking/1/123
https://dominio.com/tracking/2/456
```

### ❌ URLs INCORRECTAS (NO usar):
```
https://dominio.com/#/tracking/1/123  ❌ (tiene #)
https://dominio.com/tracking/123      ❌ (falta company_id)
https://dominio.com?tracking=123      ❌ (formato incorrecto)
```

## 🎨 Personalización del QR

Puedes personalizar el QR con:
- **Logo**: Agrega el logo de tu empresa en el centro
- **Colores**: Usa los colores de tu marca
- **Marco**: Agrega un marco con texto como "Escanea para seguimiento"

### Ejemplo de texto para el marco:
```
ESCANEA PARA RASTREAR TU REPARACIÓN
Oryon App - Tracking en Tiempo Real
```

## 📊 Buenas Prácticas

1. **Tamaño del QR**: Mínimo 2cm x 2cm para fácil escaneo
2. **Contraste**: Fondo claro con QR oscuro (mejor lectura)
3. **Ubicación**: Coloca el QR en un lugar visible del recibo
4. **Instrucciones**: Agrega texto explicativo cerca del QR
5. **Testing**: Prueba escanear desde diferentes dispositivos

## 🔗 Integración con Recibos

El QR debe aparecer en:
- ✅ Recibo de recepción de la orden
- ✅ Ticket de entrega
- ✅ Emails de notificación (como imagen o link)
- ✅ WhatsApp/SMS al cliente

## 🚀 Ejemplo de Implementación

```javascript
// Generar URL para QR
function generateTrackingQR(companyId, repairId) {
  const baseUrl = 'https://TU-DOMINIO.com'
  const trackingUrl = `${baseUrl}/tracking/${companyId}/${repairId}`
  
  // Usa una librería de QR como 'qrcode' o un servicio API
  return trackingUrl
}

// Uso:
const qrUrl = generateTrackingQR(1, 123)
// Resultado: https://TU-DOMINIO.com/tracking/1/123
```

## 📞 Soporte

Si tienes problemas con los códigos QR:
1. Verifica que el servidor esté configurado correctamente
2. Comprueba que los archivos `_redirects` y `vercel.json` estén presentes
3. Prueba la URL directamente en el navegador
4. Revisa los logs de la consola del navegador

---

**Última Actualización:** 5 de Noviembre, 2025  
**Versión:** 1.0 - BrowserRouter Puro  
**Estado:** ✅ Configuración Completa
