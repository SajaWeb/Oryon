import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { getSupabaseClient } from '../../utils/supabase/client'
import { Alert, Button, OTPInput } from '../oryon'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { AuthBack, AuthFootnote, AuthHeading, AuthLayout, AuthLink } from './AuthLayout'
import { authMessage, type AuthMessage } from './authErrors'
import { provisionAccount } from './provision'
import { useTurnstile } from './Turnstile'

interface VerifyEmailProps {
  email: string
  /** Verificado y aprovisionado: entra al producto. */
  onVerified: (accessToken: string) => void
  onBackToLogin: () => void
}

const CODE_LENGTH = 6
const RESEND_SECONDS = 60

export function VerifyEmail({ email, onVerified, onBackToLogin }: VerifyEmailProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [alert, setAlert] = useState<AuthMessage | null>(null)
  const [cooldown, setCooldown] = useState(RESEND_SECONDS)

  const { isMobile } = useBreakpoint()
  const captcha = useTurnstile()
  /* Evita que el auto-envío al completar los seis dígitos dispare dos veces
     cuando el usuario además pulsa el botón. */
  const submitting = useRef(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = window.setInterval(() => setCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000)
    return () => window.clearInterval(id)
  }, [cooldown])

  const verify = async (value: string) => {
    if (submitting.current) return
    if (value.length !== CODE_LENGTH) {
      setAlert({ title: 'Código incompleto', message: `Escribe los ${CODE_LENGTH} dígitos del correo.` })
      return
    }

    submitting.current = true
    setLoading(true)
    setAlert(null)

    try {
      const { data, error } = await getSupabaseClient().auth.verifyOtp({
        email,
        token: value,
        type: 'signup',
      })

      if (error || !data.session) {
        setAlert(error ? authMessage(error) : { title: 'Código incorrecto', message: 'Revisa los seis dígitos e intenta de nuevo.' })
        setCode('')
        return
      }

      // Con sesión ya hay identidad: el servidor crea empresa, sucursal y perfil.
      const result = await provisionAccount(data.session.access_token)
      if (!result.success) {
        setAlert({
          title: 'Cuenta verificada, pero falta configurarla',
          message: result.error ?? 'No se pudo crear el taller. Vuelve a entrar en un momento.',
        })
        return
      }

      onVerified(data.session.access_token)
    } catch (err) {
      setAlert(authMessage(err))
    } finally {
      submitting.current = false
      setLoading(false)
    }
  }

  const resend = async () => {
    if (cooldown > 0) return
    setResending(true)
    setAlert(null)
    try {
      const { error } = await getSupabaseClient().auth.resend({
        type: 'signup',
        email,
        options: { captchaToken: captcha.captchaToken },
      })
      if (error) {
        setAlert(authMessage(error))
        return
      }
      toast.success('Te enviamos un código nuevo')
      setCode('')
      setCooldown(RESEND_SECONDS)
    } catch (err) {
      setAlert(authMessage(err))
    } finally {
      captcha.reset()
      setResending(false)
    }
  }

  return (
    <AuthLayout variant="support">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void verify(code)
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
      >
        <AuthBack onClick={onBackToLogin} />

        <AuthHeading title="Verifica tu correo">
          Enviamos un código de {CODE_LENGTH} dígitos a{' '}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--text-primary)' }}>
            {email}
          </span>
        </AuthHeading>

        {alert && (
          <Alert role="alert" variant="danger" title={alert.title} onDismiss={() => setAlert(null)}>
            {alert.message}
          </Alert>
        )}

        <OTPInput
          length={CODE_LENGTH}
          value={code}
          onChange={setCode}
          onComplete={(value) => void verify(value)}
          invalid={Boolean(alert)}
          disabled={loading}
          autoFocus
          size={isMobile ? 'lg' : 'md'}
        />

        {captcha.widget}

        <Button
          type="submit"
          variant="primary"
          size={isMobile ? 'lg' : 'md'}
          fullWidth
          loading={loading}
          disabled={loading || resending}
        >
          {loading ? 'Verificando' : 'Verificar'}
        </Button>

        <AuthFootnote>
          {cooldown > 0 ? (
            <>No llegó. Puedes pedir otro en {cooldown}s</>
          ) : (
            <>
              No llegó.{' '}
              <AuthLink onClick={resend} disabled={resending}>
                {resending ? 'Enviando…' : 'Reenviar código'}
              </AuthLink>
            </>
          )}
        </AuthFootnote>
      </form>
    </AuthLayout>
  )
}
