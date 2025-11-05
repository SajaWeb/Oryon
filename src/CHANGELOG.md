# Changelog

Todos los cambios notables en Oryon App serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [2.0.0] - 2025-11-05

### 🚀 Cambio Mayor: Migración a BrowserRouter

Este es un cambio **BREAKING** que mejora significativamente la compatibilidad con códigos QR en dispositivos móviles.

### Added (Agregado)

#### Routing
- ✅ Implementado BrowserRouter completo reemplazando HashRouter
- ✅ Sistema de navegación programática con función `navigate()`
- ✅ Soporte para `popstate` event (botones atrás/adelante del navegador)
- ✅ URLs limpias sin símbolo `#`

#### Configuración
- ✅ Archivo `/_redirects` para Netlify
- ✅ Archivo `/vercel.json` para Vercel
- ✅ Archivo `/.htaccess` para Apache
- ✅ Script opcional `/hash-to-path-redirect.js` para compatibilidad con QRs antiguos

#### Documentación
- ✅ `/BROWSERROUTER_MIGRATION.md` - Guía completa de migración
- ✅ `/QR_CODES_GUIDE.md` - Guía de códigos QR
- ✅ `/TESTING_BROWSERROUTER.md` - Plan de pruebas completo
- ✅ `/README.md` - README principal del proyecto
- ✅ `/CHANGELOG.md` - Este archivo

#### Service Worker
- ✅ Actualizado a v2.0.0 con soporte para SPA routing
- ✅ Mejoras en el manejo de rutas de navegación offline
- ✅ Fallback mejorado para páginas cacheadas

### Changed (Cambiado)

#### App.tsx
- 🔄 Cambiado de `window.location.hash` a `window.location.pathname`
- 🔄 Reemplazado event `hashchange` por `popstate`
- 🔄 Actualizada navegación programática en Login, Register, ForgotPassword
- 🔄 Mejorada detección de rutas públicas (tracking, reset-password)
- 🔄 Función `navigate()` agregada para navegación interna

#### index.html
- 🔄 Eliminada referencia a `/hash-fix.js`
- 🔄 Agregado comentario para script de redirección opcional

#### URLs
**Antes:**
```
https://tu-dominio.com/#/tracking/company/repair
https://tu-dominio.com/#/login
```

**Ahora:**
```
https://tu-dominio.com/tracking/company/repair
https://tu-dominio.com/login
```

### Removed (Eliminado)

- ❌ Archivo `/hash-fix.js` (ya no necesario)
- ❌ Toda la lógica relacionada con hash routing
- ❌ Event listeners de `hashchange`

### Fixed (Corregido)

- 🐛 **Problema Principal**: Códigos QR no funcionaban en lectores de móviles debido al símbolo `#`
- 🐛 Parámetros de tracking se perdían en algunos navegadores móviles
- 🐛 Redirecciones inesperadas al escanear QR
- 🐛 Flash de login/dashboard en rutas públicas

### Security (Seguridad)

- 🔒 Headers de seguridad agregados en `.htaccess`
- 🔒 Prevención de clickjacking
- 🔒 Protección XSS mejorada

### Performance (Rendimiento)

- ⚡ Compresión GZIP configurada (Apache)
- ⚡ Caché de navegador optimizado
- ⚡ Service Worker v2.0 más eficiente

### Migration Guide (Guía de Migración)

Para migrar de v1.x a v2.0:

1. **Actualizar el código**
   ```bash
   git pull origin main
   npm install
   ```

2. **Configurar servidor**
   - Asegúrate de tener uno de estos archivos según tu hosting:
     - `_redirects` (Netlify)
     - `vercel.json` (Vercel)
     - `.htaccess` (Apache)

3. **Generar nuevos códigos QR**
   - Formato nuevo: `https://tu-dominio.com/tracking/company/repair`
   - Los QRs antiguos pueden seguir funcionando con el script de redirección

4. **Testing**
   - Ejecutar suite de pruebas en `/TESTING_BROWSERROUTER.md`
   - Verificar QRs en dispositivos móviles reales

5. **Deploy**
   - Deploy a staging primero
   - Verificar que todas las rutas funcionen
   - Deploy a producción

📚 [Ver guía completa](./BROWSERROUTER_MIGRATION.md)

### Breaking Changes (Cambios Incompatibles)

#### URLs antiguas con hash
Las URLs con `#` ya no funcionarán directamente. 

**Solución**: Implementar script de redirección opcional:
```html
<script src="/hash-to-path-redirect.js"></script>
```

#### Códigos QR antiguos
Los QR generados en v1.x contienen URLs con `#`.

**Solución**: 
- Opción 1: Regenerar todos los QR codes
- Opción 2: Usar script de redirección
- Opción 3: Soporte temporal para ambos formatos

#### Bookmarks y Links compartidos
Links guardados con formato antiguo no funcionarán.

**Solución**: Los usuarios deberán actualizar sus bookmarks.

### Rollback Plan (Plan de Reversión)

Si encuentras problemas críticos:

```bash
# Revertir al commit anterior
git revert [commit-hash-v2.0]
git push origin main

# O volver a branch anterior
git checkout v1.x
git push origin main --force
```

---

## [1.1.0] - 2025-11-04

### Added
- ✅ Sistema completo de permisos por rol
- ✅ Facturación de reparaciones (solo admin/asesor)
- ✅ Traslados de inventario entre sucursales
- ✅ Ajustes de inventario
- ✅ Gestión de variantes de productos
- ✅ Unidades de medida personalizables
- ✅ PWA completo con service worker

### Changed
- 🔄 Modelo de licencias a feature-based
- 🔄 Mejoras en UI/UX de cards
- 🔄 Optimización de exportación de inventario

### Fixed
- 🐛 Corrección de cálculo de precios
- 🐛 Problemas de permisos en facturación
- 🐛 Errores en tracking de reparaciones

---

## [1.0.0] - 2025-10-15

### Added
- ✅ Sistema base de autenticación
- ✅ Dashboard con métricas
- ✅ Módulo de productos
- ✅ Módulo de reparaciones
- ✅ Módulo de ventas
- ✅ Gestión de clientes
- ✅ Reportes básicos
- ✅ Multi-sucursal
- ✅ Sistema de roles (admin, asesor, técnico)
- ✅ Tracking público de reparaciones
- ✅ Códigos QR para tracking
- ✅ Integración con Supabase
- ✅ Dark mode
- ✅ Diseño responsive

---

## Convenciones

### Tipos de Cambios
- **Added** - Para nuevas funcionalidades
- **Changed** - Para cambios en funcionalidades existentes
- **Deprecated** - Para funcionalidades que serán eliminadas
- **Removed** - Para funcionalidades eliminadas
- **Fixed** - Para corrección de bugs
- **Security** - Para cambios de seguridad

### Emojis Utilizados
- ✅ Agregado/Completado
- 🔄 Cambiado/Actualizado
- ❌ Eliminado
- 🐛 Bug corregido
- 🔒 Seguridad
- ⚡ Performance
- 📚 Documentación
- 🚀 Lanzamiento importante
- ⚠️ Advertencia/Breaking change

---

**Mantenido por**: Equipo Oryon App
**Última actualización**: 5 de Noviembre, 2025
