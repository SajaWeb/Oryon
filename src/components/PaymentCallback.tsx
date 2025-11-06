import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import PaymentSuccess from '../components/PaymentSuccess'
import { Loader2 } from 'lucide-react'

interface PaymentCallbackProps {
  accessToken: string
}

export function PaymentCallback({ accessToken }: PaymentCallbackProps) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Obtener parámetros de la URL
  const transactionId = searchParams.get('id') // Wompi usa 'id'
  const reference = searchParams.get('reference')
  const planId = searchParams.get('planId')
  const paymentMethod = searchParams.get('method') as 'wompi' | 'paddle' || 'wompi'
  
  // Para Paddle (parámetros diferentes)
  const paddleCheckoutId = searchParams.get('_ptxn') // Paddle Transaction ID
  const paddleStatus = searchParams.get('checkout_status')

  useEffect(() => {
    console.log('Payment Callback - Params:', {
      transactionId,
      reference,
      planId,
      paymentMethod,
      paddleCheckoutId,
      paddleStatus,
      allParams: Object.fromEntries(searchParams.entries())
    })

    // Validar que tenemos los datos necesarios
    if (!transactionId && !paddleCheckoutId) {
      console.error('No transaction ID found')
      // Redirigir a la página de licencias después de 2 segundos
      setTimeout(() => {
        navigate('/license')
      }, 2000)
    }
  }, [searchParams])

  // Si no hay ID de transacción, mostrar cargando
  if (!transactionId && !paddleCheckoutId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            No se encontró información del pago. Redirigiendo...
          </p>
        </div>
      </div>
    )
  }

  // Determinar el ID de transacción correcto
  const finalTransactionId = transactionId || paddleCheckoutId || ''
  const finalPaymentMethod = paddleCheckoutId ? 'paddle' : paymentMethod

  return (
    <PaymentSuccess
      transactionId={finalTransactionId}
      accessToken={accessToken}
      paymentMethod={finalPaymentMethod}
      reference={reference || undefined}
      planId={planId || undefined}
      onComplete={() => {
        // Redirigir a la página de licencias
        navigate('/license')
      }}
    />
  )
}

export default PaymentCallback