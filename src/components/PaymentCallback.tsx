import { useEffect, useState } from 'react'
import PaymentSuccess from './PaymentSuccess'
import { Loader2 } from 'lucide-react'

interface PaymentCallbackProps {
  accessToken: string
  onComplete?: () => void
}

export function PaymentCallback({ accessToken, onComplete }: PaymentCallbackProps) {
  const [params, setParams] = useState<{
    transactionId: string | null
    reference: string | null
    planId: string | null
    months?: number
    paymentMethod: 'wompi'
  }>({
    transactionId: null,
    reference: null,
    planId: null,
    months: undefined,
    paymentMethod: 'wompi'
  })

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const transactionId = urlParams.get('id') || urlParams.get('transactionId') || urlParams.get('txId')
    const reference = urlParams.get('reference') || urlParams.get('ref')
    const planId = urlParams.get('planId')
    const monthsStr = urlParams.get('months')
    const months = monthsStr ? parseInt(monthsStr, 10) : undefined

    console.log('Payment Callback - Detected URL Params:', {
      transactionId,
      reference,
      planId,
      months,
      search: window.location.search
    })

    setParams({
      transactionId,
      reference,
      planId,
      months,
      paymentMethod: 'wompi'
    })

    if (!transactionId && !reference) {
      console.warn('No transactionId or reference found in URL')
    }
  }, [])

  const handleFinish = () => {
    if (onComplete) {
      onComplete()
    } else {
      window.history.pushState({}, '', '/')
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  // Si no hay ID de transacción ni referencia, mostrar mensaje de espera o redirección
  if (!params.transactionId && !params.reference) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md p-6 bg-card rounded-xl border border-border">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm font-semibold text-foreground mb-1">
            Procesando respuesta del pago...
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Estamos verificando la información de tu transacción con Wompi.
          </p>
          <button
            onClick={handleFinish}
            className="text-xs text-primary underline cursor-pointer"
          >
            Volver a Oryon
          </button>
        </div>
      </div>
    )
  }

  return (
    <PaymentSuccess
      transactionId={params.transactionId || params.reference || ''}
      accessToken={accessToken}
      paymentMethod="wompi"
      reference={params.reference || undefined}
      planId={params.planId || undefined}
      months={params.months}
      onComplete={handleFinish}
    />
  )
}

export default PaymentCallback