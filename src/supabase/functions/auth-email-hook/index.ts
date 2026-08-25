/**
 * Send Email Hook de Supabase Auth.
 *
 * Supabase deja de mandar sus correos genéricos y llama aquí con el usuario y el
 * token ya emitidos; nosotros solo maquetamos y enviamos por Resend.
 *
 * Lo importante de este reparto: la expiración, el uso único y los límites de
 * envío siguen siendo de Supabase. Lo que había antes —token y código de seis
 * dígitos propios, guardados en el KV, generados con Math.random() y sin límite de
 * intentos— era reimplementar esa parte, y estaba mal.
 *
 * Despliegue (no lleva JWT: Supabase firma con el secreto del hook):
 *   supabase functions deploy auth-email-hook --no-verify-jwt
 *
 * Secretos: SEND_EMAIL_HOOK_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL.
 */

import {
  emailChangeEmail,
  inviteEmail,
  magicLinkEmail,
  recoveryEmail,
  signupEmail,
  type RenderedEmail,
  type TemplateInput,
} from './templates.ts'
import { verifyWebhookSignature } from './webhook.ts'

interface EmailData {
  token: string
  token_hash: string
  redirect_to: string
  email_action_type: string
  site_url: string
}

interface HookPayload {
  user: { email: string; user_metadata?: Record<string, unknown> }
  email_data: EmailData
}

function render(actionType: string, input: TemplateInput): RenderedEmail | null {
  switch (actionType) {
    case 'signup':
      return signupEmail(input)
    case 'recovery':
      return recoveryEmail(input)
    case 'email_change':
    case 'email_change_new':
      return emailChangeEmail(input)
    case 'magiclink':
      return magicLinkEmail(input)
    case 'invite':
      return inviteEmail(input)
    default:
      return null
  }
}

async function sendWithResend(to: string, email: RenderedEmail) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) throw new Error('RESEND_API_KEY no configurada')

  /* Sin remitente propio NO se cae a onboarding@resend.dev: ese remitente
     compartido solo entrega a la dirección con la que se registró la cuenta de
     Resend, así que el código de verificación de un cliente se perdería sin dejar
     rastro. Mejor que el registro falle con un error visible. */
  const from = Deno.env.get('RESEND_FROM_EMAIL')
  if (!from) throw new Error('RESEND_FROM_EMAIL no configurada (dominio verificado en Resend)')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      subject: email.subject,
      html: email.html,
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Resend respondió ${res.status}: ${detail}`)
  }
}

/** Formato de error que Supabase Auth entiende y propaga al cliente. */
function hookError(message: string, code = 500) {
  return new Response(JSON.stringify({ error: { http_code: code, message } }), {
    status: code,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return hookError('Método no permitido', 405)

  const raw = await req.text()

  const signed = await verifyWebhookSignature(
    raw,
    {
      id: req.headers.get('webhook-id'),
      timestamp: req.headers.get('webhook-timestamp'),
      signature: req.headers.get('webhook-signature'),
    },
    Deno.env.get('SEND_EMAIL_HOOK_SECRET')
  )

  if (!signed) {
    // Incluye el caso de que falte el secreto: sin él no se envía nada.
    console.error('Petición rechazada: firma del hook no válida.')
    return hookError('Firma no válida', 401)
  }

  try {
    const { user, email_data } = JSON.parse(raw) as HookPayload
    const meta = user.user_metadata ?? {}
    const name = String(meta.name ?? meta.full_name ?? user.email.split('@')[0])

    /* URL canónica de confirmación de Supabase. `redirect_to` es donde vuelve el
       usuario después; Supabase ya lo valida contra su lista de redirects. */
    const base = (email_data.redirect_to || email_data.site_url).replace(/\/$/, '')
    const confirmationUrl =
      `${base}?token_hash=${encodeURIComponent(email_data.token_hash)}` +
      `&type=${encodeURIComponent(email_data.email_action_type)}`

    const email = render(email_data.email_action_type, {
      token: email_data.token,
      confirmationUrl,
      email: user.email,
      name,
    })

    if (!email) {
      console.error('Tipo de correo sin plantilla:', email_data.email_action_type)
      return hookError('Tipo de correo no soportado', 400)
    }

    await sendWithResend(user.email, email)
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('Fallo enviando el correo de autenticación:', err)
    return hookError('No se pudo enviar el correo')
  }
})
