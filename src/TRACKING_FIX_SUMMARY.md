# Fix de Sistema de Tracking - Oryon App

## Problema Identificado

El sistema de tracking tenía un error crítico donde las órdenes de reparación se identificaban solo por su ID numérico sin considerar la empresa, causando que la **orden #6 de la Empresa A** pudiera cruzarse con la **orden #6 de la Empresa B**, comprometiendo la privacidad de los clientes y la seguridad del sistema.

### Ejemplo del Problema
- Empresa "TechFix" crea orden #5 → URL: `/#/tracking/5`
- Empresa "MobileRepair" crea orden #5 → URL: `/#/tracking/5` ❌ **MISMO URL**
- Ambas órdenes compartían la misma clave en la base de datos: `repair:5`

## Solución Implementada

### 1. Nuevo Formato de Identificación Única

**Antes:**
- Clave en base de datos: `repair:123`
- URL de tracking: `/#/tracking/123`

**Ahora:**
- Clave en base de datos: `repair:{companyId}:{repairId}`
- URL de tracking: `/#/tracking/{companyId}/{repairId}`

**Ejemplo:**
- Empresa 1, Orden 5: `repair:1:5` → `/#/tracking/1/5`
- Empresa 2, Orden 5: `repair:2:5` → `/#/tracking/2/5`

### 2. Cambios en el Backend (`/supabase/functions/server/index.tsx`)

#### Endpoints Actualizados:

**a) Endpoint Principal de Tracking (con companyId)**
```
GET /tracking/:companyId/:repairId
```
- Requiere ambos parámetros
- Verifica que la orden pertenezca a la empresa solicitada
- Soporta fallback a formato antiguo si existe

**b) Endpoint Legacy (compatibilidad)**
```
GET /tracking-legacy/:repairId
```
- Solo para códigos QR antiguos
- Busca en todas las empresas (con precaución)
- Marcado como DEPRECATED

#### Operaciones de Reparación:
- ✅ **POST** `/repairs` - Crea con clave `repair:companyId:id`
- ✅ **PUT** `/repairs/:id/status` - Actualiza con verificación de empresa
- ✅ **POST** `/repairs/:id/invoice` - Factura con verificación de empresa
- ✅ **PUT** `/repairs/:id` - Edita con verificación de empresa
- ✅ **DELETE** `/repairs/:id` - Elimina con verificación de empresa

Todas las operaciones ahora:
1. Intentan leer primero el nuevo formato `repair:companyId:id`
2. Hacen fallback al formato antiguo `repair:id`
3. Verifican que `repair.companyId === userProfile.companyId`
4. Guardan en el nuevo formato
5. Eliminan la clave antigua si existe (migración automática)

### 3. Cambios en el Frontend

#### `/App.tsx`
```typescript
// Antes
const trackingId = currentRoute.split('/tracking/')[1]
<TrackingPage repairId={trackingId} />

// Ahora
const parts = trackingParams.split('/')
const trackingCompanyId = parts.length === 2 ? parts[0] : null
const trackingRepairId = parts.length === 2 ? parts[1] : parts[0]
<TrackingPage companyId={trackingCompanyId} repairId={trackingRepairId} />
```

#### `/components/TrackingPage.tsx`
- Acepta `companyId` y `repairId` como parámetros separados
- Soporta formato nuevo: `fetchRepairTracking()` con ambos IDs
- Soporta formato legacy: `fetchLegacyRepairTracking()` solo con repairId
- Búsqueda manual acepta ambos formatos: `1/5` o `5`

#### `/components/repairs/index.tsx`
```typescript
// Generación de URL de tracking con companyId
const trackingUrl = `${window.location.origin}/#/tracking/${repair.companyId}/${repair.id}`
```
- URLs en códigos QR ahora incluyen el companyId
- Previene conflictos entre empresas

#### `/components/repairs/types.ts`
```typescript
export interface Repair {
  id: number
  companyId: number  // ← NUEVO CAMPO
  // ... resto de campos
}
```

### 4. Compatibilidad con QR Codes Existentes

El sistema es **100% retrocompatible**:

1. **QR Codes Nuevos** (`/#/tracking/1/5`)
   - Funcionan de inmediato
   - Máxima seguridad
   - No hay conflictos posibles

2. **QR Codes Antiguos** (`/#/tracking/5`)
   - Siguen funcionando temporalmente
   - Usan endpoint legacy
   - Sistema recomienda regenerar

### 5. Migración Automática

El sistema migra automáticamente las órdenes del formato antiguo al nuevo cuando:
- Se actualiza el estado de una orden
- Se factura una orden
- Se edita una orden
- Se consulta una orden

**Proceso de Migración:**
```typescript
// 1. Lee el formato antiguo
let existing = await kv.get(`repair:${userProfile.companyId}:${id}`)
if (!existing) {
  existing = await kv.get(`repair:${id}`) // Fallback
}

// 2. Guarda en formato nuevo
await kv.set(`repair:${repair.companyId}:${id}`, JSON.stringify(repair))

// 3. Elimina formato antiguo
await kv.del(`repair:${id}`)
```

## Seguridad Mejorada

### Verificaciones de Seguridad Implementadas:

1. **Aislamiento de Empresas**
   ```typescript
   if (repair.companyId !== userProfile.companyId) {
     return c.json({ success: false, error: 'Unauthorized' }, 403)
   }
   ```

2. **Tracking Público con Validación**
   ```typescript
   if (repair.companyId !== parseInt(companyId)) {
     return c.json({ success: false, error: 'Repair not found' }, 404)
   }
   ```

3. **Prevención de Acceso Cruzado**
   - Una empresa no puede ver/editar órdenes de otra empresa
   - Las URLs de tracking son únicas por empresa
   - Los QR codes no se cruzan entre empresas

## Testing y Validación

### Casos de Prueba:
1. ✅ Crear nueva orden → Genera QR con formato `companyId/repairId`
2. ✅ Escanear QR nuevo → Va directamente a tracking (sin login)
3. ✅ Escanear QR antiguo → Funciona con endpoint legacy
4. ✅ Búsqueda manual → Acepta ambos formatos
5. ✅ Empresa A orden #5 ≠ Empresa B orden #5 → URLs diferentes
6. ✅ Tracking público → No requiere autenticación

### Logs de Debugging:
```
🎨 TrackingPage component rendering...
   Company ID received: 1
   Repair ID received: 5
   → Fetching repair tracking with both IDs (new format)
```

## Próximos Pasos Recomendados

1. **Regenerar QR Codes** (Opcional pero recomendado)
   - Reimprimir órdenes de servicio activas
   - Los QR antiguos seguirán funcionando

2. **Monitoreo**
   - Revisar logs de uso del endpoint legacy
   - Identificar empresas que aún usan códigos antiguos

3. **Deprecación Futura**
   - Después de 30-60 días, considerar remover endpoint legacy
   - Notificar a empresas para regenerar QR codes

## Archivos Modificados

### Backend
- `/supabase/functions/server/index.tsx`
  - Nuevo endpoint `/tracking/:companyId/:repairId`
  - Nuevo endpoint `/tracking-legacy/:repairId` (temporal)
  - Actualización de todas las operaciones CRUD de repairs

### Frontend
- `/App.tsx` - Parsing de parámetros de tracking
- `/components/TrackingPage.tsx` - Soporte dual de formatos
- `/components/repairs/index.tsx` - Generación de URLs con companyId
- `/components/repairs/types.ts` - Agregado campo companyId

## Beneficios del Fix

1. ✅ **Seguridad**: Cada empresa tiene sus propias órdenes aisladas
2. ✅ **Privacidad**: Los clientes solo ven sus propias órdenes
3. ✅ **Escalabilidad**: Soporta múltiples empresas sin conflictos
4. ✅ **Compatibilidad**: QR codes antiguos siguen funcionando
5. ✅ **Migración Transparente**: Sin interrupciones de servicio
6. ✅ **Acceso Público**: Clientes ven tracking sin necesidad de login

---

**Fecha de Implementación**: Noviembre 2025
**Versión**: 2.0.0
**Estado**: ✅ Completado y Probado
