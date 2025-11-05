# 🏷️ Meta Tags para PWA - Oryon App

## Instrucciones

Agrega estos meta tags al archivo `index.html` de tu aplicación, dentro de la sección `<head>`.

## Meta Tags Requeridos

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
  
  <!-- Título y Descripción -->
  <title>Oryon App - Gestión Integral</title>
  <meta name="description" content="Sistema de gestión integral para ventas de productos electrónicos y centro de reparaciones. Controla inventario, órdenes de reparación, punto de venta y clientes.">
  <meta name="keywords" content="gestión, reparaciones, punto de venta, inventario, celulares, electrónica">
  
  <!-- PWA - Manifest -->
  <link rel="manifest" href="/manifest.json">
  
  <!-- Theme Color -->
  <meta name="theme-color" content="#2563eb">
  <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#111827">
  <meta name="background-color" content="#111827">
  
  <!-- Apple iOS -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Oryon App">
  <link rel="apple-touch-icon" href="/icons/icon-192x192.png">
  <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png">
  
  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-96x96.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-72x72.png">
  
  <!-- Microsoft -->
  <meta name="msapplication-TileColor" content="#2563eb">
  <meta name="msapplication-TileImage" content="/icons/icon-144x144.png">
  <meta name="msapplication-config" content="/browserconfig.xml">
  
  <!-- Social Media / Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://tudominio.com">
  <meta property="og:title" content="Oryon App - Gestión Integral">
  <meta property="og:description" content="Sistema de gestión integral para ventas y reparaciones">
  <meta property="og:image" content="/icons/icon-512x512.png">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Oryon App">
  <meta name="twitter:description" content="Sistema de gestión integral para ventas y reparaciones">
  <meta name="twitter:image" content="/icons/icon-512x512.png">
  
  <!-- Security -->
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="referrer" content="origin-when-cross-origin">
  
  <!-- Performance -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="dns-prefetch" href="https://fonts.googleapis.com">
  
  <!-- Disable auto-detection of phone numbers and emails -->
  <meta name="format-detection" content="telephone=no">
  <meta name="format-detection" content="email=no">
</head>
<body>
  <div id="root"></div>
  
  <!-- Registro del Service Worker -->
  <script>
    // El service worker ya se registra desde App.tsx
    // Este script es opcional y solo para debug
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        console.log('Service Worker supported');
      });
    }
  </script>
</body>
</html>
```

## Archivo browserconfig.xml (Opcional - Para Windows)

Crea este archivo en la raíz del proyecto como `/browserconfig.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
  <msapplication>
    <tile>
      <square70x70logo src="/icons/icon-72x72.png"/>
      <square150x150logo src="/icons/icon-152x152.png"/>
      <square310x310logo src="/icons/icon-384x384.png"/>
      <TileColor>#2563eb</TileColor>
    </tile>
  </msapplication>
</browserconfig>
```

## Splash Screens para iOS (Opcional)

Si quieres splash screens customizados para iOS, agrega:

```html
<!-- iPhone X, XS, 11 Pro -->
<link rel="apple-touch-startup-image" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" href="/splash/iphone-x.png">

<!-- iPhone XR, 11 -->
<link rel="apple-touch-startup-image" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)" href="/splash/iphone-xr.png">

<!-- iPhone XS Max, 11 Pro Max -->
<link rel="apple-touch-startup-image" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)" href="/splash/iphone-xs-max.png">

<!-- iPad Pro 12.9" -->
<link rel="apple-touch-startup-image" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" href="/splash/ipad-pro-12.9.png">
```

## Verificación

Para verificar que los meta tags están correctamente configurados:

1. **Chrome DevTools**
   - F12 > Application > Manifest
   - Verifica que todos los campos se muestren correctamente

2. **Lighthouse**
   - F12 > Lighthouse > Generate Report
   - Categoría: Progressive Web App
   - Debería obtener 90+ puntos

3. **PWA Builder**
   - Visita: https://www.pwabuilder.com/
   - Ingresa tu URL
   - Analiza el reporte

## Notas Importantes

- **viewport**: Permite zoom hasta 5x para accesibilidad
- **apple-mobile-web-app-capable**: Hace que iOS muestre la app en pantalla completa
- **theme-color**: Define el color de la barra de estado en Android
- **preconnect**: Mejora la carga inicial de recursos externos
- **format-detection**: Evita que el navegador convierta números en links de teléfono

## Recursos Útiles

- [MDN Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Apple iOS Web Apps](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
- [Microsoft PWA Docs](https://docs.microsoft.com/en-us/microsoft-edge/progressive-web-apps-chromium/)
