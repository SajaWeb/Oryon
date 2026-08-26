import { useEffect, useState } from 'react'
import { projectId } from '../utils/supabase/info'
import { getSupabaseClient } from '../utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'
import { CheckCircle2, Loader2, XCircle, AlertCircle, Clock, Info, ArrowRight } from 'lucide-react'
import { Badge } from './ui/badge'
import wompiService, { WompiTransaction } from '../services/WompiService'
import { OryonLoader } from './oryon'

interface PaymentSuccessProps {
  transactionId: string
  accessToken: string
  paymentMethod?: 'wompi'
  reference?: string
  planId?: string
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
          case 'APPROVED': {
            /* Sólo se canta victoria si el servidor confirmó y aplicó la vigencia.
               Antes se anunciaba éxito pasara lo que pasara con la licencia. */
            const resultado = await processPlanUpgrade(transaction)
            if (resultado.applied) {
              setStatus('success')
              setMessage('¡Pago aprobado! Los días que te quedaban se conservaron y se sumaron a lo comprado.')
            } else {
              setStatus('pending')
              setMessage('Wompi aprobó el pago y estamos activando tu licencia. Puede tardar unos segundos.')
              if (retryCount < 6) {
                setTimeout(() => {
                  setRetryCount(prev => prev + 1)
                  confirmPayment()
                }, 5000)
              }
            }
            break
          }

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
        
        /* Aquí no sabemos el estado: la consulta a Wompi desde el navegador falló.
           Antes se daba por aprobado y se anunciaba la licencia renovada, así que
           bastaba con abrir esta URL a mano para regalarse una. Se le pregunta al
           servidor, que sí puede verificarlo, y se dice lo que responda. */
        const details: PaymentDetails = {
          id: transactionId || reference || `TXN-${Date.now()}`,
          reference: reference || transactionId || 'ORY-REF',
          amount: 0,
          currency: 'COP',
          status: 'PENDING',
          paymentMethod: 'Wompi',
          createdAt: new Date().toISOString()
        }
        setPaymentDetails(details)

        const resultado = await processPlanUpgrade({
          id: transactionId || reference,
          reference: reference || transactionId
        })

        if (resultado.applied) {
          setStatus('success')
          setMessage('¡Pago confirmado! Los días que te quedaban se conservaron y se sumaron a lo comprado.')
        } else {
          setStatus('pending')
          setMessage('Estamos confirmando tu pago con Wompi. En cuanto se acredite, la licencia se activa sola.')
          if (retryCount < 6) {
            setTimeout(() => {
              setRetryCount(prev => prev + 1)
              confirmPayment()
            }, 5000)
          }
        }
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

  /**
   * Pide al servidor que aplique el pago a la licencia.
   *
   * El navegador ya no calcula ni escribe vigencias. Antes lo hacía, y de ahí
   * salían los dos problemas:
   *
   *  1. Una rama de "compra de plan" arrancaba en `new Date()`, así que a quien le
   *     quedaban 31 días y compraba un año se le quedaban 365, no 396.
   *  2. Clasificaba la compra leyendo la referencia devuelta por Wompi, que con
   *     enlaces de pago es una suya (`test_…`) y no la nuestra. Toda extensión
   *     parecía compra nueva, que es justo lo que activaba esa rama.
   *
   * Además, cualquiera que abriera /payment-callback con una referencia a mano se
   * llevaba la licencia: aquí se daba el pago por aprobado sin preguntarle a nadie.
   * Ahora lo confirma el Edge Function contra Wompi, y sólo él escribe.
   */
  const processPlanUpgrade = async (
    transaction: any
  ): Promise<{ applied: boolean; reason?: string }> => {
    // La referencia de comercio es la nuestra, la que viaja en la URL de retorno.
    const merchantRef = String(reference || '').trim()
    const wompiRef = String(transaction?.reference || '').trim()
    const txId = String(transaction?.id || transactionId || '').trim()
    const ref = merchantRef || wompiRef || txId
    if (!ref) return { applied: false, reason: 'sin referencia' }

    const isPlanChange = merchantRef ? merchantRef.startsWith('PLAN-') : Boolean(planId)

    const token = await getAuthToken()
    if (!token) return { applied: false, reason: 'sin sesión' }

    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/license/payment/update`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference: ref,
            transactionId: txId,
            planId: isPlanChange ? planId : undefined,
            paymentData: transaction
          })
        }
      )
      const data = await res.json().catch(() => null)
      if (res.ok && data?.success && data?.license?.applied) {
        return { applied: true }
      }
      return {
        applied: false,
        reason: data?.license?.reason || data?.error || 'el pago aún no está confirmado'
      }
    } catch (err) {
      console.warn('Sin respuesta del servidor al aplicar el pago:', err)
      return { applied: false, reason: 'no se pudo contactar al servidor' }
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
        /* Aquí va la marca sola: el lockup completo no cabe en una fila de iconos
           de estado junto al check y la equis, pero el gesto es el mismo. */
        return <OryonLoader mark width={56} label="Procesando" />
      case 'success':
        return <CheckCircle2 className="h-14 w-14 text-success" />
      case 'pending':
        return <Clock className="h-14 w-14 text-warning" />
      case 'declined':
        return <XCircle className="h-14 w-14 text-[var(--state-waiting)]" />
      case 'error':
        return <XCircle className="h-14 w-14 text-danger" />
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
            status === 'success' ? 'bg-[color-mix(in_srgb,var(--success)_10%,transparent)] border-[color-mix(in_srgb,var(--success)_30%,transparent)] text-success' :
            status === 'pending' ? 'bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] border-[color-mix(in_srgb,var(--warning)_30%,transparent)] text-warning' :
            status === 'declined' ? 'bg-[color-mix(in_srgb,var(--state-waiting)_10%,transparent)] border-[color-mix(in_srgb,var(--state-waiting)_30%,transparent)] text-[var(--state-waiting)]' :
            status === 'error' ? 'bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] border-[color-mix(in_srgb,var(--danger)_30%,transparent)] text-danger' :
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
                  status === 'success' ? 'bg-success text-on-success' :
                  status === 'pending' ? 'bg-warning text-on-warning' :
                  'bg-danger text-on-danger'
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