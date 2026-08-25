import { useState } from 'react'
import { Mail } from 'lucide-react'
import { getSupabaseClient } from '../../utils/supabase/client'
import { Alert, Button, FormField, Input } from '../oryon'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { AuthBack, AuthHeading, AuthLayout } from './AuthLayout'
import { authMessage, type AuthMessage } from './authErrors'
import { useTurnstile } from './Turnstile'

interface ForgotPasswordProps {
  onBackToLogin: () => void
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function ForgotPassword({ onBackToLogin }: ForgotPasswordProps) {
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [alert, setAlert] = useState<AuthMessage | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const { isMobile } = useBreakpoint()
  const captcha = useTurnstile()
  const size = isMobile ? 'lg' : 'md'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanEmail = email.trim().toLowerCase()

    if (!EMAIL_RE.test(cleanEmail)) {
      setFieldError('Escribe un correo válido, con @ y dominio.')
      return
    }

    setFieldError(undefined)
    setAlert(null)
    setLoading(true)

    try {
      const { error } = await getSupabaseClient().auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
        captchaToken: captcha.captchaToken,
      })

      /* Un límite de envíos sí se le dice al usuario; lo demás se calla a
         propósito: la respuesta no debe revelar si el correo existe. */
      if (error && /rate limit|security purposes/i.test(error.message)) {
        setAlert(authMessage(error))
        return
      }

      setSent(true)
    } catch (err) {
      setAlert(authMessage(err))
    } finally {
      captcha.reset()
      setLoading(false)
    }
  }

  return (
    <AuthLayout variant="support">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <AuthBack onClick={onBackToLogin} />

        <AuthHeading title="Recuperar contraseña">
          Se envía un enlace al correo registrado. Sirve una sola vez y caduca en una hora.
        </AuthHeading>

        {alert && (
          <Alert role="alert" variant="danger" title={alert.title} onDismiss={() => setAlert(null)}>
            {alert.message}
          </Alert>
        )}

        {sent ? (
          <>
            <Alert variant="success" title="Enlace enviado">
              Si <span style={{ color: 'var(--text-primary)' }}>{email.trim().toLowerCase()}</span> tiene
              cuenta en Oryon, el enlace ya va en camino. Revisa también el correo no deseado.
            </Alert>
            <Button variant="secondary" size={size} fullWidth onClick={onBackToLogin}>
              Volver a iniciar sesión
            </Button>
          </>
        ) : (
          <>
            <FormField label="Correo" error={fieldError}>
              <Input
                type="email"
                size={size}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setFieldError(undefined)
                }}
                placeholder="tu@taller.com"
                iconLeft={Mail}
                autoComplete="email"
                autoFocus
                disabled={loading}
              />
            </FormField>

            {captcha.widget}

            <Button type="submit" variant="primary" size={size} fullWidth loading={loading} disabled={loading}>
              {loading ? 'Enviando' : 'Enviar enlace'}
            </Button>
          </>
        )}
      </form>
    </AuthLayout>
  )
}
