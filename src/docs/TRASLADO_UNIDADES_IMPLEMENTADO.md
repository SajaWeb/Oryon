# Traslado de Unidades Individuales - Implementación Completa

## Resumen
Se ha implementado la funcionalidad completa para trasladar productos con seguimiento por unidades individuales (IMEI/Serial) entre sucursales, completando así el sistema de traslados para todos los tipos de productos en Oryon App.

## Cambios Realizados

### 1. Backend - Nueva Ruta de API (`/supabase/functions/server/index.tsx`)

Se agregó una nueva ruta POST: `/make-server-4d437e50/products/:id/transfer-units`

**Características:**
- ✅ Solo accesible para administradores
- ✅ Valida que todas las unidades existan y estén disponibles (status = 'available')
- ✅ No permite trasladar unidades vendidas o en reparación
- ✅ Valida que la sucursal destino pertenezca a la misma empresa
- ✅ Busca si existe el mismo producto en la sucursal destino
- ✅ Si existe, mueve las unidades al producto existente
- ✅ Si no existe, crea un nuevo producto en la sucursal destino
- ✅ Mantiene el seguimiento individual de cada unidad (IMEI/Serial)
- ✅ Crea un log del traslado con toda la información
- ✅ Elimina las unidades de la sucursal origen
- ✅ Actualiza timestamps de ambos productos

### 2. Nuevo Componente Frontend (`/components/products/UnitsTransfer.tsx`)

Componente especializado para el traslado de unidades individuales.

**Características:**
- ✅ Muestra lista de todas las unidades disponibles con sus IMEI/Serial
- ✅ Permite seleccionar múltiples unidades mediante checkboxes
- ✅ Botón para seleccionar/deseleccionar todas las unidades
- ✅ Muestra un contador de unidades seleccionadas
- ✅ Selector de sucursal destino con validaciones
- ✅ Campo de razón del traslado (requerido)
- ✅ Vista previa del traslado mostrando:
  - Unidades que se restarán de la sucursal origen
  - Unidades que se sumarán a la sucursal destino
- ✅ Advertencia sobre la permanencia del traslado
- ✅ Manejo de estados de carga y errores
- ✅ Diseño responsive y accesible
- ✅ Iconos visuales para mejor UX

### 3. Actualización del Componente Principal (`/components/products/index.tsx`)

**Nuevas funciones:**
- `handleUnitsTransfer()`: Maneja la llamada al API para trasladar unidades
- `openUnitsTransferDialog()`: Abre el diálogo de traslado de unidades
- Modificación en `openTransferDialog()`: Detecta si el producto usa trackByUnit y redirige automáticamente al diálogo correcto

**Nuevo estado:**
- `unitsTransferDialogOpen`: Controla la visibilidad del diálogo de traslado de unidades

**Nuevo diálogo en UI:**
- Diálogo modal para traslado de unidades con scroll cuando hay muchas unidades
- Solo visible para administradores
- Integrado con el sistema de toasts para feedback

### 4. Actualización de ProductCard (`/components/products/ProductCard.tsx`)

**Cambios:**
- ✅ Removida la restricción `!product.trackByUnit` del botón de traslado
- ✅ Ahora todos los productos (simples, con variantes y con unidades) muestran el botón de traslado
- ✅ El botón se muestra solo cuando:
  - El usuario es administrador
  - Hay más de una sucursal disponible
  - El producto tiene stock/unidades disponibles
  - El usuario tiene permisos de edición

### 5. Actualización de Tipos (`/components/products/types.ts`)

**Nuevo tipo exportado:**
```typescript
export interface UnitsTransferData {
  targetBranchId: string
  unitIds: number[]
  reason: string
}
```

## Flujo Completo del Traslado de Unidades

### Paso 1: Usuario Selecciona Traslado
1. El administrador hace clic en "Trasladar a Otra Sucursal" en la tarjeta del producto
2. El sistema detecta que el producto tiene `trackByUnit = true`
3. Se abre el diálogo `UnitsTransfer` en lugar del diálogo estándar

### Paso 2: Selección de Unidades
1. El componente muestra todas las unidades con status 'available'
2. El administrador puede:
   - Seleccionar unidades individuales haciendo clic
   - Usar "Seleccionar Todas" para seleccionar todas las disponibles
   - Ver IMEI y/o Serial de cada unidad
3. Se muestra un contador de unidades seleccionadas

### Paso 3: Configuración del Traslado
1. Seleccionar la sucursal destino del dropdown
2. Ingresar la razón del traslado
3. Ver preview con:
   - Cuántas unidades se restarán de la sucursal actual
   - Cuántas unidades se sumarán a la sucursal destino

### Paso 4: Ejecución
1. Al confirmar, el frontend envía:
   - `targetBranchId`: ID de la sucursal destino
   - `unitIds`: Array de IDs de las unidades a trasladar
   - `reason`: Razón del traslado
2. El backend:
   - Valida todas las condiciones
   - Busca o crea el producto en la sucursal destino
   - Mueve cada unidad individualmente
   - Crea nuevos IDs para las unidades en el producto destino
   - Elimina las unidades del producto origen
   - Registra el traslado en logs
3. El frontend:
   - Muestra feedback con toast de éxito/error
   - Recarga la lista de productos
   - Cierra el diálogo

## Validaciones Implementadas

### Backend
- ✅ Usuario autenticado y autorizado (solo admin)
- ✅ Producto existe y tiene trackByUnit activado
- ✅ Todas las unidades existen y están disponibles
- ✅ Al menos una unidad seleccionada
- ✅ Sucursal destino existe y pertenece a la misma empresa
- ✅ Sucursal destino está activa
- ✅ Sucursal destino es diferente a la origen
- ✅ Razón del traslado no está vacía

### Frontend
- ✅ Sucursal destino seleccionada
- ✅ Al menos una unidad seleccionada
- ✅ Razón del traslado no está vacía
- ✅ Deshabilita botones durante la operación
- ✅ Muestra estados de carga apropiados

## Casos de Uso Cubiertos

### 1. Producto No Existe en Destino
- Se crea un nuevo producto en la sucursal destino
- Se copian todas las propiedades del producto original
- Las unidades se crean con nuevos IDs en el nuevo producto
- Se mantienen los IMEI/Serial originales

### 2. Producto Ya Existe en Destino
- Se reutiliza el producto existente
- Las unidades se agregan al producto existente
- Se generan nuevos IDs para las unidades
- Se mantiene el historial de unidades del producto destino

### 3. No Hay Unidades Disponibles
- El componente muestra un mensaje de advertencia
- No permite proceder con el traslado
- Explica que unidades vendidas o en reparación no pueden trasladarse

## Logs y Auditoría

Cada traslado genera un registro con:
```typescript
{
  id: number,
  productId: number,           // Producto origen
  targetProductId: number,      // Producto destino
  sourceBranchId: string,       // Sucursal origen
  targetBranchId: string,       // Sucursal destino
  unitIds: number[],           // IDs de unidades trasladadas (en origen)
  unitsCount: number,          // Cantidad de unidades
  reason: string,              // Razón del traslado
  userId: string,              // Quién realizó el traslado
  companyId: number,           // Empresa
  createdAt: string            // Fecha y hora
}
```

## Sistema de Traslados Completo

Ahora Oryon App soporta traslado para los **3 tipos de productos**:

### 1. Productos Simples
- Usa: `BranchTransfer.tsx`
- Traslada cantidades genéricas
- Se suma/resta del campo `quantity`

### 2. Productos con Variantes
- Usa: `BranchTransfer.tsx`
- Muestra todas las variantes disponibles
- Distribuye automáticamente entre variantes
- Muestra preview de la distribución

### 3. Productos con Unidades Individuales ⭐ (NUEVO)
- Usa: `UnitsTransfer.tsx`
- Traslada unidades específicas por IMEI/Serial
- Mantiene el seguimiento individual
- Solo unidades disponibles pueden trasladarse

## Beneficios

1. **Trazabilidad Completa**: Cada unidad mantiene su identidad (IMEI/Serial) durante el traslado
2. **Flexibilidad**: El administrador puede elegir exactamente qué unidades trasladar
3. **Seguridad**: Solo unidades disponibles pueden ser trasladadas
4. **Auditoría**: Logs detallados de cada traslado
5. **UX Consistente**: Interfaz similar a los otros tipos de traslado
6. **Validaciones Robustas**: Múltiples capas de validación en frontend y backend

## Testing Recomendado

1. ✅ Trasladar 1 unidad a sucursal sin el producto
2. ✅ Trasladar múltiples unidades a sucursal sin el producto
3. ✅ Trasladar unidades a sucursal que ya tiene el producto
4. ✅ Intentar trasladar unidades vendidas (debe fallar)
5. ✅ Intentar trasladar unidades en reparación (debe fallar)
6. ✅ Trasladar todas las unidades disponibles
7. ✅ Verificar que los IMEI/Serial se mantienen correctos
8. ✅ Verificar que el stock se actualiza correctamente en ambas sucursales
9. ✅ Verificar logs de traslado

## Próximos Pasos Sugeridos

1. Agregar filtros en el diálogo de unidades (por IMEI, Serial, fecha)
2. Permitir búsqueda de unidades específicas
3. Mostrar historial de traslados de cada unidad
4. Agregar reportes de traslados entre sucursales
5. Notificaciones automáticas a usuarios de la sucursal destino

---

**Fecha de Implementación**: Noviembre 4, 2025
**Versión**: 1.0
**Estado**: ✅ Completado y Funcional
