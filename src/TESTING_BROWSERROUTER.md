# Testing BrowserRouter Migration

## 🧪 Plan de Pruebas Completo

### Pre-requisitos
1. ✅ Servidor de desarrollo corriendo
2. ✅ Acceso a dispositivo móvil para pruebas de QR
3. ✅ Generador de códigos QR online
4. ✅ Diferentes navegadores instalados

---

## 📝 Test Suite

### 1. Pruebas de Navegación Básica

#### Test 1.1: Página Principal
```
URL: https://tu-dominio.com/
Esperado: 
- ✅ Carga la HomePage (cuando no autenticado)
- ✅ Muestra opciones de login/registro
- ✅ No hay errores en consola
```

#### Test 1.2: Login
```
URL: https://tu-dominio.com/login
Esperado:
- ✅ Muestra formulario de login
- ✅ Permite autenticarse
- ✅ Redirecciona a dashboard después de login
```

#### Test 1.3: Register
```
URL: https://tu-dominio.com/register
Esperado:
- ✅ Muestra formulario de registro
- ✅ Permite crear cuenta
- ✅ Redirecciona a login después de registro
```

#### Test 1.4: Forgot Password
```
URL: https://tu-dominio.com/forgot-password
Esperado:
- ✅ Muestra formulario de recuperación
- ✅ Envía email de recuperación
- ✅ Muestra mensaje de confirmación
```

---

### 2. Pruebas de Tracking (CRÍTICO para QR)

#### Test 2.1: URL de Tracking Completa
```
URL: https://tu-dominio.com/tracking/company123/repair456
Esperado:
- ✅ Carga directamente sin login
- ✅ NO redirecciona a login
- ✅ Muestra información de la reparación
- ✅ companyId: "company123"
- ✅ repairId: "repair456"
- ✅ No hay flash de otras páginas
```

#### Test 2.2: URL de Tracking Sin Company ID (Legacy)
```
URL: https://tu-dominio.com/tracking/repair456
Esperado:
- ✅ Carga directamente sin login
- ✅ companyId: null
- ✅ repairId: "repair456"
- ✅ Muestra información de la reparación
```

#### Test 2.3: Tracking - Recargar Página
```
Acción: En /tracking/company123/repair456, presionar F5
Esperado:
- ✅ La página recarga correctamente
- ✅ Mantiene los mismos parámetros
- ✅ NO muestra error 404
```

#### Test 2.4: Tracking - Navegador Mobile
```
Dispositivo: iPhone/Android
URL: https://tu-dominio.com/tracking/company123/repair456
Esperado:
- ✅ Carga correctamente en móvil
- ✅ Diseño responsive
- ✅ Sin errores de JavaScript
```

---

### 3. Pruebas de Códigos QR

#### Test 3.1: QR en iPhone (Safari)
```
1. Generar QR con: https://tu-dominio.com/tracking/test123/qr001
2. Escanear con cámara de iPhone
3. Abrir en Safari

Esperado:
- ✅ Abre directamente la URL
- ✅ No pierde los parámetros
- ✅ Carga la página de tracking
- ✅ Sin redirecciones
```

#### Test 3.2: QR en Android (Chrome)
```
1. Generar QR con: https://tu-dominio.com/tracking/test456/qr002
2. Escanear con Google Lens o cámara
3. Abrir en Chrome

Esperado:
- ✅ Abre directamente la URL
- ✅ Parámetros intactos
- ✅ Carga correctamente
```

#### Test 3.3: QR - Diferentes Apps de Escaneo
Probar con:
- [ ] Cámara nativa iOS
- [ ] Cámara nativa Android
- [ ] Google Lens
- [ ] Apps de QR de terceros
- [ ] WhatsApp scanner
- [ ] WeChat scanner (si aplica)

---

### 4. Pruebas de Reset Password

#### Test 4.1: Reset Password desde Email
```
URL: https://tu-dominio.com/reset-password?token=abc123
Esperado:
- ✅ Carga formulario de reset
- ✅ Permite cambiar contraseña
- ✅ Redirecciona a login después
```

---

### 5. Pruebas del Navegador

#### Test 5.1: Botón Atrás
```
1. Navegar: / -> /login -> Dashboard
2. Presionar botón atrás del navegador

Esperado:
- ✅ Vuelve a /login
- ✅ Vuelve a /
- ✅ Historia funciona correctamente
```

#### Test 5.2: Botón Adelante
```
1. Navegar hacia atrás
2. Presionar botón adelante

Esperado:
- ✅ Vuelve a la página siguiente
- ✅ Estado se restaura correctamente
```

#### Test 5.3: Bookmarks
```
1. Estando en /tracking/test/123, guardar bookmark
2. Cerrar navegador
3. Abrir bookmark

Esperado:
- ✅ Carga la página correctamente
- ✅ Parámetros se mantienen
```

---

### 6. Pruebas de Autenticación

#### Test 6.1: Rutas Protegidas Sin Login
```
URL: https://tu-dominio.com/dashboard (sin estar logueado)
Esperado:
- ✅ Redirecciona a /login o muestra HomePage
```

#### Test 6.2: Logout
```
1. Estar autenticado
2. Hacer logout

Esperado:
- ✅ Limpia sesión
- ✅ Redirecciona a /
- ✅ URL cambia correctamente
```

---

### 7. Pruebas de Service Worker

#### Test 7.1: Instalación PWA
```
1. Abrir la app en navegador compatible
2. Instalar como PWA

Esperado:
- ✅ PWA se instala correctamente
- ✅ Rutas funcionan en PWA
- ✅ Tracking funciona en PWA
```

#### Test 7.2: Offline
```
1. Visitar varias páginas online
2. Activar modo avión
3. Intentar navegar

Esperado:
- ✅ Páginas cacheadas cargan
- ✅ Muestra indicador offline
- ✅ Service worker maneja rutas SPA
```

---

### 8. Pruebas de Performance

#### Test 8.1: Primera Carga
```
Herramienta: Chrome DevTools Lighthouse
Esperado:
- ✅ Performance Score > 80
- ✅ First Contentful Paint < 2s
- ✅ Time to Interactive < 3s
```

#### Test 8.2: Navegación Entre Rutas
```
Acción: Navegar entre /login, /register, /tracking
Esperado:
- ✅ Transiciones suaves
- ✅ Sin parpadeos
- ✅ Sin recargas de página
```

---

### 9. Pruebas de Seguridad

#### Test 9.1: URLs Maliciosas
```
URL: https://tu-dominio.com/tracking/../../../etc/passwd
Esperado:
- ✅ No ejecuta código malicioso
- ✅ Maneja ruta de forma segura
```

#### Test 9.2: XSS en Parámetros
```
URL: https://tu-dominio.com/tracking/<script>alert('xss')</script>/test
Esperado:
- ✅ Escapea caracteres especiales
- ✅ No ejecuta scripts
```

---

### 10. Pruebas de Compatibilidad

#### Test 10.1: Navegadores Desktop
- [ ] Chrome 90+
- [ ] Firefox 88+
- [ ] Safari 14+
- [ ] Edge 90+

#### Test 10.2: Navegadores Mobile
- [ ] iOS Safari 14+
- [ ] Chrome Android 90+
- [ ] Samsung Internet
- [ ] Firefox Mobile

#### Test 10.3: Dispositivos
- [ ] iPhone (varios modelos)
- [ ] Android (varios modelos)
- [ ] iPad
- [ ] Tablets Android

---

## 🚨 Casos de Error Conocidos

### Error 1: 404 en Refresh
**Síntoma**: Al recargar /tracking/..., muestra 404
**Causa**: Servidor no configurado para SPA
**Solución**: Verificar archivos de configuración (_redirects, vercel.json, .htaccess)

### Error 2: Redirección a Login
**Síntoma**: /tracking/... redirecciona a login
**Causa**: Detección de ruta pública fallando
**Solución**: Verificar lógica en App.tsx líneas 36-39

### Error 3: Parámetros Perdidos
**Síntoma**: companyId o repairId son null
**Causa**: Parsing de URL incorrecto
**Solución**: Verificar lógica en App.tsx líneas 78-93

---

## 📊 Checklist Final

Antes de deploy a producción:

### Código
- [ ] Todos los `window.location.hash` reemplazados
- [ ] Función `navigate()` implementada
- [ ] Rutas públicas detectadas correctamente
- [ ] Service Worker actualizado

### Configuración
- [ ] `_redirects` creado (Netlify)
- [ ] `vercel.json` creado (Vercel)
- [ ] `.htaccess` creado (Apache)
- [ ] Scripts de migración documentados

### Testing
- [ ] Tracking funciona en móvil
- [ ] QR codes escaneables
- [ ] Login/Logout funcional
- [ ] PWA funcional
- [ ] Offline mode funcional

### Documentación
- [ ] BROWSERROUTER_MIGRATION.md completo
- [ ] QR_CODES_GUIDE.md completo
- [ ] README actualizado
- [ ] Equipo informado del cambio

---

## 🎯 Métricas de Éxito

Post-deploy, monitorear:
1. **Tasa de éxito de QR**: % de QRs que cargan correctamente
2. **Errores 404**: Debe ser mínimo (<1%)
3. **Tiempo de carga tracking**: <2 segundos
4. **Soporte tickets**: Reducción en problemas de QR

---

## 📞 Rollback Plan

Si hay problemas críticos:

1. **Inmediato**: Activar script de redirección hash
   ```html
   <script src="/hash-to-path-redirect.js"></script>
   ```

2. **Temporal**: Generar nuevos QRs con formato hash
   ```
   https://tu-dominio.com/#/tracking/company/repair
   ```

3. **Permanente**: Revertir commit y volver a HashRouter
   ```bash
   git revert [commit-hash]
   git push origin main
   ```

---

**Fecha**: 5 de Noviembre, 2025
**Versión**: 2.0 - BrowserRouter
**Tester**: _______________
**Estado**: [ ] PASSED  [ ] FAILED  [ ] BLOCKED
