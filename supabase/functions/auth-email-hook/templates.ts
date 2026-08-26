/**
 * Plantillas de los correos de autenticación.
 *
 * Reglas del medio, no del sistema de diseño: tablas en vez de flex, estilos
 * incrustados en cada etiqueta, nada de variables CSS ni de `class`. Outlook sigue
 * renderizando con el motor de Word y no entiende casi nada de lo demás.
 *
 * Las fuentes de marca tampoco cargan de forma fiable en un cliente de correo, así
 * que Archivo e IBM Plex Sans van declaradas con su alternativa del sistema y se
 * asume el respaldo. Los colores sí son los del sistema, en hexadecimal literal.
 */

const GRAPHITE = '#0B0D0E'
const SURFACE = '#131617'
const SUNKEN = '#070909'
const BORDER = '#2C3335'
const TEXT = '#F2F5F6'
const MUTED = '#98A2A6'
const DIM = '#6E787C'
const ACCENT = '#35E0FF'

const DISPLAY = "Archivo,'Helvetica Neue',Helvetica,Arial,sans-serif"
const SANS = "'IBM Plex Sans','Helvetica Neue',Helvetica,Arial,sans-serif"
const MONO = "'JetBrains Mono',Consolas,Menlo,monospace"

/** Escapa lo que venga del usuario: el nombre del taller acaba dentro del HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface ShellOptions {
  preheader: string
  title: string
  intro: string
  body: string
  footnote?: string
}

/** Marco común: fondo grafito, tarjeta centrada de 520px, lockup y pie. */
function shell({ preheader, title, intro, body, footnote }: ShellOptions): string {
  const year = new Date().getFullYear()
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${GRAPHITE};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${GRAPHITE};padding:32px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="width:520px;max-width:100%;background:${SURFACE};border:1px solid ${BORDER};">
        <tr>
          <td style="padding:28px 32px 0 32px;">
            <span style="font-family:${DISPLAY};font-size:15px;font-weight:900;letter-spacing:-0.04em;text-transform:uppercase;color:${TEXT};">Oryon</span>
            <span style="font-family:${DISPLAY};font-size:15px;font-weight:900;color:${ACCENT};">&#216;</span>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 0 32px;">
            <h1 style="margin:0;font-family:${DISPLAY};font-size:26px;line-height:1.1;font-weight:800;letter-spacing:-0.03em;color:${TEXT};">${escapeHtml(title)}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 32px 0 32px;">
            <p style="margin:0;font-family:${SANS};font-size:14px;line-height:21px;color:${MUTED};">${intro}</p>
          </td>
        </tr>
        <tr><td style="padding:24px 32px 0 32px;">${body}</td></tr>
        ${
          footnote
            ? `<tr><td style="padding:20px 32px 0 32px;">
                 <p style="margin:0;font-family:${SANS};font-size:12px;line-height:18px;color:${DIM};">${footnote}</p>
               </td></tr>`
            : ''
        }
        <tr>
          <td style="padding:24px 32px 28px 32px;">
            <div style="border-top:1px solid ${BORDER};padding-top:14px;font-family:${SANS};font-size:11px;line-height:16px;color:${DIM};">
              &copy; ${year} Oryon &middot; Software para talleres de reparaci&oacute;n.<br>
              Si no esperabas este correo, puedes ignorarlo: sin abrirlo no pasa nada.
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

/** Bloque del código de seis dígitos, separado para que se lea de un vistazo. */
function codeBlock(token: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${SUNKEN};border:1px solid ${BORDER};">
  <tr>
    <td align="center" style="padding:20px 16px;">
      <div style="font-family:${SANS};font-size:11px;letter-spacing:0.10em;text-transform:uppercase;color:${DIM};padding-bottom:10px;">Tu código</div>
      <div style="font-family:${MONO};font-size:32px;font-weight:700;letter-spacing:0.22em;color:${ACCENT};">${escapeHtml(token)}</div>
    </td>
  </tr>
</table>`
}

/** Botón "bulletproof": una celda con fondo, no un <a> con padding. */
function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="background:${ACCENT};">
      <a href="${href}" target="_blank" style="display:inline-block;padding:13px 26px;font-family:${SANS};font-size:14px;font-weight:600;color:#04181D;text-decoration:none;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`
}

export interface TemplateInput {
  token: string
  confirmationUrl: string
  email: string
  name: string
}

export interface RenderedEmail {
  subject: string
  html: string
}

/** Registro: código de seis dígitos, sin enlace. El usuario ya está en la pantalla. */
export function signupEmail({ token, name }: TemplateInput): RenderedEmail {
  return {
    subject: `${token} es tu código de verificación de Oryon`,
    html: shell({
      preheader: `Tu código es ${token}. Vence en una hora.`,
      title: 'Verifica tu correo',
      intro: `Hola ${escapeHtml(name)}, escribe este código en la pantalla de verificación para activar tu taller.`,
      body: codeBlock(token),
      footnote: 'El código vence en una hora y sirve una sola vez. Nadie de Oryon te lo va a pedir por teléfono ni por WhatsApp.',
    }),
  }
}

/**
 * Recuperación: código de seis dígitos, sin enlace.
 *
 * El documento de acceso pedía un enlace, pero con PKCE activo el enlace solo se
 * puede canjear en el mismo navegador que lo pidió —el code verifier vive en su
 * localStorage—. Pedir la recuperación en el móvil y abrirla en el computador
 * fallaba; peor aún, tocar el enlace desde la app de Gmail lo abre en su navegador
 * interno, con almacenamiento aparte, y fallaba también.
 *
 * El código no usa PKCE, así que funciona en cualquier dispositivo. De paso, un
 * correo sin enlace clicable quita la superficie de phishing más obvia.
 */
export function recoveryEmail({ token, name }: TemplateInput): RenderedEmail {
  return {
    subject: `${token} es tu código para cambiar la contraseña de Oryon`,
    html: shell({
      preheader: `Tu código es ${token}. Vence en una hora.`,
      title: 'Cambiar contraseña',
      intro: `Hola ${escapeHtml(name)}, escribe este código en la pantalla de recuperación para elegir una contraseña nueva.`,
      body: codeBlock(token),
      footnote:
        'El código vence en una hora y sirve una sola vez. Si no fuiste tú, tu contraseña actual sigue funcionando y no hay nada que hacer. Nadie de Oryon te va a pedir este código por teléfono ni por WhatsApp.',
    }),
  }
}

/** Cambio de correo: confirma la dirección nueva. */
export function emailChangeEmail({ confirmationUrl, token, email }: TemplateInput): RenderedEmail {
  return {
    subject: 'Confirma tu correo nuevo en Oryon',
    html: shell({
      preheader: 'Confirma la dirección nueva para terminar el cambio.',
      title: 'Confirma tu correo',
      intro: `Para terminar el cambio, confirma que <strong style="color:${TEXT};">${escapeHtml(email)}</strong> es tuyo.`,
      body: `${button(confirmationUrl, 'Confirmar correo')}
<div style="padding-top:16px;">${codeBlock(token)}</div>`,
      footnote: 'Hasta que confirmes, sigues entrando con el correo anterior.',
    }),
  }
}

/** Enlace mágico e invitación comparten forma. */
export function magicLinkEmail({ confirmationUrl, name }: TemplateInput): RenderedEmail {
  return {
    subject: 'Tu acceso a Oryon',
    html: shell({
      preheader: 'Enlace de acceso directo a tu taller.',
      title: 'Entra a tu taller',
      intro: `Hola ${escapeHtml(name)}, con este enlace entras sin escribir la contraseña.`,
      body: button(confirmationUrl, 'Entrar a Oryon'),
      footnote: 'El enlace vence en una hora y sirve una sola vez.',
    }),
  }
}

export function inviteEmail({ confirmationUrl }: TemplateInput): RenderedEmail {
  return {
    subject: 'Te invitaron a un taller en Oryon',
    html: shell({
      preheader: 'Acepta la invitación para empezar a trabajar.',
      title: 'Te invitaron a Oryon',
      intro: 'Un taller te sumó a su equipo. Acepta la invitación y elige tu contraseña.',
      body: button(confirmationUrl, 'Aceptar invitación'),
      footnote: 'Si no sabes de qué va esto, ignora el correo.',
    }),
  }
}
