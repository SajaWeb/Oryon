import { useMemo, useState } from 'react'
import { Globe, Lock, Mail } from 'lucide-react'
import { getSupabaseClient, setSessionPersistence } from '../../utils/supabase/client'
import { MIN_PASSWORD_LENGTH, scorePassword } from '../../utils/password-strength'
import {
  Alert,
  Button,
  Checkbox,
  FormField,
  Input,
  PasswordInput,
  PasswordMeter,
} from '../oryon'
import { AuthDivider, AuthFootnote, AuthHeading, AuthLayout, AuthLink } from './AuthLayout'
import { ALREADY_REGISTERED, authMessage, isExistingUser, type AuthMessage } from './authErrors'
import { useTurnstile } from './Turnstile'

interface RegisterProps {
  /** La cuenta quedó creada sin confirmar: toca verificar el correo. */
  onRegistered: (email: string) => void
  onSwitchToLogin: () => void
  onSwitchToForgotPassword: () => void
}

type Field = 'companyName' | 'name' | 'email' | 'password' | 'confirmPassword' | 'terms'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function Register({ onRegistered, onSwitchToLogin, onSwitchToForgotPassword }: RegisterProps) {
  const [companyName, setCompanyName] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [terms, setTerms] = useState(false)

  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [alert, setAlert] = useState<AuthMessage | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const captcha = useTurnstile()
  const busy = loading || googleLoading
  const cleanEmail = email.trim().toLowerCase()

  const strength = useMemo(
    () => scorePassword(password, { email: cleanEmail, name: `${name} ${companyName}` }),
    [password, cleanEmail, name, companyName]
  )

  const validate = (): boolean => {
    const next: Partial<Record<Field, string>> = {}

    if (!companyName.trim()) next.companyName = 'Escribe el nombre del taller.'
    if (!name.trim()) next.name = 'Escribe tu nombre completo.'
    if (!EMAIL_RE.test(cleanEmail)) next.email = 'Escribe un correo válido, con @ y dominio.'
    if (password.length < MIN_PASSWORD_LENGTH) {
      next.password = `La contraseña necesita al menos ${MIN_PASSWORD_LENGTH} caracteres.`
    } else if (!strength.acceptable) {
      next.password = strength.advice
    }
    if (confirmPassword !== password) next.confirmPassword = 'Las dos contraseñas tienen que coincidir.'
    if (!terms) next.terms = 'Hay que aceptar los términos para crear la cuenta.'

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAlert(null)
    if (!validate()) return

    setLoading(true)
    try {
      setSessionPersistence(true)
      const { data, error } = await getSupabaseClient().auth.signUp({
        email: cleanEmail,
        password,
        options: {
          // El aprovisionamiento de empresa y sucursal lee esto tras verificar.
          data: { name: name.trim(), companyName: companyName.trim() },
          captchaToken: await captcha.getToken(),
        },
      })

      if (error) {
        setAlert(authMessage(error))
        return
      }

      /* Con la protección de enumeración activada Supabase no devuelve error para
         un correo ya registrado: devuelve un usuario sin identidades. */
      if (isExistingUser(data)) {
        setAlert(ALREADY_REGISTERED)
        return
      }

      onRegistered(cleanEmail)
    } catch (err) {
      setAlert(authMessage(err))
    } finally {
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
    } catch (err) {
      setAlert(authMessage(err))
      setGoogleLoading(false)
    }
  }

  const clear = (field: Field) => setErrors((prev) => ({ ...prev, [field]: undefined }))

  return (
    <AuthLayout variant="register">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <AuthHeading title="Crear cuenta">Un taller por cuenta. Los técnicos se invitan después.</AuthHeading>

        {alert && (
          <Alert role="alert" variant={alert.action === 'login' ? 'warning' : 'danger'} title={alert.title} onDismiss={() => setAlert(null)}>
            {alert.message}
            {alert.action === 'login' && (
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                <AuthLink onClick={onSwitchToLogin}>Inicia sesión</AuthLink>
                <AuthLink onClick={onSwitchToForgotPassword}>¿Olvidaste la contraseña?</AuthLink>
              </div>
            )}
          </Alert>
        )}

        <FormField label="Nombre de la empresa" error={errors.companyName}>
          <Input
            value={companyName}
            onChange={(e) => {
              setCompanyName(e.target.value)
              clear('companyName')
            }}
            placeholder="Servitec Celulares"
            autoComplete="organization"
            disabled={busy}
          />
        </FormField>

        <FormField label="Tu nombre completo" error={errors.name}>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              clear('name')
            }}
            placeholder="Andrés Chavarría"
            autoComplete="name"
            disabled={busy}
          />
        </FormField>

        <FormField
          label="Correo"
          hint="A este correo llega el código de verificación"
          error={errors.email}
        >
          <Input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              clear('email')
            }}
            placeholder="tu@taller.com"
            iconLeft={Mail}
            autoComplete="email"
            disabled={busy}
          />
        </FormField>

        <FormField
          label="Contraseña"
          hint={password ? undefined : `Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
          error={errors.password}
        >
          <PasswordInput
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              clear('password')
            }}
            placeholder="••••••••"
            iconLeft={Lock}
            autoComplete="new-password"
            disabled={busy}
          />
        </FormField>

        {password && (
          <PasswordMeter
            score={strength.score}
            label={strength.label}
            advice={strength.advice}
            style={{ marginTop: -8 }}
          />
        )}

        <FormField label="Confirmar contraseña" error={errors.confirmPassword}>
          <PasswordInput
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              clear('confirmPassword')
            }}
            placeholder="••••••••"
            iconLeft={Lock}
            autoComplete="new-password"
            disabled={busy}
          />
        </FormField>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Checkbox
            checked={terms}
            onChange={(e) => {
              setTerms(e.target.checked)
              clear('terms')
            }}
            invalid={Boolean(errors.terms)}
            label="Acepto los términos y la política de datos"
            disabled={busy}
          />
          {errors.terms && (
            <div role="alert" style={{ fontSize: 'var(--text-caption)', color: 'var(--danger)' }}>
              {errors.terms}
            </div>
          )}
        </div>

        {captcha.widget}

        <Button type="submit" variant="primary" fullWidth loading={loading} disabled={busy}>
          {loading ? 'Creando cuenta' : 'Crear cuenta'}
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
          ¿Ya tienes cuenta? <AuthLink onClick={onSwitchToLogin} disabled={busy}>Inicia sesión</AuthLink>
        </AuthFootnote>
      </form>
    </AuthLayout>
  )
}
