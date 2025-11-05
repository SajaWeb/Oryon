# Sales Module

Este módulo contiene los componentes relacionados con la gestión de ventas y facturación en Oryon App.

## Componentes

### SaleCard

Componente de card moderno para mostrar información de ventas/facturas de forma visual y consistente.

#### Props

```typescript
interface SaleCardProps {
  sale: Sale                          // Datos de la venta
  onPrintInvoice: (sale: Sale) => void  // Callback para imprimir factura
  onCancelSale: (sale: Sale) => void    // Callback para anular factura
  canCancel: boolean                    // Permiso para anular (solo admin)
}
```

#### Características

- **Diseño Responsivo**: Adaptable a diferentes tamaños de pantalla
- **Dark Mode**: Soporte completo para tema oscuro
- **Estados Visuales**: 
  - Facturas activas con accent azul
  - Reparaciones con accent púrpura
  - Facturas anuladas con accent rojo
  - Créditos en mora con accent naranja
- **Tooltips**: Información adicional en hover
- **Información Detallada**:
  - Cliente y contacto
  - Items/productos vendidos
  - Mano de obra (para reparaciones)
  - Repuestos (para reparaciones)
  - Total y ganancia
  - Estado de crédito
  - Razón de anulación (si aplica)

#### Uso

```tsx
import { SaleCard } from './components/sales/SaleCard'

<SaleCard
  sale={saleData}
  onPrintInvoice={handlePrint}
  onCancelSale={handleCancel}
  canCancel={userRole === 'admin'}
/>
```

#### Layout Recomendado

Para una visualización óptima, usar en un grid responsivo:

```tsx
<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
  {sales.map(sale => (
    <SaleCard key={sale.id} sale={sale} {...props} />
  ))}
</div>
```

## Estilos

El componente sigue el sistema de diseño de Oryon App:

- **Accent Line**: Línea superior de 0.5px con gradiente
- **Padding**: p-4 consistente
- **Spacing**: gap-3 entre secciones
- **Borders**: border-gray-200/60 con opacidad
- **Shadows**: shadow-sm con hover:shadow-md
- **Transiciones**: transition-all duration-300

### Colores Semánticos

```css
/* Estados de Crédito */
- En mora: red-50/red-700
- Vence hoy: yellow-50/yellow-700
- Pendiente: blue-50/blue-700

/* Tipos de Venta */
- Normal: blue accent
- Reparación: purple accent
- Anulada: red accent
```

## Tipos

Ver `Sale` interface en el componente para la estructura completa de datos.

## Dependencias

- `lucide-react`: Iconos
- `shadcn/ui`: Componentes base (Card, Badge, Button, Tooltip)
- Tailwind CSS: Estilos

## Mantenimiento

Al actualizar este componente:

1. Mantener consistencia con ProductCard y RepairCard
2. Preservar soporte para dark mode
3. Actualizar tipos TypeScript si cambian los datos
4. Testear en diferentes tamaños de pantalla
5. Verificar tooltips y accesibilidad

## Changelog

### v1.0.0 (2025-11-04)
- Componente inicial creado
- Diseño moderno consistente con ProductCard
- Soporte completo para ventas de productos y servicios
- Grid responsivo implementado
- Dark mode completo
- Tooltips informativos
- Cálculo de ganancia y margen
- Manejo de créditos y estados
