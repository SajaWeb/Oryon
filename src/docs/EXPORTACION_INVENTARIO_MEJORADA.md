# Exportación de Inventario Mejorada

## 🎯 Resumen de Mejoras

Se ha actualizado completamente la función de exportación de inventario a Excel (CSV) para incluir información detallada de todos los tipos de productos.

## 🔐 Restricción de Acceso

### Solo Administradores
- ✅ El botón de "Exportar Excel" ahora **solo es visible para administradores**
- ✅ Si un usuario no admin intenta exportar, recibe un mensaje de error
- ✅ Validación tanto en UI como en la función

## 📊 Estructura del CSV Exportado

### Columnas Incluidas:

1. **Producto** - Nombre del producto
2. **Categoría** - Categoría del producto
3. **Sucursal** - Nombre de la sucursal (no ID)
4. **Tipo** - Tipo de producto:
   - "Simple" - Producto estándar
   - "Con Variantes" - Producto con variantes
   - "Con Unidades" - Seguimiento por IMEI/Serial
5. **Variante/IMEI** - Detalles específicos según el tipo
6. **Estado** - Estado de la unidad/variante
7. **Storage** - Almacenamiento
8. **RAM** - Memoria RAM
9. **Color** - Color del producto
10. **Stock** - Cantidad disponible
11. **Costo Unit.** - Costo unitario (sin decimales)
12. **Precio Venta** - Precio de venta (sin decimales)
13. **Margen %** - Porcentaje de margen de ganancia
14. **Valor Inventario** - Valor total (stock × costo)

## 📦 Manejo por Tipo de Producto

### 1. Productos Simples
```
Producto, Categoría, Sucursal, Tipo, ..., Stock, Costo, Precio, Margen, Valor
iPhone 12, Smartphones, Sucursal Centro, Simple, , Disponible, ..., 5, 800000, 1200000, 50.0, 4000000
```

### 2. Productos con Variantes
Cada variante se exporta en una **fila separada**:
```
Producto, Categoría, Sucursal, Tipo, Variante/IMEI, ..., Stock
Samsung S21, Smartphones, Centro, Con Variantes, 128GB 8GB Negro, ..., 3
Samsung S21, Smartphones, Centro, Con Variantes, 256GB 12GB Blanco, ..., 2
```

### 3. Productos con Unidades (IMEI/Serial)
Cada unidad se exporta en una **fila separada**:
```
Producto, Categoría, Sucursal, Tipo, Variante/IMEI, Estado, Stock
iPhone 13, Smartphones, Centro, Con Unidades, 123456789012345, Disponible, 1
iPhone 13, Smartphones, Centro, Con Unidades, 987654321098765, Vendido, 0
iPhone 13, Smartphones, Centro, Con Unidades, 456789123045678, Disponible, 1
```

## 🎨 Formato del Archivo

### Características:
- ✅ **BOM UTF-8** - Para correcta visualización de caracteres especiales en Excel
- ✅ **Campos entrecomillados** - Previene errores con comas en los datos
- ✅ **Escape de comillas** - Manejo correcto de comillas dobles
- ✅ **Nombre descriptivo** - `inventario_detallado_YYYY-MM-DD.csv`

## 📈 Cálculos Automáticos

### Margen de Ganancia
```javascript
margen = ((precio - costo) / costo) × 100
```

### Valor de Inventario
```javascript
valor = stock × costo_unitario
```

### Stock Total
- **Productos simples**: Cantidad directa
- **Productos con variantes**: Suma de todas las variantes
- **Productos con unidades**: Conteo de unidades disponibles

## 🔧 Implementación Técnica

### Función Actualizada
```typescript
exportProductsToCSV(
  products: Product[], 
  branches: Array<{ id: string; name: string }>
)
```

### Cambios en el Código:
1. **utils.ts** - Función `exportProductsToCSV` completamente reescrita
2. **index.tsx** - Botón de exportar solo visible para admins
3. **Validación** - Verificación de rol antes de exportar

## 📋 Casos de Uso

### Ejemplo 1: Inventario General
Administrador exporta todo el inventario para análisis financiero.

### Ejemplo 2: Auditoría de Unidades
Revisar todas las unidades con IMEI y sus estados (disponible/vendido/reservado).

### Ejemplo 3: Valorización por Sucursal
Filtrar por sucursal y exportar para conocer el valor del inventario.

### Ejemplo 4: Control de Variantes
Ver desglose completo de stock por cada variante de producto.

## 🎯 Beneficios

### Para Administradores:
- ✅ Vista completa y detallada del inventario
- ✅ Trazabilidad de unidades individuales
- ✅ Cálculos automáticos de valores
- ✅ Formato compatible con Excel para análisis

### Para el Negocio:
- ✅ Control preciso del inventario
- ✅ Valorización exacta de activos
- ✅ Seguimiento de márgenes de ganancia
- ✅ Auditoría y reportes financieros

### Para Análisis:
- ✅ Importable en Excel, Google Sheets, Power BI
- ✅ Filtros y tablas dinámicas
- ✅ Gráficos y reportes personalizados
- ✅ Integración con sistemas contables

## 🔒 Seguridad

- ✅ Solo administradores pueden exportar
- ✅ Incluye todas las sucursales (visibilidad completa para admin)
- ✅ Información sensible de costos protegida
- ✅ Trazabilidad de productos individuales

## 📝 Notas Adicionales

### Formato de Precios
Los precios se exportan **sin decimales** según el estándar colombiano:
- Costo: 800000 (no 800000.00)
- Precio: 1200000 (no 1200000.00)
- Excel puede formatearlo según preferencias locales

### Sucursales
- Se exporta el **nombre** de la sucursal, no el ID
- Más legible y útil para reportes
- Facilita el análisis por ubicación

### Estados de Unidades
- **Disponible** - Unidad en stock
- **Vendido** - Unidad ya vendida
- **Reservado** - Unidad apartada

## 🚀 Uso

1. Iniciar sesión como **Administrador**
2. Ir a **Productos**
3. Aplicar filtros si es necesario
4. Click en **"Exportar Excel"**
5. Abrir el archivo .csv en Excel o Google Sheets

¡Listo! Ahora tienes un reporte detallado de todo tu inventario.
