# Módulo de Productos - Documentación

## 📦 Descripción General

El módulo de **Productos** es un sistema completo de gestión de inventario diseñado para manejar productos de electrónica con soporte multisucursal. Ofrece tres métodos de seguimiento de inventario y trazabilidad completa de cada producto.

## 🏗️ Arquitectura

El módulo está estructurado de forma modular para facilitar el mantenimiento y la escalabilidad:

```
/components/products/
├── index.tsx                    # Componente principal (orquestador)
├── types.ts                     # Definiciones de tipos TypeScript
├── constants.ts                 # Constantes del módulo
├── utils.ts                     # Funciones utilitarias
├── BranchSelector.tsx           # Selector de sucursal reutilizable
├── ProductFilters.tsx           # Filtros de búsqueda y categoría
├── ProductCard.tsx              # Tarjeta de producto individual
├── ProductForm.tsx              # Formulario crear/editar producto
├── UnitsManagement.tsx          # Gestión de unidades IMEI/Serial
├── VariantsManagement.tsx       # Gestión de variantes (aumentar stock)
├── InventoryAdjustment.tsx      # Ajuste manual de inventario (solo admin)
├── BranchTransfer.tsx           # Traslado entre sucursales (solo admin)
└── README.md                    # Esta documentación
```

## ✨ Características Principales

### 1. **Soporte Multisucursal**
- Cada producto debe pertenecer a una sucursal específica
- Selección obligatoria de sucursal al crear productos
- Filtrado de productos por sucursal
- Trazabilidad completa del inventario por ubicación

### 2. **Tres Métodos de Seguimiento de Inventario**

#### a) **Por Cantidad Simple**
- Para productos sin variantes (cables, cargadores, etc.)
- Control de stock por cantidad numérica
- Ajustes manuales de inventario con registro de motivos

#### b) **Por Variantes (Colores)**
- Para productos con diferentes colores o modelos
- Cada variante tiene su propio stock independiente
- Ejemplo: Estuche (Rojo: 5, Negro: 10, Azul: 3)

#### c) **Por Unidades Individuales (IMEI/Serial)**
- Para productos con IMEI o número de serie único
- Tracking individual de cada unidad
- Estados: Disponible, Vendido, En Reparación
- Agregar unidades de forma individual o masiva

### 3. **Gestión Completa**
- ✅ Crear, editar, eliminar productos
- ✅ Especificaciones técnicas (almacenamiento, RAM, color)
- ✅ Cálculo automático de margen de ganancia
- ✅ Alertas de stock bajo (< 5 unidades)
- ✅ Exportación a CSV para análisis
- ✅ Búsqueda avanzada (nombre, specs, IMEI, etc.)
- ✅ Filtros por categoría y sucursal
- ✅ Paginación para grandes inventarios

## 🎯 Casos de Uso

### Crear un Producto Simple (Cable USB)
```typescript
// El usuario selecciona:
- Método: "Por Cantidad Simple"
- Nombre: "Cable USB-C 2m"
- Categoría: "Accesorios"
- Sucursal: "Sucursal Centro" (OBLIGATORIO)
- Cantidad: 50
- Precio: $5.00
```

### Crear un Producto con Variantes (Estuche)
```typescript
// El usuario selecciona:
- Método: "Por Variantes (Colores)"
- Nombre: "Estuche iPhone 15"
- Sucursal: "Sucursal Norte" (OBLIGATORIO)

// Luego agrega variantes:
- Rojo: 10 unidades
- Negro: 15 unidades
- Azul: 8 unidades
```

### Crear un Producto con IMEI (iPhone)
```typescript
// El usuario selecciona:
- Método: "Por Unidades Individuales (IMEI/Serial)"
- Nombre: "iPhone 15 Pro 256GB"
- Sucursal: "Sucursal Sur" (OBLIGATORIO)

// Luego agrega unidades:
- IMEI: 356938035643809, Serial: SN001
- IMEI: 356938035643810, Serial: SN002
```

## 🔧 Componentes Reutilizables

### BranchSelector
```tsx
<BranchSelector
  value={formData.branchId}
  onChange={(value) => updateField('branchId', value)}
  branches={branches}
  required={true}
/>
```

### ProductFilters
```tsx
<ProductFilters
  filters={filters}
  onFiltersChange={setFilters}
  branches={branches}
  resultsCount={filteredProducts.length}
/>
```

### ProductCard
```tsx
<ProductCard
  product={product}
  branches={branches}
  onEdit={openEditDialog}
  onDelete={handleDeleteProduct}
  onManageUnits={openUnitsDialog}
  onManageVariants={openVariantsDialog}
  onAdjustInventory={openAdjustmentDialog}
  isAdmin={isAdmin}
/>
```

## 📊 Estructura de Datos

### Product
```typescript
interface Product {
  id: number
  name: string
  category: 'celulares' | 'accesorios' | 'computadores' | 'perifericos'
  price: number
  cost?: number
  branchId: string              // REQUERIDO - ID de la sucursal
  trackByUnit?: boolean         // Tracking por IMEI/Serial
  hasVariants?: boolean         // Tracking por variantes
  quantity?: number             // Stock para productos simples
  units?: ProductUnit[]         // Unidades con IMEI/Serial
  variants?: ProductVariant[]   // Variantes (colores)
  // Especificaciones técnicas
  storage?: string
  ram?: string
  color?: string
  description: string
}
```

## 🔐 Permisos por Rol y Sucursal

### Administrador
- ✅ Crear, editar, eliminar productos de **todas las sucursales**
- ✅ **Ajustar inventario** (aumentar/disminuir) de cualquier sucursal
- ✅ **Realizar traslados entre sucursales** (mover productos completos)
- ✅ Gestionar unidades y variantes de cualquier producto
- ✅ Exportar datos de todas las sucursales
- ✅ Ver inventario completo de todas las sucursales

### Asesor
- ✅ Crear productos **solo en su sucursal asignada**
- ✅ Editar productos **solo de su sucursal**
- ✅ **Aumentar stock de variantes** de su sucursal (no puede disminuir directamente)
- ✅ Agregar unidades IMEI/Serial **solo de su sucursal**
- ✅ Ver inventario de todas las sucursales (solo lectura para otras sucursales)
- ❌ No puede ajustar inventario (solo administradores)
- ❌ No puede hacer traslados entre sucursales
- ❌ Eliminar productos
- ❌ Modificar productos de otras sucursales

### Técnico
- ✅ Ver productos de todas las sucursales (solo lectura)
- ❌ No puede crear ni modificar inventario
- ❌ No puede ajustar stock
- ❌ No tiene botón "Nuevo Producto"

## 🚀 Integración con Backend

### Endpoints Utilizados

```typescript
// Products CRUD
GET    /products              // Listar todos los productos
POST   /products              // Crear producto (branchId REQUERIDO)
PUT    /products/:id          // Actualizar producto
DELETE /products/:id          // Eliminar producto

// Units Management
POST   /products/:id/units           // Agregar unidad individual
POST   /products/:id/units/bulk      // Agregar múltiples unidades
DELETE /products/:id/units/:unitId   // Eliminar unidad

// Variants Management
POST   /products/:id/variants            // Agregar variante
PUT    /products/:id/variants/:variantId // Actualizar stock variante
DELETE /products/:id/variants/:variantId // Eliminar variante

// Inventory Adjustment
POST   /products/:id/adjust-inventory    // Ajustar inventario (solo admin)

// Branch Transfer
POST   /products/:id/transfer             // Trasladar producto entre sucursales (solo admin)

// Branches
GET    /branches              // Listar sucursales
```

## 💡 Mejores Prácticas

### 1. **Selección de Sucursal Obligatoria**
- Todo producto DEBE tener una sucursal asignada
- Esto garantiza trazabilidad completa del inventario
- Permite reportes y análisis por ubicación

### 2. **Validación de Formularios**
- Todos los campos requeridos son validados antes del envío
- Mensajes de error claros y descriptivos
- Prevención de doble submit

### 3. **Feedback al Usuario**
- Toasts informativos para todas las operaciones
- Estados de carga durante operaciones async
- Confirmaciones para acciones destructivas

### 4. **Gestión de Estado**
- Re-fetch automático después de operaciones CRUD
- Actualización del producto seleccionado en diálogos
- Sincronización de filtros y paginación

## 🐛 Troubleshooting

### Problema: No aparecen sucursales en el selector
**Solución:** Verifica que existan sucursales creadas en el sistema. Si no hay sucursales, el formulario mostrará una advertencia y deshabilitará el botón de crear producto.

### Problema: No se puede agregar unidades con IMEI
**Solución:** Asegúrate de que el producto fue creado con el método "Por Unidades Individuales". Los productos simples o con variantes no permiten agregar unidades IMEI.

### Problema: El stock no se actualiza correctamente
**Solución:** Verifica que estés usando el método de tracking correcto. Los productos con unidades IMEI calculan el stock automáticamente basándose en las unidades disponibles.

## 🔄 Traslados Entre Sucursales

### Funcionamiento
Los administradores pueden trasladar productos entre sucursales. El traslado:
- Reduce la cantidad en la sucursal origen
- Crea o aumenta el producto en la sucursal destino
- Solo funciona con productos simples (sin variantes ni IMEI)
- Registra un log completo de la transferencia con motivo

### Requisitos
- Solo disponible para **administradores**
- El producto debe tener stock disponible
- La sucursal destino debe estar activa
- Solo productos sin variantes ni unidades IMEI

### Ejemplo de Uso
```
Producto: Cable USB-C
Sucursal Origen: Centro (Stock: 50)
Sucursal Destino: Norte (Stock: 10)
Cantidad a Trasladar: 20
Motivo: "Mayor demanda en sucursal Norte"

Resultado:
- Centro: 30 unidades
- Norte: 30 unidades
- Log de transferencia registrado
```

## 📈 Mejoras Futuras Sugeridas

1. **Códigos de Barras**
   - Generación automática de códigos de barras
   - Escaneo para búsqueda rápida

3. **Historial de Cambios**
   - Auditoría completa de modificaciones
   - Quién cambió qué y cuándo

4. **Proveedores**
   - Asociar productos con proveedores
   - Órdenes de compra automáticas

5. **Imágenes de Productos**
   - Subir y mostrar fotos de productos
   - Galería de imágenes

## 📝 Notas de Migración

Si estás migrando desde el módulo anterior de productos:

1. **Todos los productos existentes deben tener una sucursal asignada**
2. El campo `branchId` ahora es obligatorio
3. La estructura de datos es compatible hacia atrás
4. Los métodos de tracking se mantienen igual

## 🤝 Contribuciones

Para agregar nuevas funcionalidades al módulo de productos:

1. Agrega nuevos tipos en `types.ts`
2. Agrega constantes en `constants.ts`
3. Agrega funciones utilitarias en `utils.ts`
4. Crea nuevos componentes siguiendo el patrón existente
5. Actualiza esta documentación

---

**Versión:** 2.0.0 (Multisucursal)  
**Última Actualización:** Noviembre 2025  
**Mantenedor:** Equipo Oryon App
