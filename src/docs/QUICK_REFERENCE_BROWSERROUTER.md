# Quick Reference: BrowserRouter Migration

## 🚀 Cambio Rápido

### Antes (HashRouter)
```javascript
// Navegación
window.location.hash = '/tracking/123'

// Leer ruta
const route = window.location.hash.slice(1)

// Event listener
window.addEventListener('hashchange', handler)

// URL
https://domain.com/#/tracking/company/repair
```

### Ahora (BrowserRouter)
```javascript
// Navegación
navigate('/tracking/123')
// o
window.history.pushState({}, '', '/tracking/123')

// Leer ruta
const route = window.location.pathname

// Event listener
window.addEventListener('popstate', handler)

// URL
https://domain.com/tracking/company/repair
```

## 📝 Rutas Principales

| Ruta | Descripción | Auth Requerida |
|------|-------------|----------------|
| `/` | HomePage | No |
| `/login` | Login | No |
| `/register` | Registro | No |
| `/forgot-password` | Recuperar contraseña | No |
| `/reset-password` | Restablecer contraseña | No |
| `/tracking/:companyId/:repairId` | Tracking público | No |
| Dashboard | Vista autenticada | Sí |

## 🔧 Función de Navegación

```typescript
// En App.tsx
const navigate = (path: string) => {
  window.history.pushState({}, '', path)
  setCurrentRoute(path)
}

// Uso
navigate('/login')
navigate('/tracking/company123/repair456')
```

## 🎯 Detección de Rutas

```typescript
// Leer ruta actual
const currentPath = window.location.pathname

// Verificar ruta específica
const isTracking = currentPath.startsWith('/tracking')
const isLogin = currentPath === '/login'

// Extraer parámetros de tracking
const trackingParams = currentPath.split('/tracking/')[1]
const [companyId, repairId] = trackingParams.split('/')
```

## 📦 Configuración por Plataforma

### Netlify
Archivo: `_redirects`
```
/*    /index.html   200
```

### Vercel
Archivo: `vercel.json`
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Apache
Archivo: `.htaccess`
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

## 🧪 Testing Rápido

```bash
# 1. Iniciar dev server
npm run dev

# 2. Probar en navegador
http://localhost:5173/tracking/test123/repair456

# 3. Verificar consola
# Debe mostrar: currentPath: "/tracking/test123/repair456"

# 4. Recargar página (F5)
# Debe mantener la misma URL y cargar correctamente
```

## 📱 QR Code Format

```typescript
// Generar URL para QR
const qrUrl = `https://${domain}/tracking/${companyId}/${repairId}`

// Ejemplo
const qrUrl = `https://oryon-app.com/tracking/cmp_123/rep_456`
```

## 🔍 Debugging

### Verificar Ruta Actual
```javascript
console.log('Current Path:', window.location.pathname)
console.log('Full URL:', window.location.href)
console.log('Current Route State:', currentRoute)
```

### Verificar Navegación
```javascript
window.addEventListener('popstate', (e) => {
  console.log('Navigation:', window.location.pathname)
})
```

### Verificar Service Worker
```javascript
// En DevTools Console
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW State:', reg?.active?.state)
})
```

## ⚠️ Problemas Comunes

### 404 en Refresh
**Problema**: Recargar página da 404
**Solución**: Verificar archivo de configuración del servidor (_redirects, vercel.json, .htaccess)

### Redirecciona a Login
**Problema**: /tracking redirecciona a login
**Solución**: Verificar detección de rutas públicas en App.tsx línea 37

### Parámetros Null
**Problema**: companyId o repairId son null
**Solución**: Verificar parsing de URL en App.tsx líneas 78-93

### Service Worker 404
**Problema**: SW no cachea rutas correctamente
**Solución**: Limpiar caché y actualizar SW a v2.0

## 🔄 Compatibilidad con URLs Antiguas

Para soportar URLs antiguas con hash:

```html
<!-- En index.html (opcional) -->
<script src="/hash-to-path-redirect.js"></script>
```

## 📊 Checklist de Deploy

```
Pre-Deploy:
[ ] App.tsx usa window.location.pathname
[ ] navigate() function implementada
[ ] Archivo de configuración del servidor incluido
[ ] Service Worker actualizado a v2.0
[ ] hash-fix.js eliminado de index.html

Post-Deploy:
[ ] URLs limpias funcionan
[ ] Refresh mantiene la ruta
[ ] QR codes funcionan en móviles
[ ] Navegación atrás/adelante funciona
[ ] Login/Logout funcionan
```

## 🆘 Scripts Útiles

### Verificar Migración
```bash
chmod +x verify-browserrouter.sh
./verify-browserrouter.sh
```

### Buscar Referencias a Hash
```bash
# Buscar window.location.hash
grep -r "window.location.hash" . --exclude-dir=node_modules

# Buscar hashchange
grep -r "hashchange" . --exclude-dir=node_modules
```

### Limpiar Caché
```bash
# En DevTools Console
caches.keys().then(keys => {
  keys.forEach(key => caches.delete(key))
})
```

## 📚 Links Rápidos

- [Migración Completa](./BROWSERROUTER_MIGRATION.md)
- [Guía de QR](./QR_CODES_GUIDE.md)
- [Testing](./TESTING_BROWSERROUTER.md)
- [README](./README.md)

---

**Tip**: Guarda este archivo como referencia rápida durante el desarrollo.
