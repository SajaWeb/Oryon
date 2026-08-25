# Correos de autenticación — Oryon

Todos los correos de acceso los emite **Supabase Auth** y los envía **Resend** a
través de un *Send Email Hook* propio. Supabase sigue siendo quien genera el token,
lo caduca, lo invalida tras el primer uso y aplica los límites de envío; nosotros
solo maquetamos y entregamos.

## Piezas

| Pieza | Dónde |
|---|---|
| Función del hook | `src/supabase/functions/auth-email-hook/index.ts` |
| Verificación de firma | `src/supabase/functions/auth-email-hook/webhook.ts` |
| Plantillas HTML | `src/supabase/functions/auth-email-hook/templates.ts` |
| Pantalla del código | `src/components/auth/VerifyEmail.tsx` |
| Pantalla de recuperación | `src/components/auth/ForgotPassword.tsx` / `ResetPassword.tsx` |

## Flujos

**Registro — código de 6 dígitos.**
`supabase.auth.signUp()` → Supabase crea la cuenta sin confirmar y llama al hook →
llega el correo con el código → `/verify-email` → `verifyOtp({ type: 'signup' })` →
con la sesión ya abierta, `POST /auth/provision` crea empresa, sucursal y perfil.

**Recuperación — enlace.**
`resetPasswordForEmail(email, { redirectTo: origin + '/reset-password' })` → el
correo lleva `?token_hash=…&type=recovery` → `/reset-password` hace
`verifyOtp({ type: 'recovery' })` para abrir sesión y luego `updateUser({ password })`.

## Qué se retiró

El sistema propio de `/auth/forgot-password` y `/auth/reset-password-confirm`.
Generaba un token y un código de seis dígitos con `Math.random()`, los guardaba en
el KV durante una hora **sin límite de intentos** —seis dígitos se agotan en un
rato— y devolvía el enlace de restablecimiento dentro de la propia respuesta HTTP
cuando fallaba el envío. También se borró `src/services/EmailService.ts`, que leía
la API key de Resend desde `VITE_RESEND_API_KEY`, es decir, desde el navegador.

`sendResendEmail()` sigue existiendo en `src/supabase/functions/server/index.tsx`,
pero solo para avisos del producto (alta de empleado, alta de superadministrador).
Ningún correo de autenticación pasa por ahí.

## Configuración

Secretos de las Edge Functions:

```bash
supabase secrets set \
  RESEND_API_KEY=re_xxx \
  "RESEND_FROM_EMAIL=Oryon <acceso@oryonsas.com>" \
  SEND_EMAIL_HOOK_SECRET=v1,whsec_xxx \
  SITE_URL=https://oryonsas.com \
  ALLOWED_ORIGINS=https://oryonsas.com

supabase functions deploy auth-email-hook --no-verify-jwt
```

`--no-verify-jwt` es obligatorio: Supabase no manda un JWT, firma la petición con el
secreto del hook (formato Standard Webhooks). La función rechaza con 401 cualquier
petición sin firma válida o con más de 5 minutos de desfase; sin
`SEND_EMAIL_HOOK_SECRET` no envía nada.

En el panel de Supabase:

1. **Authentication → Providers → Email**: activar *Confirm email*.
2. **Authentication → Hooks**: registrar *Send Email Hook* apuntando a la función y
   copiar el secreto que genera.
3. **Authentication → URL Configuration**: `Site URL` y la lista de redirects con
   `/reset-password`, `/confirm-email` y `/welcome`.
4. **Authentication → Rate limits**: ajustar los de registro, OTP y envío de correo.

En Resend: verificar el dominio (SPF/DKIM). Sin eso los correos salen desde
`onboarding@resend.dev` y acaban en spam.
