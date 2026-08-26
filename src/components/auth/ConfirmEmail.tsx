import { useEffect, useRef, useState } from 'react'
import type { EmailOtpType } from '@supabase/supabase-js'
import { getSupabaseClient } from '../../utils/supabase/client'
import { Alert, Button, Loading } from '../oryon'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { AuthHeading, AuthLayout } from './AuthLayout'
import { authMessage, type AuthMessage } from './authErrors'

interface ConfirmEmailProps {
  onConfirmSuccess: () => void
}

/**
 * Confirmación por enlace.
 *
 * El registro normal ya no pasa por aquí: usa el código de seis dígitos de
 * /verify-email. Esta pantalla queda para los enlaces que Supabase sí manda como
 * enlace —cambio de correo, invitaciones— y para los correos antiguos que sigan
 * dando vueltas por alguna bandeja.
 */
const VALID_TYPES: EmailOtpType[] = ['signup', 'email_change', 'email', 'invite', 'magiclink']

export function ConfirmEmail({ onConfirmSuccess }: ConfirmEmailProps) {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [alert, setAlert] = useState<AuthMessage | null>(null)
  const [email, setEmail] = useState('')
  const [countdown, setCountdown] = useState(4)
  /* React 18 en modo estricto monta dos veces; sin esto se canjea el token dos
     veces y el segundo intento falla porque ya se gastó. */
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const run = async () => {
      const supabase = getSupabaseClient()
      const params = new URLSearchParams(window.location.search)
      const tokenHash = params.get('token_hash') ?? params.get('token')
      const rawType = params.get('type')
      const code = params.get('code')

      try {
        if (tokenHash) {
          const type = (VALID_TYPES as string[]).includes(rawType ?? '')
            ? (rawType as EmailOtpType)
            : 'email'
          const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
          if (!error && data.session) {
            setEmail(data.user?.email ?? '')
            setStatus('success')
            return
          }
          if (error) setAlert(authMessage(error))
        } else if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (!error && data.session) {
            setEmail(data.user?.email ?? '')
            setStatus('success')
            return
          }
          if (error) setAlert(authMessage(error))
        }

        // Puede que detectSessionInUrl ya lo haya canjeado al cargar la página.
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          setEmail(data.session.user.email ?? '')
          setStatus('success')
          return
        }

        setAlert((prev) => prev ?? {
          title: 'Enlace no válido',
          message: 'Puede que ya se haya usado o que haya caducado. Inicia sesión o pide uno nuevo.',
        })
        setStatus('error')
      } catch (err) {
        setAlert(authMessage(err))
        setStatus('error')
      }
    }

    void run()
  }, [])

  useEffect(() => {
    if (status !== 'success') return
    const id = window.setInterval(() => {
      setCountdown((s) => {
        if (s <= 1) {
          window.clearInterval(id)
          onConfirmSuccess()
          return 0
        }
        return s - 1
      })
    }, 1000)
    // Antes este intervalo no se limpiaba: seguía corriendo tras desmontar.
    return () => window.clearInterval(id)
  }, [status, onConfirmSuccess])

  const { isMobile } = useBreakpoint()
  const size = isMobile ? 'lg' : 'md'

  return (
    <AuthLayout variant="support">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {status === 'verifying' && (
          <>
            <AuthHeading title="Verificando tu correo">Un momento, estamos comprobando el enlace.</AuthHeading>
            <Loading minHeight={160} width={84} />
          </>
        )}

        {status === 'success' && (
          <>
            <AuthHeading title="Correo verificado">
              {email ? (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--text-primary)' }}>
                  {email}
                </span>
              ) : (
                'Tu cuenta quedó activa.'
              )}
            </AuthHeading>
            <Alert variant="success" title="Cuenta activa">
              Ya puedes entrar al panel de tu taller.
            </Alert>
            <Button variant="primary" size={size} fullWidth onClick={onConfirmSuccess}>
              Continuar ({countdown}s)
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <AuthHeading title="No se pudo verificar">Este enlace no nos sirve.</AuthHeading>
            {alert && (
              <Alert role="alert" variant="danger" title={alert.title}>
                {alert.message}
              </Alert>
            )}
            <Button variant="primary" size={size} fullWidth onClick={onConfirmSuccess}>
              Ir a iniciar sesión
            </Button>
          </>
        )}
      </div>
    </AuthLayout>
  )
}
