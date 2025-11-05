import { useState } from 'react'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { getSupabaseClient } from '../utils/supabase/client'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Wrench, CheckCircle, XCircle } from 'lucide-react'

interface RegisterProps {
  onRegisterSuccess: () => void
  onSwitchToLogin: () => void
}

export function Register({ onRegisterSuccess, onSwitchToLogin }: RegisterProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    companyName: ''
  })
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validations
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden. Por favor verifica que ambas contraseñas sean iguales.')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres. Por favor elige una contraseña más segura.')
      setLoading(false)
      return
    }

    if (!formData.companyName.trim()) {
      setError('El nombre de la empresa es obligatorio.')
      setLoading(false)
      return
    }

    if (!formData.name.trim()) {
      setError('Tu nombre completo es obligatorio.')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/auth/signup`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            name: formData.name,
            companyName: formData.companyName
          })
        }
      )

      const data = await response.json()

      if (!data.success) {
        // Translate common errors to friendly Spanish messages
        let friendlyError = data.error || 'Error al crear la cuenta'
        if (data.error?.includes('User already registered')) {
          friendlyError = 'Ya existe una cuenta con este email. ¿Deseas iniciar sesión en su lugar?'
        } else if (data.error?.includes('Invalid email')) {
          friendlyError = 'El formato del email no es válido. Por favor verifica tu email.'
        } else if (data.error?.includes('Password')) {
          friendlyError = 'La contraseña no cumple con los requisitos mínimos de seguridad.'
        } else if (data.error?.includes('rate limit')) {
          friendlyError = 'Demasiados intentos. Por favor espera unos minutos e intenta de nuevo.'
        }
        setError(friendlyError)
        setLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        onRegisterSuccess()
      }, 2000)
    } catch (err) {
      console.error('Register error:', err)
      setError('Error al crear la cuenta. Por favor verifica tu conexión a internet e intenta de nuevo.')
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
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
        console.error('Google sign up error:', signInError)
        let friendlyError = 'Error al registrarse con Google.'
        if (signInError.message.includes('not enabled')) {
          friendlyError = 'El registro con Google no está habilitado. Por favor contacta al administrador o regístrate con email.'
        } else if (signInError.message.includes('popup')) {
          friendlyError = 'La ventana de Google fue bloqueada. Por favor permite ventanas emergentes e intenta de nuevo.'
        } else if (signInError.message.includes('already')) {
          friendlyError = 'Ya existe una cuenta con este email de Google. ¿Deseas iniciar sesión en su lugar?'
        }
        setError(friendlyError)
        setGoogleLoading(false)
      }
      // If successful, user will be redirected to Google
    } catch (err) {
      console.error('Google signup error:', err)
      setError('Error al registrarse con Google. Por favor verifica tu conexión e intenta de nuevo.')
      setGoogleLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle className="text-green-600 dark:text-green-400" size={48} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  ¡Cuenta creada exitosamente!
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Tu cuenta y empresa han sido creadas correctamente.
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-900 dark:text-green-100">
                  <strong className="block mb-1">🎉 ¡Bienvenido a Oryon App!</strong>
                  Tienes 7 días de prueba gratis para explorar todas las funcionalidades
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Redirigiendo al inicio de sesión...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <Wrench className="text-white" size={32} />
          </div>
          <CardTitle className="text-3xl">Crear Cuenta</CardTitle>
          <CardDescription>
            Obtén 7 días gratis para probar Oryon App
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-red-900 dark:text-red-100">
                      Error al crear la cuenta
                    </p>
                    <p className="text-sm text-red-800 dark:text-red-200 leading-relaxed">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <Label htmlFor="companyName">Nombre de la Empresa</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Mi Empresa de Reparaciones"
                required
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="name">Tu Nombre Completo</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Juan Pérez"
                required
                disabled={loading}
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="tu@email.com"
                required
                disabled={loading}
              />
            </div>
            
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={loading || googleLoading}>
              {loading ? 'Creando cuenta...' : 'Crear Cuenta Gratis'}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">O regístrate con</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignup}
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
            <p className="text-sm text-gray-600">
              ¿Ya tienes una cuenta?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-blue-600 hover:underline"
                disabled={loading || googleLoading}
              >
                Inicia sesión
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
