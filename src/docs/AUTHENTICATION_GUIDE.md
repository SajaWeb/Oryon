# Guía de Autenticación - Oryon App

## 🔐 Métodos de Autenticación Disponibles

Oryon App soporta múltiples métodos de autenticación para máxima flexibilidad:

### 1. Email y Contraseña (Tradicional)
- ✅ Registro con email corporativo
- ✅ Inicio de sesión con credenciales
- ✅ Recuperación de contraseña por email
- ✅ Sin configuración adicional requerida (excepto para recuperación de contraseña)

### 2. Google OAuth (Recomendado)
- ✅ Inicio de sesión con un clic
- ✅ Sin contraseñas que recordar
- ✅ Configuración inicial de perfil empresarial
- ⚠️ Requiere configuración en Google Cloud Console

## 📋 Flujos Completos

### Flujo 1: Registro con Email

```
Usuario → Pantalla de Registro
    ↓
Ingresa:
  - Nombre de la empresa
  - Email
  - Contraseña
  - Nombre del contacto
  - Teléfono
    ↓
Backend crea:
  - Usuario en Supabase Auth
  - Registro de empresa en BD
  - Registro de usuario en BD
  - Licencia de prueba (7 días)
    ↓
Usuario es redirigido al Login
    ↓
Inicia sesión con email/password
    ↓
Accede al dashboard
```

**Ventajas**:
- Control total sobre las credenciales
- No depende de terceros
- Ideal para empresas con políticas de seguridad estrictas

**Desventajas**:
- Usuario debe recordar contraseña
- Requiere configurar servidor SMTP para recuperación

---

### Flujo 2: Registro con Google

```
Usuario → Pantalla de Registro
    ↓
Click en "Continuar con Google"
    ↓
Redirigido a Google para autenticación
    ↓
Google valida identidad
    ↓
Usuario es redirigido a Oryon App
    ↓
Pantalla de "Configuración Inicial"
Ingresa:
  - Nombre de la empresa
  - Nombre del contacto
  - Teléfono
    ↓
Backend completa registro:
  - Asocia cuenta de Google
  - Crea empresa en BD
  - Crea usuario en BD
  - Licencia de prueba (7 días)
    ↓
Accede al dashboard
```

**Ventajas**:
- Experiencia más rápida (1 clic)
- Sin contraseñas que recordar
- Mayor seguridad (2FA de Google)
- Recuperación automática por Google

**Desventajas**:
- Requiere configuración inicial en Google Cloud
- Depende de que Google esté disponible

---

### Flujo 3: Login Existente - Email

```
Usuario → Pantalla de Login
    ↓
Ingresa email y contraseña
    ↓
Supabase Auth valida credenciales
    ↓
Backend verifica:
  - Usuario existe en BD
  - Usuario está activo
  - Licencia vigente
    ↓
Retorna:
  - Token de acceso
  - Datos del usuario
  - Rol del usuario
  - Info de licencia
    ↓
Usuario accede según su rol:
  - Admin → Dashboard
  - Asesor → Ventas
  - Técnico → Reparaciones
```

---

### Flujo 4: Login Existente - Google

```
Usuario → Pantalla de Login
    ↓
Click en "Continuar con Google"
    ↓
Redirigido a Google
    ↓
Google valida identidad
    ↓
Usuario es redirigido a Oryon App
    ↓
Backend verifica:
  - Usuario existe en BD
  - Usuario está activo
  - Licencia vigente
    ↓
Si usuario YA completó setup antes:
  ↓
  Accede directamente al dashboard
    
Si usuario es NUEVO (primera vez con Google):
  ↓
  Pantalla de "Configuración Inicial"
  ↓
  Completa datos de empresa
  ↓
  Accede al dashboard
```

---

### Flujo 5: Recuperación de Contraseña (NUEVO)

```
Usuario → Pantalla de Login
    ↓
Click en "¿Olvidaste tu contraseña?"
    ↓
Pantalla de Recuperación
    ↓
Ingresa su email
    ↓
Supabase envía email con link único
    ↓
Usuario recibe email
    ↓
Click en link del email
    ↓
Redirigido a /#/reset-password
    ↓
Pantalla de Nueva Contraseña
    ↓
Ingresa:
  - Nueva contraseña (min 6 caracteres)
  - Confirmar contraseña
    ↓
Supabase actualiza contraseña
    ↓
Mensaje de éxito
    ↓
Auto-redirigido al Login (3 segundos)
    ↓
Inicia sesión con nueva contraseña
```

**Importante**:
- El link de recuperación expira en 24 horas
- Solo funciona para usuarios registrados con email/password
- Usuarios de Google usan la recuperación nativa de Google
- Requiere servidor SMTP configurado en Supabase

---

## 🔧 Configuración Necesaria

### Para Email/Password:
- ✅ **Funciona de inmediato** (sin configuración)
- ⚠️ Para recuperación de contraseña: Configurar SMTP (ver `EMAIL_SETUP.md`)

### Para Google OAuth:
- ⚠️ **Requiere configuración**:
  1. Crear proyecto en Google Cloud Console
  2. Habilitar Google+ API
  3. Configurar pantalla de consentimiento
  4. Crear credenciales OAuth 2.0
  5. Configurar en Supabase Auth
  
**Ver instrucciones detalladas en**: `GOOGLE_OAUTH_SETUP.md`

---

## 🛡️ Seguridad

### Contraseñas:
- ✅ Hashing automático por Supabase Auth (bcrypt)
- ✅ Mínimo 6 caracteres requeridos
- ✅ No se almacenan en texto plano
- ✅ Recuperación segura por email

### Sesiones:
- ✅ Tokens JWT firmados
- ✅ Expiración automática
- ✅ Verificación en cada request
- ✅ Logout limpia tokens

### Google OAuth:
- ✅ OAuth 2.0 estándar de industria
- ✅ Tokens manejados por Supabase
- ✅ No se almacenan credenciales de Google
- ✅ Soporte para 2FA de Google

---

## 👥 Sistema de Roles

Una vez autenticado, el usuario tiene un rol asignado:

### Admin (Administrador):
- ✅ Acceso completo a todos los módulos
- ✅ Gestión de licencias
- ✅ Configuración de empresa
- ✅ Reportes y dashboard
- ✅ Gestión de usuarios (próximamente)

### Asesor:
- ✅ Crear y gestionar ventas
- ✅ Crear y gestionar productos
- ✅ Crear órdenes de servicio
- ✅ Cambiar estado de órdenes
- ❌ No acceso a: Dashboard, Clientes, Reportes, Configuración

### Técnico:
- ✅ Ver órdenes de servicio
- ✅ Cambiar estado de órdenes
- ✅ Agregar notas e imágenes
- ❌ No acceso a: Otros módulos

---

## 🔄 Gestión de Sesiones

### Persistencia:
- Las sesiones persisten en el navegador
- El usuario permanece logueado hasta que:
  - Cierre sesión manualmente
  - El token expire (configurable en Supabase)
  - La cuenta sea desactivada

### Verificación:
- Cada vez que el usuario abre la app:
  1. Se verifica si hay sesión activa
  2. Se valida el token con el backend
  3. Se confirma que el usuario sigue activo
  4. Se carga la info de licencia actualizada

### Multi-dispositivo:
- Un usuario puede estar logueado en múltiples dispositivos
- Cada dispositivo tiene su propia sesión
- Al cerrar sesión en un dispositivo no afecta otros

---

## 📱 Próximas Funcionalidades

- [ ] Autenticación de 2 factores (2FA) nativa
- [ ] Login con Microsoft/Office 365
- [ ] Login con Apple
- [ ] Gestión de usuarios subordinados (empleados)
- [ ] Auditoría de inicios de sesión
- [ ] Notificaciones de sesiones nuevas
- [ ] Límite de dispositivos simultáneos

---

## 🆘 Problemas Comunes

### "No puedo iniciar sesión"
1. Verifica tu email y contraseña
2. Revisa que tu cuenta esté activa
3. Confirma que la licencia no haya expirado
4. Intenta recuperar tu contraseña

### "No recibo el email de recuperación"
1. Revisa spam/correo no deseado
2. Confirma que SMTP esté configurado (ver `EMAIL_SETUP.md`)
3. Verifica que el email sea el correcto
4. Espera hasta 5 minutos

### "Google OAuth no funciona"
1. Confirma que esté configurado en Supabase
2. Revisa la configuración en Google Cloud Console
3. Verifica las URLs de redirección
4. Ver guía completa: `GOOGLE_OAUTH_SETUP.md`

### "Mi cuenta está desactivada"
- Contacta al administrador de tu empresa
- Solo admins pueden reactivar cuentas

---

## 📞 Soporte

Para problemas técnicos o dudas sobre autenticación:
- Revisa los archivos de documentación
- Verifica los logs en la consola del navegador
- Contacta al equipo de soporte

---

**Última actualización**: Noviembre 2025
