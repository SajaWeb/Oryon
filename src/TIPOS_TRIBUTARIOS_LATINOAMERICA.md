# Tipos de Identificación Tributaria de Latinoamérica

## Resumen
Oryon App ahora soporta **todos los tipos de identificación tributaria** utilizados en los 19 países de Latinoamérica, facilitando la facturación e impresión de documentos fiscales en cualquier país de la región.

## Países y Tipos Soportados

### 🇦🇷 Argentina
- **CUIT** - Clave Única de Identificación Tributaria
  - Formato: `XX-XXXXXXXX-X`
  - Ejemplo: `20-12345678-9`
- **CUIL** - Código Único de Identificación Laboral
  - Formato: `XX-XXXXXXXX-X`
  - Ejemplo: `20-12345678-9`

### 🇧🇴 Bolivia
- **NIT** - Número de Identificación Tributaria
  - Formato: `XXXXXXXXX`
  - Ejemplo: `123456789`

### 🇧🇷 Brasil
- **CNPJ** - Cadastro Nacional da Pessoa Jurídica (Empresas)
  - Formato: `XX.XXX.XXX/XXXX-XX`
  - Ejemplo: `12.345.678/0001-90`
- **CPF** - Cadastro de Pessoas Físicas (Personas)
  - Formato: `XXX.XXX.XXX-XX`
  - Ejemplo: `123.456.789-10`

### 🇨🇱 Chile
- **RUT** - Rol Único Tributario
  - Formato: `XX.XXX.XXX-X`
  - Ejemplo: `12.345.678-9`

### 🇨🇴 Colombia
- **NIT** - Número de Identificación Tributaria
  - Formato: `XXX.XXX.XXX-X`
  - Ejemplo: `900.123.456-7`
- **RUT** - Registro Único Tributario
  - Formato: `XXX.XXX.XXX-X`
  - Ejemplo: `900.123.456-7`

### 🇨🇷 Costa Rica
- **Cédula Jurídica** - Cédula de Persona Jurídica
  - Formato: `X-XXX-XXXXXX`
  - Ejemplo: `3-101-123456`

### 🇨🇺 Cuba
- **NIT** - Número de Identificación Tributaria
  - Formato: `XXXXXXXXXXX`
  - Ejemplo: `12345678901`

### 🇪🇨 Ecuador
- **RUC** - Registro Único de Contribuyentes
  - Formato: `XXXXXXXXXXXXX`
  - Ejemplo: `1234567890001`

### 🇸🇻 El Salvador
- **NIT** - Número de Identificación Tributaria
  - Formato: `XXXX-XXXXXX-XXX-X`
  - Ejemplo: `1234-567890-123-4`

### 🇬🇹 Guatemala
- **NIT** - Número de Identificación Tributaria
  - Formato: `XXXXXXX-X`
  - Ejemplo: `1234567-8`

### 🇭🇳 Honduras
- **RTN** - Registro Tributario Nacional
  - Formato: `XXXXXXXXXXXX`
  - Ejemplo: `123456789012`

### 🇲🇽 México
- **RFC** - Registro Federal de Contribuyentes
  - Formato: `XXXX######XXX`
  - Ejemplo: `ABC123456XYZ`

### 🇳🇮 Nicaragua
- **RUC** - Registro Único de Contribuyente
  - Formato: `XXX-XXXXXX-XXXX-X`
  - Ejemplo: `123-456789-0123-4`

### 🇵🇦 Panamá
- **RUC** - Registro Único de Contribuyente
  - Formato: `X-XXX-XXXXX`
  - Ejemplo: `1-234-56789`

### 🇵🇾 Paraguay
- **RUC** - Registro Único de Contribuyentes
  - Formato: `XXXXXXXX-X`
  - Ejemplo: `12345678-9`

### 🇵🇪 Perú
- **RUC** - Registro Único de Contribuyentes
  - Formato: `XXXXXXXXXXX`
  - Ejemplo: `12345678901`

### 🇩🇴 República Dominicana
- **RNC** - Registro Nacional del Contribuyente
  - Formato: `XXX-XXXXX-X`
  - Ejemplo: `123-45678-9`

### 🇺🇾 Uruguay
- **RUT** - Registro Único Tributario
  - Formato: `XXXXXXXXXXXX`
  - Ejemplo: `123456789012`

### 🇻🇪 Venezuela
- **RIF** - Registro de Información Fiscal
  - Formato: `X-XXXXXXXX-X`
  - Ejemplo: `J-12345678-9`

### 🌎 Genérico Internacional
- **TAX ID** - Identificación Tributaria Genérica
  - Formato: Variable
  - Ejemplo: `123456789`
  - Uso: Para países no listados o situaciones especiales

## Características Implementadas

### 1. Selección Inteligente
- ✅ Dropdown organizado con todos los países
- ✅ Descripción completa de cada tipo
- ✅ Búsqueda rápida por país o código

### 2. Validación y Ayuda
- ✅ Formato de ejemplo mostrado dinámicamente
- ✅ Placeholder contextual según el tipo seleccionado
- ✅ Indicador visual del formato esperado

### 3. Almacenamiento
- ✅ Tipo y número guardados en la configuración de impresión
- ✅ Utilizado en facturas, recibos y documentos fiscales
- ✅ Compatible con impresoras térmicas (80mm) y estándar (A4)

## Uso en el Sistema

### Módulo de Configuración
1. Ve a **Configuración** → **General**
2. Scroll hasta **Configuración de Impresión**
3. En la sección **Información Tributaria**:
   - Selecciona tu tipo de identificación tributaria
   - Ingresa tu número según el formato indicado
4. Guarda la configuración

### Impresión de Documentos
El tipo y número tributario se incluyen automáticamente en:
- 📄 Facturas de venta
- 🔧 Recibos de reparación
- 📦 Guías de despacho
- 📋 Cotizaciones

### Ejemplo de Impresión
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        ORYON TECH S.A.S.
    Calle 123 #45-67, Bogotá
      Tel: +57 300 123 4567
   contacto@oryontech.com
   
   NIT: 900.123.456-7
   
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Archivo de Configuración

Los tipos están centralizados en:
```
/utils/tax-id-types.ts
```

Este archivo exporta:
- `TAX_ID_TYPES`: Array con todos los tipos
- `getTaxIdType(value)`: Obtener tipo por código
- `getTaxIdTypesByCountry(code)`: Filtrar por país
- `validateTaxId(value, type)`: Validación básica
- `formatTaxId(value, type)`: Formateo automático

## Beneficios

### Para Usuarios
- ✅ Cumplimiento fiscal en su país
- ✅ Documentos profesionales y legales
- ✅ Fácil configuración sin conocimientos técnicos

### Para el Negocio
- ✅ Expansión internacional facilitada
- ✅ Soporte multi-país desde día 1
- ✅ Competitivo en toda Latinoamérica

### Para Desarrolladores
- ✅ Código centralizado y mantenible
- ✅ Fácil agregar nuevos países
- ✅ Tipado fuerte con TypeScript
- ✅ Funciones de utilidad reutilizables

## Expansión Futura

El sistema está diseñado para ser extensible:

### Agregar un nuevo país:
```typescript
// En /utils/tax-id-types.ts
{
  value: 'NEW-TYPE',
  label: 'Tipo - País',
  country: 'País',
  countryCode: 'XX',
  description: 'Descripción completa',
  format: 'XX-XXXX',
  example: '12-3456'
}
```

### Agregar validación específica:
```typescript
export function validateSpecificTaxId(value: string): boolean {
  // Lógica de validación específica del país
  return true
}
```

## Notas Técnicas

1. **Compatibilidad Backwards**: Los tipos anteriores (NIT, RUT, RFC, CUIT) se mantienen con nuevos códigos únicos
2. **Migración**: Configuraciones existentes seguirán funcionando
3. **Performance**: El dropdown está optimizado para 40+ opciones
4. **Accesibilidad**: Soporte completo de teclado y screen readers

## Soporte

Si tu país no está listado o necesitas un tipo específico:
1. Abre un issue en el repositorio
2. Incluye: nombre del tipo, formato, ejemplo
3. Se agregará en la próxima actualización

---

**Última actualización**: Noviembre 2025  
**Versión**: 2.0  
**Países soportados**: 19 + Genérico
