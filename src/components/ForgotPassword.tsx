import { useState } from 'react'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { getSupabaseClient } from '../utils/supabase/client'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Mail, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

interface ForgotPasswordProps {
  onBackToLogin: () => void
}

export function ForgotPassword({ onBackToLogin }: ForgotPasswordProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [fallbackLink, setFallbackLink] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setError('')
    setSuccess(false)
    setFallbackLink(null)

    try {
      // 1. Intentar enviar correo con el servicio de Resend a través del backend de Oryon
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/auth/forgot-password`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            email: email.trim(),
            origin: window.location.origin
          })
        }
      )

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        if (data.resetLink) {
          setFallbackLink(data.resetLink)
        }
        toast.success('Instrucciones de recuperación enviadas a tu correo')
        setLoading(false)
        return
      }

      // 2. Fallback estándar con Supabase Auth si el backend reporta algún error
      const supabase = getSupabaseClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (resetError) {
        setError(resetError.message)
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)
    } catch (err: any) {
      console.error('Password reset request error:', err)
      setError('Error al solicitar recuperación de contraseña. Por favor intenta de nuevo.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md border-border bg-card shadow-lg">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto w-14 h-14 bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-success rounded-full flex items-center justify-center">
              <CheckCircle2 size={32} />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight">¡Correo de Recuperación Enviado!</CardTitle>
            <CardDescription className="text-xs">
              Hemos enviado las instrucciones a <strong>{email}</strong> mediante el servicio seguro de Resend.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <Alert className="bg-muted/50 border-border">
              <AlertDescription className="text-xs leading-relaxed text-muted-foreground">
                Revisa tu bandeja de entrada o carpeta de spam. Encontrarás un enlace seguro y un código de 6 dígitos para restablecer tu contraseña.
              </AlertDescription>
            </Alert>

            {fallbackLink && (
              <div className="p-3 bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] border border-[color-mix(in_srgb,var(--warning)_20%,transparent)] rounded-lg text-warning">
                <p className="font-semibold text-[11px] mb-1">Enlace directo generado para pruebas:</p>
                <a 
                  href={fallbackLink} 
                  className="text-[11px] underline break-all hover:text-warning"
                >
                  Abrir asistente de nueva contraseña
                </a>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <Button 
                onClick={() => {
                  window.location.href = `/reset-password?email=${encodeURIComponent(email)}`
                }}
                className="w-full h-10 text-xs font-semibold"
              >
                Ingresar Código de 6 Dígitos
              </Button>

              <Button 
                onClick={onBackToLogin} 
                className="w-full h-10 text-xs font-semibold"
                variant="outline"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Inicio de Sesión
              </Button>
            </div>
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
            <KeyRound size={28} />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">Recuperar Contraseña</CardTitle>
          <CardDescription className="text-xs">
            Ingresa tu correo registrado y te enviaremos un enlace seguro a través de Resend para restaurar tu acceso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {error && (
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}
            
            <div>
              <Label htmlFor="email" className="text-xs font-semibold mb-1.5 block">Correo Electrónico:</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  disabled={loading}
                  className="h-10 text-xs pl-9"
                />
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            
            <Button type="submit" className="w-full h-10 text-xs font-semibold" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando Correo con Resend...
                </>
              ) : (
                'Enviar Enlace de Recuperación'
              )}
            </Button>

            <Button 
              type="button"
              onClick={onBackToLogin} 
              className="w-full h-10 text-xs text-muted-foreground hover:text-foreground"
              variant="ghost"
              disabled={loading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al inicio de sesión
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default ForgotPassword
