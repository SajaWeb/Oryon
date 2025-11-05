# Arreglo del Routing de Tracking - Oryon App (ACTUALIZACIÓN MÓVIL)

## Problema Resuelto

Se corrigió el problema donde al escanear el código QR con un dispositivo móvil, el sistema mostraba brevemente la página de login o dashboard antes de mostrar la página de tracking. Este problema era causado por cómo algunos navegadores móviles (especialmente iOS Safari y Chrome en Android) procesan las URLs con hash fragments cuando se abren desde códigos QR.

### Síntoma específico:
- Usuario escanea QR con cámara del celular
- URL se muestra correctamente en el preview
- Al abrir, aparece brevemente login/dashboard
- Usuario tiene que escribir la URL manualmente para acceder al tracking

## Cambios Implementados

### 1. Priorización del Hash Route (App.tsx - Línea 47)

```typescript
// ANTES: effectiveRoute = currentRoute || hashRoute
// AHORA: effectiveRoute = hashRoute || currentRoute
const effectiveRoute = hashRoute || currentRoute // Prioritize hashRoute for immediate detection
```

**Razón**: Ahora se prioriza `hashRoute` (que lee directamente de `window.location.hash`) sobre `currentRoute` (que es un estado de React). Esto permite una detección inmediata de las rutas de tracking incluso antes de que el estado se actualice.

### 2. Mejora en el useEffect de Autenticación (App.tsx - Líneas 116-127)

```typescript
useEffect(() => {
  console.log('⚡ Auth check effect:', { isTrackingPage, isResetPasswordPage, effectiveRoute })
  // Skip authentication check for public routes (tracking and reset-password)
  if (isTrackingPage || isResetPasswordPage) {
    console.log('⚡ Public route detected, skipping auth check')
    setIsLoading(false)
    return // Early return para evitar cualquier chequeo de autenticación
  }
  
  // For all other routes, check authentication
  checkSession()
}, [isTrackingPage, isResetPasswordPage, effectiveRoute])
```

**Razón**: Se agregó un `return` temprano cuando se detecta una ruta pública, evitando completamente el chequeo de autenticación y cualquier posible redirección.

### 3. Renderizado con ThemeProvider (App.tsx - Líneas 294-300)

```typescript
// PRIORITY 1: If this is a public page, show it immediately (check first, before auth)
// This ensures tracking pages work for anyone with the link, regardless of auth status
if (isTrackingPage) {
  console.log('✅ Rendering TrackingPage with companyId:', trackingCompanyId, 'repairId:', trackingRepairId)
  return (
    <ThemeProvider>
      <TrackingPage companyId={trackingCompanyId} repairId={trackingRepairId} />
    </ThemeProvider>
  )
}
```

**Razón**: Se envolvió el componente `TrackingPage` con `ThemeProvider` para mantener la consistencia visual con el resto de la aplicación (soporte para modo oscuro/claro).

## Flujo del Routing Actualizado

### Orden de Prioridad en App.tsx:

1. **PRIORIDAD 1**: ¿Es una página de tracking? → Mostrar TrackingPage (sin autenticación)
2. **PRIORIDAD 2**: ¿Es la página de reset password? → Mostrar ResetPassword (sin autenticación)
3. **PRIORIDAD 3**: ¿Está cargando? → Mostrar loading spinner
4. **PRIORIDAD 4**: ¿Usuario autenticado? → Mostrar app completa
5. **PRIORIDAD 5**: Usuario no autenticado → Mostrar Login/Register

## Formato de URLs de Tracking

El sistema soporta dos formatos:

### Formato Actual (Con Company ID)
```
https://tu-dominio.com/#/tracking/{companyId}/{repairId}
Ejemplo: https://oryon-app.com/#/tracking/1/12345
```

### Formato Legacy (Sin Company ID)
```
https://tu-dominio.com/#/tracking/{repairId}
Ejemplo: https://oryon-app.com/#/tracking/12345
```

## Generación de QR Codes

Los códigos QR se generan en `/components/repairs/actions/printActions.ts` (línea 41):

```typescript
const trackingUrl = `${window.location.origin}/#/tracking/${repair.companyId}/${repair.id}`
```

El QR se incluye automáticamente en el recibo de servicio impreso.

## Comportamiento Esperado

### Usuario NO Autenticado
1. Escanea QR code o accede a URL de tracking
2. Ve inmediatamente la página de tracking con toda la información de la reparación
3. No se le pide login
4. No es redirigido a ninguna otra página

### Usuario Autenticado
1. Escanea QR code o accede a URL de tracking
2. Ve inmediatamente la página de tracking
3. NO es redirigido al dashboard
4. La sesión sigue activa en segundo plano
5. Puede navegar manualmente al dashboard si lo desea

## Archivos Creados/Modificados

### Nuevos Archivos:
- `/hash-fix.js` - Script que se ejecuta ANTES de React para preservar el hash en móviles

### Archivos Modificados:
- `/App.tsx` - Lógica principal de routing optimizada para móviles

## Configuración Requerida (IMPORTANTE)

Para que el fix funcione completamente en producción, necesitas incluir el archivo `hash-fix.js` en el HTML antes de que React se cargue.

### Si tienes acceso al index.html:

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Oryon App</title>
  
  <!-- CRITICAL: Este script DEBE ir ANTES de cualquier otro script -->
  <script src="/hash-fix.js"></script>
</head>
<body>
  <div id="root"></div>
  <!-- React se carga después -->
</body>
</html>
```

### Si estás usando Vite/Figma Make (sin acceso a index.html):

El script `hash-fix.js` debe ser configurado en el sistema de build para incluirse automáticamente. Mientras tanto, el fix en `App.tsx` debería manejar la mayoría de los casos.

### Verificación:

Abre la consola del navegador móvil y deberías ver estos logs cuando escanees un QR:

```
🔧 Hash Fix Script: Running...
🔧 Current URL: https://tu-dominio.com/#/tracking/1/123
🔧 Hash: #/tracking/1/123
🔧 Hash detected: #/tracking/1/123
🔧 Hash saved to sessionStorage
🔧 Hash Fix Script: Complete
```

## Testing Recomendado

1. ✅ Escanear QR sin estar autenticado → Debe mostrar tracking
2. ✅ Escanear QR estando autenticado → Debe mostrar tracking (no dashboard)
3. ✅ Acceder manualmente a URL de tracking → Debe funcionar
4. ✅ Formato legacy (solo repairId) → Debe seguir funcionando
5. ✅ Formato nuevo (companyId/repairId) → Debe funcionar

## Notas Importantes

- Las páginas de tracking son completamente públicas y no requieren autenticación
- El sistema utiliza hash routing (`#/tracking/...`) para compatibilidad con hosting estático
- Los logs en consola ayudan a debuggear el flujo de routing
- El componente TrackingPage maneja internamente ambos formatos de URL

## Fecha de Implementación

Noviembre 4, 2025
