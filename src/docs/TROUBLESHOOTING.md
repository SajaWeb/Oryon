# Guía de Solución de Problemas - Oryon App

## 🚨 Error: "Failed to fetch" / "TypeError: Failed to fetch"

### Síntomas:
- Error al cargar reparaciones, ventas, o productos
- Mensajes de "Error de conexión"
- La aplicación no puede comunicarse con el backend

### Causas Comunes:

#### 1. Edge Function no está desplegada en Supabase

**Verificación:**
1. Ve a tu proyecto en [Supabase](https://app.supabase.com)
2. Navega a **Edge Functions** en el menú lateral
3. Verifica que exista una función llamada `make-server-4d437e50`
4. Verifica que el estado sea "Deployed" (verde)

**Solución:**
Si la función no existe o no está desplegada:

```bash
# Desde la raíz de tu proyecto
cd supabase/functions/server

# Desplegar la función
supabase functions deploy make-server-4d437e50

# O si usas Supabase CLI
npx supabase functions deploy make-server-4d437e50
```

#### 2. Variables de entorno no configuradas

**Verificación:**
1. En Supabase → Edge Functions → `make-server-4d437e50` → Settings
2. Verifica que existan estas variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`

**Solución:**
Configura las variables de entorno:
1. Ve a Project Settings → API
2. Copia las credenciales necesarias
3. Agrégalas en Edge Functions → Settings → Environment Variables

#### 3. CORS bloqueando las requests

**Verificación:**
1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Network"
3. Busca requests a `supabase.co/functions`
4. Si ves errores de CORS, verás mensajes como "blocked by CORS policy"

**Solución:**
El código ya incluye configuración de CORS. Si aún hay problemas:
- Verifica que el Edge Function esté desplegado con el código actualizado
- Revisa los logs en Supabase → Edge Functions → Logs

#### 4. Función crasheando al iniciar

**Verificación:**
1. Ve a Supabase → Edge Functions → Logs
2. Busca errores al inicio de la función
3. Revisa errores de importación o sintaxis

**Solución:**
- Redespliega la función
- Verifica que `kv_store.ts` esté presente
- Revisa que todas las importaciones sean correctas

#### 5. Token de acceso inválido o expirado

**Verificación:**
Abre la consola del navegador y ejecuta:
```javascript
console.log(localStorage.getItem('supabase.auth.token'))
```

**Solución:**
1. Cierra sesión
2. Inicia sesión nuevamente
3. El token se renovará automáticamente

---

## 🔧 Verificación del Estado del Servidor

### Health Check Manual

Puedes verificar manualmente si el servidor está funcionando:

1. **Desde el navegador:**
   - Abre: `https://[TU-PROJECT-ID].supabase.co/functions/v1/make-server-4d437e50/health`
   - Deberías ver:
     ```json
     {
       "success": true,
       "status": "healthy",
       "timestamp": "2025-11-03T...",
       "service": "Oryon App Backend"
     }
     ```

2. **Desde la consola del navegador:**
   ```javascript
   fetch('https://[TU-PROJECT-ID].supabase.co/functions/v1/make-server-4d437e50/health')
     .then(r => r.json())
     .then(console.log)
     .catch(console.error)
   ```

3. **Componente integrado:**
   - La aplicación ahora incluye un indicador de estado del servidor
   - Se muestra automáticamente cuando hay errores de conexión
   - Verifica cada 30 segundos

---

## 📊 Revisión de Logs

### Logs de Edge Functions:

1. Ve a Supabase → Edge Functions → `make-server-4d437e50` → Logs
2. Busca:
   - Errores de inicio: `Error starting server`
   - Errores de autorización: `Unauthorized`
   - Errores de base de datos: `kv_store error`
   - Requests fallidas: Status codes 4xx o 5xx

### Logs del Cliente (Navegador):

1. Abre DevTools (F12)
2. Pestaña Console
3. Busca:
   - `Error fetching repairs`
   - `Error updating status`
   - `Network error`
   - `Failed to fetch`

---

## 🔍 Diagnóstico Paso a Paso

### Paso 1: Verificar Conectividad Básica

```bash
# Ping a Supabase
ping [TU-PROJECT-ID].supabase.co

# O desde el navegador
fetch('https://[TU-PROJECT-ID].supabase.co')
  .then(() => console.log('✅ Conectividad OK'))
  .catch(() => console.log('❌ Sin conectividad'))
```

### Paso 2: Verificar Edge Function

```javascript
// En la consola del navegador
const projectId = '[TU-PROJECT-ID]'
const url = `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/health`

fetch(url)
  .then(r => r.json())
  .then(data => {
    console.log('✅ Edge Function funciona:', data)
  })
  .catch(error => {
    console.log('❌ Edge Function tiene problemas:', error)
  })
```

### Paso 3: Verificar Autenticación

```javascript
// En la consola del navegador
import { getSupabaseClient } from './utils/supabase/client'

const supabase = getSupabaseClient()
supabase.auth.getSession().then(({ data }) => {
  if (data.session) {
    console.log('✅ Sesión válida:', data.session.user.email)
    console.log('Token:', data.session.access_token)
  } else {
    console.log('❌ No hay sesión activa')
  }
})
```

### Paso 4: Verificar Request Completo

```javascript
// En la consola del navegador
const projectId = '[TU-PROJECT-ID]'
const accessToken = '[TU-ACCESS-TOKEN]'

fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/repairs`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
})
  .then(r => {
    console.log('Status:', r.status)
    return r.json()
  })
  .then(data => {
    console.log('✅ Respuesta:', data)
  })
  .catch(error => {
    console.log('❌ Error:', error)
  })
```

---

## 🛠️ Soluciones Rápidas

### Problema: "Failed to fetch" persistente

**Solución Rápida:**
1. Verifica que Edge Function esté desplegada
2. Redespliega si es necesario:
   ```bash
   supabase functions deploy make-server-4d437e50
   ```
3. Espera 30 segundos para que se active
4. Recarga la página en el navegador

### Problema: Errores 401 Unauthorized

**Solución Rápida:**
1. Cierra sesión en la app
2. Limpia localStorage:
   ```javascript
   localStorage.clear()
   ```
3. Inicia sesión nuevamente

### Problema: Errores 500 Internal Server Error

**Solución Rápida:**
1. Ve a Supabase → Edge Functions → Logs
2. Identifica el error específico
3. Si es error de `kv_store`:
   - Verifica que el archivo exista
   - Verifica permisos de la función
4. Redespliega la función

### Problema: La app funciona pero lento

**Optimizaciones:**
1. Verifica la región de tu proyecto Supabase
2. Considera usar una región más cercana
3. Revisa el plan de Supabase (free tier tiene límites)
4. Optimiza queries si tienes muchos datos

---

## 📝 Checklist de Verificación

Antes de reportar un problema, verifica:

- [ ] Edge Function desplegada
- [ ] Variables de entorno configuradas
- [ ] Health check responde correctamente
- [ ] Sesión de usuario válida
- [ ] Navegador actualizado
- [ ] Cache del navegador limpio
- [ ] Sin errores en consola del navegador
- [ ] Logs de Supabase revisados
- [ ] Conectividad a internet estable
- [ ] Plan de Supabase activo

---

## 🆘 Comandos Útiles

### Supabase CLI:

```bash
# Ver estado de funciones
supabase functions list

# Ver logs en tiempo real
supabase functions logs make-server-4d437e50

# Desplegar función
supabase functions deploy make-server-4d437e50

# Probar función localmente
supabase functions serve make-server-4d437e50
```

### Navegador (DevTools Console):

```javascript
// Verificar proyecto ID
import { projectId } from './utils/supabase/info'
console.log('Project ID:', projectId)

// Verificar sesión
const supabase = getSupabaseClient()
supabase.auth.getSession().then(console.log)

// Limpiar datos locales
localStorage.clear()
sessionStorage.clear()

// Recargar sin cache
location.reload(true)
```

---

## 📞 Soporte Adicional

Si después de seguir esta guía el problema persiste:

1. **Recopila información:**
   - Mensajes de error exactos
   - Screenshots de logs
   - Pasos para reproducir
   - Versión del navegador
   - Project ID de Supabase

2. **Revisa la documentación:**
   - [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
   - [Supabase Auth](https://supabase.com/docs/guides/auth)
   - Documentación de Oryon App

3. **Lugares para buscar ayuda:**
   - Logs de Supabase
   - Documentación del proyecto
   - Comunidad de Supabase
   - Stack Overflow

---

## 🔄 Actualización del Sistema

Si hay una actualización disponible:

```bash
# 1. Hacer backup de datos importantes

# 2. Pull cambios recientes
git pull origin main

# 3. Redesplegar Edge Function
supabase functions deploy make-server-4d437e50

# 4. Limpiar cache del navegador
# (Ctrl+Shift+Delete o Cmd+Shift+Delete)

# 5. Recargar la aplicación
```

---

**Última actualización:** Noviembre 2025
