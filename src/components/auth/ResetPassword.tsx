import { useEffect, useMemo, useRef, useState } from 'react'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import { getSupabaseClient } from '../../utils/supabase/client'
import { MIN_PASSWORD_LENGTH, scorePassword } from '../../utils/password-strength'
import { Alert, Button, FormField, OTPInput, PasswordInput, PasswordMeter } from '../oryon'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { AuthBack, AuthFootnote, AuthHeading, AuthLayout, AuthLink } from './AuthLayout'
import { authMessage, type AuthMessage } from './authErrors'
import { useTurnstile } from './Turnstile'

interface ResetPasswordProps {
  onResetSuccess: () => void
  onBackToLogin: () => void
}

/**
 * Recuperación de contraseña: código de 6 dígitos y luego contraseña nueva.
 *
 * Se pasó de enlace a código porque con PKCE el enlace solo se puede canjear en el
 * navegador que lo pidió: el code verifier vive en su localStorage. Pedirlo en el
 * móvil y abrirlo en el computador fallaba, y abrirlo desde el navegador interno
 * de Gmail —almacenamiento aparte— también. `verifyOtp` con código no usa PKCE.
 *
 * La rama de `token_hash`/`code` se conserva para los enlaces que ya se enviaron
 * antes del cambio; caducan en una hora y luego sobra.
 */
const CODE_LENGTH = 6
const RESEND_SECONDS = 60

type Phase = 'checking' | 'code' | 'ready' | 'invalid' | 'done'

export function ResetPassword({ onResetSuccess, onBackToLogin }: ResetPasswordProps) {
  const [phase, setPhase] = useState<Phase>('checking')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({})
  const [alert, setAlert] = useState<AuthMessage | null>(null)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(RESEND_SECONDS)

  const { isMobile } = useBreakpoint()
  const captcha = useTurnstile()
  const size = isMobile ? 'lg' : 'md'
  const strength = useMemo(() => scorePassword(password, { email }), [password, email])
  const verifying = useRef(false)

  useEffect(() => {
    let cancelled = false

    const authorize = async () => {
      const supabase = getSupabaseClient()
      const params = new URLSearchParams(window.location.search)
      const tokenHash = params.get('token_hash')
      const legacyCode = params.get('code')
      const emailParam = params.get('email')

      // Enlaces emitidos antes del cambio a código.
      try {
        if (tokenHash || legacyCode) {
          const { data, error } = tokenHash
            ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
            : await supabase.auth.exchangeCodeForSession(legacyCode!)
          if (cancelled) return
          if (!error && data.session) {
            setEmail(data.user?.email ?? '')
            setPhase('ready')
            // El token ya se gastó: fuera de la barra para que no quede en el historial.
            window.history.replaceState({}, '', window.location.pathname)
            return
          }
          if (error) setAlert(authMessage(error))
        }

        if (emailParam) {
          if (cancelled) return
          setEmail(emailParam.toLowerCase())
          setPhase('code')
          return
        }

        // Puede que detectSessionInUrl ya haya abierto la sesión de recuperación.
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

  useEffect(() => {
    if (phase !== 'code' || cooldown <= 0) return
    const id = window.setInterval(() => setCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000)
    return () => window.clearInterval(id)
  }, [phase, cooldown])

  const verifyCode = async (value: string) => {
    if (verifying.current) return
    if (value.length !== CODE_LENGTH) {
      setAlert({ title: 'Código incompleto', message: `Escribe los ${CODE_LENGTH} dígitos del correo.` })
      return
    }

    verifying.current = true
    setLoading(true)
    setAlert(null)
    try {
      const { data, error } = await getSupabaseClient().auth.verifyOtp({
        email,
        token: value,
        type: 'recovery',
      })
      if (error || !data.session) {
        setAlert(error ? authMessage(error) : { title: 'Código incorrecto', message: 'Revisa los seis dígitos e intenta de nuevo.' })
        setCode('')
        return
      }
      setPhase('ready')
    } catch (err) {
      setAlert(authMessage(err))
    } finally {
      verifying.current = false
      setLoading(false)
    }
  }

  const resend = async () => {
    if (cooldown > 0) return
    setResending(true)
    setAlert(null)
    try {
      const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email, {
        captchaToken: captcha.captchaToken,
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
         nueva, lo que además comprueba que quedó bien guardada. */
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

  const errorAlert = alert && (
    <Alert role="alert" variant="danger" title={alert.title} onDismiss={() => setAlert(null)}>
      {alert.message}
    </Alert>
  )

  if (phase === 'checking') {
    return (
      <AuthLayout variant="support">
        <div style={{ display: 'grid', placeItems: 'center', minHeight: 200 }}>
          <span
            aria-label="Comprobando"
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

  if (phase === 'code') {
    return (
      <AuthLayout variant="support">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void verifyCode(code)
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
        >
          <AuthBack onClick={onBackToLogin} />

          <AuthHeading title="Escribe el código">
            Si{' '}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--text-primary)' }}>
              {email}
            </span>{' '}
            tiene cuenta en Oryon, ya va en camino un código de {CODE_LENGTH} dígitos.
          </AuthHeading>

          {errorAlert}

          <OTPInput
            length={CODE_LENGTH}
            value={code}
            onChange={setCode}
            onComplete={(value) => void verifyCode(value)}
            invalid={Boolean(alert)}
            disabled={loading}
            autoFocus
            size={isMobile ? 'lg' : 'md'}
          />

          {captcha.widget}

          <Button type="submit" variant="primary" size={size} fullWidth loading={loading} disabled={loading || resending}>
            {loading ? 'Verificando' : 'Verificar código'}
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

  if (phase === 'invalid') {
    return (
      <AuthLayout variant="support">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <AuthHeading title="No hay nada que restablecer">
            Empieza pidiendo un código desde la pantalla de recuperación.
          </AuthHeading>
          {errorAlert}
          <Button variant="primary" size={size} fullWidth onClick={onResetSuccess}>
            Ir a recuperar contraseña
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

        {errorAlert}

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
