# 📱 Sistema de Seguimiento Público para Clientes

## 🎯 Cómo Funciona

El sistema de seguimiento permite que tus clientes rastreen el estado de sus reparaciones en tiempo real sin necesidad de iniciar sesión.

### Para tus clientes:

1. **Acceden a la página de tracking**: `TU-URL/#/tracking`
2. **Ingresan el código de seguimiento**: El número que aparece en su orden de servicio impresa
3. **Ven el estado actual**: Información en tiempo real sobre su reparación, incluyendo historial de cambios de estado

## 📋 Estado Actual - IMPORTANTE

### ⚠️ La aplicación NO está publicada aún

Actualmente, la aplicación solo es accesible desde el panel de desarrollo de Figma Make. Esto significa que:

- ❌ Los QR codes **NO funcionarán** cuando los clientes los escaneen desde sus teléfonos
- ❌ La URL solo funciona para ti dentro del panel de desarrollo
- ✅ El código de tracking **SÍ aparece** en las órdenes de servicio impresas
- ✅ Todo está listo para funcionar una vez publiques la aplicación

### 📝 En las órdenes de servicio impresas verás:

```
🔍 SEGUIMIENTO DE REPARACIÓN
┌─────────────────────────────┐
│  CÓDIGO DE SEGUIMIENTO      │
│        12345                 │
└─────────────────────────────┘
[QR CODE]
Escanea el QR o ingresa el código en:
https://tu-url.com/#/tracking
```

## 🚀 Cómo Publicar la Aplicación

Para que el sistema de tracking funcione públicamente, necesitas publicar la aplicación:

### Opción 1: Publicar desde Figma Make (Recomendado)

1. Busca el botón "Publish" o "Deploy" en el panel de Figma Make
2. Sigue las instrucciones para obtener una URL pública
3. ¡Listo! Los QR codes y enlaces funcionarán automáticamente

### Opción 2: Exportar y Desplegar en tu propio servidor

1. Exporta el código de la aplicación
2. Despliega en servicios como:
   - **Vercel** (recomendado - gratis y fácil)
   - **Netlify** (gratis y fácil)
   - **Tu propio servidor**

## 🔗 Una vez publicado

Cuando la aplicación esté publicada:

1. ✅ Los clientes podrán escanear el QR code
2. ✅ Podrán acceder directamente a `https://tu-url.com/#/tracking`
3. ✅ Verán información en tiempo real de sus reparaciones
4. ✅ No necesitarán crear cuenta ni iniciar sesión

## 💡 Solución Temporal (Mientras no esté publicado)

Mientras publicas la aplicación, puedes:

1. **Indicar a tus clientes que llamen/escriban** para consultar el estado
2. **Usar el código de seguimiento** que aparece en la orden de servicio para buscar rápidamente la orden en tu sistema
3. **Compartir capturas de pantalla** del estado desde tu panel

## 📞 Contacto para clientes

Asegúrate de que en las órdenes de servicio aparezca:
- Tu número de teléfono
- Tu WhatsApp
- Correo electrónico

De esta forma, aunque el tracking online no esté disponible aún, los clientes pueden contactarte fácilmente.

---

## 🎨 Personalización

El diseño del tracking público está optimizado para:
- ✅ Ser claro y fácil de entender
- ✅ Mostrar el estado actual de forma prominente
- ✅ Incluir historial completo de cambios
- ✅ Funcionar en móviles y desktop
- ✅ No requerir autenticación

## ⚙️ Configuración Técnica

El sistema utiliza:
- **Ruta pública**: `/#/tracking` (sin autenticación)
- **Ruta con ID**: `/#/tracking/[numero]` (muestra detalles)
- **API endpoint**: `/tracking/[id]` (público, no requiere token de usuario)
- **QR Code**: Generado automáticamente al imprimir órdenes de servicio
