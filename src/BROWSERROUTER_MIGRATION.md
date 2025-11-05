# Migración de HashRouter a BrowserRouter

## 📋 Resumen

Se ha migrado completamente de **HashRouter** a **BrowserRouter** para solucionar el problema de lectura de códigos QR en dispositivos móviles. Los lectores de QR no pueden procesar correctamente el símbolo `#` del HashRouter.

## 🔄 Cambios Realizados

### 1. App.tsx
- ✅ Eliminada toda la lógica de `window.location.hash`
- ✅ Cambiado a `window.location.pathname`
- ✅ Reemplazado `hashchange` event por `popstate` event
- ✅ Agregada función `navigate()` para navegación programática
- ✅ Actualizado el sistema de routing para usar paths en lugar de hashes

### 2. Archivos Eliminados
- ❌ `/hash-fix.js` - Ya no es necesario

### 3. Archivos Actualizados
- ✅ `/index.html` - Eliminada la referencia al script hash-fix.js

### 4. Nuevos Archivos de Configuración
- ✅ `/_redirects` - Configuración para Netlify
- ✅ `/vercel.json` - Configuración para Vercel

## 🌐 URLs Antes y Después

### Antes (HashRouter):
```
https://tu-dominio.com/#/tracking/companyId/repairId
https://tu-dominio.com/#/login
https://tu-dominio.com/#/reset-password
```

### Después (BrowserRouter):
```
https://tu-dominio.com/tracking/companyId/repairId
https://tu-dominio.com/login
https://tu-dominio.com/reset-password
```

## 📱 Beneficios para Códigos QR

1. **URLs Limpias**: Los códigos QR ahora apuntan a URLs sin `#`
2. **Compatibilidad Total**: Los lectores de QR en móviles funcionan correctamente
3. **SEO Mejorado**: Las URLs limpias son mejores para SEO
4. **Experiencia de Usuario**: URLs más legibles y compartibles

## ⚙️ Configuración del Servidor

Para que BrowserRouter funcione correctamente, el servidor debe estar configurado para redirigir todas las rutas a `index.html`. Esto permite que React maneje el routing del lado del cliente.

### Netlify
El archivo `/_redirects` ya está configurado:
```
/*    /index.html   200
```

### Vercel
El archivo `/vercel.json` ya está configurado:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Apache (.htaccess)
Si usas Apache, crea un archivo `.htaccess`:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>
```

### Nginx
Configuración para Nginx:
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

### Supabase Storage (Hosting Estático)
Si estás usando Supabase Storage para hosting, necesitas configurar las reglas de reescritura en tu CDN o usar un servicio como Netlify o Vercel que soporte SPAs nativamente.

## 🧪 Testing

### Pruebas Locales
Durante el desarrollo local, el servidor de desarrollo ya maneja correctamente las rutas de SPA.

### Pruebas de Códigos QR
1. Genera un código QR con la URL completa:
   ```
   https://tu-dominio.com/tracking/companyId/repairId
   ```

2. Escanea el código QR desde un dispositivo móvil

3. Verifica que:
   - ✅ La página de tracking se carga correctamente
   - ✅ No hay redirecciones a login
   - ✅ Los parámetros se detectan correctamente
   - ✅ No hay flash de otras páginas

## 📝 Rutas Disponibles

### Rutas Públicas (sin autenticación)
- `/` - HomePage
- `/login` - Página de login
- `/register` - Página de registro
- `/forgot-password` - Recuperación de contraseña
- `/reset-password` - Restablecer contraseña
- `/tracking/:companyId/:repairId` - Tracking de reparación

### Rutas Protegidas (requieren autenticación)
Las rutas protegidas se manejan internamente con el estado `currentView`:
- Dashboard
- Productos
- Reparaciones
- Ventas
- Clientes
- Reportes
- Configuración
- Licencia

## 🔒 Seguridad

- Las rutas públicas (`/tracking/*`, `/reset-password`) no requieren autenticación
- Todas las demás rutas verifican la sesión del usuario
- El token se refresca automáticamente cada 5 minutos
- Se verifica la sesión al cambiar de pestaña/ventana

## ⚠️ Consideraciones Importantes

1. **Servidor Configurado**: Asegúrate de que tu servidor de producción esté configurado para redirigir todas las rutas a `index.html`

2. **Códigos QR Existentes**: Los códigos QR antiguos con hash (`#`) pueden seguir funcionando si implementas una redirección:
   ```javascript
   // Opcional: Redireccionar de hash a path
   if (window.location.hash) {
     const hashPath = window.location.hash.slice(1)
     window.history.replaceState({}, '', hashPath)
   }
   ```

3. **Caché del Navegador**: Los usuarios que tenían la versión anterior en caché pueden necesitar hacer un hard refresh (Ctrl+Shift+R)

## 🚀 Deploy

1. **Netlify**: Simplemente sube el proyecto. El archivo `_redirects` se detectará automáticamente.

2. **Vercel**: Sube el proyecto. El archivo `vercel.json` se detectará automáticamente.

3. **Otros Servicios**: Asegúrate de configurar las reglas de reescritura según la documentación del servicio.

## 📚 Recursos

- [React Router - BrowserRouter](https://reactrouter.com/en/main/router-components/browser-router)
- [Netlify SPA Redirects](https://docs.netlify.com/routing/redirects/rewrites-proxies/#history-pushstate-and-single-page-apps)
- [Vercel SPA Configuration](https://vercel.com/guides/deploying-react-with-vercel)

## ✅ Checklist de Verificación

Después del deploy, verifica:
- [ ] La página principal carga en `/`
- [ ] El login funciona en `/login`
- [ ] Los códigos QR de tracking funcionan en móviles
- [ ] No hay errores 404 al recargar en rutas específicas
- [ ] La navegación con el botón "atrás" del navegador funciona
- [ ] El logout redirecciona correctamente a `/`
- [ ] Las rutas protegidas requieren autenticación

---

**Fecha de Migración**: 5 de Noviembre, 2025
**Versión**: 2.0 - BrowserRouter
