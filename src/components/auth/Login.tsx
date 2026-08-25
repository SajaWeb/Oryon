import { useState } from 'react'
import { Globe, Lock, Mail, Shield } from 'lucide-react'
import { getSupabaseClient, setSessionPersistence } from '../../utils/supabase/client'
import { Alert, Button, Checkbox, FormField, Input, PasswordInput } from '../oryon'
import { AuthDivider, AuthFootnote, AuthHeading, AuthLayout, AuthLink } from './AuthLayout'
import { authMessage, type AuthMessage } from './authErrors'
import { useTurnstile } from './Turnstile'

interface LoginProps {
  onLoginSuccess: (accessToken: string) => void
  onSwitchToRegister: () => void
  onSwitchToForgotPassword: () => void
  /** La cuenta existe pero nunca se verificó: hay que llevarla a /verify-email. */
  onNeedsVerification: (email: string) => void
}

export function Login({
  onLoginSuccess,
  onSwitchToRegister,
  onSwitchToForgotPassword,
  onNeedsVerification,
}: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [alert, setAlert] = useState<AuthMessage | null>(null)
  /* El bloqueo de superadmin no es un error de credenciales: es una cuenta válida
     entrando por la puerta equivocada, y merece su propia salida. */
  const [superAdminBlocked, setSuperAdminBlocked] = useState(false)

  const captcha = useTurnstile()
  const busy = loading || googleLoading
  const cleanEmail = email.trim().toLowerCase()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setAlert(null)
    setSuperAdminBlocked(false)

    try {
      const supabase = getSupabaseClient()
      // Debe fijarse antes del login: es lo que decide dónde se guarda la sesión.
      setSessionPersistence(remember)

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
        options: { captchaToken: captcha.captchaToken },
      })

      if (error) {
        setAlert(authMessage(error))
        return
      }

      if (data.session) {
        const user = data.user
        const isSuperAdmin =
          user?.user_metadata?.role === 'superadmin' || user?.user_metadata?.isSuperAdmin === true

        if (isSuperAdmin) {
          await supabase.auth.signOut()
          setSuperAdminBlocked(true)
          setAlert({
            title: 'Cuenta de superadministración',
            message:
              'Esta cuenta administra el SaaS completo y no entra por el portal de talleres.',
          })
          return
        }

        onLoginSuccess(data.session.access_token)
      }
    } catch (err) {
      setAlert(authMessage(err))
    } finally {
      // El token de Turnstile es de un solo uso, salga bien o mal.
      captcha.reset()
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    setAlert(null)
    try {
      setSessionPersistence(true)
      const { error } = await getSupabaseClient().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (error) {
        setAlert(authMessage(error))
        setGoogleLoading(false)
      }
      // Si va bien, el navegador ya está saliendo hacia Google.
    } catch (err) {
      setAlert(authMessage(err))
      setGoogleLoading(false)
    }
  }

  return (
    <AuthLayout variant="login">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <AuthHeading title="Inicia sesión">Accede al panel de tu taller.</AuthHeading>

        {alert && (
          <Alert role="alert" variant="danger" title={alert.title} onDismiss={() => setAlert(null)}>
            {alert.message}
            {alert.action === 'recover' && (
              <div style={{ marginTop: 8 }}>
                <AuthLink onClick={onSwitchToForgotPassword}>Recuperar mi contraseña</AuthLink>
              </div>
            )}
            {alert.action === 'resend' && (
              <div style={{ marginTop: 8 }}>
                <AuthLink onClick={() => onNeedsVerification(cleanEmail)}>Verificar mi correo</AuthLink>
              </div>
            )}
          </Alert>
        )}

        {superAdminBlocked && (
          <Button
            variant="secondary"
            iconLeft={Shield}
            fullWidth
            onClick={() => {
              window.location.href = '/superadmin'
            }}
          >
            Ir al portal de superadministración
          </Button>
        )}

        <FormField label="Correo">
          <Input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@taller.com"
            iconLeft={Mail}
            autoComplete="email"
            required
            disabled={busy}
          />
        </FormField>

        <FormField label="Contraseña">
          <PasswordInput
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            iconLeft={Lock}
            autoComplete="current-password"
            required
            disabled={busy}
          />
        </FormField>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Checkbox
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            label="Mantener sesión"
            disabled={busy}
          />
          <AuthLink onClick={onSwitchToForgotPassword} disabled={busy}>
            Olvidé mi contraseña
          </AuthLink>
        </div>

        {captcha.widget}

        <Button type="submit" variant="primary" fullWidth loading={loading} disabled={busy}>
          {loading ? 'Entrando' : 'Entrar'}
        </Button>

        <AuthDivider />

        <Button
          variant="secondary"
          iconLeft={Globe}
          fullWidth
          loading={googleLoading}
          disabled={busy}
          onClick={handleGoogle}
        >
          Continuar con Google
        </Button>

        <AuthFootnote>
          ¿Sin cuenta? <AuthLink onClick={onSwitchToRegister} disabled={busy}>Crear cuenta</AuthLink>
        </AuthFootnote>
      </form>
    </AuthLayout>
  )
}
