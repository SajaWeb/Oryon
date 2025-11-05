# Settings Components

Esta carpeta contiene todos los componentes modulares del módulo de Configuración de Oryon App.

## Estructura

La configuración está organizada en **5 pestañas principales**:

### 1. **General** (`GeneralSection.tsx`)
Configuraciones generales de la empresa:
- ⚙️ **Inventario**: Umbral de stock bajo
- 🖨️ **Impresión**: 
  - Logo de la empresa
  - Formato de impresión (80mm/A4)
  - Información de la empresa (dirección, teléfono, email, web)
  - Datos tributarios (todos los tipos de ID tributaria de Latinoamérica):
    - 🇦🇷 Argentina: CUIT, CUIL
    - 🇧🇴 Bolivia: NIT
    - 🇧🇷 Brasil: CNPJ, CPF
    - 🇨🇱 Chile: RUT
    - 🇨🇴 Colombia: NIT, RUT
    - 🇨🇷 Costa Rica: Cédula Jurídica
    - 🇨🇺 Cuba: NIT
    - 🇪🇨 Ecuador: RUC
    - 🇸🇻 El Salvador: NIT
    - 🇬🇹 Guatemala: NIT
    - 🇭🇳 Honduras: RTN
    - 🇲🇽 México: RFC
    - 🇳🇮 Nicaragua: RUC
    - 🇵🇦 Panamá: RUC
    - 🇵🇾 Paraguay: RUC
    - 🇵🇪 Perú: RUC
    - 🇩🇴 República Dominicana: RNC
    - 🇺🇾 Uruguay: RUT
    - 🇻🇪 Venezuela: RIF
    - 🌎 Genérico: TAX ID
  - Mensajes personalizados (bienvenida, despedida, garantía)

### 2. **Usuarios** (`UsersSection.tsx`)
Gestión completa de usuarios:
- 👥 Crear nuevos usuarios (admin, asesor, técnico)
- 🔐 Cambiar contraseñas
- 🏢 Asignar sucursales a usuarios
- ✅ Activar/desactivar usuarios
- 📊 Ver información de usuarios

### 3. **Sucursales** (`BranchManager.tsx`)
Gestión de sucursales (componente existente reutilizado):
- Crear y editar sucursales
- Ver límites según el plan
- Asignar ubicaciones

### 4. **Documentos** (`DocumentsSection.tsx`)
Configuración de documentos y facturación:
- 🆔 **Tipos de Identificación**: Gestionar tipos de documento de clientes
- 📄 **Facturación**: Configurar prefijo y consecutivo de facturas

### 5. **Sistema** (`AppearanceSection.tsx`, `NotificationsSection.tsx`)
Configuraciones del sistema:
- 🎨 **Apariencia**: Tema claro/oscuro/sistema
- 🔔 **Notificaciones**: Activar/desactivar notificaciones push
- 📱 **PWA**: Información de instalación y estado

## Componentes Auxiliares

### `CompanyInfoSection.tsx`
Muestra información general de la empresa en un header:
- Nombre de la empresa
- Plan actual
- Estado del trial
- Fecha de creación

## Uso

Todos los componentes están diseñados para ser:
- ✅ **Modulares**: Cada sección es independiente
- ✅ **Reutilizables**: Se pueden usar en otros contextos
- ✅ **Escalables**: Fácil agregar nuevas secciones
- ✅ **Responsivos**: Adaptados a móvil y desktop

## Agregar Nueva Sección

Para agregar una nueva sección de configuración:

1. Crear el componente en esta carpeta: `/components/settings/NuevaSeccion.tsx`
2. Importarlo en `/components/Settings.tsx`
3. Agregar un nuevo `TabsTrigger` y `TabsContent` en el componente principal
4. Actualizar este README

## Ejemplo de Uso

```tsx
import { Settings } from './components/Settings'

<Settings 
  accessToken={token}
  userProfile={profile}
  licenseInfo={license}
/>
```
