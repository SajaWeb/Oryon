import { useState, useEffect } from 'react'
import { getSupabaseClient } from '../utils/supabase/client'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, Mail, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

interface ConfirmEmailProps {
  onConfirmSuccess: () => void
}

export function ConfirmEmail({ onConfirmSuccess }: ConfirmEmailProps) {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [verifiedEmail, setVerifiedEmail] = useState<string>('')
  const [countdown, setCountdown] = useState<number>(4)

  useEffect(() => {
    handleEmailVerification()
  }, [])

  const handleEmailVerification = async () => {
    try {
      const supabase = getSupabaseClient()
      
      // 1. Extraer parámetros de búsqueda y hash
      const urlParams = new URLSearchParams(window.location.search)
      const tokenHash = urlParams.get('token_hash') || urlParams.get('token')
      const type = (urlParams.get('type') as any) || 'signup'
      const code = urlParams.get('code')
      const hash = window.location.hash

      // 2. Si viene token_hash (formato estándar Supabase OTP / verifyOtp)
      if (tokenHash) {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type === 'email_change' ? 'email_change' : (type === 'recovery' ? 'recovery' : 'signup')
        })

        if (error) {
          console.warn('verifyOtp error:', error)
          // Si el token ya fue consumido pero hay sesión activa
          const { data: sessionData } = await supabase.auth.getSession()
          if (sessionData?.session?.user) {
            setVerifiedEmail(sessionData.session.user.email || '')
            setStatus('success')
            startRedirectTimer()
            return
          }
          setStatus('error')
          setErrorMessage(error.message || 'El enlace de confirmación es inválido o ha expirado.')
          return
        }

        if (data?.user) {
          setVerifiedEmail(data.user.email || '')
          setStatus('success')
          toast.success('¡Correo confirmado exitosamente!')
          startRedirectTimer()
          return
        }
      }

      // 3. Si viene code (flujo PKCE de Supabase)
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          console.warn('exchangeCodeForSession error:', error)
          setStatus('error')
          setErrorMessage(error.message || 'Error al canjear el código de verificación.')
          return
        }

        if (data?.user) {
          setVerifiedEmail(data.user.email || '')
          setStatus('success')
          toast.success('¡Correo verificado con éxito!')
          startRedirectTimer()
          return
        }
      }

      // 4. Si viene token en hash (#access_token=...&type=signup)
      if (hash && (hash.includes('access_token') || hash.includes('type=signup') || hash.includes('type=email_change'))) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setVerifiedEmail(session.user.email || '')
          setStatus('success')
          toast.success('¡Correo verificado exitosamente!')
          startRedirectTimer()
          return
        }
      }

      // 5. Comprobar sesión actual por si el cliente de Supabase ya procesó el hash automáticamente
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.email_confirmed_at || session?.user) {
        setVerifiedEmail(session.user.email || '')
        setStatus('success')
        startRedirectTimer()
        return
      }

      // Si no se encontró ningún token en URL
      setStatus('error')
      setErrorMessage('No se encontró un token de verificación válido en el enlace. Es posible que ya haya sido utilizado.')
    } catch (err: any) {
      console.error('Error during email confirmation:', err)
      setStatus('error')
      setErrorMessage(err.message || 'Ocurrió un error inesperado al verificar tu correo.')
    }
  }

  const startRedirectTimer = () => {
    let timeLeft = 4
    const interval = setInterval(() => {
      timeLeft -= 1
      setCountdown(timeLeft)
      if (timeLeft <= 0) {
        clearInterval(interval)
        onConfirmSuccess()
      }
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="max-w-md w-full">
        {status === 'verifying' && (
          <Card className="border-border bg-card shadow-xl text-center">
            <CardHeader className="space-y-3 pb-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center animate-pulse">
                <Loader2 size={32} className="animate-spin text-primary" />
              </div>
              <CardTitle className="text-xl font-bold tracking-tight">Verificando tu Correo...</CardTitle>
              <CardDescription className="text-xs">
                Estamos validando tu cuenta con los servidores de autenticación. Esto tomará solo unos segundos.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {status === 'success' && (
          <Card className="border-border bg-card shadow-xl text-center animate-in fade-in zoom-in-95 duration-300">
            <CardHeader className="space-y-3 pb-4">
              <div className="mx-auto w-16 h-16 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center shadow-inner">
                <CheckCircle2 size={36} />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mx-auto">
                <Sparkles size={13} />
                <span>Cuenta Verificada y Activa</span>
              </div>
              <CardTitle className="text-2xl font-black tracking-tight text-foreground">
                ¡Correo Confirmado con Éxito!
              </CardTitle>
              <CardDescription className="text-xs">
                {verifiedEmail ? (
                  <span>
                    El correo <strong className="text-foreground">{verifiedEmail}</strong> ha sido verificado correctamente.
                  </span>
                ) : (
                  'Tu cuenta ha sido activada correctamente en Oryon.'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2 text-xs">
              <div className="p-3.5 bg-muted/40 rounded-xl border border-border text-left space-y-1.5">
                <p className="font-semibold text-foreground flex items-center gap-2">
                  <Mail size={14} className="text-primary" />
                  Acceso habilitado
                </p>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Ya puedes iniciar sesión en tu portal de empresa o taller para gestionar órdenes, sucursales, inventario y ventas.
                </p>
              </div>

              <Button
                onClick={onConfirmSuccess}
                className="w-full h-11 text-xs font-semibold gap-2 shadow-md"
              >
                <span>Ingresar a Mi Taller ({countdown}s)</span>
                <ArrowRight size={16} />
              </Button>
            </CardContent>
          </Card>
        )}

        {status === 'error' && (
          <Card className="border-border bg-card shadow-xl text-center">
            <CardHeader className="space-y-3 pb-4">
              <div className="mx-auto w-16 h-16 bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center">
                <AlertCircle size={36} />
              </div>
              <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                No se Pudo Confirmar el Correo
              </CardTitle>
              <CardDescription className="text-xs">
                {errorMessage || 'El enlace de confirmación es inválido o ha expirado.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2 text-xs">
              <Alert variant="destructive">
                <AlertDescription className="text-xs">
                  Si ya habías confirmado tu correo previamente, puedes iniciar sesión directamente con tus credenciales.
                </AlertDescription>
              </Alert>

              <Button
                onClick={onConfirmSuccess}
                className="w-full h-10 text-xs font-semibold"
              >
                Ir a Iniciar Sesión
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default ConfirmEmail
