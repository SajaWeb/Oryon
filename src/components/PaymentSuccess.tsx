import { useEffect, useState } from 'react'
import { projectId } from '../utils/supabase/info'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'
import { CheckCircle2, Loader2, XCircle, AlertCircle, Clock, Info } from 'lucide-react'
import { Badge } from './ui/badge'
import wompiService, { WompiTransaction } from '../services/WompiService'

interface PaymentSuccessProps {
  transactionId: string
  accessToken: string
  paymentMethod: 'wompi' | 'paddle' // Identificar el método de pago
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
  paymentMethod,
  reference,
  planId,
  onComplete 
}: PaymentSuccessProps) {
  const [status, setStatus] = useState<PaymentStatus>('processing')
  const [message, setMessage] = useState('Verificando el estado de tu pago...')
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    confirmPayment()
  }, [])

  const confirmPayment = async () => {
    try {
      setStatus('processing')
      setMessage('Verificando el estado de tu pago...')

      if (paymentMethod === 'wompi') {
        await confirmWompiPayment()
      } else if (paymentMethod === 'paddle') {
        await confirmPaddlePayment()
      }
    } catch (error) {
      console.error('Error confirming payment:', error)
      setStatus('error')
      setMessage('Error al verificar el estado del pago. Por favor intenta de nuevo.')
    }
  }

  const confirmWompiPayment = async () => {
    try {
      // 1. Consultar transacción en Wompi
      const transaction: WompiTransaction = await wompiService.getTransaction(transactionId)
      
      console.log('Wompi Transaction:', transaction)

      // 2. Mapear detalles del pago
      const details: PaymentDetails = {
        id: transaction.id,
        reference: transaction.reference,
        amount: transaction.amount_in_cents / 100,
        currency: transaction.currency,
        status: transaction.status,
        paymentMethod: transaction.payment_method_type,
        createdAt: transaction.created_at,
        customerEmail: transaction.customer_email
      }

      setPaymentDetails(details)

      // 3. Procesar según el estado
      switch (transaction.status) {
        case 'APPROVED':
          await processPlanUpgrade(transaction)
          setStatus('success')
          setMessage('¡Pago aprobado! Tu licencia ha sido actualizada exitosamente.')
          break

        case 'PENDING':
          setStatus('pending')
          setMessage('Tu pago está siendo procesado. Esto puede tomar algunos minutos.')
          // Reintentar después de 5 segundos
          if (retryCount < 6) { // Máximo 6 intentos (30 segundos)
            setTimeout(() => {
              setRetryCount(prev => prev + 1)
              confirmWompiPayment()
            }, 5000)
          }
          break

        case 'DECLINED':
          setStatus('declined')
          setMessage('Tu pago fue rechazado. Por favor verifica tus datos e intenta nuevamente.')
          break

        case 'VOIDED':
          setStatus('error')
          setMessage('El pago fue cancelado.')
          break

        case 'ERROR':
          setStatus('error')
          setMessage('Hubo un error al procesar tu pago. Por favor contacta a soporte.')
          break

        default:
          setStatus('error')
          setMessage('Estado de pago desconocido. Por favor contacta a soporte.')
      }

    } catch (error) {
      console.error('Error confirming Wompi payment:', error)
      setStatus('error')
      setMessage('No se pudo verificar el estado del pago. Por favor intenta de nuevo.')
    }
  }

  const confirmPaddlePayment = async () => {
    try {
      // 1. Verificar el pago con Paddle a través de tu backend
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/license/paddle/verify`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            transactionId,
            reference
          })
        }
      )

      const data = await response.json()

      if (data.success && data.transaction) {
        const transaction = data.transaction

        // 2. Mapear detalles del pago
        const details: PaymentDetails = {
          id: transaction.id,
          reference: transaction.reference || reference || 'N/A',
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status,
          paymentMethod: 'Paddle',
          createdAt: transaction.created_at || new Date().toISOString(),
          customerEmail: transaction.customer_email
        }

        setPaymentDetails(details)

        // 3. Procesar según el estado
        if (transaction.status === 'completed' || transaction.status === 'paid') {
          // Actualizar el plan
          await processPlanUpgrade({ 
            id: transactionId, 
            reference: reference || '',
            status: 'APPROVED'
          })
          setStatus('success')
          setMessage('¡Pago confirmado! Tu licencia ha sido actualizada exitosamente.')
        } else if (transaction.status === 'pending') {
          setStatus('pending')
          setMessage('Tu pago está siendo procesado por Paddle.')
        } else {
          setStatus('error')
          setMessage('El pago no pudo ser completado.')
        }
      } else {
        setStatus('error')
        setMessage(data.error || 'No se pudo verificar el pago con Paddle')
      }

    } catch (error) {
      console.error('Error confirming Paddle payment:', error)
      setStatus('error')
      setMessage('Error al verificar el pago con Paddle.')
    }
  }

  const processPlanUpgrade = async (transaction: any) => {
    try {
      // 1. Actualizar registro del pago en la base de datos
      const updatePaymentResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/license/payment/update`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            reference: transaction.reference,
            transactionId: transaction.id,
            status: 'approved',
            paymentData: transaction
          })
        }
      )

      const paymentUpdateData = await updatePaymentResponse.json()
      console.log('Payment update response:', paymentUpdateData)

      // 2. Actualizar el plan de la empresa
      if (planId) {
        const upgradeResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/license/upgrade-plan`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              planId: planId,
              transactionId: transaction.id
            })
          }
        )

        const upgradeData = await upgradeResponse.json()
        console.log('Plan upgrade response:', upgradeData)

        if (!upgradeData.success) {
          throw new Error(upgradeData.error || 'Error al actualizar el plan')
        }
      }
    } catch (error) {
      console.error('Error processing plan upgrade:', error)
      throw error
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
        return <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />
      case 'success':
        return <CheckCircle2 className="h-16 w-16 text-green-600" />
      case 'pending':
        return <Clock className="h-16 w-16 text-yellow-600" />
      case 'declined':
        return <XCircle className="h-16 w-16 text-orange-600" />
      case 'error':
        return <XCircle className="h-16 w-16 text-red-600" />
      default:
        return <AlertCircle className="h-16 w-16 text-gray-600" />
    }
  }

  const getStatusTitle = () => {
    switch (status) {
      case 'processing':
        return 'Procesando Pago'
      case 'success':
        return '¡Pago Exitoso!'
      case 'pending':
        return 'Pago Pendiente'
      case 'declined':
        return 'Pago Rechazado'
      case 'error':
        return 'Error en el Pago'
      default:
        return 'Verificando Pago'
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
      case 'pending':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800'
      case 'declined':
        return 'bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800'
      case 'error':
        return 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
      default:
        return 'border-gray-200 dark:border-gray-700'
    }
  }

  const getMessageColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-800 dark:text-green-200'
      case 'pending':
        return 'text-yellow-800 dark:text-yellow-200'
      case 'declined':
        return 'text-orange-800 dark:text-orange-200'
      case 'error':
        return 'text-red-800 dark:text-red-200'
      default:
        return 'text-gray-800 dark:text-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background flex items-center justify-center p-4 sm:p-8">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle className="text-2xl mb-2">{getStatusTitle()}</CardTitle>
          <CardDescription>
            {paymentMethod === 'wompi' ? 'Pago procesado con Wompi (PSE)' : 'Pago procesado con Paddle'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status Message */}
          <Alert className={getStatusColor()}>
            <AlertDescription className={getMessageColor()}>
              {message}
            </AlertDescription>
          </Alert>

          {/* Payment Details */}
          {paymentDetails && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3 border dark:border-gray-700">
              <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">
                Detalles de la Transacción
              </h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center pb-2 border-b dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">ID de Transacción</span>
                  <span className="font-mono text-xs font-semibold">{paymentDetails.id}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Referencia</span>
                  <span className="font-mono text-xs font-semibold">{paymentDetails.reference}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Monto</span>
                  <span className="text-lg font-bold">
                    ${paymentDetails.amount.toLocaleString()} {paymentDetails.currency}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Método de Pago</span>
                  <Badge variant="outline">{paymentDetails.paymentMethod}</Badge>
                </div>

                <div className="flex justify-between items-center pb-2 border-b dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Estado</span>
                  <Badge className={
                    status === 'success' ? 'bg-green-600' :
                    status === 'pending' ? 'bg-yellow-600' :
                    status === 'declined' ? 'bg-orange-600' :
                    'bg-red-600'
                  }>
                    {paymentDetails.status}
                  </Badge>
                </div>

                {paymentDetails.customerEmail && (
                  <div className="flex justify-between items-center pb-2 border-b dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Email</span>
                    <span className="text-xs">{paymentDetails.customerEmail}</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Fecha</span>
                  <span className="text-xs">
                    {new Date(paymentDetails.createdAt).toLocaleString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Additional Info for Pending Status */}
          {status === 'pending' && (
            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <p className="font-semibold mb-1">¿Qué significa "Pendiente"?</p>
                <p className="text-sm">
                  Tu pago está siendo verificado por el banco. Esto es normal con PSE y puede tomar 
                  algunos minutos. Recibirás una notificación cuando se complete.
                </p>
                {retryCount > 0 && (
                  <p className="text-xs mt-2 text-blue-700 dark:text-blue-300">
                    Verificando automáticamente... (Intento {retryCount}/6)
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {status === 'success' && (
              <Button 
                onClick={onComplete}
                className="w-full"
                size="lg"
              >
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Continuar al Dashboard
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
                      Verificando...
                    </>
                  ) : (
                    'Reintentar'
                  )}
                </Button>
                <Button 
                  onClick={onComplete}
                  className="flex-1"
                >
                  Volver
                </Button>
              </>
            )}

            {status === 'pending' && (
              <Button 
                onClick={onComplete}
                variant="outline"
                className="w-full"
              >
                Volver (Recibirás notificación)
              </Button>
            )}

            {status === 'processing' && (
              <Button 
                disabled
                className="w-full"
              >
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </Button>
            )}
          </div>

          {/* Support Contact */}
          {(status === 'error' || status === 'declined') && (
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              <p>¿Necesitas ayuda? Contacta a soporte con el ID de transacción:</p>
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">
                {paymentDetails?.id || transactionId}
              </code>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default PaymentSuccess