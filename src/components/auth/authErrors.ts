/**
 * Traducción de errores de Supabase Auth a lo que se le enseña al usuario.
 *
 * Antes cada pantalla llevaba su propia cadena de `message.includes('...')` sobre
 * el texto en inglés de la librería (Login, Register y Register/Google tenían tres
 * listas distintas, y ForgotPassword directamente pintaba el mensaje crudo). Un
 * cambio de copy en Supabase rompía las tres por separado.
 *
 * Aquí hay un solo sitio. Se compara primero por `code`, que es estable, y sólo se
 * cae al texto cuando el error viene de una versión que aún no lo trae.
 */

export interface AuthMessage {
  /** Título del Alert. */
  title: string
  /** Cuerpo del Alert. */
  message: string
  /** Qué ofrecer además de reintentar. */
  action?: 'login' | 'register' | 'recover' | 'resend'
}

const GENERIC: AuthMessage = {
  title: 'No se pudo completar la operación',
  message: 'Vuelve a intentarlo en un momento. Si sigue fallando, revisa tu conexión.',
}

/* Por `code` de supabase-js (AuthApiError.code). */
const BY_CODE: Record<string, AuthMessage> = {
  invalid_credentials: {
    title: 'No se pudo iniciar sesión',
    message: 'Correo o contraseña incorrectos. Revísalos e intenta de nuevo.',
    action: 'recover',
  },
  email_not_confirmed: {
    title: 'Falta verificar tu correo',
    message: 'Te enviamos un código cuando creaste la cuenta. Verifícala para poder entrar.',
    action: 'resend',
  },
  user_already_exists: {
    title: 'Ese correo ya tiene cuenta',
    message: 'Inicia sesión con él, o recupera la contraseña si no la recuerdas.',
    action: 'login',
  },
  email_exists: {
    title: 'Ese correo ya tiene cuenta',
    message: 'Inicia sesión con él, o recupera la contraseña si no la recuerdas.',
    action: 'login',
  },
  weak_password: {
    title: 'Contraseña demasiado débil',
    message: 'Usa al menos 8 caracteres y mezcla letras y números.',
  },
  over_email_send_rate_limit: {
    title: 'Demasiados correos seguidos',
    message: 'Espera unos minutos antes de pedir otro. El código anterior sigue siendo válido.',
  },
  over_request_rate_limit: {
    title: 'Demasiados intentos',
    message: 'Por seguridad hay que esperar unos minutos antes de volver a intentarlo.',
  },
  /* Supabase devuelve este mismo código tanto para un código equivocado como para
     uno vencido ("Token has expired or is invalid"), así que el texto tiene que
     cubrir los dos casos sin mentir en ninguno. */
  otp_expired: {
    title: 'El código no sirve',
    message: 'Revisa los seis dígitos del correo. Si ya pasó una hora, pide uno nuevo.',
    action: 'resend',
  },
  otp_disabled: {
    title: 'Verificación no disponible',
    message: 'La verificación por código está desactivada en este momento.',
  },
  captcha_failed: {
    title: 'No se pudo verificar que eres humano',
    message: 'Recarga la página e inténtalo otra vez.',
  },
  validation_failed: {
    title: 'Revisa los datos',
    message: 'Alguno de los campos no tiene el formato esperado.',
  },
  signup_disabled: {
    title: 'Registro cerrado',
    message: 'Ahora mismo no se pueden crear cuentas nuevas.',
  },
  provider_disabled: {
    title: 'Proveedor no habilitado',
    message: 'El acceso con Google no está activo. Entra con tu correo y contraseña.',
  },
  same_password: {
    title: 'Es la misma contraseña',
    message: 'La contraseña nueva tiene que ser distinta de la anterior.',
  },
}

/* Respaldo por texto, para versiones que aún no exponen `code`. */
const BY_TEXT: Array<[RegExp, AuthMessage]> = [
  [/invalid login credentials/i, BY_CODE.invalid_credentials],
  [/email not confirmed/i, BY_CODE.email_not_confirmed],
  [/user already registered|already been registered/i, BY_CODE.user_already_exists],
  [/password should be at least|weak password/i, BY_CODE.weak_password],
  [/for security purposes|only request this after|rate limit/i, BY_CODE.over_request_rate_limit],
  [/token has expired|otp.*expired|expired or is invalid/i, BY_CODE.otp_expired],
  [/captcha/i, BY_CODE.captcha_failed],
  [/new password should be different/i, BY_CODE.same_password],
  [/token.*invalid|invalid.*token/i, {
    title: 'Código incorrecto',
    message: 'Revisa los seis dígitos del correo. Si ya venció, pide uno nuevo.',
    action: 'resend',
  }],
  [/provider is not enabled|not enabled/i, BY_CODE.provider_disabled],
  [/popup/i, {
    title: 'La ventana de Google no se abrió',
    message: 'Tu navegador la bloqueó. Permite las ventanas emergentes de este sitio.',
  }],
  [/failed to fetch|networkerror|network request failed/i, {
    title: 'Sin conexión con el servidor',
    message: 'Revisa tu conexión a internet e intenta de nuevo.',
  }],
]

export function authMessage(error: unknown): AuthMessage {
  if (!error) return GENERIC

  const code = (error as { code?: string }).code
  if (code && BY_CODE[code]) return BY_CODE[code]

  const text =
    (error as { message?: string }).message ??
    (typeof error === 'string' ? error : '')

  for (const [pattern, message] of BY_TEXT) {
    if (pattern.test(text)) return message
  }

  return GENERIC
}

/** El correo ya tiene cuenta — mensaje único para el registro. */
export const ALREADY_REGISTERED: AuthMessage = BY_CODE.user_already_exists

/**
 * Supabase esconde a propósito si un correo ya existe.
 *
 * Con la protección de enumeración desactivada devuelve el error
 * `user_already_exists`. Con ella activada devuelve un usuario sintético sin
 * identidades, que es la única señal que queda. Hay que mirar las dos, porque el
 * ajuste vive en el panel y puede cambiar sin tocar este código.
 */
export function isExistingUser(data: { user?: { identities?: unknown[] | null } | null } | null): boolean {
  const identities = data?.user?.identities
  return Array.isArray(identities) && identities.length === 0
}
