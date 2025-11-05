# Solución a Productos/Unidades Duplicados

## Fecha: 2024-11-05

## Problema Identificado

Cuando se crea un producto con IMEI o SN, se generan automáticamente dos productos o unidades adicionales con datos nulos. Este problema puede ocurrir por:

1. **Doble/Triple Click**: El usuario hace click múltiples veces en el botón de crear
2. **Múltiples llamadas**: El componente se renderiza varias veces y ejecuta la función múltiples veces
3. **Falta de validación**: No hay validación para prevenir unidades duplicadas con IMEI/SN nulos

## Soluciones Implementadas

### 1. Validación en Backend (Prevenir Unidades Vacías)

Se agregó validación para que no se puedan crear unidades sin IMEI o Serial Number.

**Archivo modificado**: `/supabase/functions/server/index.tsx`

En la ruta POST `/make-server-4d437e50/products/:productId/units`:
- Se valida que al menos uno de los campos (IMEI o Serial) tenga un valor no vacío
- Se retorna error 400 si ambos están vacíos

En la ruta POST `/make-server-4d437e50/products/:productId/units/bulk`:
- Se filtran unidades que no tengan ni IMEI ni Serial Number
- Solo se crean unidades válidas

### 2. Prevención de Múltiples Clics en Frontend

Se modificaron los componentes para prevenir múltiples submissions:

**Componentes modificados**:
- `/components/products/UnitsManagement.tsx`
- `/components/products/index.tsx`

Cambios:
- Se usa el estado `isLoading` para deshabilitar botones durante la operación
- Los botones quedan deshabilitados mientras se procesa la petición
- Se muestra indicador de carga

### 3. Validación de Datos en Frontend

Se agregó validación en el frontend antes de enviar:
- Verificar que al menos IMEI o Serial Number tenga valor
- Mostrar mensaje de error inmediato sin llamar al backend
- Limpiar formulario solo después de éxito

## Código de la Solución

### Backend - Validación de Unidades

```typescript
// Add single unit to product
app.post('/make-server-4d437e50/products/:productId/units', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const productId = c.req.param('productId')
    const body = await c.req.json()
    
    // ✅ VALIDACIÓN: Verificar que al menos uno de los campos esté presente
    if (!body.imei && !body.serialNumber) {
      return c.json({ 
        success: false, 
        error: 'Debes proporcionar al menos un IMEI o Número de Serie' 
      }, 400)
    }
    
    // Verificar que no estén vacíos
    const imei = body.imei?.trim()
    const serialNumber = body.serialNumber?.trim()
    
    if (!imei && !serialNumber) {
      return c.json({ 
        success: false, 
        error: 'IMEI o Número de Serie no pueden estar vacíos' 
      }, 400)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    // Verify product exists
    const productData = await kv.get(`product:${productId}`)
    if (!productData) {
      return c.json({ success: false, error: 'Product not found' }, 404)
    }
    
    const product = JSON.parse(productData)
    
    // ✅ VALIDACIÓN: Verificar que IMEI/SN no esté duplicado
    if (imei) {
      const existingUnits = await kv.getByPrefix(`product:${productId}:unit:`)
      const duplicate = existingUnits.find((u: string) => {
        const unit = JSON.parse(u)
        return unit.imei?.trim().toLowerCase() === imei.toLowerCase()
      })
      
      if (duplicate) {
        return c.json({ 
          success: false, 
          error: `Ya existe una unidad con el IMEI ${imei}` 
        }, 400)
      }
    }
    
    if (serialNumber) {
      const existingUnits = await kv.getByPrefix(`product:${productId}:unit:`)
      const duplicate = existingUnits.find((u: string) => {
        const unit = JSON.parse(u)
        return unit.serialNumber?.trim().toLowerCase() === serialNumber.toLowerCase()
      })
      
      if (duplicate) {
        return c.json({ 
          success: false, 
          error: `Ya existe una unidad con el Serial ${serialNumber}` 
        }, 400)
      }
    }
    
    const unitId = await getNextId(`product:${productId}:unit`)
    const unit = {
      id: unitId,
      productId: parseInt(productId),
      imei: imei || undefined,
      serialNumber: serialNumber || undefined,
      status: 'available',
      createdAt: new Date().toISOString()
    }
    
    await kv.set(`product:${productId}:unit:${unitId}`, JSON.stringify(unit))
    
    // Log transaction
    await logProductTransaction({
      productId: product.id,
      productName: product.name,
      action: 'add_unit',
      description: `Unidad agregada a ${product.name}`,
      userId: user.id,
      userName: userProfile.name,
      userRole: userProfile.role,
      branchId: product.branchId || '',
      companyId: userProfile.companyId,
      quantity: 1,
      details: `IMEI: ${imei || 'N/A'}, Serial: ${serialNumber || 'N/A'}`
    })
    
    return c.json({ success: true, unit })
  } catch (error) {
    console.log('Error adding unit:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Add multiple units to product (bulk)
app.post('/make-server-4d437e50/products/:productId/units/bulk', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const productId = c.req.param('productId')
    const { units } = await c.req.json()
    
    // ✅ VALIDACIÓN: Filtrar unidades vacías
    const validUnits = units.filter((u: any) => {
      const imei = u.imei?.trim()
      const serialNumber = u.serialNumber?.trim()
      return imei || serialNumber
    })
    
    if (validUnits.length === 0) {
      return c.json({ 
        success: false, 
        error: 'No se encontraron unidades válidas. Cada unidad debe tener al menos IMEI o Serial Number.' 
      }, 400)
    }
    
    // Verify product exists
    const productData = await kv.get(`product:${productId}`)
    if (!productData) {
      return c.json({ success: false, error: 'Product not found' }, 404)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    const product = JSON.parse(productData)
    
    // ✅ VALIDACIÓN: Verificar duplicados en el batch
    const seenImeis = new Set()
    const seenSerials = new Set()
    const errors: string[] = []
    
    for (const unitData of validUnits) {
      const imei = unitData.imei?.trim()
      const serialNumber = unitData.serialNumber?.trim()
      
      if (imei) {
        if (seenImeis.has(imei.toLowerCase())) {
          errors.push(`IMEI duplicado en el lote: ${imei}`)
        }
        seenImeis.add(imei.toLowerCase())
        
        // Verificar en unidades existentes
        const existingUnits = await kv.getByPrefix(`product:${productId}:unit:`)
        const duplicate = existingUnits.find((u: string) => {
          const unit = JSON.parse(u)
          return unit.imei?.trim().toLowerCase() === imei.toLowerCase()
        })
        
        if (duplicate) {
          errors.push(`IMEI ya existe: ${imei}`)
        }
      }
      
      if (serialNumber) {
        if (seenSerials.has(serialNumber.toLowerCase())) {
          errors.push(`Serial duplicado en el lote: ${serialNumber}`)
        }
        seenSerials.add(serialNumber.toLowerCase())
        
        // Verificar en unidades existentes
        const existingUnits = await kv.getByPrefix(`product:${productId}:unit:`)
        const duplicate = existingUnits.find((u: string) => {
          const unit = JSON.parse(u)
          return unit.serialNumber?.trim().toLowerCase() === serialNumber.toLowerCase()
        })
        
        if (duplicate) {
          errors.push(`Serial ya existe: ${serialNumber}`)
        }
      }
    }
    
    if (errors.length > 0) {
      return c.json({ 
        success: false, 
        error: `Errores encontrados:\\n${errors.join('\\n')}` 
      }, 400)
    }
    
    const createdUnits = []
    for (const unitData of validUnits) {
      const unitId = await getNextId(`product:${productId}:unit`)
      const unit = {
        id: unitId,
        productId: parseInt(productId),
        imei: unitData.imei?.trim() || undefined,
        serialNumber: unitData.serialNumber?.trim() || undefined,
        status: 'available',
        createdAt: new Date().toISOString()
      }
      
      await kv.set(`product:${productId}:unit:${unitId}`, JSON.stringify(unit))
      createdUnits.push(unit)
    }
    
    // Log transaction
    await logProductTransaction({
      productId: product.id,
      productName: product.name,
      action: 'add_units_bulk',
      description: `${createdUnits.length} unidades agregadas a ${product.name}`,
      userId: user.id,
      userName: userProfile.name,
      userRole: userProfile.role,
      branchId: product.branchId || '',
      companyId: userProfile.companyId,
      quantity: createdUnits.length,
      details: `Importación masiva de unidades`
    })
    
    return c.json({ success: true, units: createdUnits })
  } catch (error) {
    console.log('Error bulk adding units:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})
```

## Cómo Usar

### Para el Usuario

1. **Al agregar una unidad individual**:
   - Asegúrate de llenar al menos uno de los campos (IMEI o Serial)
   - El sistema te mostrará un error si intentas agregar una unidad vacía
   - No hagas click múltiples veces en "Agregar Unidad"

2. **Al agregar unidades en lote**:
   - Cada línea debe tener formato: `IMEI, Serial`
   - Puedes omitir uno de los dos, pero no ambos
   - Ejemplo válido:
     ```
     356938035643809, SN001
     356938035643810,
     , SN003
     ```
   - Las líneas vacías o con ambos campos vacíos se ignorarán automáticamente

3. **Prevención de duplicados**:
   - El sistema ahora valida que no existan IMEI o Serial Numbers duplicados
   - Si intentas agregar una unidad con IMEI/SN que ya existe, recibirás un error

### Para Desarrolladores

- El frontend ya tiene protección contra múltiples clicks
- El backend valida todos los datos antes de crear unidades
- Los errores se muestran claramente al usuario
- Las unidades inválidas se filtran automáticamente en lotes

## Testing

Para verificar que la solución funciona:

1. ✅ Intentar agregar unidad sin IMEI ni Serial → debe mostrar error
2. ✅ Intentar agregar unidad con IMEI duplicado → debe mostrar error
3. ✅ Hacer doble click en botón de agregar → solo debe crear una unidad
4. ✅ Agregar lote con líneas vacías → debe ignorar líneas vacías
5. ✅ Agregar lote con duplicados → debe mostrar todos los errores

## Limpieza de Datos Existentes

Si ya tienes unidades duplicadas con datos nulos en tu base de datos:

1. Ve al módulo de Productos
2. Entra a "Gestionar Unidades" del producto afectado
3. Verás todas las unidades, incluyendo las que tienen datos nulos
4. Elimina manualmente las unidades vacías (las que no tienen ni IMEI ni Serial)
5. Las unidades vendidas o en reparación no se pueden eliminar

## Prevención Futura

Con estas validaciones implementadas, ya no debería ser posible crear:
- Productos duplicados
- Unidades sin datos
- Unidades con IMEI/SN duplicados
