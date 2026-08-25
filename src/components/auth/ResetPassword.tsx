import { useEffect, useMemo, useState } from 'react'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import { getSupabaseClient } from '../../utils/supabase/client'
import { MIN_PASSWORD_LENGTH, scorePassword } from '../../utils/password-strength'
import { Alert, Button, FormField, PasswordInput, PasswordMeter } from '../oryon'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { AuthHeading, AuthLayout } from './AuthLayout'
import { authMessage, type AuthMessage } from './authErrors'

interface ResetPasswordProps {
  onResetSuccess: () => void
}

/**
 * Nueva contraseña a partir del enlace del correo.
 *
 * El enlace trae `token_hash` + `type=recovery`; canjearlo por sesión es lo único
 * que autoriza el cambio. Ya no hay token propio en el KV: los generaba
 * `Math.random()`, vivían una hora y se podían probar sin límite.
 */
type Phase = 'checking' | 'ready' | 'invalid' | 'done'

export function ResetPassword({ onResetSuccess }: ResetPasswordProps) {
  const [phase, setPhase] = useState<Phase>('checking')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({})
  const [alert, setAlert] = useState<AuthMessage | null>(null)
  const [loading, setLoading] = useState(false)

  const { isMobile } = useBreakpoint()
  const size = isMobile ? 'lg' : 'md'
  const strength = useMemo(() => scorePassword(password, { email }), [password, email])

  useEffect(() => {
    let cancelled = false

    const authorize = async () => {
      const supabase = getSupabaseClient()
      const params = new URLSearchParams(window.location.search)
      const tokenHash = params.get('token_hash')
      const code = params.get('code')

      try {
        if (tokenHash) {
          const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
          if (cancelled) return
          if (!error && data.session) {
            setEmail(data.user?.email ?? '')
            setPhase('ready')
            // El token ya se gastó: fuera de la barra para que no se reenvíe ni quede en el historial.
            window.history.replaceState({}, '', window.location.pathname)
            return
          }
          if (error) setAlert(authMessage(error))
        } else if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (cancelled) return
          if (!error && data.session) {
            setEmail(data.user?.email ?? '')
            setPhase('ready')
            window.history.replaceState({}, '', window.location.pathname)
            return
          }
          if (error) setAlert(authMessage(error))
        }

        /* Sin parámetros útiles: puede que detectSessionInUrl ya los haya
           consumido y la sesión de recuperación esté abierta. */
        const { data } = await supabase.auth.getSession()
        if (cancelled) return
        if (data.session) {
          setEmail(data.session.user.email ?? '')
          setPhase('ready')
        } else {
          setPhase('invalid')
        }
      } catch (err) {
        if (cancelled) return
        setAlert(authMessage(err))
        setPhase('invalid')
      }
    }

    void authorize()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const next: typeof errors = {}
    if (password.length < MIN_PASSWORD_LENGTH) {
      next.password = `La contraseña necesita al menos ${MIN_PASSWORD_LENGTH} caracteres.`
    } else if (!strength.acceptable) {
      next.password = strength.advice
    }
    if (confirmPassword !== password) next.confirmPassword = 'Las dos contraseñas tienen que coincidir.'

    setErrors(next)
    if (Object.keys(next).length > 0) return

    setAlert(null)
    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setAlert(authMessage(error))
        return
      }

      /* Cerrar la sesión de recuperación: se entra de nuevo con la contraseña
         nueva, que además comprueba que quedó bien guardada. */
      await supabase.auth.signOut()
      setPhase('done')
      toast.success('Contraseña actualizada')
      window.setTimeout(onResetSuccess, 1800)
    } catch (err) {
      setAlert(authMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (phase === 'checking') {
    return (
      <AuthLayout variant="support">
        <div style={{ display: 'grid', placeItems: 'center', minHeight: 200 }}>
          <span
            aria-label="Comprobando el enlace"
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: '2px solid var(--border-subtle)',
              borderBottomColor: 'var(--accent-400)',
              animation: 'oryon-spin 900ms linear infinite',
            }}
          />
        </div>
      </AuthLayout>
    )
  }

  if (phase === 'invalid') {
    return (
      <AuthLayout variant="support">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <AuthHeading title="Este enlace ya no sirve">
            Los enlaces de recuperación se usan una sola vez y caducan en una hora.
          </AuthHeading>
          {alert && (
            <Alert role="alert" variant="danger" title={alert.title}>
              {alert.message}
            </Alert>
          )}
          <Button variant="primary" size={size} fullWidth onClick={onResetSuccess}>
            Pedir un enlace nuevo
          </Button>
        </div>
      </AuthLayout>
    )
  }

  if (phase === 'done') {
    return (
      <AuthLayout variant="support">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <AuthHeading title="Contraseña guardada">Ya puedes entrar con la contraseña nueva.</AuthHeading>
          <Alert variant="success" title="Listo">
            Cerramos la sesión de recuperación por seguridad.
          </Alert>
          <Button variant="primary" size={size} fullWidth onClick={onResetSuccess}>
            Ir a iniciar sesión
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout variant="support">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <AuthHeading title="Nueva contraseña">
          {email ? (
            <>
              Para{' '}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--text-primary)' }}>
                {email}
              </span>
            </>
          ) : (
            'Escribe la contraseña con la que vas a entrar de ahora en adelante.'
          )}
        </AuthHeading>

        {alert && (
          <Alert role="alert" variant="danger" title={alert.title} onDismiss={() => setAlert(null)}>
            {alert.message}
          </Alert>
        )}

        <FormField
          label="Nueva contraseña"
          hint={password ? undefined : `Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
          error={errors.password}
        >
          <PasswordInput
            size={size}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setErrors((p) => ({ ...p, password: undefined }))
            }}
            placeholder="••••••••"
            iconLeft={Lock}
            autoComplete="new-password"
            autoFocus
            disabled={loading}
          />
        </FormField>

        {password && (
          <PasswordMeter
            score={strength.score}
            label={strength.label}
            advice={strength.advice}
            style={{ marginTop: -10 }}
          />
        )}

        <FormField label="Confirmar contraseña" error={errors.confirmPassword}>
          <PasswordInput
            size={size}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              setErrors((p) => ({ ...p, confirmPassword: undefined }))
            }}
            placeholder="••••••••"
            iconLeft={Lock}
            autoComplete="new-password"
            disabled={loading}
          />
        </FormField>

        <Button type="submit" variant="primary" size={size} fullWidth loading={loading} disabled={loading}>
          {loading ? 'Guardando' : 'Guardar contraseña'}
        </Button>
      </form>
    </AuthLayout>
  )
}
