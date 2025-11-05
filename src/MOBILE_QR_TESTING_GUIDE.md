# Guía de Pruebas - Fix de QR en Móviles

## Problema Original

Al escanear códigos QR de tracking desde dispositivos móviles, la aplicación mostraba brevemente la página de login o dashboard antes de redirigir al tracking, o en algunos casos no redirigía en absoluto.

## Solución Implementada

Se implementaron múltiples capas de protección para garantizar que las rutas públicas (tracking y reset-password) se muestren inmediatamente sin procesamiento de autenticación:

### 1. Detección Inmediata del Hash
- El hash se lee ANTES de inicializar cualquier estado de React
- Esto previene cualquier renderizado condicional basado en autenticación

### 2. Estado de Carga Condicional
- Si se detecta una ruta pública al inicio, `isLoading` comienza en `false`
- Esto evita mostrar el spinner de carga innecesariamente

### 3. Script de Preservación de Hash (hash-fix.js)
- Se ejecuta ANTES de que React arranque
- Guarda el hash en sessionStorage como respaldo
- Fuerza la URL a incluir el hash si el navegador lo elimina

### 4. Historia del Navegador
- Se usa `history.replaceState` para asegurar que el hash esté en la URL
- Esto es crucial para navegadores móviles que pueden perder el fragmento

## Cómo Probar

### Prueba 1: Escaneo Directo desde Cámara (iOS)

1. **Preparación:**
   - Abre la app de Cámara en iPhone
   - Ten listo un código QR de tracking (impreso o en pantalla)

2. **Escaneo:**
   - Apunta la cámara al QR
   - Aparecerá una notificación con la URL
   - Ejemplo: `https://tu-dominio.com/#/tracking/1/123`

3. **Verificación:**
   - Toca la notificación
   - La página de tracking debe aparecer INMEDIATAMENTE
   - NO debe haber flash de login/dashboard
   - NO debe mostrar "Cargando..." innecesariamente

4. **Logs en Consola (Safari):**
   ```
   🔧 Hash Fix Script: Running...
   🔧 Hash detected: #/tracking/1/123
   🎯 App component rendering...
   🚀 Initial route detection: { isPublicRoute: true }
   ✅ Rendering TrackingPage
   ```

### Prueba 2: Escaneo desde Chrome/QR Reader (Android)

1. **Preparación:**
   - Abre Chrome o una app de QR reader
   - Ten listo el código QR

2. **Escaneo:**
   - Escanea el código
   - Chrome mostrará una vista previa de la URL

3. **Verificación:**
   - Toca "Abrir"
   - La página de tracking debe cargarse directamente
   - Verifica que no haya redirecciones

4. **Logs Esperados:**
   - Los mismos que en iOS

### Prueba 3: Compartir Link (WhatsApp/Telegram)

1. **Preparación:**
   - Copia una URL de tracking: `https://tu-dominio.com/#/tracking/1/123`
   - Envíala por WhatsApp/Telegram a tu mismo número

2. **Verificación:**
   - Toca el link en el chat
   - La página debe abrirse correctamente en el navegador
   - Verifica que llegues directamente al tracking

### Prueba 4: Usuario Autenticado

1. **Preparación:**
   - Inicia sesión en la app con un usuario válido
   - Navega al dashboard (verifica que estés autenticado)

2. **Escaneo:**
   - Escanea un código QR de tracking
   - O abre un link de tracking

3. **Verificación:**
   - Debe mostrar la página de tracking
   - NO debe redirigir al dashboard
   - La sesión debe mantenerse activa en segundo plano
   - Al hacer clic en "volver" o navegar, volverás al dashboard

### Prueba 5: Modo Incógnito/Privado

1. **Preparación:**
   - Abre el navegador en modo incógnito
   - Cierra cualquier sesión activa

2. **Escaneo:**
   - Escanea un código QR de tracking

3. **Verificación:**
   - Debe mostrar la página de tracking
   - NO debe pedir login
   - La información debe cargarse correctamente

## Debugging

### Opción 1: Usar el DebugPanel (Más Fácil)

Se creó un componente especial `/components/DebugPanel.tsx` para facilitar el debugging en móviles sin necesidad de conectar cables.

**Cómo activarlo:**

1. Abre `/App.tsx`
2. Importa el componente:
   ```typescript
   import { DebugPanel } from './components/DebugPanel'
   ```
3. Agrégalo justo antes del cierre del componente principal:
   ```typescript
   return (
     <ThemeProvider>
       {/* ... resto del código ... */}
       <DebugPanel />  {/* Agregar esta línea */}
     </ThemeProvider>
   )
   ```
4. Despliega la aplicación
5. En el móvil, verás un botón morado en la esquina inferior derecha
6. Toca el botón para ver el panel de debug
7. Escanea un QR y observa la información en tiempo real

**Información que muestra:**
- Hash actual de la URL
- Estado de detección (Tracking, Reset Password)
- SessionStorage backup del hash
- Historial de cambios de ruta
- URL completa
- Timestamp de cada cambio

**IMPORTANTE:** Elimina el DebugPanel antes de ir a producción, o protégelo para que solo lo vean administradores.

### Opción 2: Ver Logs en Móvil (Avanzado)

#### iOS Safari:
1. Conecta el iPhone a una Mac
2. Abre Safari en la Mac
3. Menú: Desarrollar > [Tu iPhone] > [Pestaña]
4. Se abrirá el inspector web

#### Android Chrome:
1. Conecta el Android a un PC
2. En Chrome PC, ve a: `chrome://inspect#devices`
3. Encuentra tu dispositivo y haz clic en "inspect"

### Logs Importantes a Verificar:

```javascript
// ✅ CORRECTO - Ruta pública detectada
🔧 Hash Fix Script: Running...
🔧 Hash detected: #/tracking/1/123
🎯 App component rendering...
🚀 Initial route detection: { isPublicRoute: true, isLoading: false }
✅ Rendering TrackingPage

// ❌ INCORRECTO - Si ves esto, hay un problema
🎯 App component rendering...
🚀 Initial route detection: { isPublicRoute: false, isLoading: true }
⚡ Auth check effect...
(Esto indica que no se detectó la ruta pública)
```

## Problemas Conocidos y Soluciones

### Problema: El hash se pierde al abrir desde QR

**Síntoma:** URL en preview muestra `#/tracking/1/123` pero al abrir aparece solo la raíz

**Solución:**
1. Verifica que `hash-fix.js` esté incluido en el HTML
2. Asegúrate de que se carga ANTES que React
3. Revisa los logs de consola

### Problema: Flash rápido de login antes de tracking

**Síntoma:** Se ve brevemente la página de login

**Solución:**
1. Verifica que `isLoading` comience en `false` para rutas públicas
2. Revisa que la verificación de `isTrackingPage` esté ANTES del renderizado condicional
3. Limpia la caché del navegador móvil

### Problema: sessionStorage no funciona

**Síntoma:** Error en consola sobre sessionStorage

**Solución:**
1. Verifica que el navegador permita sessionStorage
2. Revisa la configuración de privacidad (algunos navegadores lo bloquean en modo privado)
3. El script tiene try/catch para manejar esto gracefully

## URLs de Prueba

### Formato Actual (con companyId):
```
https://tu-dominio.com/#/tracking/1/123
https://tu-dominio.com/#/tracking/2/456
```

### Formato Legacy (sin companyId):
```
https://tu-dominio.com/#/tracking/123
https://tu-dominio.com/#/tracking/456
```

Ambos formatos deben funcionar correctamente.

## Checklist de Verificación

- [ ] QR code se escanea correctamente en iOS
- [ ] QR code se escanea correctamente en Android
- [ ] No hay flash de login/dashboard
- [ ] Usuario autenticado puede ver tracking sin problemas
- [ ] Usuario no autenticado puede ver tracking
- [ ] Links compartidos funcionan correctamente
- [ ] Modo incógnito funciona
- [ ] Formato legacy (sin companyId) funciona
- [ ] Formato nuevo (con companyId) funciona
- [ ] Logs muestran detección correcta de ruta pública

## Fecha de Implementación

Noviembre 4, 2025

## Notas Adicionales

- El fix es completamente transparente para el usuario
- No afecta el funcionamiento normal de la app
- Compatible con todas las versiones de navegadores modernos
- Sin dependencias externas adicionales
