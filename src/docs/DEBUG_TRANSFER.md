# Debug del Traslado de Inventario

## Problema Actual
Se está obteniendo un error 400 al intentar trasladar productos entre sucursales.

## Cambios Realizados

### 1. Backend - Mejoras en Validación y Logging
Se agregaron logs detallados en `/supabase/functions/server/index.tsx` para identificar exactamente dónde falla la validación:

- ✅ Log de datos recibidos (productId, targetBranchId, quantity, reason)
- ✅ Log de producto a trasladar (id, name, branchId, quantity, hasVariants, trackByUnit)
- ✅ Log de validación de cantidad
- ✅ Log de validación de sucursal destino
- ✅ Log de todas las validaciones
- ✅ Validaciones explícitas de campos requeridos antes de procesar

### 2. Frontend - Mejor Manejo de Errores
Se agregaron logs en `/components/products/index.tsx`:

- ✅ Log de datos enviados al backend
- ✅ Log de respuesta de error del servidor

### 3. Lógica de Traslado Mejorada

#### Para productos SIN variantes:
1. Valida que haya suficiente stock
2. Reduce la cantidad del producto origen
3. Si el producto existe en destino → suma la cantidad
4. Si NO existe en destino → crea el producto nuevo con la cantidad trasladada

#### Para productos CON variantes:
1. Valida que haya suficiente stock total en las variantes
2. Transfiere stock proporcionalmente desde las variantes del origen
3. Si el producto existe en destino → actualiza/crea las variantes
4. Si NO existe en destino → crea el producto y sus variantes

## Cómo Ver los Logs

### Opción 1: Console del Navegador
1. Abre las DevTools (F12)
2. Ve a la pestaña "Console"
3. Intenta hacer un traslado
4. Verás los logs que dicen:
   - `Transfer data:` (datos enviados)
   - `Transfer error response:` (respuesta del servidor)

### Opción 2: Logs de Supabase (Recomendado)
1. Ve a tu dashboard de Supabase
2. Navega a: **Edge Functions** → **server** → **Logs**
3. Intenta hacer un traslado
4. Los logs mostrarán exactamente en qué validación falla

## Validaciones que pueden causar Error 400

1. **Sucursal destino es requerida** - No se seleccionó sucursal
2. **Cantidad es requerida** - No se ingresó cantidad
3. **Razón del traslado es requerida** - No se ingresó razón
4. **No se pueden trasladar productos rastreados por unidad** - El producto tiene `trackByUnit: true`
5. **Cantidad inválida** - La cantidad no es un número válido
6. **La cantidad a trasladar debe ser mayor a 0** - Se intentó trasladar 0 o menos
7. **No puedes trasladar X unidades. Solo hay Y disponibles** - Insuficiente stock
8. **La sucursal destino no está activa** - La sucursal destino está inactiva

## Próximos Pasos para Debuggear

1. **Revisar los logs del navegador** al hacer el traslado
2. **Revisar los logs de Supabase Edge Functions**
3. **Verificar los datos que se están enviando**:
   - ¿El `targetBranchId` está definido?
   - ¿La `quantity` es válida?
   - ¿La `reason` tiene contenido?
4. **Verificar el producto**:
   - ¿Tiene `trackByUnit: true`?
   - ¿Tiene suficiente stock?
   - ¿Pertenece a la compañía del usuario?

## Soluciones Comunes

### Si dice "Sucursal destino no encontrada":
- Verifica que la sucursal destino exista
- Verifica que pertenezca a tu compañía
- Asegúrate de que el `targetBranchId` sea correcto

### Si dice "No hay suficiente stock":
- Verifica el stock actual del producto
- Si tiene variantes, verifica el stock de las variantes

### Si dice "No se pueden trasladar productos rastreados por unidad":
- Ese producto está configurado para rastreo por IMEI/Serial
- Debes trasladar las unidades individuales, no el producto completo
