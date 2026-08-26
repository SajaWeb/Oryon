# Correos de autenticación — Oryon

Todos los correos de acceso los emite **Supabase Auth** y los envía **Resend** a
través de un *Send Email Hook* propio. Supabase sigue siendo quien genera el token,
lo caduca, lo invalida tras el primer uso y aplica los límites de envío; nosotros
solo maquetamos y entregamos.

## Piezas

| Pieza | Dónde |
|---|---|
| Función del hook | `supabase/functions/auth-email-hook/index.ts` |
| Verificación de firma | `supabase/functions/auth-email-hook/webhook.ts` |
| Plantillas HTML | `supabase/functions/auth-email-hook/templates.ts` |
| Pantalla del código | `src/components/auth/VerifyEmail.tsx` |
| Pantalla de recuperación | `src/components/auth/ForgotPassword.tsx` / `ResetPassword.tsx` |

## Flujos

**Registro — código de 6 dígitos.**
`supabase.auth.signUp()` → Supabase crea la cuenta sin confirmar y llama al hook →
llega el correo con el código → `/verify-email` → `verifyOtp({ type: 'signup' })` →
con la sesión ya abierta, `POST /auth/provision` crea empresa, sucursal y perfil.

**Recuperación — código de 6 dígitos.**
`resetPasswordForEmail(email)` → llega el correo con el código → `/reset-password`
hace `verifyOtp({ email, token, type: 'recovery' })` para abrir sesión y luego
`updateUser({ password })`.

Se pasó de enlace a código porque con `flowType: 'pkce'` el enlace solo se canjea
en el navegador que lo pidió: el *code verifier* vive en su `localStorage`. Pedir
la recuperación en el móvil y abrirla en el computador fallaba, y abrir el enlace
desde el navegador interno de Gmail —almacenamiento aparte— también. El código no
usa PKCE. De paso, un correo sin enlace clicable quita la superficie de phishing
más obvia. `/reset-password` conserva la rama de `token_hash` para los enlaces
enviados antes del cambio.

## Qué se retiró

El sistema propio de `/auth/forgot-password` y `/auth/reset-password-confirm`.
Generaba un token y un código de seis dígitos con `Math.random()`, los guardaba en
el KV durante una hora **sin límite de intentos** —seis dígitos se agotan en un
rato— y devolvía el enlace de restablecimiento dentro de la propia respuesta HTTP
cuando fallaba el envío. También se borró `src/services/EmailService.ts`, que leía
la API key de Resend desde `VITE_RESEND_API_KEY`, es decir, desde el navegador.

`sendResendEmail()` sigue existiendo en `supabase/functions/make-server-4d437e50/index.ts`,
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

En Resend hace falta un dominio verificado (SPF/DKIM) — para Oryon es
**oryonsas.com**, ya verificado en el plan gratuito, y `RESEND_FROM_EMAIL` sale de
ahí. No hay respaldo a `onboarding@resend.dev`: ese remitente compartido solo
entrega a la dirección con la que se registró la cuenta de Resend, así que caer en
él haría que el código de un cliente se perdiera sin dejar rastro. Si falta
`RESEND_FROM_EMAIL`, el hook falla con un error visible en vez de fingir que envió.

Cuotas del plan gratuito de Resend: 3.000 correos al mes y **100 al día**.

## Webhooks de pago

`POST /license/wompi/webhook` verifica la firma del evento antes de tocar nada
(`supabase/functions/make-server-4d437e50/wompi_signature.ts`):

```
checksum = SHA256( v1 + … + vN + timestamp + WOMPI_EVENTS_SECRET )
```

donde `v1…vN` son los valores de `data` que señalan las rutas de
`signature.properties`. Como la firma cubre monto y estado, no se puede fabricar un
evento «APPROVED» ni reutilizar uno real cambiándole cifras. Sin
`WOMPI_EVENTS_SECRET` el endpoint rechaza todo con 401.

Se retiraron `POST /license/webhook` y `POST /plans/webhook`: aceptaban un `status`
del propio cuerpo, sin firma ni autenticación, y con eso extendían licencias. No los
llamaba nada en `src/`.
