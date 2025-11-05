# Configuración de Google OAuth para Oryon App

## ⚠️ IMPORTANTE

Para que el inicio de sesión con Google funcione correctamente, **DEBES** configurar Google OAuth en tu proyecto de Supabase. Sin esta configuración, los usuarios recibirán un error "provider is not enabled".

## Pasos para Configurar Google OAuth

### 1. Configurar Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la API de Google+ (Google People API)
4. Ve a "Credenciales" → "Crear credenciales" → "ID de cliente de OAuth 2.0"
5. Configura la pantalla de consentimiento OAuth
6. En "URIs de redireccionamiento autorizados", agrega:
   ```
   https://[TU-PROYECTO-ID].supabase.co/auth/v1/callback
   ```
7. Copia el **Client ID** y **Client Secret**

### 2. Configurar Supabase

1. Ve a tu [Dashboard de Supabase](https://app.supabase.com/)
2. Selecciona tu proyecto
3. Ve a **Authentication** → **Providers**
4. Busca **Google** en la lista
5. Habilita el proveedor de Google
6. Pega tu **Client ID** y **Client Secret** de Google
7. Guarda los cambios

### 3. Configurar Redirects Permitidos (Opcional)

Si tu aplicación está desplegada en un dominio personalizado:

1. En Supabase, ve a **Authentication** → **URL Configuration**
2. Agrega tu dominio a las "Redirect URLs" permitidas

## Documentación Oficial

Para más detalles, consulta la documentación oficial de Supabase:
👉 https://supabase.com/docs/guides/auth/social-login/auth-google

## Flujo de Autenticación con Google

1. El usuario hace clic en "Continuar con Google"
2. Es redirigido a Google para autenticarse
3. Después de autenticarse, Google redirige de vuelta a tu app
4. Si es la primera vez que el usuario inicia sesión:
   - Se muestra una pantalla para completar su perfil (nombre de empresa)
   - Se crea automáticamente la empresa con 7 días de prueba gratis
   - El usuario es redirigido al dashboard
5. Si el usuario ya tiene una cuenta:
   - Es redirigido directamente al dashboard

## Solución de Problemas

### Error: "Provider is not enabled"
- Verifica que Google OAuth esté habilitado en Supabase
- Confirma que el Client ID y Secret estén configurados correctamente

### Error: "Redirect URI mismatch"
- Verifica que la URI de redirección en Google Cloud Console coincida exactamente con:
  `https://[TU-PROYECTO-ID].supabase.co/auth/v1/callback`

### El usuario no es redirigido después del login
- Verifica que la "Redirect URL" esté configurada en Supabase
- Asegúrate de que el dominio esté en la lista de URLs permitidas

## Notas de Desarrollo

- En desarrollo local, puedes usar `http://localhost:3000` como redirect URL
- En producción, asegúrate de usar HTTPS
- Los usuarios que se registran con Google tienen automáticamente confirmado su email
