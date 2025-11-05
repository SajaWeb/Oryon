# 🚀 Oryon App - Sistema de Gestión Integral

Sistema completo de gestión para negocios de electrónica y centros de reparación, con venta de productos y seguimiento de órdenes desde la recepción hasta la entrega.

![Versión](https://img.shields.io/badge/version-2.0-blue)
![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-4.0-38B2AC?logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase)

## 📋 Tabla de Contenidos

- [Características Principales](#-características-principales)
- [Tecnologías](#-tecnologías)
- [Arquitectura](#-arquitectura)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Planes y Licencias](#-planes-y-licencias)
- [Sistema de Roles](#-sistema-de-roles)
- [Módulos](#-módulos)
- [Códigos QR](#-códigos-qr)
- [PWA](#-pwa-progressive-web-app)
- [Deploy](#-deploy)
- [Documentación](#-documentación)

## ✨ Características Principales

### 🏪 Gestión de Productos
- ✅ Catálogo completo de productos electrónicos
- ✅ Gestión de inventario por sucursal
- ✅ Variantes de productos (color, almacenamiento, etc.)
- ✅ Unidades de medida (unidad, paquete, caja)
- ✅ Traslados entre sucursales
- ✅ Ajustes de inventario
- ✅ Historial de transacciones
- ✅ Exportación de inventario

### 🔧 Centro de Reparaciones
- ✅ Gestión completa de órdenes de reparación
- ✅ Tracking público con códigos QR
- ✅ Estados personalizables (recibido, diagnóstico, reparación, listo, entregado)
- ✅ Historial de cambios de estado
- ✅ Adjuntar fotos del equipo
- ✅ Facturación integrada
- ✅ Impresión de recibos
- ✅ Búsqueda avanzada

### 💰 Ventas
- ✅ Punto de venta integrado
- ✅ Facturación automática
- ✅ Control de inventario en tiempo real
- ✅ Historial de ventas
- ✅ Reportes

### 👥 Gestión de Clientes
- ✅ Base de datos de clientes
- ✅ Historial de compras y reparaciones
- ✅ Información de contacto
- ✅ Tipos de documento (por país)

### 📊 Reportes y Analytics
- ✅ Dashboard con métricas en tiempo real
- ✅ Gráficos de ventas
- ✅ Productos con bajo stock
- ✅ Estado de reparaciones
- ✅ Actividad reciente

### 🏢 Multi-sucursal
- ✅ Gestión de múltiples sucursales
- ✅ Inventario independiente por sucursal
- ✅ Traslados de productos entre sucursales
- ✅ Asignación de usuarios por sucursal

## 🛠 Tecnologías

### Frontend
- **React 18+** - Framework UI
- **TypeScript** - Type safety
- **Tailwind CSS 4.0** - Styling
- **shadcn/ui** - Componentes UI
- **Lucide React** - Iconos
- **Recharts** - Gráficos
- **Sonner** - Notificaciones toast
- **Motion (Framer Motion)** - Animaciones

### Backend
- **Supabase** - BaaS (Backend as a Service)
  - Auth (Google OAuth, Email/Password)
  - PostgreSQL Database
  - Storage para imágenes
  - Edge Functions (Hono server)

### PWA
- **Service Worker** - Caché y offline support
- **Manifest.json** - Instalación como app
- **Offline Indicator** - Estado de conexión

## 🏗 Arquitectura

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│             │────▶│              │────▶│             │
│   Frontend  │     │ Edge Function│     │  PostgreSQL │
│   (React)   │◀────│   (Hono)     │◀────│     KV      │
│             │     │              │     │             │
└─────────────┘     └──────────────┘     └─────────────┘
       │                   │                     │
       │                   │                     │
       ▼                   ▼                     ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Service   │     │   Supabase   │     │   Storage   │
│   Worker    │     │     Auth     │     │  (Imágenes) │
└─────────────┘     └──────────────┘     └─────────────┘
```

### Routing: BrowserRouter (v2.0)

**Cambio importante**: Migrado de HashRouter a BrowserRouter para compatibilidad completa con códigos QR en móviles.

**URLs Antes (v1.x):**
```
https://tu-dominio.com/#/tracking/company/repair
```

**URLs Ahora (v2.0):**
```
https://tu-dominio.com/tracking/company/repair
```

📚 [Ver documentación completa de la migración](./BROWSERROUTER_MIGRATION.md)

## 📦 Instalación

### Requisitos Previos
- Node.js 18+
- npm o yarn
- Cuenta de Supabase

### Pasos

1. **Clonar el repositorio**
```bash
git clone https://github.com/tu-usuario/oryon-app.git
cd oryon-app
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**

Crear archivo `/utils/supabase/info.tsx`:
```typescript
export const projectId = 'tu-proyecto-id'
export const publicAnonKey = 'tu-anon-key'
```

4. **Iniciar servidor de desarrollo**
```bash
npm run dev
```

## ⚙️ Configuración

### Configuración de Supabase

1. **Crear proyecto en Supabase**
2. **Configurar autenticación**
   - Email/Password
   - Google OAuth (opcional)
3. **Configurar Storage**
   - Crear bucket: `make-4d437e50-repairs`
4. **Deploy Edge Function**
   - Ubicada en `/supabase/functions/server/`

📚 [Ver guía detallada de autenticación](./AUTHENTICATION_GUIDE.md)

### Configuración para Producción

El sistema requiere que el servidor redirija todas las rutas a `index.html` para el routing de SPA.

**Archivos incluidos:**
- `/_redirects` - Para Netlify
- `/vercel.json` - Para Vercel  
- `/.htaccess` - Para Apache

📚 [Ver guía de deployment](./DEPLOYMENT.md)

## 💳 Planes y Licencias

### Modelo de Negocio

Sistema basado en **funcionalidades por plan**, sin fecha de expiración.

| Plan | Sucursales | Admins | Asesores | Técnicos | Precio/mes |
|------|------------|--------|----------|----------|------------|
| **Básico** | 1 | 1 | 1 | 2 | $29 USD |
| **Pyme** | 2 | 2 | 4 | 8 | $79 USD |
| **Enterprise** | 4 | 4 | 8 | 16 | $159 USD |

### Características Incluidas
- ✅ Todas las funcionalidades sin restricciones
- ✅ Sin límite de órdenes o productos
- ✅ Soporte técnico
- ✅ Actualizaciones incluidas
- ✅ Backup automático

📚 [Ver detalles de licencias](./LICENSE_INFO.md)

## 👤 Sistema de Roles

### Administrador
- ✅ Acceso completo al sistema
- ✅ Gestión de usuarios y sucursales
- ✅ Ajustes de inventario
- ✅ Traslados entre sucursales
- ✅ Configuración del sistema
- ✅ Reportes completos
- ✅ Gestión de licencias

### Asesor
- ✅ Gestión de productos (crear, aumentar stock)
- ✅ Gestión de reparaciones (su sucursal)
- ✅ Ventas y facturación
- ✅ Gestión de clientes
- ❌ No puede ajustar inventario
- ❌ No puede hacer traslados
- ❌ No puede facturar reparaciones

### Técnico
- ✅ Ver y editar reparaciones (su sucursal)
- ✅ Cambiar estados de reparaciones
- ✅ Adjuntar fotos
- ❌ No puede facturar
- ❌ No acceso a productos/ventas
- ❌ No acceso a clientes/reportes

📚 [Ver permisos detallados](./PERMISOS_FACTURACION_REPARACIONES.md)

## 📚 Módulos

### Dashboard
- Métricas en tiempo real
- Gráficos de ventas
- Alertas de stock bajo
- Progreso de reparaciones
- Actividad reciente

### Productos
- Catálogo completo
- Filtros avanzados
- Gestión de variantes
- Control de inventario
- Traslados entre sucursales

📚 [Ver documentación de productos](./components/products/README.md)

### Reparaciones
- Gestión de órdenes
- Estados personalizables
- Tracking público con QR
- Facturación
- Historial completo

📚 [Ver documentación de reparaciones](./components/repairs/README.md)

### Ventas
- Punto de venta
- Facturación automática
- Control de inventario
- Historial

### Configuración
- Información de la empresa
- Gestión de usuarios
- Configuración de sucursales
- Preferencias del sistema

📚 [Ver documentación de configuración](./components/settings/README.md)

## 📱 Códigos QR

### Generación Automática

El sistema genera automáticamente códigos QR para cada orden de reparación, permitiendo al cliente rastrear el estado en tiempo real.

### Formato de URL

```
https://tu-dominio.com/tracking/{companyId}/{repairId}
```

### Características
- ✅ Acceso público (sin login)
- ✅ Funciona en todos los dispositivos móviles
- ✅ Actualización en tiempo real
- ✅ Historial de estados
- ✅ Información del equipo

### Testing

Para probar los códigos QR:
1. Genera un QR con la URL completa
2. Escanea desde un móvil
3. Verifica que carga directamente sin redirecciones

📚 [Ver guía completa de códigos QR](./QR_CODES_GUIDE.md)

### Ejemplo de Implementación

```typescript
// Generar QR para una orden
const trackingUrl = `https://oryon-app.com/tracking/${companyId}/${repairId}`

// Usar en componente
<QRCodeSVG value={trackingUrl} size={200} />
```

## 📱 PWA (Progressive Web App)

### Características
- ✅ Instalable en móviles y desktop
- ✅ Funciona offline (rutas cacheadas)
- ✅ Notificaciones push (próximamente)
- ✅ Actualizaciones automáticas
- ✅ Icono en pantalla de inicio

### Instalación

**En móviles:**
1. Abrir la app en el navegador
2. Buscar opción "Añadir a pantalla de inicio"
3. Seguir instrucciones

**En desktop (Chrome):**
1. Buscar icono de instalación en la barra de direcciones
2. Click en "Instalar"

📚 [Ver detalles de PWA](./PWA_COMPLETE.md)

## 🚀 Deploy

### Netlify (Recomendado)

1. Conectar repositorio
2. Configurar build:
   ```
   Build command: npm run build
   Publish directory: dist
   ```
3. El archivo `_redirects` se detecta automáticamente

### Vercel

1. Conectar repositorio
2. El archivo `vercel.json` se detecta automáticamente
3. Deploy automático

### Otros Proveedores

Asegúrate de configurar las reglas de reescritura para SPA según la documentación del proveedor.

📚 [Ver guía de deployment](./DEPLOYMENT.md)

## 📖 Documentación

### Guías Principales
- [Migración a BrowserRouter](./BROWSERROUTER_MIGRATION.md) - **Nuevo en v2.0**
- [Guía de Códigos QR](./QR_CODES_GUIDE.md) - **Nuevo en v2.0**
- [Testing BrowserRouter](./TESTING_BROWSERROUTER.md) - **Nuevo en v2.0**
- [Autenticación](./AUTHENTICATION_GUIDE.md)
- [Deployment](./DEPLOYMENT.md)
- [PWA Setup](./PWA_COMPLETE.md)

### Módulos
- [Productos](./components/products/README.md)
- [Reparaciones](./components/repairs/README.md)
- [Configuración](./components/settings/README.md)

### Features
- [Licencias](./LICENSE_INFO.md)
- [Permisos de Facturación](./PERMISOS_FACTURACION_REPARACIONES.md)
- [Traslados de Inventario](./TRASLADOS_INVENTARIO.md)
- [Sistema de Precios](./PRECIOS_VERIFICACION.md)

### Troubleshooting
- [Troubleshooting General](./TROUBLESHOOTING.md)
- [Tracking de Reparaciones](./TRACKING_FIX_SUMMARY.md)
- [PWA Issues](./HOOKS_AND_SW_FIXES.md)

## 🔧 Desarrollo

### Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Preview build
npm run preview

# Linting
npm run lint

# Type checking
npm run type-check
```

### Estructura del Proyecto

```
oryon-app/
├── components/           # Componentes React
│   ├── ui/              # Componentes shadcn/ui
│   ├── products/        # Módulo de productos
│   ├── repairs/         # Módulo de reparaciones
│   ├── sales/           # Módulo de ventas
│   ├── settings/        # Configuración
│   └── ...
├── utils/               # Utilidades
│   ├── supabase/        # Cliente Supabase
│   ├── api.ts           # API wrapper
│   └── ...
├── styles/              # Estilos globales
├── supabase/            # Backend
│   └── functions/       # Edge Functions
├── public/              # Assets estáticos
└── ...
```

### Convenciones de Código

- **TypeScript** para type safety
- **Componentes funcionales** con hooks
- **Tailwind CSS** para estilos
- **shadcn/ui** para componentes base
- **Comentarios** en español
- **Variables y funciones** en inglés/español según contexto

## 🤝 Contribuir

Actualmente este es un proyecto privado. Para contribuir:

1. Crear feature branch
2. Hacer cambios
3. Crear Pull Request
4. Esperar revisión

## 📄 Licencia

Copyright © 2025 Oryon App. Todos los derechos reservados.

## 🆘 Soporte

Para soporte técnico:
- Email: soporte@oryon-app.com
- Documentación: [Ver docs](#-documentación)
- Issues: GitHub Issues (si aplica)

## 🎉 Changelog

### v2.0.0 (5 Nov 2025)
- ✅ **Migración a BrowserRouter** - URLs limpias sin hash
- ✅ **Códigos QR mejorados** - Compatibilidad total con móviles
- ✅ **Service Worker actualizado** - Soporte para SPA routing
- ✅ **Documentación completa** - Nuevas guías y testing

### v1.1.0 (Anterior)
- ✅ Sistema de permisos por rol
- ✅ Facturación de reparaciones
- ✅ Traslados de inventario
- ✅ PWA completo
- ✅ Multi-sucursal

---

**Desarrollado con ❤️ para transformar la gestión de negocios de electrónica**
