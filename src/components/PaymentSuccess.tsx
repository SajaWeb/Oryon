import { useEffect, useState } from 'react'
import { projectId } from '../utils/supabase/info'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'

interface PaymentSuccessProps {
  transactionId: string
  accessToken: string
  onComplete: () => void
}

export function PaymentSuccess({ transactionId, accessToken, onComplete }: PaymentSuccessProps) {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('Procesando pago...')

  useEffect(() => {
    confirmPayment()
  }, [])

  const confirmPayment = async () => {
    try {
      // Simulate payment confirmation via webhook
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/license/webhook`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            transactionId,
            status: 'approved'
          })
        }
      )

      const data = await response.json()

      if (data.success) {
        setStatus('success')
        setMessage('¡Pago confirmado! Tu licencia ha sido activada exitosamente.')
      } else {
        setStatus('error')
        setMessage(data.error || 'Error al confirmar el pago')
      }
    } catch (error) {
      console.error('Error confirming payment:', error)
      setStatus('error')
      setMessage('Error al procesar el pago')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'processing' && (
              <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            )}
            {status === 'error' && (
              <XCircle className="h-16 w-16 text-red-600" />
            )}
          </div>
          <CardTitle>
            {status === 'processing' && 'Procesando Pago'}
            {status === 'success' && '¡Pago Exitoso!'}
            {status === 'error' && 'Error en el Pago'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className={
            status === 'success' 
              ? 'bg-green-50 border-green-200' 
              : status === 'error'
              ? 'border-red-200'
              : ''
          }>
            <AlertDescription className={
              status === 'success' 
                ? 'text-green-800' 
                : status === 'error'
                ? 'text-red-800'
                : ''
            }>
              {message}
            </AlertDescription>
          </Alert>

          {status !== 'processing' && (
            <Button 
              onClick={onComplete}
              className="w-full mt-4"
            >
              Continuar
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default PaymentSuccess
