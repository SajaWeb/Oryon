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
  /** Código enviado: continúa en la pantalla de recuperación. */
  onCodeSent: (email: string) => void
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function ForgotPassword({ onBackToLogin, onCodeSent }: ForgotPasswordProps) {
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [alert, setAlert] = useState<AuthMessage | null>(null)
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
        captchaToken: await captcha.getToken(),
      })

      /* Un límite de envíos sí se le dice al usuario. Lo demás se calla a
         propósito: se avanza a la pantalla del código exista o no la cuenta, para
         que la respuesta no revele qué correos están registrados. */
      if (error && /rate limit|security purposes/i.test(error.message)) {
        setAlert(authMessage(error))
        return
      }

      onCodeSent(cleanEmail)
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
          Enviamos un código de 6 dígitos al correo registrado. Sirve una sola vez y caduca en una hora.
        </AuthHeading>

        {alert && (
          <Alert role="alert" variant="danger" title={alert.title} onDismiss={() => setAlert(null)}>
            {alert.message}
          </Alert>
        )}

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
          {loading ? 'Enviando' : 'Enviar código'}
        </Button>
      </form>
    </AuthLayout>
  )
}
