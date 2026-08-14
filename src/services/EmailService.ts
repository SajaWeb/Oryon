/**
 * Servicio de envío de correos electrónicos transaccionales con Resend
 */

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
  text?: string
}

export interface EmailResponse {
  success: boolean
  id?: string
  error?: string
}

class EmailService {
  private getApiKey(): string {
    return (
      import.meta.env.VITE_RESEND_API_KEY ||
      ''
    )
  }

  private getFromEmail(): string {
    return (
      import.meta.env.VITE_RESEND_FROM_EMAIL ||
      'Oryon <onboarding@resend.dev>'
    )
  }

  /**
   * Envía un correo electrónico a través de la API oficial de Resend
   */
  async sendEmail(options: SendEmailOptions): Promise<EmailResponse> {
    const apiKey = this.getApiKey()
    const fromEmail = options.from || this.getFromEmail()

    if (!apiKey || apiKey.includes('tu_api_key')) {
      console.warn('⚠️ RESEND_API_KEY no configurada o usa valor por defecto.')
      return {
        success: false,
        error: 'RESEND_API_KEY no configurada. Por favor actualiza la variable en el archivo .env.'
      }
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromEmail,
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text
        })
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Error enviando correo con Resend:', data)
        return {
          success: false,
          error: data.message || 'Error al enviar correo con Resend'
        }
      }

      console.log('✅ Correo enviado exitosamente con Resend:', data.id)
      return {
        success: true,
        id: data.id
      }
    } catch (err: any) {
      console.error('Excepción al enviar correo con Resend:', err)
      return {
        success: false,
        error: err.message || 'Error de conexión con Resend'
      }
    }
  }

  /**
   * Plantilla de correo para recuperación de contraseña
   */
  async sendPasswordResetEmail(params: {
    email: string
    name?: string
    resetLink: string
    code?: string
  }): Promise<EmailResponse> {
    const { email, name = 'Usuario', resetLink, code } = params

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperación de Contraseña - Oryon</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px 12px; }
    .container { max-width: 540px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
    .logo { font-size: 24px; font-weight: 800; color: #3b82f6; text-align: center; margin-bottom: 24px; letter-spacing: -0.5px; }
    .title { font-size: 20px; font-weight: 700; color: #f8fafc; margin-bottom: 12px; text-align: center; }
    .text { font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 20px; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }
    .code-box { background-color: #0f172a; border: 1px dashed #475569; border-radius: 10px; padding: 16px; text-align: center; margin: 20px 0; }
    .code-title { font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; margin-bottom: 6px; }
    .code { font-size: 28px; font-weight: 900; letter-spacing: 6px; color: #60a5fa; font-family: monospace; }
    .footer { font-size: 11px; color: #64748b; text-align: center; margin-top: 32px; border-top: 1px solid #334155; padding-top: 16px; }
    .warning { font-size: 12px; color: #fbbf24; background-color: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.2); border-radius: 8px; padding: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">⚡ ORYON</div>
    <div class="title">Recuperación de Contraseña</div>
    <p class="text">Hola <strong>${name}</strong>,</p>
    <p class="text">Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>Oryon</strong> asociada a este correo electrónico (${email}).</p>
    
    <div class="btn-container">
      <a href="${resetLink}" class="btn" target="_blank">Restablecer mi Contraseña</a>
    </div>

    ${code ? `
    <div class="code-box">
      <div class="code-title">O usa tu código de seguridad</div>
      <div class="code">${code}</div>
    </div>
    ` : ''}

    <div class="warning">
      ⏳ <strong>Importante:</strong> Este enlace y código son válidos únicamente durante <strong>60 minutos</strong>. Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura.
    </div>

    <div class="footer">
      © ${new Date().getFullYear()} Oryon. Plataforma de Gestión y Facturación de Talleres. Todos los derechos reservados.
    </div>
  </div>
</body>
</html>
`

    return this.sendEmail({
      to: email,
      subject: '🔐 Restablece tu contraseña de Oryon',
      html
    })
  }

  /**
   * Plantilla de correo de bienvenida y verificación de cuenta
   */
  async sendWelcomeEmail(params: {
    email: string
    name: string
    role?: string
    loginLink?: string
    temporaryPassword?: string
  }): Promise<EmailResponse> {
    const { email, name, role = 'Usuario', loginLink = 'http://localhost:3002/login', temporaryPassword } = params

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a Oryon</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px 12px; }
    .container { max-width: 540px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 32px; }
    .logo { font-size: 24px; font-weight: 800; color: #3b82f6; text-align: center; margin-bottom: 20px; }
    .title { font-size: 20px; font-weight: 700; color: #f8fafc; margin-bottom: 12px; text-align: center; }
    .text { font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 16px; }
    .card { background-color: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 16px; margin: 20px 0; font-size: 13px; }
    .btn-container { text-align: center; margin: 24px 0; }
    .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 14px; }
    .footer { font-size: 11px; color: #64748b; text-align: center; margin-top: 28px; border-top: 1px solid #334155; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">⚡ ORYON</div>
    <div class="title">¡Bienvenido a Oryon!</div>
    <p class="text">Hola <strong>${name}</strong>,</p>
    <p class="text">Tu cuenta en Oryon ha sido creada y configurada con el rol de <strong>${role}</strong>.</p>
    
    <div class="card">
      <p style="margin: 0 0 8px 0;"><strong>Usuario:</strong> ${email}</p>
      <p style="margin: 0 0 8px 0;"><strong>Rol:</strong> ${role}</p>
      ${temporaryPassword ? `<p style="margin: 0;"><strong>Contraseña inicial:</strong> <code>${temporaryPassword}</code></p>` : ''}
    </div>

    <div class="btn-container">
      <a href="${loginLink}" class="btn" target="_blank">Ingresar a Oryon</a>
    </div>

    <div class="footer">
      © ${new Date().getFullYear()} Oryon. Plataforma de Gestión y Facturación de Talleres.
    </div>
  </div>
</body>
</html>
`

    return this.sendEmail({
      to: email,
      subject: `🎉 Bienvenido a Oryon - Cuenta de ${name}`,
      html
    })
  }
}

export const emailService = new EmailService()
export default emailService
