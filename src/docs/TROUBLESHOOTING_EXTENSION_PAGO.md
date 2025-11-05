# Troubleshooting: Error al Comprar Extensión de Licencia

## 🐛 Problema Reportado

"Al comprar la extensión de licencia me sale error en el proceso de pago"

## 🔍 Diagnóstico

Se han agregado **logs detallados** en el componente `ExtendLicenseSection.tsx` para diagnosticar el problema.

### Logs Agregados:

#### Al Inicio del Proceso:
```
🚀 Iniciando proceso de extensión de licencia
📊 Configuración: { selectedCountry, selectedOption, pricing, ... }
```

#### Durante Pago PSE (Colombia):
```
🔵 Iniciando pago PSE con datos: { planId, months, amount, discount }
🔵 Respuesta PSE status: 200
🔵 Datos PSE recibidos: { success: true, ... }
```

#### Durante Extensión de Licencia:
```
🟢 Extendiendo licencia por X meses
🟢 Respuesta extend status: 200
🟢 Datos extend recibidos: { success: true, ... }
```

#### Durante Pago Paddle (Internacional):
```
🔵 Iniciando pago Paddle con datos: { planId, months, amount, discount }
🔵 Respuesta Paddle status: 200
🔵 Datos Paddle recibidos: { success: true, ... }
```

#### Si Hay Errores:
```
❌ Error en respuesta PSE: [detalles]
❌ Error en extend response: [detalles]
❌ Error extending license: [detalles]
```

## 🛠️ Pasos para Diagnosticar

### Paso 1: Abrir la Consola del Navegador

1. Presiona `F12` o `Ctrl+Shift+I` (Windows/Linux)
2. Presiona `Cmd+Option+I` (Mac)
3. Ve a la pestaña **Console**

### Paso 2: Intentar la Compra

1. Ve a "Licencia" → "Extender Licencia"
2. Selecciona una duración (ej: 6 meses)
3. Selecciona el país (Colombia o Internacional)
4. Haz clic en "Comprar extensión"

### Paso 3: Revisar los Logs

Busca en la consola los emojis de colores:

- 🚀 = Inicio del proceso
- 📊 = Configuración
- 🔵 = Proceso de pago (PSE/Paddle)
- 🟢 = Extensión de licencia
- ❌ = Errores

### Paso 4: Identificar el Error

#### Error Tipo 1: "accessToken: Ausente"

**Síntoma:**
```
📊 Configuración: { ..., accessToken: 'Ausente' }
```

**Causa:** El token de autenticación no está presente.

**Solución:**
1. Cierra sesión
2. Vuelve a iniciar sesión
3. Intenta de nuevo

---

#### Error Tipo 2: "projectId is undefined"

**Síntoma:**
```
❌ Error: projectId is undefined
```

**Causa:** Variable de entorno no configurada.

**Solución:**
1. Verifica que `/utils/supabase/info.tsx` exporta `projectId`
2. Recarga la página
3. Limpia caché del navegador

---

#### Error Tipo 3: Status 401 (Unauthorized)

**Síntoma:**
```
🔵 Respuesta PSE status: 401
❌ Error en servidor: 401
```

**Causa:** Token expirado o inválido.

**Solución:**
1. Cierra sesión
2. Vuelve a iniciar sesión
3. No cierres la pestaña mientras usas la app

---

#### Error Tipo 4: Status 403 (Forbidden)

**Síntoma:**
```
🔵 Respuesta PSE status: 403
❌ Solo administradores pueden extender la licencia
```

**Causa:** Usuario no es administrador.

**Solución:**
1. Verifica que tu usuario tenga rol "admin"
2. Solo administradores pueden comprar extensiones
3. Contacta al administrador principal

---

#### Error Tipo 5: Status 404 (Not Found)

**Síntoma:**
```
🟢 Respuesta extend status: 404
❌ Empresa no encontrada
```

**Causa:** La empresa no existe en la base de datos.

**Solución:**
1. Verifica que estés asociado a una empresa
2. Recarga los datos de licencia
3. Si persiste, reinicia la sesión

---

#### Error Tipo 6: Status 500 (Server Error)

**Síntoma:**
```
🔵 Respuesta PSE status: 500
❌ Error en servidor: 500
```

**Causa:** Error en el servidor backend.

**Solución:**
1. Espera 1 minuto e intenta de nuevo
2. Verifica que el servidor esté funcionando
3. Revisa logs del servidor

---

#### Error Tipo 7: Network Error

**Síntoma:**
```
❌ Error extending license: TypeError: Failed to fetch
```

**Causa:** Problema de conexión a internet o servidor caído.

**Solución:**
1. Verifica tu conexión a internet
2. Recarga la página
3. Verifica que el servidor de Supabase esté activo

---

#### Error Tipo 8: CORS Error

**Síntoma:**
```
❌ Access to fetch has been blocked by CORS policy
```

**Causa:** Configuración CORS incorrecta.

**Solución:**
1. Verifica que el servidor tenga CORS habilitado
2. En desarrollo, esto no debería pasar
3. Contacta al equipo de backend

---

## 🔧 Soluciones Rápidas

### Solución Universal 1: Recargar Datos de Licencia

1. Ve a la sección "Licencia"
2. Haz clic en el botón "Recargar Datos de Licencia"
3. Espera que se actualice
4. Intenta de nuevo

### Solución Universal 2: Reiniciar Sesión

```
1. Haz clic en tu perfil (arriba a la derecha)
2. "Cerrar sesión"
3. Vuelve a iniciar sesión
4. Ve a "Licencia" → "Extender Licencia"
5. Intenta de nuevo
```

### Solución Universal 3: Limpiar Caché

```
Chrome/Edge:
1. Presiona Ctrl+Shift+Delete
2. Selecciona "Imágenes y archivos en caché"
3. Haz clic en "Borrar datos"
4. Recarga la página (F5)

Firefox:
1. Presiona Ctrl+Shift+Delete
2. Marca "Caché"
3. Haz clic en "Limpiar ahora"
4. Recarga la página (F5)

Safari:
1. Safari → Preferencias → Avanzado
2. Marca "Mostrar menú Desarrollo"
3. Desarrollo → Vaciar cachés
4. Recarga la página (Cmd+R)
```

## 📋 Checklist de Verificación

Antes de reportar el error, verifica:

- [ ] ¿Estás iniciado sesión?
- [ ] ¿Eres administrador?
- [ ] ¿Tu licencia tiene una empresa asociada?
- [ ] ¿Tienes conexión a internet?
- [ ] ¿Has intentado recargar la página?
- [ ] ¿Has intentado cerrar y volver a iniciar sesión?
- [ ] ¿Has revisado la consola del navegador?
- [ ] ¿Has copiado el mensaje de error completo?

## 📊 Información a Incluir al Reportar

Si el problema persiste, incluye:

1. **Navegador y versión:**
   - Ejemplo: Chrome 119, Firefox 120, Safari 17

2. **Sistema operativo:**
   - Ejemplo: Windows 11, macOS 14, Ubuntu 22.04

3. **Rol del usuario:**
   - Administrador / Asesor / Técnico

4. **Logs de la consola:**
   - Copia todos los mensajes que empiecen con 🚀, 📊, 🔵, 🟢, ❌

5. **Pasos para reproducir:**
   - Qué hiciste exactamente antes del error

6. **Duración y país seleccionados:**
   - Ejemplo: 6 meses, Colombia

## 🎯 Validaciones del Servidor

El servidor valida:

### 1. Autenticación (401 si falla)
```tsx
const { error, user } = await verifyAuth(...)
if (error || !user) {
  return 401 Unauthorized
}
```

### 2. Rol de Administrador (403 si falla)
```tsx
if (userProfile.role !== 'admin') {
  return 403 Forbidden
}
```

### 3. Duración Válida (400 si falla)
```tsx
if (months < 1 || months > 12) {
  return 400 Bad Request
}
```

### 4. Empresa Existe (404 si falla)
```tsx
const company = await kv.get(`company:${companyId}`)
if (!company) {
  return 404 Not Found
}
```

## 🐛 Errores Conocidos y Soluciones

### Error: "pricing is null"

**Causa:** La opción de duración no se seleccionó correctamente.

**Solución:**
1. Haz clic en una de las opciones de duración (1, 3, 6, 12 meses)
2. Verifica que la tarjeta se ilumine (borde azul)
3. Verifica que aparezca el resumen de compra
4. Intenta de nuevo

### Error: "selectedOption is undefined"

**Causa:** Estado de React no se actualizó.

**Solución:**
1. Cambia de duración (ej: de 6 meses a 3 meses)
2. Vuelve a la duración deseada
3. Intenta de nuevo

### Error: "Cannot read property 'months' of undefined"

**Causa:** Estado inicializó incorrectamente.

**Solución:**
1. Recarga la página completa (F5)
2. Navega a Licencia → Extender Licencia
3. Intenta de nuevo

## 🔍 Debugging Avanzado

Si eres desarrollador, puedes:

### 1. Verificar Estado de React

En la consola del navegador:
```javascript
// Inspeccionar componente con React DevTools
// Buscar "ExtendLicenseSection"
// Verificar:
// - selectedDuration (debe ser número: 1, 3, 6, 12)
// - selectedCountry (debe ser 'colombia' o 'international')
// - loading (debe ser false antes de comprar)
```

### 2. Verificar Request

En la pestaña Network:
```
1. Abre DevTools → Network
2. Intenta la compra
3. Busca request a "/license/extend/pse" o "/license/extend/paddle"
4. Haz clic en el request
5. Verifica:
   - Headers → Authorization: Bearer [token]
   - Payload → { planId, months, amount, discount }
   - Response → { success: true/false, ... }
```

### 3. Verificar Response

```
1. Si status es 200 pero success es false:
   - Mira response.error para el mensaje
   
2. Si status no es 200:
   - Mira response body para detalles
   
3. Si no hay response:
   - Problema de red o CORS
```

## 📞 Contacto de Soporte

Si después de seguir todos los pasos el problema persiste:

1. **Prepara la información:**
   - Logs de la consola (completos)
   - Screenshot del error
   - Navegador y sistema operativo
   - Pasos para reproducir

2. **Envía reporte:**
   - Incluye toda la información anterior
   - Menciona que seguiste este documento
   - Indica qué soluciones intentaste

## ✅ Verificación Post-Solución

Después de solucionar el problema:

1. Intenta comprar extensión nuevamente
2. Verifica que veas el recibo de pago
3. Verifica que la nueva fecha de vencimiento sea correcta
4. Descarga el PDF del recibo
5. Confirma que los días restantes aumentaron

## 🎓 Prevención

Para evitar este error en el futuro:

1. **Mantén la sesión activa:**
   - No cierres la pestaña mientras trabajas
   - Si vas a estar ausente, guarda tu trabajo

2. **Usa un navegador actualizado:**
   - Chrome, Firefox, Edge, Safari (últimas versiones)

3. **Conexión estable:**
   - Evita comprar con internet inestable
   - Si usas WiFi pública, espera a tener red privada

4. **Rol correcto:**
   - Solo administradores pueden comprar
   - Verifica tu rol antes de intentar

---

**Última actualización:** Noviembre 2025  
**Versión del documento:** 1.0  
**Estado:** Activo
