# ✅ Validación de Clientes Duplicados

## 📋 Resumen de Implementación

Se implementó un sistema completo de validación de clientes duplicados para evitar la creación de registros con el mismo **número de documento** o **número de teléfono**. La validación funciona en todos los módulos donde se pueden crear clientes.

**Fecha:** 5 de Noviembre, 2025  
**Versión:** 2.3 - Validación de Duplicados  
**Estado:** ✅ IMPLEMENTADO

---

## 🎯 Objetivo

Evitar la duplicidad de datos de clientes en el sistema mediante validación en:
- ✅ Módulo de Clientes (creación y edición)
- ✅ Módulo de Reparaciones (creación automática al crear orden)
- ✅ Módulo de Ventas (creación automática al registrar venta)

---

## 🔍 Campos Validados

### 1. Número de Documento (documentNumber / identificationNumber)
- Se valida que no exista otro cliente con el mismo documento
- La comparación es **case-insensitive** (no distingue mayúsculas/minúsculas)
- Se eliminan espacios en blanco al inicio y final

**Ejemplo:**
```
Cliente 1: Documento "1234567890"
Cliente 2: Intenta crear con "1234567890" → ❌ RECHAZADO
Cliente 2: Intenta crear con " 1234567890 " → ❌ RECHAZADO (se eliminan espacios)
Cliente 2: Intenta crear con "1234567891" → ✅ PERMITIDO
```

### 2. Número de Teléfono (phone)
- Se valida que no exista otro cliente con el mismo teléfono
- La comparación es **exacta** (respeta formato)
- Se eliminan espacios en blanco

**Ejemplo:**
```
Cliente 1: Teléfono "3001234567"
Cliente 2: Intenta crear con "3001234567" → ❌ RECHAZADO
Cliente 2: Intenta crear con "3001234568" → ✅ PERMITIDO
```

---

## 🔧 Implementación Backend

### Archivo: `/supabase/functions/server/index.tsx`

#### POST /customers (Crear Cliente)

**Validación implementada (líneas 2869-2903):**

```typescript
// Validation: Check for duplicate document number or phone
const allCustomers = await kv.getByPrefix('customer:')
const existingCustomers = allCustomers
  .map((c: string) => JSON.parse(c))
  .filter((c: any) => c.companyId === userProfile.companyId)

// Check for duplicate document number (if provided)
if (body.documentNumber && body.documentNumber.trim()) {
  const duplicateDocument = existingCustomers.find(
    (c: any) => c.documentNumber && 
    c.documentNumber.toLowerCase().trim() === body.documentNumber.toLowerCase().trim()
  )
  if (duplicateDocument) {
    return c.json({ 
      success: false, 
      error: `Ya existe un cliente con el documento ${body.documentNumber}. Cliente: ${duplicateDocument.name}`,
      field: 'documentNumber'
    }, 400)
  }
}

// Check for duplicate phone number (if provided)
if (body.phone && body.phone.trim()) {
  const duplicatePhone = existingCustomers.find(
    (c: any) => c.phone && c.phone.trim() === body.phone.trim()
  )
  if (duplicatePhone) {
    return c.json({ 
      success: false, 
      error: `Ya existe un cliente con el teléfono ${body.phone}. Cliente: ${duplicatePhone.name}`,
      field: 'phone'
    }, 400)
  }
}
```

#### PUT /customers/:id (Actualizar Cliente)

**Validación implementada (líneas 2900-2944):**

Similar a la creación, pero **excluye el cliente actual** de la búsqueda:

```typescript
const existingCustomers = allCustomers
  .map((c: string) => JSON.parse(c))
  .filter((c: any) => c.companyId === userProfile.companyId && c.id !== parseInt(id))
```

Esto permite que un cliente mantenga su propio documento/teléfono al editarse.

---

## 💻 Implementación Frontend

### 1. Módulo de Clientes

**Archivo:** `/components/Customers.tsx`

**Actualización (líneas 146-152):**

```typescript
const data = await response.json()
if (data.success) {
  fetchCustomers()
  setDialogOpen(false)
  resetForm()
  toast.success(editingCustomer ? 'Cliente actualizado exitosamente' : 'Cliente creado exitosamente')
} else {
  console.error('Error saving customer:', data.error)
  toast.error(data.error || 'Error al guardar el cliente')
}
```

**Comportamiento:**
- ✅ Muestra mensaje de éxito con toast verde
- ❌ Muestra mensaje de error detallado con toast rojo
- El error incluye el nombre del cliente duplicado

---

### 2. Módulo de Reparaciones

**Archivo:** `/components/repairs/hooks/useCustomers.ts`

**Actualización (líneas 96-101):**

```typescript
const createData = await createResponse.json()
if (createData.success) {
  await fetchCustomers()
  return createData.customer.id
} else {
  // Error al crear cliente (puede ser duplicado)
  throw new Error(createData.error || 'Error al crear el cliente')
}
```

**Archivo:** `/components/repairs/index.tsx`

**Actualización (líneas 118-127):**

```typescript
try {
  const customerId = await findOrCreateCustomer(formData, selectedCustomerId)
  await createRepair(accessToken, formData, uploadedImages, customerId)
  await fetchRepairs()
  dialogs.setDialogOpen(false)
  toast.success('✅ Orden de reparación creada exitosamente')
} catch (error) {
  console.error('Error in handleSubmitNewRepair:', error)
  const errorMessage = error instanceof Error ? error.message : 'Error al crear la orden de reparación'
  toast.error(errorMessage)
}
```

**Comportamiento:**
- Si se detecta un cliente duplicado, se lanza un error
- El error se propaga y se muestra con toast
- El diálogo permanece abierto para que el usuario corrija

---

### 3. Módulo de Ventas

**Archivo:** `/components/Sales.tsx`

**Actualización en findOrCreateCustomer (líneas 589-596):**

```typescript
const createData = await createResponse.json()
if (createData.success) {
  return createData.customer.id
} else {
  // Error al crear cliente (puede ser duplicado)
  throw new Error(createData.error || 'Error al crear el cliente')
}
```

**Actualización en completeSale (líneas 776-780):**

```typescript
} catch (error) {
  console.error('Error completing sale:', error)
  const errorMessage = error instanceof Error ? error.message : 'Error al completar la venta'
  toast.error(errorMessage)
}
```

**También actualizado en handleCreateNewCustomer (líneas 646-648):**

```typescript
} else {
  toast.error('Error al crear cliente: ' + (data.error || 'Error desconocido'))
}
```

---

## 📱 Flujos de Usuario

### Flujo 1: Crear Cliente desde Módulo de Clientes

**Escenario de Duplicado:**

```
1. Usuario navega a "Clientes"
2. Click en "Nuevo Cliente"
3. Ingresa datos:
   - Nombre: "Juan Pérez"
   - Documento: "1234567890"
   - Teléfono: "3001234567"
4. Click en "Guardar"

→ Sistema valida en backend
→ Encuentra cliente existente con documento "1234567890"
→ Retorna error: "Ya existe un cliente con el documento 1234567890. Cliente: María López"

5. Toast rojo aparece con el mensaje de error
6. Diálogo permanece abierto
7. Usuario puede corregir el documento
```

**Escenario Exitoso:**

```
1-3. Mismos pasos
4. Ingresa documento único: "9876543210"
5. Click en "Guardar"

→ Sistema valida en backend
→ No encuentra duplicados
→ Crea el cliente

6. Toast verde: "Cliente creado exitosamente"
7. Diálogo se cierra
8. Lista de clientes se actualiza
```

---

### Flujo 2: Crear Orden de Reparación con Cliente Nuevo

**Escenario de Duplicado:**

```
1. Usuario navega a "Reparaciones"
2. Click en "Nueva Orden"
3. Selecciona "Crear Nuevo" en cliente
4. Ingresa datos del cliente:
   - Nombre: "Pedro García"
   - Documento: "1234567890" (ya existe)
   - Teléfono: "3009876543"
5. Completa datos del equipo
6. Click en "Crear Orden"

→ Sistema intenta crear/encontrar cliente
→ Detecta documento duplicado
→ Backend retorna error

7. Toast rojo: "Ya existe un cliente con el documento 1234567890. Cliente: María López"
8. Orden NO se crea
9. Diálogo permanece abierto
10. Usuario puede:
    - Buscar el cliente existente y seleccionarlo
    - O cambiar el documento si es un error
```

**Escenario con Cliente Existente:**

```
1-2. Mismos pasos
3. Selecciona "Seleccionar Existente"
4. Busca y selecciona cliente existente
5. Completa datos del equipo
6. Click en "Crear Orden"

→ Sistema usa el ID del cliente existente
→ No hay validación de duplicados (ya existe)
→ Crea la orden exitosamente

7. Toast verde: "✅ Orden de reparación creada exitosamente"
8. Orden aparece en la lista
```

---

### Flujo 3: Registrar Venta con Cliente Nuevo

**Escenario de Duplicado:**

```
1. Usuario navega a "Ventas"
2. Agrega productos al carrito
3. Ingresa datos del cliente:
   - Nombre: "Ana Rodríguez"
   - Teléfono: "3001234567" (ya existe)
4. Click en "Completar Venta"

→ Sistema intenta crear/encontrar cliente
→ Detecta teléfono duplicado
→ Backend retorna error

5. Toast rojo: "Ya existe un cliente con el teléfono 3001234567. Cliente: Carlos Martínez"
6. Venta NO se registra
7. Carrito permanece intacto
8. Usuario puede corregir el teléfono
```

---

## 🎨 Mensajes de Error

### Formato de Mensajes

**Por Documento Duplicado:**
```
Ya existe un cliente con el documento [DOCUMENTO]. Cliente: [NOMBRE_EXISTENTE]
```

**Por Teléfono Duplicado:**
```
Ya existe un cliente con el teléfono [TELEFONO]. Cliente: [NOMBRE_EXISTENTE]
```

### Ejemplos Reales

```
❌ "Ya existe un cliente con el documento 1234567890. Cliente: María López"
❌ "Ya existe un cliente con el teléfono 3001234567. Cliente: Juan Pérez"
✅ "Cliente creado exitosamente"
✅ "Cliente actualizado exitosamente"
✅ "✅ Orden de reparación creada exitosamente"
```

---

## 🔐 Seguridad y Alcance

### Validación por Empresa (Company)

La validación es **por empresa** (multi-tenant):

```typescript
.filter((c: any) => c.companyId === userProfile.companyId)
```

**Esto significa:**
- ✅ Empresa A puede tener un cliente con documento "1234567890"
- ✅ Empresa B puede tener un cliente con documento "1234567890"
- ❌ Empresa A NO puede tener DOS clientes con documento "1234567890"

### Casos Opcionales

La validación solo se aplica si el campo está presente:

```typescript
if (body.documentNumber && body.documentNumber.trim()) {
  // Validar documento
}

if (body.phone && body.phone.trim()) {
  // Validar teléfono
}
```

**Comportamiento:**
- Si NO se proporciona documento → No se valida documento
- Si NO se proporciona teléfono → No se valida teléfono
- Mínimo uno debe estar presente para crear el cliente

---

## 🧪 Casos de Prueba

### Test 1: Documento Duplicado Exacto

**Setup:**
```
Cliente existente:
- Nombre: "María López"
- Documento: "1234567890"
- Teléfono: "3001111111"
```

**Test:**
```
Crear cliente nuevo:
- Nombre: "Juan Pérez"
- Documento: "1234567890"
- Teléfono: "3002222222"

Resultado: ❌ RECHAZADO
Error: "Ya existe un cliente con el documento 1234567890. Cliente: María López"
```

---

### Test 2: Documento con Espacios

**Setup:**
```
Cliente existente:
- Documento: "1234567890"
```

**Test:**
```
Crear cliente nuevo:
- Documento: " 1234567890 " (con espacios)

Resultado: ❌ RECHAZADO (se eliminan espacios antes de comparar)
```

---

### Test 3: Documento Case-Insensitive

**Setup:**
```
Cliente existente:
- Documento: "abc123xyz"
```

**Test:**
```
Crear cliente nuevo:
- Documento: "ABC123XYZ"

Resultado: ❌ RECHAZADO (no distingue mayúsculas/minúsculas)
```

---

### Test 4: Teléfono Duplicado

**Setup:**
```
Cliente existente:
- Nombre: "Carlos Martínez"
- Teléfono: "3001234567"
```

**Test:**
```
Crear cliente nuevo:
- Nombre: "Ana Rodríguez"
- Teléfono: "3001234567"

Resultado: ❌ RECHAZADO
Error: "Ya existe un cliente con el teléfono 3001234567. Cliente: Carlos Martínez"
```

---

### Test 5: Edición Sin Cambiar Datos

**Setup:**
```
Cliente ID 5:
- Nombre: "Pedro García"
- Documento: "9999999999"
- Teléfono: "3009999999"
```

**Test:**
```
Editar cliente ID 5:
- Cambiar nombre a "Pedro J. García"
- Mantener documento: "9999999999"
- Mantener teléfono: "3009999999"

Resultado: ✅ PERMITIDO (es el mismo cliente)
```

---

### Test 6: Edición con Documento de Otro Cliente

**Setup:**
```
Cliente ID 5:
- Documento: "1111111111"

Cliente ID 8:
- Documento: "2222222222"
```

**Test:**
```
Editar cliente ID 5:
- Cambiar documento a "2222222222"

Resultado: ❌ RECHAZADO
Error: "Ya existe un cliente con el documento 2222222222. Cliente: [Nombre del cliente 8]"
```

---

### Test 7: Campos Vacíos/Opcionales

**Test:**
```
Crear cliente nuevo:
- Nombre: "Laura Sánchez"
- Documento: "" (vacío)
- Teléfono: "3007777777" (único)

Resultado: ✅ PERMITIDO
- No valida documento porque está vacío
- Solo valida teléfono
```

---

### Test 8: Cliente Existente en Reparaciones

**Setup:**
```
Cliente existente:
- ID: 10
- Nombre: "Jorge Ramírez"
- Teléfono: "3008888888"
```

**Test:**
```
Crear orden de reparación:
- Modo: "Seleccionar Existente"
- Selecciona cliente ID 10
- Completa datos del equipo

Resultado: ✅ PERMITIDO
- Usa cliente existente
- No intenta crear nuevo cliente
- No hay validación de duplicados
```

---

## ✅ Checklist de Implementación

### Backend
- [x] Validación de documento duplicado en POST /customers
- [x] Validación de teléfono duplicado en POST /customers
- [x] Validación de documento duplicado en PUT /customers/:id
- [x] Validación de teléfono duplicado en PUT /customers/:id
- [x] Excluir cliente actual al editar
- [x] Mensajes de error descriptivos
- [x] Validación por empresa (multi-tenant)

### Frontend - Módulo de Clientes
- [x] Manejo de errores con toast
- [x] Mostrar mensaje de error al usuario
- [x] Mantener diálogo abierto en caso de error
- [x] Mensaje de éxito al crear/actualizar

### Frontend - Módulo de Reparaciones
- [x] Propagar error desde useCustomers hook
- [x] Capturar error en handleSubmitNewRepair
- [x] Mostrar error con toast
- [x] Mantener diálogo abierto en caso de error

### Frontend - Módulo de Ventas
- [x] Propagar error desde findOrCreateCustomer
- [x] Capturar error en completeSale
- [x] Mostrar error con toast
- [x] Mantener carrito intacto en caso de error
- [x] Error en handleCreateNewCustomer

---

## 📊 Resumen Ejecutivo

```
✅ VALIDACIÓN DE DUPLICADOS IMPLEMENTADA
✅ FUNCIONA EN 3 MÓDULOS (Clientes, Reparaciones, Ventas)
✅ VALIDA DOCUMENTO Y TELÉFONO
✅ MENSAJES CLAROS Y DESCRIPTIVOS
✅ MULTI-TENANT (Por empresa)
✅ CASE-INSENSITIVE EN DOCUMENTOS
✅ PERMITE EDICIÓN SIN CONFLICTO
```

**Campos Validados:**
- 📄 Número de Documento (documentNumber/identificationNumber)
- 📱 Número de Teléfono (phone)

**Módulos Protegidos:**
- 👥 Clientes (crear y editar)
- 🔧 Reparaciones (creación automática)
- 💰 Ventas (creación automática)

**Estado:** ✅ SISTEMA COMPLETAMENTE FUNCIONAL Y PROBADO

---

**Responsable:** Sistema Figma Make AI  
**Fecha de Implementación:** 5 de Noviembre, 2025  
**Versión:** 2.3 - Validación de Clientes Duplicados  
**Estado:** ✅ IMPLEMENTADO Y DOCUMENTADO
