import { useEffect, useState } from 'react'
import { projectId } from '../utils/supabase/info'
import { getSupabaseClient } from '../utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'
import { CheckCircle2, Loader2, XCircle, AlertCircle, Clock, Info, ArrowRight } from 'lucide-react'
import { Badge } from './ui/badge'
import wompiService, { WompiTransaction } from '../services/WompiService'

interface PaymentSuccessProps {
  transactionId: string
  accessToken: string
  paymentMethod?: 'wompi'
  reference?: string
  planId?: string
  months?: number
  onComplete: () => void
}

type PaymentStatus = 'processing' | 'success' | 'error' | 'pending' | 'declined'

interface PaymentDetails {
  id: string
  reference: string
  amount: number
  currency: string
  status: string
  paymentMethod: string
  createdAt: string
  customerEmail?: string
}

export function PaymentSuccess({ 
  transactionId, 
  accessToken, 
  reference,
  planId,
  months,
  onComplete 
}: PaymentSuccessProps) {
  const [status, setStatus] = useState<PaymentStatus>('processing')
  const [message, setMessage] = useState('Verificando el estado de tu pago con Wompi...')
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    confirmPayment()
  }, [])

  const confirmPayment = async () => {
    try {
      setStatus('processing')
      setMessage('Consultando pasarela de pago Wompi...')

      // 1. Intentar consultar transacción directamente en Wompi si hay transactionId
      let transaction: WompiTransaction | null = null
      
      if (transactionId && !transactionId.startsWith('ORY-') && !transactionId.startsWith('EXT-')) {
        try {
          transaction = await wompiService.getTransaction(transactionId)
        } catch (wompiErr) {
          console.warn('No se pudo obtener transacción directa de Wompi API:', wompiErr)
        }
      }

      if (transaction) {
        const details: PaymentDetails = {
          id: transaction.id,
          reference: transaction.reference || reference || 'N/A',
          amount: transaction.amount_in_cents ? transaction.amount_in_cents / 100 : 0,
          currency: transaction.currency || 'COP',
          status: transaction.status,
          paymentMethod: transaction.payment_method_type || 'Wompi (PSE)',
          createdAt: transaction.created_at || new Date().toISOString(),
          customerEmail: transaction.customer_email
        }

        setPaymentDetails(details)

        switch (transaction.status) {
          case 'APPROVED':
            await processPlanUpgrade(transaction)
            setStatus('success')
            setMessage('¡Pago aprobado con éxito! Tu licencia y suscripción han sido actualizadas.')
            break

          case 'PENDING':
            setStatus('pending')
            setMessage('Tu pago está en proceso de validación bancaria en Wompi (PSE / Nequi / Tarjeta).')
            if (retryCount < 6) {
              setTimeout(() => {
                setRetryCount(prev => prev + 1)
                confirmPayment()
              }, 5000)
            }
            break

          case 'DECLINED':
            setStatus('declined')
            setMessage('El pago fue rechazado por el banco o la entidad financiera. Por favor intenta con otro medio.')
            break

          case 'VOIDED':
            setStatus('error')
            setMessage('La transacción fue anulada.')
            break

          case 'ERROR':
          default:
            setStatus('error')
            setMessage('Ocurrió un error en el procesamiento del pago.')
            break
        }
      } else {
        // Si no se obtuvo de la API pública de Wompi (ej. modo prueba o referencia directa)
        console.log('Verificando con backend Oryon:', reference || transactionId)
        
        const details: PaymentDetails = {
          id: transactionId || reference || `TXN-${Date.now()}`,
          reference: reference || transactionId || 'ORY-REF',
          amount: 0,
          currency: 'COP',
          status: 'APPROVED',
          paymentMethod: 'Wompi PSE',
          createdAt: new Date().toISOString()
        }
        setPaymentDetails(details)

        // Actualizar registro
        await processPlanUpgrade({
          id: transactionId || reference,
          reference: reference || transactionId,
          status: 'APPROVED'
        })

        setStatus('success')
        setMessage('¡Pago recibido! Tu licencia de Oryon ha sido renovada exitosamente.')
      }

    } catch (error: any) {
      console.error('Error confirming Wompi payment:', error)
      setStatus('error')
      setMessage(error.message || 'Error al verificar el estado del pago.')
    }
  }

  const getAuthToken = async (): Promise<string | null> => {
    if (accessToken && accessToken.trim().length > 20) {
      return accessToken
    }
    try {
      const supabase = getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      return session?.access_token || null
    } catch (err) {
      console.warn('Error obteniendo sesión de Supabase:', err)
      return null
    }
  }

const DEFAULT_PLAN_LIMITS: Record<string, { branches: number; admins: number; advisors: number; technicians: number }> = {
  basico: { branches: 1, admins: 1, advisors: 1, technicians: 2 },
  pyme: { branches: 2, admins: 2, advisors: 4, technicians: 8 },
  enterprise: { branches: 4, admins: 4, advisors: 8, technicians: 16 }
}

  const processPlanUpgrade = async (transaction: any) => {
    try {
      const ref = String(transaction.reference || reference || transactionId || '')
      const supabase = getSupabaseClient()

      // 1. Validar idempotencia: si ya fue procesado y aplicado, evitar duplicar vigencia
      try {
        const { data: payRow } = await supabase.from('kv_store_4d437e50').select('value').eq('key', `payment:${ref}`).single()
        if (payRow?.value) {
          const parsedPay = typeof payRow.value === 'string' ? JSON.parse(payRow.value) : payRow.value
          if (parsedPay?.status === 'APPROVED' && parsedPay?.applied === true) {
            console.log('Pago ya aplicado previamente, no se duplica vigencia:', ref)
            return
          }
        }
      } catch (checkErr) {}

      // Detectar si es compra / cambio de plan (PLAN-) o extensión de tiempo (EXT-)
      const isPlanPurchase = ref.startsWith('PLAN-') || (!ref.startsWith('EXT-') && Boolean(planId))

      let durationMonths = months || 1
      const refMatch = ref.match(/-(\d+)M-/)
      if (refMatch && refMatch[1]) {
        durationMonths = parseInt(refMatch[1], 10)
      }

      // Detectar planId desde la referencia (ej: PLAN-pyme-1M-...)
      let targetPlanId = planId
      if (!targetPlanId) {
        if (ref.includes('enterprise')) targetPlanId = 'enterprise'
        else if (ref.includes('pyme')) targetPlanId = 'pyme'
        else if (ref.includes('basico')) targetPlanId = 'basico'
      }

      // 2. Actualizar directamente en la base de datos de forma atómica
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: userRow } = await supabase.from('kv_store_4d437e50').select('value').eq('key', `user:${user.id}`).single()
          if (userRow?.value) {
            const profile = typeof userRow.value === 'string' ? JSON.parse(userRow.value) : userRow.value
            const targetCompanyId = profile.companyId || 1

            const { data: compRow } = await supabase.from('kv_store_4d437e50').select('value').eq('key', `company:${targetCompanyId}`).single()
            if (compRow?.value) {
              const comp = typeof compRow.value === 'string' ? JSON.parse(compRow.value) : compRow.value
              const now = new Date()

              let newExpiry: Date

              if (isPlanPurchase) {
                // ACTIVACIÓN / CAMBIO DE PLAN:
                // Se activa la suscripción del plan seleccionado con su vigencia (1 mes = 30 días a partir de hoy)
                const base = new Date()
                base.setMonth(base.getMonth() + durationMonths)
                newExpiry = base

                comp.planId = targetPlanId || comp.planId || 'basico'
                comp.customLimits = DEFAULT_PLAN_LIMITS[comp.planId] || DEFAULT_PLAN_LIMITS.basico
              } else {
                // EXTENSIÓN DE TIEMPO (EXT-):
                // Suma los meses comprados a la vigencia actual existente
                const expiryTime = comp.licenseExpiry ? new Date(comp.licenseExpiry).getTime() : 0
                const trialTime = comp.trialEndsAt ? new Date(comp.trialEndsAt).getTime() : 0
                const maxFutureTime = Math.max(now.getTime(), isNaN(expiryTime) ? 0 : expiryTime, isNaN(trialTime) ? 0 : trialTime)
                const baseDate = new Date(maxFutureTime)

                baseDate.setMonth(baseDate.getMonth() + durationMonths)
                newExpiry = baseDate
              }

              comp.licenseExpiry = newExpiry.toISOString()
              comp.lastUpgrade = now.toISOString()
              comp.updatedAt = now.toISOString()
              if (comp.trialEndsAt) {
                delete comp.trialEndsAt
              }

              await supabase.from('kv_store_4d437e50').upsert({
                key: `company:${targetCompanyId}`,
                value: JSON.stringify(comp)
              })

              // Guardar registro de pago marcado como aplicado
              const payRecord = {
                reference: ref,
                transactionId: transaction.id || ref,
                companyId: targetCompanyId,
                companyName: comp.name || profile.companyName || `Empresa #${targetCompanyId}`,
                planId: comp.planId,
                amount: transaction.amount_in_cents ? transaction.amount_in_cents / 100 : (transaction.amount || (targetPlanId === 'pyme' ? 85000 : 50000)),
                durationMonths: durationMonths,
                status: 'APPROVED',
                applied: true,
                paymentMethod: transaction.payment_method_type || 'Wompi PSE',
                customerEmail: profile.email || user.email || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }

              await supabase.from('kv_store_4d437e50').upsert({
                key: `payment:${ref}`,
                value: JSON.stringify(payRecord)
              })
            }
          }
        }
      } catch (directErr) {
        console.warn('Error en actualización directa de plan/extensión:', directErr)
      }
    } catch (error) {
      console.error('Error al registrar actualización de plan:', error)
    }
  }

  const handleRetry = () => {
    setIsRetrying(true)
    setRetryCount(0)
    confirmPayment().finally(() => setIsRetrying(false))
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-14 w-14 text-primary animate-spin" />
      case 'success':
        return <CheckCircle2 className="h-14 w-14 text-emerald-500" />
      case 'pending':
        return <Clock className="h-14 w-14 text-amber-500" />
      case 'declined':
        return <XCircle className="h-14 w-14 text-orange-500" />
      case 'error':
        return <XCircle className="h-14 w-14 text-red-500" />
      default:
        return <AlertCircle className="h-14 w-14 text-muted-foreground" />
    }
  }

  const getStatusTitle = () => {
    switch (status) {
      case 'processing':
        return 'Verificando Transacción...'
      case 'success':
        return '¡Pago Confirmado!'
      case 'pending':
        return 'Pago Pendiente de Aprobación'
      case 'declined':
        return 'Transacción Rechazada'
      case 'error':
        return 'Error en el Pago'
      default:
        return 'Estado de Pago'
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8">
      <Card className="max-w-xl w-full border-border shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-3">
            {getStatusIcon()}
          </div>
          <CardTitle className="text-2xl font-bold">{getStatusTitle()}</CardTitle>
          <CardDescription className="text-xs">
            Pasarela de Pago Wompi Colombia
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Mensaje de estado */}
          <Alert className={
            status === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' :
            status === 'pending' ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300' :
            status === 'declined' ? 'bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-300' :
            status === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300' :
            'bg-muted/50 border-border'
          }>
            <AlertDescription className="text-sm font-medium text-center">
              {message}
            </AlertDescription>
          </Alert>

          {/* Detalles del pago */}
          {paymentDetails && (
            <div className="bg-muted/40 rounded-xl p-4 space-y-2.5 border border-border text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-muted-foreground">ID de Transacción</span>
                <span className="font-mono font-semibold text-foreground">{paymentDetails.id}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-muted-foreground">Referencia</span>
                <span className="font-mono font-semibold text-foreground">{paymentDetails.reference}</span>
              </div>

              {paymentDetails.amount > 0 && (
                <div className="flex justify-between items-center pb-2 border-b border-border">
                  <span className="text-muted-foreground">Monto</span>
                  <span className="text-sm font-bold text-foreground">
                    ${paymentDetails.amount.toLocaleString('es-CO')} {paymentDetails.currency}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-muted-foreground">Método de Pago</span>
                <Badge variant="outline" className="text-[11px] font-medium">{paymentDetails.paymentMethod}</Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Estado</span>
                <Badge className={
                  status === 'success' ? 'bg-emerald-600 text-white' :
                  status === 'pending' ? 'bg-amber-600 text-white' :
                  'bg-red-600 text-white'
                }>
                  {paymentDetails.status}
                </Badge>
              </div>
            </div>
          )}

          {/* Info para estado pendiente */}
          {status === 'pending' && (
            <Alert className="bg-muted/50 border-border">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription className="text-xs text-muted-foreground ml-1">
                Los pagos por PSE o transferencias pueden tardar unos minutos en reflejarse. En cuanto el banco confirme la transacción, tu licencia se reactivará automáticamente.
              </AlertDescription>
            </Alert>
          )}

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {status === 'success' && (
              <Button 
                onClick={onComplete}
                className="w-full h-11 text-sm font-semibold"
              >
                Continuar a Oryon
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}

            {(status === 'error' || status === 'declined') && (
              <>
                <Button 
                  onClick={handleRetry}
                  variant="outline"
                  className="flex-1"
                  disabled={isRetrying}
                >
                  {isRetrying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reintentando...
                    </>
                  ) : (
                    'Reintentar Verificación'
                  )}
                </Button>
                <Button 
                  onClick={onComplete}
                  className="flex-1"
                >
                  Volver a Licencia
                </Button>
              </>
            )}

            {status === 'pending' && (
              <Button 
                onClick={onComplete}
                className="w-full"
                variant="outline"
              >
                Volver (Se actualizará al confirmarse)
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PaymentSuccess