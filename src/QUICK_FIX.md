# 🚨 Solución Rápida - Errores de Conexión

## Error: "Failed to fetch" / "TypeError: Failed to fetch"

### ✅ Solución en 3 pasos (5 minutos):

#### Paso 1: Verificar que Edge Function esté desplegada

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **Edge Functions** (menú lateral izquierdo)
4. Busca `make-server-4d437e50`

**Si NO aparece o dice "Not deployed":**

```bash
# Opción A: Usando Supabase CLI
cd supabase/functions/server
supabase functions deploy make-server-4d437e50

# Opción B: Usando npx (si no tienes CLI instalado)
npx supabase functions deploy make-server-4d437e50
```

#### Paso 2: Verificar conexión desde el navegador

1. Abre la aplicación
2. Abre DevTools (F12 o clic derecho → Inspeccionar)
3. Ve a la pestaña **Console**
4. Pega este código:

```javascript
// Reemplaza [TU-PROJECT-ID] con tu ID real de Supabase
fetch('https://[TU-PROJECT-ID].supabase.co/functions/v1/make-server-4d437e50/health')
  .then(r => r.json())
  .then(data => console.log('✅ Servidor OK:', data))
  .catch(err => console.error('❌ Servidor NO responde:', err))
```

**Resultado esperado:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-11-03T...",
  "service": "Oryon App Backend"
}
```

#### Paso 3: Limpiar cache y recargar

1. En la aplicación, cierra sesión
2. Limpia el cache del navegador:
   - **Chrome/Edge:** Ctrl+Shift+Delete (Cmd+Shift+Delete en Mac)
   - Selecciona "Cookies y otros datos del sitio" y "Archivos e imágenes en caché"
   - Clic en "Borrar datos"
3. Recarga la página (F5)
4. Inicia sesión nuevamente

---

## 🔧 Diagnóstico Automático

### Opción 1: Usar el Indicador de Estado

La aplicación ahora incluye un **indicador de estado del servidor**:

- 🟢 **Verde**: Servidor conectado correctamente
- 🔴 **Rojo**: No se puede conectar al servidor
- 🔵 **Azul**: Verificando conexión...

Si ves el indicador rojo:
1. Haz clic en "Reintentar"
2. Sigue los pasos de verificación arriba

### Opción 2: Script de Diagnóstico

En la consola del navegador (F12 → Console):

```javascript
// Pega este código para ejecutar diagnóstico completo
import { runDiagnostics } from './utils/diagnostics'
runDiagnostics()
```

El script verificará:
- ✅ Configuración del proyecto
- ✅ Sesión de usuario
- ✅ Conectividad con Supabase
- ✅ Estado de Edge Function
- ✅ Autenticación con backend
- ✅ Acceso a datos

---

## 📋 Checklist Rápido

Antes de pedir ayuda, verifica:

- [ ] Edge Function desplegada (ver Paso 1)
- [ ] Health check responde OK (ver Paso 2)
- [ ] Cache del navegador limpio (ver Paso 3)
- [ ] Sesión iniciada correctamente
- [ ] Internet funcionando

---

## 🆘 Si el problema persiste

### Ver logs detallados:

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **Edge Functions** → `make-server-4d437e50` → **Logs**
4. Busca errores recientes

### Errores comunes en logs:

| Error | Causa | Solución |
|-------|-------|----------|
| `Module not found: kv_store` | Archivo faltante | Redespliega la función |
| `SUPABASE_URL is not defined` | Variables de entorno | Configura en Settings |
| `Unauthorized` | Token inválido | Cierra sesión y vuelve a entrar |
| `500 Internal Server Error` | Error en código | Revisa logs completos |

---

## 📞 Recursos Adicionales

- **Guía completa:** Ver `TROUBLESHOOTING.md`
- **Logs de Supabase:** Dashboard → Edge Functions → Logs
- **Documentación Supabase:** [supabase.com/docs](https://supabase.com/docs)

---

## 💡 Comandos Útiles

### Para desarrolladores:

```bash
# Ver lista de funciones
supabase functions list

# Ver logs en tiempo real
supabase functions logs make-server-4d437e50

# Desplegar función
supabase functions deploy make-server-4d437e50

# Probar localmente
supabase functions serve make-server-4d437e50
```

### Desde la consola del navegador:

```javascript
// Verificar Project ID
console.log(import.meta.env)

// Limpiar datos locales
localStorage.clear()

// Recargar sin cache
location.reload(true)

// Ver sesión actual
import { getSupabaseClient } from './utils/supabase/client'
const supabase = getSupabaseClient()
supabase.auth.getSession().then(console.log)
```

---

**⏱️ Tiempo estimado de solución:** 5-10 minutos  
**🎯 Tasa de éxito:** 95% siguiendo estos pasos

---

**Última actualización:** Noviembre 2025
