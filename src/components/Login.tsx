import { useState } from 'react'
import { getSupabaseClient } from '../utils/supabase/client'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Wrench, XCircle, Shield } from 'lucide-react'

interface LoginProps {
  onLoginSuccess: (accessToken: string) => void
  onSwitchToRegister: () => void
  onSwitchToForgotPassword: () => void
}

export function Login({ onLoginSuccess, onSwitchToRegister, onSwitchToForgotPassword }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  const [isSuperAdminBlocked, setIsSuperAdminBlocked] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setIsSuperAdminBlocked(false)

    try {
      const supabase = getSupabaseClient()
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })

      if (signInError) {
        // Translate common errors to friendly Spanish messages
        let friendlyError = signInError.message
        if (signInError.message.includes('Invalid login credentials')) {
          friendlyError = 'Email o contraseña incorrectos. Por favor verifica tus datos.'
        } else if (signInError.message.includes('Email not confirmed')) {
          friendlyError = 'Tu email no ha sido confirmado. Revisa tu bandeja de entrada.'
        } else if (signInError.message.includes('User not found')) {
          friendlyError = 'No existe una cuenta con este email. ¿Deseas registrarte?'
        } else if (signInError.message.includes('Too many requests')) {
          friendlyError = 'Demasiados intentos fallidos. Por favor espera unos minutos e intenta de nuevo.'
        }
        setError(friendlyError)
        setLoading(false)
        return
      }

      if (data.session) {
        // Verificar si la cuenta posee rol de Superadministrador
        const user = data.user
        const isSuperAdmin = 
          user?.user_metadata?.role === 'superadmin' || 
          user?.user_metadata?.isSuperAdmin === true

        if (isSuperAdmin) {
          await supabase.auth.signOut()
          setError('Esta cuenta tiene rol de Superadministrador Maestro y está restringida exclusivamente a la administración global del SaaS. No puedes ingresar desde el portal de empresas/talleres.')
          setIsSuperAdminBlocked(true)
          setLoading(false)
          return
        }

        onLoginSuccess(data.session.access_token)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Error al iniciar sesión. Por favor verifica tu conexión e intenta de nuevo.')
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError('')

    try {
      const supabase = getSupabaseClient()
      
      // Note: You need to configure Google OAuth in Supabase dashboard
      // Follow instructions at: https://supabase.com/docs/guides/auth/social-login/auth-google
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      })

      if (signInError) {
        console.error('Google sign in error:', signInError)
        let friendlyError = 'Error al iniciar sesión con Google.'
        if (signInError.message.includes('not enabled')) {
          friendlyError = 'El inicio de sesión con Google no está habilitado. Por favor contacta al administrador.'
        } else if (signInError.message.includes('popup')) {
          friendlyError = 'La ventana de Google fue bloqueada. Por favor permite ventanas emergentes e intenta de nuevo.'
        }
        setError(friendlyError)
        setGoogleLoading(false)
      }
      // If successful, user will be redirected to Google
    } catch (err) {
      console.error('Google login error:', err)
      setError('Error al iniciar sesión con Google. Por favor verifica tu conexión e intenta de nuevo.')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            <Wrench className="text-white" size={32} />
          </div>
          <CardTitle className="text-3xl">Oryon App</CardTitle>
          <CardDescription>
            Inicia sesión para acceder a tu panel de gestión
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-[var(--danger-subtle)] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-danger">
                      {isSuperAdminBlocked ? 'Cuenta de Superadministrador Detectada' : 'No se pudo iniciar sesión'}
                    </p>
                    <p className="text-sm text-danger leading-relaxed">
                      {error}
                    </p>
                  </div>
                </div>
                {isSuperAdminBlocked && (
                  <Button
                    type="button"
                    className="w-full bg-[var(--state-diagnosis)] hover:bg-[var(--state-diagnosis)] text-white font-medium shadow-sm transition-all flex items-center justify-center gap-2"
                    onClick={() => window.location.href = '/superadmin'}
                  >
                    <Shield className="w-4 h-4" />
                    Ir al Portal Super Admin (/superadmin)
                  </Button>
                )}
              </div>
            )}
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                disabled={loading}
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label htmlFor="password">Contraseña</Label>
                <button
                  type="button"
                  onClick={onSwitchToForgotPassword}
                  className="text-xs text-primary hover:underline"
                  disabled={loading || googleLoading}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={loading || googleLoading}>
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-line"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-background text-ink-tertiary">O continúa con</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {googleLoading ? 'Redirigiendo...' : 'Continuar con Google'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-ink-secondary">
              ¿No tienes una cuenta?{' '}
              <button
                onClick={onSwitchToRegister}
                className="text-primary hover:underline"
                disabled={loading || googleLoading}
              >
                Regístrate gratis
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
