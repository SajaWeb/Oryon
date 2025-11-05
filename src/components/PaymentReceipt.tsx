import { useEffect, useState, useRef } from 'react'
import { projectId } from '../utils/supabase/info'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { Alert, AlertDescription } from './ui/alert'
import { 
  CheckCircle2, 
  Loader2, 
  XCircle, 
  Download,
  Calendar,
  Clock,
  CreditCard,
  Package,
  FileText,
  Printer,
  Mail,
  Home
} from 'lucide-react'
import { toast } from 'sonner@2.0.3'

interface PaymentReceiptProps {
  paymentIntentId?: string
  transactionId?: string
  accessToken: string
  onComplete: () => void
  // Para llamadas directas con datos
  paymentData?: {
    planId: string
    planName: string
    amount: number
    currency: string
    months: number
    discount?: number
    status: 'success' | 'failed' | 'pending'
  }
}

interface PaymentDetails {
  status: 'success' | 'failed' | 'pending'
  transactionId: string
  paymentDate: string
  planId: string
  planName: string
  amount: number
  currency: string
  months: number
  discount: number
  companyName: string
  companyEmail: string
  receiptNumber: string
  paymentMethod: string
  newExpiryDate?: string
}

export function PaymentReceipt({ 
  paymentIntentId, 
  transactionId, 
  accessToken, 
  onComplete,
  paymentData 
}: PaymentReceiptProps) {
  const [loading, setLoading] = useState(!paymentData)
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null)
  const receiptRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (paymentData) {
      // Usar datos proporcionados directamente
      const details: PaymentDetails = {
        status: paymentData.status,
        transactionId: transactionId || `TXN-${Date.now()}`,
        paymentDate: new Date().toISOString(),
        planId: paymentData.planId,
        planName: paymentData.planName,
        amount: paymentData.amount,
        currency: paymentData.currency,
        months: paymentData.months,
        discount: paymentData.discount || 0,
        companyName: 'Tu Empresa',
        companyEmail: 'email@example.com',
        receiptNumber: `REC-${Date.now()}`,
        paymentMethod: paymentData.currency === 'COP' ? 'PSE' : 'Paddle'
      }
      setPaymentDetails(details)
    } else if (paymentIntentId || transactionId) {
      loadPaymentDetails()
    }
  }, [paymentIntentId, transactionId, paymentData])

  const loadPaymentDetails = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/license/payment-details`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            paymentIntentId,
            transactionId
          })
        }
      )

      const data = await response.json()

      if (data.success) {
        setPaymentDetails(data.details)
      } else {
        toast.error('Error al cargar detalles del pago')
      }
    } catch (error) {
      console.error('Error loading payment details:', error)
      toast.error('Error al cargar el recibo')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'COP') {
      return `$${amount.toLocaleString('es-CO')} COP`
    } else {
      return `$${amount.toFixed(2)} USD`
    }
  }

  const downloadPDF = async () => {
    try {
      toast.loading('Generando PDF...', { id: 'pdf-generation' })
      
      // Usar window.print() con CSS especial para PDF
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        toast.error('Por favor permite ventanas emergentes')
        return
      }

      const receiptHTML = receiptRef.current?.innerHTML || ''
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Recibo de Pago - ${paymentDetails?.receiptNumber}</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: Arial, sans-serif;
                padding: 40px;
                background: white;
                color: #000;
              }
              
              .receipt-container {
                max-width: 800px;
                margin: 0 auto;
                border: 2px solid #000;
                padding: 40px;
              }
              
              .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #000;
              }
              
              .header h1 {
                font-size: 32px;
                margin-bottom: 10px;
                color: #000;
              }
              
              .header .subtitle {
                font-size: 18px;
                color: #666;
              }
              
              .status-badge {
                display: inline-block;
                padding: 10px 20px;
                margin: 20px 0;
                font-size: 16px;
                font-weight: bold;
                border-radius: 5px;
              }
              
              .status-success {
                background: #22c55e;
                color: white;
              }
              
              .status-failed {
                background: #ef4444;
                color: white;
              }
              
              .status-pending {
                background: #eab308;
                color: white;
              }
              
              .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin: 30px 0;
              }
              
              .info-item {
                padding: 15px;
                background: #f9fafb;
                border: 1px solid #e5e7eb;
              }
              
              .info-label {
                font-size: 12px;
                color: #666;
                text-transform: uppercase;
                margin-bottom: 5px;
                font-weight: bold;
              }
              
              .info-value {
                font-size: 16px;
                color: #000;
                font-weight: 600;
              }
              
              .details-section {
                margin: 30px 0;
                padding: 20px;
                background: #f9fafb;
                border: 1px solid #e5e7eb;
              }
              
              .details-row {
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px solid #e5e7eb;
              }
              
              .details-row:last-child {
                border-bottom: none;
              }
              
              .details-label {
                font-size: 14px;
                color: #666;
              }
              
              .details-value {
                font-size: 14px;
                color: #000;
                font-weight: 600;
              }
              
              .total-row {
                font-size: 18px !important;
                font-weight: bold;
                padding-top: 15px;
                margin-top: 15px;
                border-top: 2px solid #000;
              }
              
              .thank-you {
                text-align: center;
                margin: 40px 0 20px 0;
                padding: 30px;
                background: #eff6ff;
                border: 2px solid #3b82f6;
              }
              
              .thank-you h2 {
                font-size: 24px;
                color: #1e40af;
                margin-bottom: 10px;
              }
              
              .thank-you p {
                font-size: 14px;
                color: #1e40af;
                line-height: 1.6;
              }
              
              .footer {
                text-align: center;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 2px solid #000;
                font-size: 12px;
                color: #666;
              }
              
              @media print {
                body {
                  padding: 0;
                }
                
                .no-print {
                  display: none !important;
                }
              }
            </style>
          </head>
          <body>
            <div class="receipt-container">
              <div class="header">
                <h1>🏢 Oryon App</h1>
                <p class="subtitle">Recibo de Pago de Licencia</p>
                <p style="margin-top: 10px; font-size: 14px; color: #666;">
                  Recibo No. ${paymentDetails?.receiptNumber}
                </p>
              </div>
              
              <div style="text-align: center;">
                <span class="status-badge status-${paymentDetails?.status}">
                  ${paymentDetails?.status === 'success' ? '✓ PAGO EXITOSO' : 
                    paymentDetails?.status === 'failed' ? '✗ PAGO RECHAZADO' : 
                    '⏳ PAGO PENDIENTE'}
                </span>
              </div>
              
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Fecha</div>
                  <div class="info-value">${formatDate(paymentDetails?.paymentDate || '')}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Hora</div>
                  <div class="info-value">${formatTime(paymentDetails?.paymentDate || '')}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">ID de Transacción</div>
                  <div class="info-value">${paymentDetails?.transactionId}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Método de Pago</div>
                  <div class="info-value">${paymentDetails?.paymentMethod}</div>
                </div>
              </div>
              
              <div class="details-section">
                <h3 style="margin-bottom: 15px; font-size: 18px;">Detalles de la Compra</h3>
                
                <div class="details-row">
                  <span class="details-label">Plan</span>
                  <span class="details-value">${paymentDetails?.planName}</span>
                </div>
                
                <div class="details-row">
                  <span class="details-label">Duración</span>
                  <span class="details-value">${paymentDetails?.months} ${paymentDetails?.months === 1 ? 'mes' : 'meses'}</span>
                </div>
                
                ${paymentDetails?.discount && paymentDetails.discount > 0 ? `
                  <div class="details-row">
                    <span class="details-label">Descuento</span>
                    <span class="details-value" style="color: #22c55e;">${paymentDetails.discount}%</span>
                  </div>
                ` : ''}
                
                ${paymentDetails?.newExpiryDate ? `
                  <div class="details-row">
                    <span class="details-label">Nueva fecha de vencimiento</span>
                    <span class="details-value">${formatDate(paymentDetails.newExpiryDate)}</span>
                  </div>
                ` : ''}
                
                <div class="details-row total-row">
                  <span class="details-label">TOTAL PAGADO</span>
                  <span class="details-value">${formatCurrency(paymentDetails?.amount || 0, paymentDetails?.currency || 'USD')}</span>
                </div>
              </div>
              
              ${paymentDetails?.status === 'success' ? `
                <div class="thank-you">
                  <h2>¡Gracias por tu compra! 🎉</h2>
                  <p>
                    Tu pago ha sido procesado exitosamente y tu licencia ${paymentDetails.planName} 
                    ha sido ${paymentDetails.months > 1 ? 'extendida' : 'activada'}.
                    Ahora puedes disfrutar de todas las funcionalidades de Oryon App.
                  </p>
                  <p style="margin-top: 10px;">
                    Si tienes alguna pregunta, no dudes en contactar a nuestro equipo de soporte.
                  </p>
                </div>
              ` : paymentDetails?.status === 'failed' ? `
                <div class="thank-you" style="background: #fef2f2; border-color: #ef4444;">
                  <h2 style="color: #991b1b;">Pago No Procesado</h2>
                  <p style="color: #991b1b;">
                    Lamentablemente, tu pago no pudo ser procesado. 
                    Por favor verifica los detalles de pago e intenta nuevamente.
                  </p>
                  <p style="margin-top: 10px; color: #991b1b;">
                    Si el problema persiste, contacta a nuestro equipo de soporte.
                  </p>
                </div>
              ` : ''}
              
              <div class="footer">
                <p><strong>Oryon App</strong></p>
                <p>Sistema de Gestión Integral para Centros de Reparación</p>
                <p style="margin-top: 10px;">
                  Este recibo es un documento oficial de tu transacción.<br>
                  Guárdalo para tus registros.
                </p>
                <p style="margin-top: 10px; font-size: 10px;">
                  Documento generado el ${formatDate(new Date().toISOString())} a las ${formatTime(new Date().toISOString())}
                </p>
              </div>
            </div>
          </body>
        </html>
      `)
      
      printWindow.document.close()
      
      setTimeout(() => {
        printWindow.print()
        toast.success('PDF generado', { id: 'pdf-generation' })
      }, 500)
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Error al generar PDF', { id: 'pdf-generation' })
    }
  }

  const printReceipt = () => {
    window.print()
  }

  const sendReceiptEmail = async () => {
    toast.loading('Enviando recibo por email...', { id: 'send-email' })
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/license/send-receipt`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            receiptNumber: paymentDetails?.receiptNumber,
            transactionId: paymentDetails?.transactionId
          })
        }
      )

      const data = await response.json()

      if (data.success) {
        toast.success('Recibo enviado por email', { id: 'send-email' })
      } else {
        toast.error('Error al enviar email', { id: 'send-email' })
      }
    } catch (error) {
      console.error('Error sending email:', error)
      toast.error('Error al enviar email', { id: 'send-email' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />
              <p className="text-center text-gray-600 dark:text-gray-400">
                Cargando detalles del pago...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!paymentDetails) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <XCircle className="h-16 w-16 text-red-600" />
              <p className="text-center text-gray-600 dark:text-gray-400">
                No se pudo cargar el recibo
              </p>
              <Button onClick={onComplete}>Volver</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isSuccess = paymentDetails.status === 'success'
  const isFailed = paymentDetails.status === 'failed'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Actions Bar - Solo visible en pantalla */}
        <div className="flex justify-end gap-2 mb-4 print:hidden">
          <Button
            variant="outline"
            onClick={onComplete}
            className="gap-2"
          >
            <Home size={16} />
            Volver al inicio
          </Button>
          <Button
            variant="outline"
            onClick={printReceipt}
            className="gap-2"
          >
            <Printer size={16} />
            Imprimir
          </Button>
          <Button
            variant="outline"
            onClick={sendReceiptEmail}
            className="gap-2"
          >
            <Mail size={16} />
            Enviar por email
          </Button>
          <Button
            onClick={downloadPDF}
            className="gap-2"
          >
            <Download size={16} />
            Descargar PDF
          </Button>
        </div>

        {/* Receipt Card */}
        <div ref={receiptRef}>
          <Card className="overflow-hidden">
            {/* Header */}
            <CardHeader className="text-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-white rounded-full">
                  {isSuccess && <CheckCircle2 className="h-12 w-12 text-green-600" />}
                  {isFailed && <XCircle className="h-12 w-12 text-red-600" />}
                  {!isSuccess && !isFailed && <Clock className="h-12 w-12 text-yellow-600" />}
                </div>
              </div>
              <CardTitle className="text-3xl mb-2">
                {isSuccess && '¡Pago Exitoso!'}
                {isFailed && 'Pago No Procesado'}
                {!isSuccess && !isFailed && 'Pago Pendiente'}
              </CardTitle>
              <p className="text-blue-100">
                Recibo de Pago de Licencia
              </p>
              <p className="text-sm text-blue-200 mt-2">
                No. {paymentDetails.receiptNumber}
              </p>
            </CardHeader>

            <CardContent className="p-6 sm:p-8">
            {/* Status Badge */}
            <div className="flex justify-center mb-6">
              <Badge 
                className={`text-base px-4 py-2 ${
                  isSuccess ? 'bg-green-600 hover:bg-green-700' : 
                  isFailed ? 'bg-red-600 hover:bg-red-700' : 
                  'bg-yellow-600 hover:bg-yellow-700'
                }`}
              >
                {isSuccess && '✓ CONFIRMADO'}
                {isFailed && '✗ RECHAZADO'}
                {!isSuccess && !isFailed && '⏳ PENDIENTE'}
              </Badge>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border dark:border-gray-800">
                <Calendar className="text-blue-600 flex-shrink-0" size={24} />
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 uppercase font-medium">Fecha</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatDate(paymentDetails.paymentDate)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border dark:border-gray-800">
                <Clock className="text-blue-600 flex-shrink-0" size={24} />
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 uppercase font-medium">Hora</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatTime(paymentDetails.paymentDate)}
                  </p>
                </div>
              </div>
            </div>

            {/* Transaction Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border dark:border-gray-800">
                <FileText className="text-blue-600 flex-shrink-0" size={24} />
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 uppercase font-medium">ID Transacción</p>
                  <p className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {paymentDetails.transactionId}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border dark:border-gray-800">
                <CreditCard className="text-blue-600 flex-shrink-0" size={24} />
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 uppercase font-medium">Método de Pago</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {paymentDetails.paymentMethod}
                  </p>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Purchase Details */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="text-blue-600" size={20} />
                <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                  Detalles de la Compra
                </h3>
              </div>

              <div className="space-y-3 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border dark:border-gray-800">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Plan</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {paymentDetails.planName}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Duración</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {paymentDetails.months} {paymentDetails.months === 1 ? 'mes' : 'meses'}
                  </span>
                </div>

                {paymentDetails.discount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Descuento aplicado</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {paymentDetails.discount}%
                    </span>
                  </div>
                )}

                {paymentDetails.newExpiryDate && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Nueva fecha de vencimiento</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {formatDate(paymentDetails.newExpiryDate)}
                    </span>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">TOTAL PAGADO</span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(paymentDetails.amount, paymentDetails.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Thank You Message */}
            {isSuccess && (
              <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                <AlertDescription className="text-blue-900 dark:text-blue-100">
                  <p className="font-semibold mb-2">¡Gracias por tu compra! 🎉</p>
                  <p className="text-sm">
                    Tu pago ha sido procesado exitosamente y tu licencia <strong>{paymentDetails.planName}</strong> ha sido {paymentDetails.months > 1 ? 'extendida' : 'activada'}. 
                    Ahora puedes disfrutar de todas las funcionalidades de Oryon App.
                  </p>
                  <p className="text-sm mt-2">
                    Si tienes alguna pregunta, no dudes en contactar a nuestro equipo de soporte.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {isFailed && (
              <Alert className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                <XCircle className="h-5 w-5 text-red-600" />
                <AlertDescription className="text-red-900 dark:text-red-100">
                  <p className="font-semibold mb-2">Pago No Procesado</p>
                  <p className="text-sm">
                    Lamentablemente, tu pago no pudo ser procesado. Por favor verifica los detalles de pago e intenta nuevamente.
                  </p>
                  <p className="text-sm mt-2">
                    Si el problema persiste, contacta a nuestro equipo de soporte con el ID de transacción: <strong>{paymentDetails.transactionId}</strong>
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Footer Note */}
            <div className="mt-6 pt-6 border-t dark:border-gray-800 text-center text-sm text-gray-600 dark:text-gray-400">
              <p>
                Este recibo es un documento oficial de tu transacción.
              </p>
              <p className="mt-1">
                Guárdalo para tus registros.
              </p>
              <p className="mt-4 text-xs">
                <strong>Oryon App</strong> - Sistema de Gestión Integral
              </p>
            </div>
          </CardContent>
          </Card>
        </div>

        {/* Action Buttons at Bottom - Mobile friendly */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6 print:hidden">
          <Button
            variant="outline"
            onClick={onComplete}
            className="flex-1 gap-2"
          >
            <Home size={16} />
            Volver al Dashboard
          </Button>
          <Button
            onClick={downloadPDF}
            className="flex-1 gap-2"
          >
            <Download size={16} />
            Descargar Recibo PDF
          </Button>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .dark\\:bg-background,
          .dark\\:bg-gray-900,
          .dark\\:bg-gray-800 {
            background: white !important;
          }
          
          .dark\\:text-gray-100,
          .dark\\:text-gray-200 {
            color: #000 !important;
          }
          
          .dark\\:border-gray-800,
          .dark\\:border-gray-700 {
            border-color: #e5e7eb !important;
          }
        }
      `}</style>
    </div>
  )
}

export default PaymentReceipt
