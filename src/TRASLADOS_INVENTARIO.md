# 🔄 Traslados de Inventario Entre Sucursales

## ✅ Implementación Completada - Noviembre 2025

### 📋 Resumen de Cambios

Se ha implementado el sistema de **traslados de inventario entre sucursales** con los siguientes permisos y funcionalidades:

## 🔐 Sistema de Permisos

### **Administradores**
✅ **Ajuste de Inventario:**
- Pueden aumentar o disminuir stock manualmente
- Disponible para productos simples (sin variantes ni IMEI)
- Requiere especificar motivo del ajuste
- Registra log completo de auditoría

✅ **Traslados Entre Sucursales:**
- Mover productos completos entre sucursales
- Reduce stock en sucursal origen
- Crea o aumenta stock en sucursal destino
- Solo para productos simples (sin variantes ni IMEI)
- Requiere motivo del traslado
- Validaciones de stock disponible
- Registra log completo de transferencia

### **Asesores**
✅ **Crear Productos:**
- Solo en su sucursal asignada
- Acceso completo al formulario de creación

✅ **Aumentar Stock de Variantes:**
- Pueden agregar stock a variantes de su sucursal
- Interfaz simplificada: ingresar cantidad y presionar "Añadir"
- No pueden disminuir stock directamente

❌ **Restricciones:**
- No pueden ajustar inventario (aumentar/disminuir stock general)
- No pueden hacer traslados entre sucursales
- No pueden eliminar productos
- No pueden modificar productos de otras sucursales

### **Técnicos**
❌ Solo lectura - No pueden modificar inventario

## 🎨 Componentes Creados/Modificados

### Nuevos Componentes

**1. `BranchTransfer.tsx`**
- Interfaz para trasladar productos entre sucursales
- Muestra stock actual y destino
- Preview de stock después del traslado
- Validaciones en tiempo real
- Solo visible para administradores

### Componentes Modificados

**2. `VariantsManagement.tsx`**
- Cambiado a sistema de "Agregar Stock"
- Los asesores pueden aumentar stock
- Input + botón para añadir cantidad
- No se permite disminuir directamente

**3. `ProductCard.tsx`**
- Botón "Ajustar Stock" solo para administradores
- Nuevo botón "Trasladar a Otra Sucursal" solo para administradores
- El botón de traslado solo aparece en productos simples con stock

**4. `index.tsx` (Productos)**
- Nuevo diálogo de traslado
- Handler `handleBranchTransfer`
- Integración completa con backend

**5. `types.ts`**
- Nuevo tipo `BranchTransferData`

## 🔌 Backend - Endpoints

### Nuevo Endpoint: `/products/:id/transfer`

```typescript
POST /make-server-4d437e50/products/:id/transfer

Request Body:
{
  targetBranchId: string,
  quantity: number,
  reason: string
}

Response:
{
  success: true,
  sourceProduct: Product,
  targetProduct: Product,
  transfer: TransferLog
}
```

**Validaciones:**
- Solo administradores
- Producto debe existir y pertenecer a la empresa
- No permitido para productos con unidades IMEI o variantes
- Cantidad debe ser > 0 y <= stock disponible
- Sucursal destino debe existir, estar activa y pertenecer a la empresa
- Registra log completo de transferencia

**Lógica:**
1. Reduce cantidad en producto origen
2. Si el producto ya existe en destino (mismo nombre, categoría, specs):
   - Aumenta stock del producto existente
3. Si no existe en destino:
   - Crea nuevo producto con las mismas características
4. Registra log de transferencia con toda la información

## 📊 Logs de Auditoría

### Ajuste de Inventario
```typescript
{
  id: number,
  productId: number,
  productName: string,
  type: 'add' | 'subtract',
  quantity: number,
  previousQuantity: number,
  newQuantity: number,
  reason: string,
  userId: string,
  userName: string,
  companyId: string,
  createdAt: string
}
```

### Traslado Entre Sucursales
```typescript
{
  id: number,
  productId: number,
  productName: string,
  sourceBranchId: string,
  targetBranchId: string,
  quantity: number,
  reason: string,
  userId: string,
  userName: string,
  companyId: string,
  createdAt: string
}
```

## 🎯 Flujo de Uso

### Traslado de Producto (Solo Admin)

1. **Seleccionar Producto:**
   - Debe ser producto simple (sin variantes ni IMEI)
   - Debe tener stock disponible
   - Click en "Trasladar a Otra Sucursal"

2. **Completar Formulario:**
   - Seleccionar sucursal destino
   - Ingresar cantidad a trasladar
   - Especificar motivo del traslado
   - Ver preview del resultado

3. **Confirmar Traslado:**
   - Sistema valida todo
   - Actualiza stock en ambas sucursales
   - Registra log de transferencia
   - Muestra confirmación al usuario

### Aumentar Stock de Variante (Admin y Asesor)

1. **Gestionar Variantes:**
   - Click en "Gestionar Variantes"
   - Buscar la variante deseada

2. **Agregar Stock:**
   - Ingresar cantidad en el campo "Agregar"
   - Presionar Enter o click en botón "Añadir"
   - Stock se actualiza inmediatamente

## 🚨 Validaciones Implementadas

### En el Frontend (BranchTransfer.tsx)
- Campo de sucursal destino requerido
- Cantidad debe ser > 0
- Cantidad no puede exceder stock disponible
- Motivo del traslado requerido
- No permitir traslado si solo hay 1 sucursal

### En el Backend (index.tsx)
- Autenticación requerida
- Solo administradores
- Producto debe existir
- Producto debe pertenecer a la empresa del usuario
- No permitido para productos con IMEI o variantes
- Cantidad válida (> 0 y <= stock)
- Sucursal destino válida y activa
- Sucursal destino pertenece a la misma empresa

## 📱 Interfaz de Usuario

### Diálogo de Traslado
- **Header:** Título y descripción clara
- **Info Actual:** Sucursal origen y stock disponible
- **Selector:** Dropdown para elegir sucursal destino
- **Visual:** Flecha indicando dirección del traslado
- **Input:** Campo para cantidad con validación
- **Motivo:** Textarea para justificación
- **Preview:** Vista previa del stock resultante
- **Advertencia:** Mensaje sobre permanencia del cambio
- **Acciones:** Botones Cancelar/Confirmar

### Gestión de Variantes (Mejorada)
- **Stock Actual:** Badge con cantidad disponible
- **Campo Agregar:** Input numérico para cantidad
- **Botón Añadir:** Incrementa el stock
- **Tip:** Instrucciones claras para el usuario
- **Enter:** Soporte para agregar con tecla Enter

## 🔍 Casos de Uso

### Ejemplo 1: Traslado por Mayor Demanda
```
Producto: Cable USB-C 2m
Sucursal Origen: Centro (50 unidades)
Sucursal Destino: Norte (10 unidades)
Cantidad: 20 unidades
Motivo: "Mayor demanda en sucursal Norte"

Resultado:
- Centro: 30 unidades (-20)
- Norte: 30 unidades (+20)
```

### Ejemplo 2: Agregar Stock a Variante (Asesor)
```
Producto: Estuche iPhone 15
Variante: Rojo
Stock Actual: 5 unidades
Acción: Agregar 10 unidades
Motivo: (No requerido para asesores)

Resultado:
- Variante Rojo: 15 unidades
```

## 📝 Notas Técnicas

1. **Productos Duplicados:**
   - El sistema detecta si el producto ya existe en la sucursal destino
   - Criterios: nombre, categoría, storage, ram, color iguales
   - Si existe: aumenta stock
   - Si no existe: crea nuevo producto

2. **IDs Únicos:**
   - Cada producto tiene un ID único global
   - Si se crea nuevo producto en destino, recibe nuevo ID
   - Esto permite trazabilidad independiente por sucursal

3. **Toasts Mejorados:**
   - Loading state durante traslado
   - Success con descripción de cantidad trasladada
   - Error con descripción específica del problema

## ✅ Testing Realizado

- ✅ Traslado exitoso entre sucursales
- ✅ Validación de permisos (solo admin)
- ✅ Validación de cantidad disponible
- ✅ Creación de producto en destino si no existe
- ✅ Aumento de stock si producto ya existe en destino
- ✅ Registro correcto de logs
- ✅ Interfaz responsive en móvil
- ✅ Asesores pueden agregar stock a variantes
- ✅ Asesores NO pueden ajustar inventario general
- ✅ Botones visibles solo según permisos

## 🎓 Documentación Actualizada

- ✅ README.md del módulo de productos actualizado
- ✅ Sección de permisos clarificada
- ✅ Nuevos endpoints documentados
- ✅ Componentes listados en arquitectura
- ✅ Este archivo de resumen creado

---

**Versión:** 2.1.0  
**Fecha:** Noviembre 2025  
**Feature:** Traslados de Inventario y Permisos Granulares  
**Estado:** ✅ Completado y Documentado
