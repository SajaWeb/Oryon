# Guía de Códigos QR para Tracking de Reparaciones

## 📱 Formato de URLs para Códigos QR

Con el cambio a **BrowserRouter**, los códigos QR ahora utilizan URLs limpias sin el símbolo `#`.

### Formato de URL

```
https://tu-dominio.com/tracking/{companyId}/{repairId}
```

#### Parámetros:
- **companyId**: ID de la empresa/compañía (del KV store)
- **repairId**: ID único de la reparación

### Ejemplo Completo

Si tu dominio es `oryon-app.netlify.app`:

```
https://oryon-app.netlify.app/tracking/cmp_123456/rep_789012
```

## 🔧 Cómo Generar el Código QR

### Opción 1: Desde el Sistema Oryon App

El sistema genera automáticamente el código QR cuando creas una orden de reparación. El QR se incluye en:
- ✅ El recibo de recepción
- ✅ La vista de detalles de la reparación
- ✅ El sistema de impresión

### Opción 2: Generadores Online

Puedes usar cualquier generador de códigos QR online:

1. **QR Code Generator** (https://www.qr-code-generator.com/)
2. **QR Code Monkey** (https://www.qrcode-monkey.com/)
3. **QRStuff** (https://www.qrstuff.com/)

**Pasos:**
1. Copia la URL de tracking completa
2. Pégala en el generador
3. Descarga el código QR en formato PNG o SVG
4. Imprímelo o adjúntalo al recibo

### Opción 3: Programáticamente

Si estás integrando el sistema con otras herramientas:

```javascript
// Usando una librería como 'qrcode'
import QRCode from 'qrcode'

const trackingUrl = `https://tu-dominio.com/tracking/${companyId}/${repairId}`

// Generar como Data URL
const qrDataUrl = await QRCode.toDataURL(trackingUrl)

// O generar como archivo
await QRCode.toFile('./qr-code.png', trackingUrl)
```

## 📋 Testing de Códigos QR

### 1. Verificación Manual
1. Abre el código QR en tu teléfono
2. El navegador debe abrir directamente: `https://tu-dominio.com/tracking/...`
3. Debe cargar la página de tracking sin redirecciones
4. Debe mostrar el estado de la reparación

### 2. Checklist de Pruebas
- [ ] El QR se escanea correctamente en iOS Safari
- [ ] El QR se escanea correctamente en Chrome Android
- [ ] La página carga sin mostrar login
- [ ] Los datos de la reparación se muestran correctamente
- [ ] El historial de estados aparece
- [ ] Las imágenes (si hay) se cargan
- [ ] Funciona sin conexión (si está cacheada)

### 3. Problemas Comunes

#### ❌ "Página no encontrada" (404)
**Causa**: El servidor no está configurado para SPAs
**Solución**: Verifica que tienes uno de estos archivos:
- `/_redirects` (Netlify)
- `/vercel.json` (Vercel)
- `/.htaccess` (Apache)

#### ❌ Redirecciona a login
**Causa**: La ruta de tracking no se detecta como pública
**Solución**: Verifica que la URL empiece con `/tracking/`

#### ❌ No se detectan los parámetros
**Causa**: Formato de URL incorrecto
**Solución**: Asegúrate de usar el formato:
```
/tracking/{companyId}/{repairId}
```

## 🎨 Personalización del Código QR

### Tamaño Recomendado
- **Mínimo**: 2cm x 2cm (para imprimir)
- **Recomendado**: 3cm x 3cm
- **Digital**: 200x200 pixels

### Colores
- **Alto contraste**: Usa negro sobre blanco
- **Color**: Puedes usar colores oscuros sobre fondos claros
- **Evita**: Colores muy claros o bajo contraste

### Margen
- Deja al menos **4 módulos** de margen blanco alrededor del QR
- Esto mejora la lectura en diferentes condiciones de luz

## 📝 Ejemplo de Recibo con QR

```
┌─────────────────────────────────┐
│      ORYON REPAIR SERVICES      │
│                                 │
│  Orden: #12345                  │
│  Cliente: Juan Pérez            │
│  Equipo: iPhone 12 Pro          │
│  Fecha: 05/11/2025              │
│                                 │
│  Escanea para ver el estado:    │
│  ┌───────────────┐              │
│  │               │              │
│  │   [QR CODE]   │              │
│  │               │              │
│  └───────────────┘              │
│                                 │
│  o visita:                      │
│  oryon.app/tracking/cmp/rep     │
│                                 │
└─────────────────────────────────┘
```

## 🔒 Seguridad y Privacidad

### URLs Públicas
- ⚠️ Las URLs de tracking son **públicas** por diseño
- Cualquiera con el link puede ver el estado
- **No incluyas** información sensible en el QR visible

### Protección de Datos
- Los datos personales no se muestran en la URL
- Solo se muestran: estado, fecha, descripción del problema
- Para más detalles, el cliente debe autenticarse

### Recomendaciones
1. **IDs Únicos**: Usa IDs aleatorios difíciles de adivinar
2. **Rate Limiting**: Implementa límites de consulta
3. **Logs**: Registra accesos para detectar abusos
4. **Expiración**: Considera deshabilitar tracking después de la entrega

## 📊 Analytics y Seguimiento

### Métricas Útiles
- Número de escaneos por orden
- Dispositivos más usados (iOS vs Android)
- Horarios de mayor actividad
- Tasa de consulta vs entregas

### Implementación
Puedes agregar parámetros UTM para tracking:

```
https://tu-dominio.com/tracking/cmp_123/rep_456?utm_source=qr&utm_medium=receipt
```

## 🌐 Compatibilidad de Navegadores

### Probado en:
- ✅ iOS Safari 14+
- ✅ Chrome Android 90+
- ✅ Samsung Internet
- ✅ Firefox Mobile
- ✅ Edge Mobile

### PWA (Progressive Web App)
Si instalas Oryon App como PWA:
- Los QR abrirán directamente en la app
- Funciona offline si ya visitaste la orden
- Notificaciones push cuando cambia el estado

## 🚀 Mejores Prácticas

1. **Incluye URL legible**: Además del QR, imprime la URL completa
2. **Prueba antes de imprimir**: Verifica que el QR funcione
3. **Calidad de impresión**: Usa impresoras de buena calidad
4. **Ubicación**: Coloca el QR en un lugar visible del recibo
5. **Instrucciones**: Agrega texto explicativo ("Escanea para ver estado")

## 📞 Soporte

Si tienes problemas con los códigos QR:
1. Verifica que la URL es correcta
2. Prueba en diferentes navegadores
3. Verifica la configuración del servidor
4. Consulta la documentación de tu plataforma de hosting

---

**Última actualización**: 5 de Noviembre, 2025
**Versión del sistema**: 2.0 (BrowserRouter)
