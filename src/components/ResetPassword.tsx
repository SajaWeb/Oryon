import { useState, useEffect } from 'react'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { getSupabaseClient } from '../utils/supabase/client'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, ShieldCheck, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

interface ResetPasswordProps {
  onResetSuccess: () => void
}

export function ResetPassword({ onResetSuccess }: ResetPasswordProps) {
  // Parámetros de URL
  const [token, setToken] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [code, setCode] = useState<string>('')

  // Formulario
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Extraer token / email de query params
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const tokenParam = urlParams.get('token') || ''
      const emailParam = urlParams.get('email') || ''
      const codeParam = urlParams.get('code') || ''

      if (tokenParam) setToken(tokenParam)
      if (emailParam) setEmail(emailParam)
      if (codeParam) setCode(codeParam)
    } catch (e) {
      console.warn('Error parsing URL search params:', e)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validar contraseñas
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    try {
      // 1. Intentar actualizar mediante el endpoint seguro con token/código de Resend
      if (token || (email && code)) {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/auth/reset-password-confirm`,
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify({
              token: token || undefined,
              code: code || undefined,
              email: email || undefined,
              password
            })
          }
        )

        const data = await response.json()

        if (data.success) {
          setSuccess(true)
          toast.success('¡Contraseña actualizada con éxito!')
          setLoading(false)
          setTimeout(() => {
            onResetSuccess()
          }, 2500)
          return
        } else {
          // Si falló el token de Resend y no hay sesión de Supabase Auth
          setError(data.error || 'Error al actualizar contraseña')
          setLoading(false)
          return
        }
      }

      // 2. Fallback con Supabase Auth session si se abrió desde link nativo de Supabase
      const supabase = getSupabaseClient()
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        console.error('Password update error:', updateError)
        setError(updateError.message || 'El enlace de recuperación es inválido o ha expirado.')
        setLoading(false)
        return
      }

      setSuccess(true)
      toast.success('¡Contraseña actualizada!')
      setLoading(false)

      setTimeout(() => {
        onResetSuccess()
      }, 2500)
    } catch (err: any) {
      console.error('Password reset error:', err)
      setError('Error al actualizar la contraseña. Por favor intenta de nuevo.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md border-border bg-card shadow-lg">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto w-14 h-14 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
              <CheckCircle2 size={32} />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight">¡Contraseña Restablecida!</CardTitle>
            <CardDescription className="text-xs">
              Tu clave de acceso ha sido actualizada de forma segura. Redirigiendo al inicio de sesión...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <Button onClick={onResetSuccess} className="w-full h-10 text-xs font-semibold">
              Ir al Inicio de Sesión Ahora
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md border-border bg-card shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto w-14 h-14 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-1">
            <ShieldCheck size={28} />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">Establecer Nueva Contraseña</CardTitle>
          <CardDescription className="text-xs">
            Ingresa tu nueva contraseña para restaurar el acceso a tu cuenta en Oryon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {error && (
              <Alert variant="destructive">
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            {/* Si no vino token por URL, permitir ingresar correo y código de 6 dígitos */}
            {!token && (
              <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-3">
                <div>
                  <Label className="text-[11px] font-semibold mb-1 block">Correo Electrónico:</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-semibold mb-1 block">Código de Seguridad (6 dígitos):</Label>
                  <Input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.trim())}
                    placeholder="123456"
                    required
                    maxLength={6}
                    className="h-9 text-xs font-mono text-center tracking-widest font-bold"
                  />
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Nueva Contraseña:</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  disabled={loading}
                  className="h-10 text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Confirmar Nueva Contraseña:</Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  required
                  minLength={6}
                  disabled={loading}
                  className="h-10 text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-10 text-xs font-semibold mt-2" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Actualizando Contraseña...
                </>
              ) : (
                'Guardar Nueva Contraseña'
              )}
            </Button>

            <Button
              type="button"
              onClick={onResetSuccess}
              variant="ghost"
              className="w-full h-10 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancelar y volver al login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default ResetPassword
