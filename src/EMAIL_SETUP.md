# Configuración de Recuperación de Contraseñas - Oryon App

## ✅ Funcionalidad Implementada

El sistema de recuperación de contraseñas ya está completamente implementado en Oryon App:

- ✅ Enlace "¿Olvidaste tu contraseña?" en la pantalla de inicio de sesión
- ✅ Componente para solicitar recuperación de contraseña (`ForgotPassword.tsx`)
- ✅ Componente para establecer nueva contraseña (`ResetPassword.tsx`)
- ✅ Flujo completo usando Supabase Auth
- ✅ Validaciones de seguridad (mínimo 6 caracteres, contraseñas deben coincidir)
- ✅ Interfaz moderna y amigable

## ⚙️ Cómo Funciona

### Flujo del Usuario:

1. **Solicitar Recuperación**:
   - El usuario hace clic en "¿Olvidaste tu contraseña?" en el login
   - Ingresa su email registrado
   - Supabase envía un email con un link mágico

2. **Recibir Email**:
   - El usuario recibe un email con instrucciones
   - El email contiene un link único y temporal

3. **Resetear Contraseña**:
   - Al hacer clic en el link, el usuario es redirigido a la app
   - Puede ingresar su nueva contraseña
   - El sistema valida y actualiza la contraseña

4. **Completar**:
   - La contraseña se actualiza exitosamente
   - El usuario es redirigido al login
   - Puede iniciar sesión con su nueva contraseña

## 🔧 Configuración Requerida en Supabase

Para que el envío de emails funcione, necesitas configurar un servidor de email en Supabase:

### Opción 1: Usar el Email Server de Supabase (Desarrollo)

Por defecto, Supabase incluye un servidor de email básico para desarrollo:

1. Ve a tu proyecto en [https://app.supabase.com](https://app.supabase.com)
2. Navega a **Authentication** → **Email Templates**
3. Encuentra la plantilla **Reset Password**
4. Personaliza el mensaje si lo deseas
5. Guarda los cambios

**Nota**: El servidor de email por defecto de Supabase tiene limitaciones:
- Puede tener límites de envío
- Los emails pueden ir a spam
- Es principalmente para desarrollo/pruebas

### Opción 2: Configurar un Proveedor SMTP (Producción - Recomendado)

Para producción, se recomienda usar un proveedor de email profesional:

#### Proveedores Recomendados (gratis para comenzar):

1. **SendGrid** (100 emails/día gratis)
2. **Mailgun** (5,000 emails/mes gratis)
3. **Amazon SES** (62,000 emails/mes gratis primer año)
4. **Resend** (3,000 emails/mes gratis)

#### Pasos para Configurar SMTP:

1. **Obtén credenciales SMTP** de tu proveedor elegido:
   - Host SMTP
   - Puerto (usualmente 587 para TLS)
   - Usuario
   - Contraseña

2. **Configura en Supabase**:
   - Ve a **Project Settings** → **Auth** → **SMTP Settings**
   - Habilita "Enable Custom SMTP"
   - Completa los campos:
     ```
     Host: smtp.tuproveedor.com
     Port Number: 587
     Sender Email: noreply@tudominio.com
     Sender Name: Oryon App
     Username: tu-usuario-smtp
     Password: tu-contraseña-smtp
     ```
   - Haz clic en **Save**

3. **Verifica tu dominio** (si es necesario):
   - Algunos proveedores requieren verificar tu dominio
   - Sigue las instrucciones de tu proveedor SMTP

### Opción 3: Configurar SendGrid (Guía Paso a Paso)

SendGrid es muy popular y fácil de configurar:

1. **Crear cuenta en SendGrid**:
   - Ve a [https://sendgrid.com](https://sendgrid.com)
   - Crea una cuenta gratuita (100 emails/día)

2. **Crear API Key**:
   - Ve a **Settings** → **API Keys**
   - Crea una nueva API Key con permisos de "Mail Send"
   - Guarda la API Key (solo se muestra una vez)

3. **Verificar email de envío**:
   - Ve a **Settings** → **Sender Authentication**
   - Verifica un email individual o dominio

4. **Configurar en Supabase**:
   ```
   Host: smtp.sendgrid.net
   Port: 587
   Sender Email: (tu email verificado)
   Sender Name: Oryon App
   Username: apikey
   Password: (tu API Key de SendGrid)
   ```

## 📧 Personalizar la Plantilla de Email

1. Ve a **Authentication** → **Email Templates** → **Reset Password**
2. Personaliza el contenido del email:

```html
<h2>Recuperación de Contraseña - Oryon App</h2>
<p>Hola,</p>
<p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
<p>Haz clic en el siguiente botón para continuar:</p>
<p><a href="{{ .ConfirmationURL }}">Restablecer Contraseña</a></p>
<p>Si no solicitaste este cambio, puedes ignorar este email.</p>
<p>Este link expirará en 24 horas.</p>
<br>
<p>Saludos,<br>El equipo de Oryon App</p>
```

## 🧪 Probar la Funcionalidad

### Sin Configuración SMTP:

Si intentas usar la recuperación de contraseña sin configurar SMTP:

1. La interfaz funcionará correctamente
2. Se mostrará un mensaje de éxito
3. **PERO** no se enviará ningún email
4. Verás un mensaje amarillo indicando que se necesita configurar email

### Con Configuración SMTP:

1. Ingresa tu email en "¿Olvidaste tu contraseña?"
2. Deberías recibir un email en 1-2 minutos
3. Haz clic en el link del email
4. Establece tu nueva contraseña
5. Inicia sesión con la nueva contraseña

## 🔍 Solución de Problemas

### No recibo el email:

1. **Revisa spam/correo no deseado**
2. **Verifica la configuración SMTP** en Supabase
3. **Revisa los logs** en Supabase → Logs → Auth Logs
4. **Confirma que el email esté registrado** en tu sistema

### El link del email no funciona:

1. **Verifica la URL de redirección** en Supabase:
   - Ve a **Authentication** → **URL Configuration**
   - Asegúrate de que tu dominio esté en la lista de "Redirect URLs"
   - Agrega: `https://tu-dominio.com/#/reset-password`

2. **El link expira en 24 horas** - solicita uno nuevo si expiró

### Error al actualizar contraseña:

1. **Verifica que la contraseña tenga al menos 6 caracteres**
2. **Confirma que ambas contraseñas coincidan**
3. **Revisa los logs de Supabase** para más detalles

## 🚀 Estado Actual

✅ **Todo está listo para funcionar**  
⚠️ **Solo falta configurar el servidor SMTP en Supabase**

La funcionalidad completa está implementada en el código. Una vez configures el servidor SMTP siguiendo esta guía, la recuperación de contraseñas funcionará automáticamente sin necesidad de cambios en el código.

## 📝 Notas Adicionales

- Los links de recuperación expiran en **24 horas** por seguridad
- Un usuario puede solicitar múltiples recuperaciones (se invalidan las anteriores)
- Solo usuarios registrados con email/password pueden usar esta función
- Los usuarios que iniciaron sesión con Google deben usar la recuperación de Google
- Se recomienda configurar rate limiting en Supabase para evitar spam

## 🔗 Referencias

- [Supabase Auth - Reset Password](https://supabase.com/docs/guides/auth/passwords)
- [Supabase - Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [SendGrid Setup](https://sendgrid.com/docs/for-developers/sending-email/smtp/)
- [Mailgun Setup](https://documentation.mailgun.com/en/latest/user_manual.html)
