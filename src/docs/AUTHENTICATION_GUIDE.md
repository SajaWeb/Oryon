# Autenticación — Oryon

## Métodos

- **Correo y contraseña**, con verificación obligatoria por código de 6 dígitos.
- **Google OAuth**, que además pide el nombre del taller la primera vez.

Ambos pasan por Supabase Auth con flujo **PKCE** (`src/utils/supabase/client.tsx`).

## Pantallas

Todas viven en `src/components/auth/` sobre el design system Oryon
(`src/components/oryon/`) y comparten `AuthLayout`.

| Ruta | Componente |
|---|---|
| `/login` | `Login` |
| `/register` | `Register` |
| `/verify-email?email=` | `VerifyEmail` — código de 6 dígitos |
| `/forgot-password` | `ForgotPassword` |
| `/reset-password` | `ResetPassword` |
| `/confirm-email` | `ConfirmEmail` — enlaces de cambio de correo y legacy |
| `/welcome` | `Welcome` |

El enrutado sigue siendo la cadena de `if` de `src/App.tsx`; no hay router.

## Registro con correo

```
Register  →  supabase.auth.signUp({ email, password,
                options: { data: { name, companyName }, captchaToken } })
          →  Supabase crea la cuenta SIN confirmar y dispara el Send Email Hook
/verify-email
          →  supabase.auth.verifyOtp({ email, token, type: 'signup' })  → sesión
          →  POST /auth/provision  → empresa + sucursal «Principal» + perfil
/welcome  →  panel
```

`/auth/provision` es idempotente, exige sesión y **exige `email_confirmed_at`**. Es
lo que sustituye al viejo `/auth/signup`, que era anónimo y creaba usuarios con
`email_confirm: true` — o sea, nunca se verificaba ningún correo.

## Registro con Google

Google entrega correo y nombre, nunca el del taller. Cuando `/auth/provision`
responde `needsCompanyName: true`, `App.tsx` muestra `GoogleSetup`. Antes esa
pantalla era inalcanzable y el cliente rellenaba el hueco con `companyId: 1`,
metiendo al usuario nuevo dentro de la empresa de otro.

## Recuperación

`/forgot-password` (correo) → `/reset-password?email=…` (código de 6 dígitos) →
`verifyOtp({ email, token, type: 'recovery' })` → contraseña nueva →
`updateUser({ password })` → se cierra la sesión de recuperación para forzar un
login con la contraseña nueva.

Es código y no enlace por PKCE: el *code verifier* del enlace vive en el
`localStorage` del navegador que lo pidió, así que pedirlo en el móvil y abrirlo en
el computador —o abrirlo desde el navegador interno de Gmail— fallaba.
`/reset-password` mantiene la rama de `token_hash` para los enlaces ya enviados.

Se avanza a la pantalla del código exista o no la cuenta: la respuesta no debe
revelar qué correos están registrados.

## Mensajes de error

`src/components/auth/authErrors.ts` es el único sitio que traduce errores de
Supabase a español. Compara primero por `code` y solo cae al texto cuando el error
viene de una versión que no lo trae. No repartir `includes('...')` por las pantallas.

Sobre «usuario existente»: Supabase lo oculta a propósito. Con la protección de
enumeración desactivada devuelve `user_already_exists`; con ella activada devuelve
un usuario sintético sin identidades. `isExistingUser()` cubre los dos casos.
Mostrarlo hace del registro un oráculo de cuentas: la contrapartida son Turnstile y
los límites por IP.

## Anti-bots

Cloudflare Turnstile, nativo en Supabase Auth. `src/components/auth/Turnstile.tsx`
carga el script solo en estas pantallas. **El token es de un solo uso**: hay que
llamar a `reset()` tras cada intento, salga bien o mal.

- `VITE_TURNSTILE_SITE_KEY` — clave de sitio, pública, en `.env`.
- Clave secreta — **Authentication → Attack Protection**, nunca en el repo.

Sin clave de sitio el captcha se desactiva solo y el formulario sigue funcionando.

## Contraseñas

Mínimo 8 caracteres. `src/utils/password-strength.ts` puntúa de 0 a 3 y devuelve un
consejo accionable; rechaza las de la lista de comunes y las que contienen el
correo, el nombre o el del taller. El medidor es `PasswordMeter` y el ojo para
revelar es `PasswordInput`, ambos en `src/components/oryon/forms.tsx`.

## Sesión

«Mantener sesión» decide dónde se guarda: marcado, `localStorage`; sin marcar,
`sessionStorage`, y se pierde al cerrar la pestaña. Lo implementa el adaptador de
almacenamiento conmutable de `src/utils/supabase/client.tsx`; hay que llamar a
`setSessionPersistence()` **antes** de iniciar sesión.
