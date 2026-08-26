# 🚀 Guía de Deployment - Oryon App

## Después de las correcciones de "Failed to fetch"

---

## ⚡ Deployment Rápido (5 minutos)

### Prerequisitos:
- Tener Supabase CLI instalado
- Estar logueado en Supabase CLI
- Tener un proyecto de Supabase activo

### Paso 1: Desplegar Edge Function

```bash
# Navegar al directorio de funciones
cd supabase/functions/server

# Desplegar la función
supabase functions deploy make-server-4d437e50

# Esperar confirmación
# ✅ Deployed Function make-server-4d437e50 version xxx
```

### Paso 2: Verificar Deployment

```bash
# Opción A: Desde la terminal
curl https://[TU-PROJECT-ID].supabase.co/functions/v1/make-server-4d437e50/health

# Opción B: Desde el navegador
# Abrir: https://[TU-PROJECT-ID].supabase.co/functions/v1/make-server-4d437e50/health
```

**Respuesta esperada:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-11-03T12:34:56.789Z",
  "service": "Oryon App Backend"
}
```

### Paso 3: Probar la Aplicación

1. Abre la aplicación en el navegador
2. Limpia el cache (Ctrl+Shift+Delete)
3. Recarga la página (F5)
4. Inicia sesión
5. Verifica que el indicador de estado del servidor esté verde ✅
6. Prueba operaciones CRUD (crear, leer, actualizar)

---

## 📋 Checklist de Deployment

Antes de desplegar:

- [ ] Código committed en git
- [ ] Variables de entorno configuradas en Supabase
- [ ] Backup de datos importantes realizado
- [ ] Usuarios notificados sobre mantenimiento (si aplica)

Durante el deployment:

- [ ] Edge Function desplegada exitosamente
- [ ] Health check responde correctamente
- [ ] Logs no muestran errores
- [ ] Variables de entorno accesibles

Después del deployment:

- [ ] Aplicación carga correctamente
- [ ] Indicador de servidor está verde
- [ ] Operaciones CRUD funcionan
- [ ] No hay errores en consola del navegador
- [ ] Usuarios pueden iniciar sesión

---

## 🔧 Configuración de Variables de Entorno

### Verificar Variables Existentes:

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **Settings** → **Edge Functions**
4. Revisa las variables de entorno

### Variables Requeridas:

```bash
SUPABASE_URL=https://[TU-PROJECT-ID].supabase.co
SUPABASE_ANON_KEY=[TU-ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[TU-SERVICE-ROLE-KEY]
```

### Cómo obtenerlas:

1. **SUPABASE_URL:**
   - Settings → API → Project URL

2. **SUPABASE_ANON_KEY:**
   - Settings → API → Project API keys → anon/public

3. **SUPABASE_SERVICE_ROLE_KEY:**
   - Settings → API → Project API keys → service_role
   - ⚠️ **NUNCA** expongas esta key en el frontend

### Configurar en Edge Functions:

```bash
# Opción A: Desde la CLI
supabase secrets set SUPABASE_URL=https://xxx.supabase.co
supabase secrets set SUPABASE_ANON_KEY=eyJxxx...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Opción B: Desde el Dashboard
# Settings → Edge Functions → Secrets → Add secret
```

---

## 🔍 Troubleshooting de Deployment

### Error: "Function not found"

**Causa:** La función no se desplegó correctamente

**Solución:**
```bash
# Verificar que existe
supabase functions list

# Si no aparece, redesplegar
supabase functions deploy make-server-4d437e50
```

### Error: "SUPABASE_URL is not defined"

**Causa:** Variables de entorno no configuradas

**Solución:**
```bash
# Configurar todas las variables requeridas
supabase secrets set SUPABASE_URL=https://xxx.supabase.co
supabase secrets set SUPABASE_ANON_KEY=eyJxxx...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
```

### Error: "Module not found: kv_store"

**Causa:** El archivo `kv_store.ts` no se incluyó en el deployment

**Solución:**
```bash
# Verificar que el archivo existe
ls supabase/functions/make-server-4d437e50/kv_store.ts

# Si existe, redesplegar
supabase functions deploy make-server-4d437e50
```

### Error 500 en Health Check

**Causa:** Error de sintaxis o imports en el código

**Solución:**
1. Ve a Supabase Dashboard → Edge Functions → Logs
2. Identifica el error específico
3. Corrige el código
4. Redespliega

---

## 📊 Monitoreo Post-Deployment

### Logs en Tiempo Real:

```bash
# Desde la terminal
supabase functions logs make-server-4d437e50 --tail

# O desde el Dashboard
# Edge Functions → make-server-4d437e50 → Logs
```

### Métricas a Monitorear:

1. **Request Success Rate:**
   - Dashboard → Edge Functions → Analytics
   - Debe estar > 95%

2. **Response Time:**
   - Debe estar < 500ms para la mayoría de requests

3. **Error Rate:**
   - Debe estar < 5%

4. **Resource Usage:**
   - CPU: < 80%
   - Memory: < 80%

---

## 🔄 Rollback (En caso de problemas)

### Si necesitas volver a la versión anterior:

```bash
# 1. Ver versiones anteriores
supabase functions list-versions make-server-4d437e50

# 2. Seleccionar versión anterior
# Desde el Dashboard:
# Edge Functions → make-server-4d437e50 → Versions → Activate version

# 3. Verificar que funcione
curl https://[TU-PROJECT-ID].supabase.co/functions/v1/make-server-4d437e50/health
```

---

## 🧪 Testing Post-Deployment

### Test 1: Health Check

```bash
curl https://[TU-PROJECT-ID].supabase.co/functions/v1/make-server-4d437e50/health
```

**Respuesta esperada:** `{"success": true, "status": "healthy", ...}`

### Test 2: Autenticación

```javascript
// En consola del navegador
const token = '[TU-ACCESS-TOKEN]'
fetch('https://[TU-PROJECT-ID].supabase.co/functions/v1/make-server-4d437e50/auth/session', {
  headers: { 'Authorization': `Bearer ${token}` }
})
  .then(r => r.json())
  .then(console.log)
```

**Respuesta esperada:** `{"success": true, "authenticated": true, ...}`

### Test 3: Datos (Repairs)

```javascript
// En consola del navegador
const token = '[TU-ACCESS-TOKEN]'
fetch('https://[TU-PROJECT-ID].supabase.co/functions/v1/make-server-4d437e50/repairs', {
  headers: { 'Authorization': `Bearer ${token}` }
})
  .then(r => r.json())
  .then(data => console.log('Repairs:', data.repairs?.length || 0))
```

**Respuesta esperada:** `{"success": true, "repairs": [...]}`

### Test 4: Diagnóstico Completo

```javascript
// En consola del navegador
import { runDiagnostics } from './utils/diagnostics'
runDiagnostics()
```

**Resultado esperado:** 7/7 checks pasados ✅

---

## 📝 Notas Importantes

### ⚠️ Consideraciones de Seguridad:

1. **NUNCA expongas `SUPABASE_SERVICE_ROLE_KEY` en el frontend**
2. Usa siempre HTTPS (Supabase lo hace por defecto)
3. Valida tokens en cada request del backend
4. Implementa rate limiting si esperas mucho tráfico

### 💡 Mejores Prácticas:

1. **Versionado:**
   - Mantén un historial de versiones de la Edge Function
   - Documenta cambios en cada deployment

2. **Monitoreo:**
   - Revisa logs regularmente
   - Configura alertas para errores críticos

3. **Backups:**
   - Haz backup de datos antes de cambios mayores
   - Mantén copias de configuraciones importantes

4. **Testing:**
   - Prueba en local antes de desplegar a producción
   - Mantén un ambiente de staging si es posible

---

## 🎯 Deployment Automation (Opcional)

### GitHub Actions

Crea `.github/workflows/deploy.yml`:

```yaml
name: Deploy Edge Function

on:
  push:
    branches: [main]
    paths:
      - 'supabase/functions/server/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: supabase/setup-cli@v1
        with:
          version: latest
          
      - name: Deploy Function
        run: |
          cd supabase/functions/server
          supabase functions deploy make-server-4d437e50 \
            --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

---

## 📞 Soporte Post-Deployment

### Si encuentras problemas:

1. **Primero:** Revisa los logs
   ```bash
   supabase functions logs make-server-4d437e50
   ```

2. **Segundo:** Ejecuta diagnóstico
   ```javascript
   runDiagnostics()
   ```

3. **Tercero:** Consulta documentación
   - `TROUBLESHOOTING.md`
   - `QUICK_FIX.md`
   - `FIXES_SUMMARY.md`

4. **Último recurso:** Rollback a versión anterior

---

## ✅ Checklist Final

Después de deployment exitoso:

- [ ] Health check responde ✅
- [ ] Aplicación carga correctamente
- [ ] Login funciona
- [ ] CRUD operations funcionan
- [ ] No hay errores en logs
- [ ] Indicador de servidor está verde
- [ ] Performance es aceptable (< 500ms)
- [ ] Usuarios pueden trabajar normalmente
- [ ] Documentación actualizada
- [ ] Equipo notificado sobre deployment

---

## 🎉 ¡Deployment Exitoso!

Si todo está ✅, tu aplicación Oryon App ahora tiene:

- ✅ Manejo de errores mejorado
- ✅ CORS configurado correctamente
- ✅ Health check endpoint
- ✅ Mejor logging y debugging
- ✅ Indicador de estado del servidor
- ✅ Herramientas de diagnóstico
- ✅ Documentación completa

**Próximos pasos:**
- Monitorear logs durante las próximas 24h
- Recopilar feedback de usuarios
- Planear próximas mejoras

---

**Fecha:** Noviembre 2025  
**Versión:** 2.0 (Mejoras de Estabilidad)  
**Estado:** 🚀 Listo para producción
