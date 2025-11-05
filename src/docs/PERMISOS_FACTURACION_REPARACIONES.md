# Restricción de Permisos - Facturación de Reparaciones

## Resumen
Se implementó una restricción de permisos para que solo los usuarios con rol de **Asesor** y **Administrador** puedan facturar órdenes de reparación completadas. Los **Técnicos** ya no tienen acceso a esta funcionalidad.

## Motivación
Esta restricción de permisos responde a la necesidad de separar responsabilidades en el flujo de trabajo:
- Los **técnicos** se enfocan en reparar dispositivos
- Los **asesores** y **administradores** manejan la parte comercial y facturación

## Cambios Implementados

### 1. RepairCard Component (`/components/repairs/RepairCard.tsx`)

**Ubicación**: Botón rápido de facturar en la tarjeta de reparación

#### Nueva Prop
Se agregó la prop `userRole` al componente:

```typescript
interface RepairCardProps {
  // ... props existentes
  userRole?: string  // NUEVO
}
```

#### Lógica de Validación
Se implementó una validación para determinar quién puede facturar:

```typescript
// Solo asesores y administradores pueden facturar
const canInvoice = userRole === 'admin' || userRole === 'administrador' || userRole === 'asesor'
```

#### Condicional en el Botón
El botón de facturar ahora incluye la validación:

```typescript
{repair.status === 'completed' && !repair.invoiced && canInvoice && (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 hover:bg-green-50 dark:hover:bg-green-950/30 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400"
        onClick={() => onCreateInvoice(repair)}
      >
        <DollarSign size={13} />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Facturar</TooltipContent>
  </Tooltip>
)}
```

### 2. RepairDetailsDialog Component (`/components/repairs/RepairDetailsDialog.tsx`)

**Ubicación**: Botón principal de facturar en el diálogo de detalles

#### Nueva Prop
Se agregó la prop `userRole` al componente:

```typescript
interface RepairDetailsDialogProps {
  // ... props existentes
  userRole?: string  // NUEVO
}
```

#### Lógica de Validación
Se implementó la misma validación:

```typescript
// Solo asesores y administradores pueden facturar
const canInvoice = userRole === 'admin' || userRole === 'administrador' || userRole === 'asesor'
```

#### Condicional en el Botón
El botón de facturar principal ahora incluye la validación:

```typescript
{repair.status === 'completed' && !repair.invoiced && canInvoice && (
  <div className="border-t pt-4">
    <Button 
      onClick={onCreateInvoice}
      className="w-full bg-green-600 hover:bg-green-700"
    >
      <DollarSign className="mr-2" size={16} />
      Facturar Reparación
    </Button>
    <p className="text-xs text-gray-500 mt-2 text-center">
      El equipo está listo para ser facturado y entregado al cliente
    </p>
  </div>
)}
```

### 3. Repairs Index Component (`/components/repairs/index.tsx`)

#### Propagación de userRole
Se actualizan los llamados a RepairCard y RepairDetailsDialog para pasar el rol del usuario:

```typescript
// En RepairCard (botón rápido)
<RepairCard
  key={repair.id}
  repair={repair}
  onViewDetails={openDetailDialog}
  onChangeStatus={openStatusDialog}
  onCreateInvoice={openInvoiceDialog}
  onDelete={handleDelete}
  canDelete={canDelete}
  branches={branches}
  userRole={userRole}  // NUEVO
/>

// En RepairDetailsDialog (botón principal)
<RepairDetailsDialog
  open={detailDialogOpen}
  onOpenChange={setDetailDialogOpen}
  repair={selectedRepair}
  onChangeStatus={() => openStatusDialog(selectedRepair!)}
  onViewHistory={() => openHistoryDialog(selectedRepair!)}
  onCreateInvoice={() => openInvoiceDialog(selectedRepair!)}
  onImageClick={openImagePreview}
  onPrintServiceOrder={() => handlePrintServiceOrder(selectedRepair!)}
  onPrintDeviceLabel={() => handlePrintDeviceLabel(selectedRepair!)}
  branches={branches}
  userRole={userRole}  // NUEVO
/>
```

## Comportamiento por Rol

### Administrador
- ✅ Ve el botón de facturar (icono $) en la card de reparación
- ✅ Ve el botón "Facturar Reparación" en el diálogo de detalles
- ✅ Puede crear facturas desde ambas ubicaciones
- ✅ Acceso completo a todas las funcionalidades

### Asesor
- ✅ Ve el botón de facturar (icono $) en la card de reparación
- ✅ Ve el botón "Facturar Reparación" en el diálogo de detalles
- ✅ Puede crear facturas desde ambas ubicaciones
- ✅ Acceso a facturación de sus sucursales asignadas

### Técnico
- ❌ **NO** ve el botón de facturar en la card
- ❌ **NO** ve el botón "Facturar Reparación" en el diálogo de detalles
- ❌ **NO** puede acceder a la funcionalidad de facturación
- ✅ Puede ver las órdenes y cambiar su estado
- ✅ Puede agregar notas y actualizar el progreso
- ✅ Puede imprimir orden de servicio y etiquetas

## Estados de Orden Afectados

La restricción solo aplica cuando:
1. La orden está en estado `completed` (completada)
2. La orden **NO** ha sido facturada (`!invoiced`)
3. El usuario **NO** tiene rol de técnico

## Validación de Roles

La validación soporta diferentes variantes del mismo rol:

```typescript
userRole === 'admin'          // Administrador (variante 1)
userRole === 'administrador'  // Administrador (variante 2)
userRole === 'asesor'        // Asesor
// userRole === 'tecnico'     // Técnico (NO tiene acceso)
```

## UX - Experiencia de Usuario

### Para Técnicos
- No ven el botón de facturar en las cards de reparación
- No hay mensajes de error ni indicaciones visuales
- La interfaz simplemente no muestra la opción
- Esto evita confusión y mantiene el enfoque en sus tareas

### Para Asesores y Administradores
- Ven el botón de facturar normalmente
- Tooltip informativo en hover
- Botón destacado con icono de dólar ($)
- Color verde para indicar acción de cobro

## Archivos Modificados

1. **`/components/repairs/RepairCard.tsx`**
   - Agregada prop `userRole`
   - Implementada validación `canInvoice`
   - Condicional agregada al botón rápido de facturar

2. **`/components/repairs/RepairDetailsDialog.tsx`**
   - Agregada prop `userRole`
   - Implementada validación `canInvoice`
   - Condicional agregada al botón principal de facturar

3. **`/components/repairs/index.tsx`**
   - Propagación de `userRole` a RepairCard
   - Propagación de `userRole` a RepairDetailsDialog

4. **`/components/repairs/README.md`**
   - Documentación actualizada con permisos por rol
   - Sección de permisos agregada

## Casos de Uso

### Caso 1: Técnico intenta facturar
**Antes:**
- Técnico veía el botón de facturar
- Al hacer click, podía crear facturas
- No había control de permisos

**Después:**
- Técnico no ve el botón de facturar
- No tiene acceso a la funcionalidad
- Control de permisos a nivel de UI

### Caso 2: Asesor factura orden
**Antes y Después:**
- Asesor ve el botón de facturar
- Puede crear facturas normalmente
- Sin cambios en su experiencia

### Caso 3: Administrador factura orden
**Antes y Después:**
- Administrador ve el botón de facturar
- Puede crear facturas normalmente
- Sin cambios en su experiencia

## Consideraciones de Seguridad

### Frontend
✅ Validación implementada en el componente
✅ Botón oculto para usuarios sin permisos
✅ No se puede bypassear la UI fácilmente

### Backend
⚠️ **IMPORTANTE**: Este cambio es solo en el frontend. Para seguridad completa, el backend debe validar también que solo asesores y administradores puedan crear facturas.

**Recomendación**: Agregar validación en el endpoint de facturación:

```typescript
// En el endpoint de crear factura
if (userRole !== 'admin' && userRole !== 'administrador' && userRole !== 'asesor') {
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: 'No tienes permisos para facturar órdenes' 
    }),
    { status: 403 }
  )
}
```

## Testing Checklist

### RepairCard (Botón Rápido)
- [x] Técnico NO ve botón de facturar en card
- [x] Asesor ve botón de facturar en card
- [x] Administrador ve botón de facturar en card
- [x] Botón solo aparece en órdenes completadas
- [x] Botón solo aparece en órdenes no facturadas
- [x] Tooltip muestra "Facturar"
- [x] Botón tiene icono de dólar ($)
- [x] Hover effect verde funciona

### RepairDetailsDialog (Botón Principal)
- [x] Técnico NO ve botón "Facturar Reparación"
- [x] Asesor ve botón "Facturar Reparación"
- [x] Administrador ve botón "Facturar Reparación"
- [x] Botón solo aparece en órdenes completadas
- [x] Botón solo aparece en órdenes no facturadas
- [x] Botón tiene fondo verde
- [x] Mensaje explicativo se muestra correctamente

### General
- [x] No hay errores en consola
- [x] TypeScript compila sin errores
- [ ] Validación backend implementada (pendiente)

## Próximos Pasos

1. **Backend Validation**: Implementar validación de permisos en el servidor
2. **Audit Log**: Registrar intentos de facturación por usuario y rol
3. **Notificaciones**: Alertar a administradores si hay intentos no autorizados
4. **Tests**: Agregar tests unitarios para validación de permisos

## Notas Técnicas

- La validación es case-sensitive para los roles
- Se soportan múltiples variantes: `admin`, `administrador`, `asesor`
- El componente mantiene compatibilidad hacia atrás (userRole es opcional)
- Si no se pasa userRole, el botón no se muestra (comportamiento seguro por defecto)

## Compatibilidad

- ✅ Dark Mode
- ✅ Responsive Design
- ✅ TypeScript
- ✅ Todas las funcionalidades existentes preservadas
- ✅ No hay breaking changes para otros roles

## Documentación Relacionada

- [README del Módulo de Reparaciones](/components/repairs/README.md)
- [Mejoras UX de Cards](/MEJORAS_UX_CARDS.md)
- [Sistema de Roles y Permisos](pendiente)
