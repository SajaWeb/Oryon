import { useState } from 'react'
import { Clock, Calendar, Zap, Percent, CreditCard, Globe, MapPin, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Alert, AlertDescription } from '../ui/alert'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { Label } from '../ui/label'
import { projectId } from '../../utils/supabase/info'
import { toast } from 'sonner@2.0.3'
import { PaymentReceipt } from '../PaymentReceipt'

interface ExtendLicenseSectionProps {
  accessToken: string
  currentPlanId: string
  currentPlanName: string
  currentExpiry: string
  onLicenseExtended: () => void
}

interface DurationOption {
  months: number
  label: string
  discount: number
  badge?: string
  popular?: boolean
}

const durationOptions: DurationOption[] = [
  {
    months: 1,
    label: '1 Mes',
    discount: 0
  },
  {
    months: 3,
    label: '3 Meses',
    discount: 0
  },
  {
    months: 6,
    label: '6 Meses',
    discount: 10,
    badge: '10% OFF',
    popular: true
  },
  {
    months: 12,
    label: '12 Meses',
    discount: 10,
    badge: '10% OFF'
  }
]

const planPrices: Record<string, { usd: number; cop: number }> = {
  basico: { usd: 20, cop: 50000 },    // Colombia: $50,000 COP/mes
  pyme: { usd: 35, cop: 90000 },       // Colombia: $90,000 COP/mes
  enterprise: { usd: 60, cop: 160000 } // Colombia: $160,000 COP/mes
}

export function ExtendLicenseSection({
  accessToken,
  currentPlanId,
  currentPlanName,
  currentExpiry,
  onLicenseExtended
}: ExtendLicenseSectionProps) {
  const [selectedDuration, setSelectedDuration] = useState<number>(6)
  const [selectedCountry, setSelectedCountry] = useState<'colombia' | 'international'>('international')
  const [loading, setLoading] = useState(false)
  
  // Estados para el recibo de pago
  const [showReceipt, setShowReceipt] = useState(false)
  const [receiptData, setReceiptData] = useState<any>(null)

  const calculatePrice = (months: number, discount: number) => {
    const basePrices = planPrices[currentPlanId] || planPrices.basico
    const basePrice = selectedCountry === 'colombia' ? basePrices.cop : basePrices.usd
    const totalBeforeDiscount = basePrice * months
    const discountAmount = totalBeforeDiscount * (discount / 100)
    const finalPrice = totalBeforeDiscount - discountAmount
    
    return {
      basePrice,
      totalBeforeDiscount,
      discountAmount,
      finalPrice,
      perMonth: finalPrice / months
    }
  }

  const calculateNewExpiryDate = (months: number) => {
    if (!currentExpiry) return null
    const currentDate = new Date(currentExpiry)
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + months)
    return newDate
  }

  const formatPrice = (price: number) => {
    if (selectedCountry === 'colombia') {
      return `$${price.toLocaleString('es-CO')} COP`
    } else {
      return `$${price.toFixed(2)} USD`
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'No disponible'
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const selectedOption = durationOptions.find(opt => opt.months === selectedDuration)
  const pricing = selectedOption ? calculatePrice(selectedOption.months, selectedOption.discount) : null
  const newExpiryDate = selectedOption ? calculateNewExpiryDate(selectedOption.months) : null

  const handleExtendLicense = async () => {
    if (!selectedOption || !pricing) {
      console.warn('⚠️ No hay opción seleccionada o pricing')
      return
    }

    console.log('🚀 Iniciando proceso de extensión de licencia')
    console.log('📊 Configuración:', {
      selectedCountry,
      selectedOption,
      pricing,
      currentPlanId,
      currentPlanName,
      accessToken: accessToken ? 'Presente' : 'Ausente',
      projectId
    })

    setLoading(true)

    try {
      if (selectedCountry === 'colombia') {
        // PSE Payment for Colombia
        toast.loading('Procesando pago con PSE...', { id: 'payment-process' })

        console.log('🔵 Iniciando pago PSE con datos:', {
          planId: currentPlanId,
          months: selectedOption.months,
          amount: pricing.finalPrice,
          discount: selectedOption.discount
        })

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/license/extend/pse`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              planId: currentPlanId,
              months: selectedOption.months,
              amount: pricing.finalPrice,
              discount: selectedOption.discount
            })
          }
        )

        console.log('🔵 Respuesta PSE status:', response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.error('❌ Error en respuesta PSE:', errorText)
          throw new Error(`Error en servidor: ${response.status}`)
        }

        const data = await response.json()
        console.log('🔵 Datos PSE recibidos:', data)

        if (data.success) {
          toast.dismiss('payment-process')
          
          // Simulate PSE payment success for demo
          toast.info('Modo demostración activado', {
            description: 'En producción serías redirigido a PSE'
          })

          // Extend license directly
          console.log('🟢 Extendiendo licencia por', selectedOption.months, 'meses')
          
          const extendResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/license/extend`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                months: selectedOption.months
              })
            }
          )

          console.log('🟢 Respuesta extend status:', extendResponse.status)

          if (!extendResponse.ok) {
            const errorText = await extendResponse.text()
            console.error('❌ Error en extend response:', errorText)
            toast.dismiss('payment-process')
            toast.error('Error al extender la licencia', {
              description: `Error del servidor: ${extendResponse.status}`
            })
            setLoading(false)
            return
          }

          const extendData = await extendResponse.json()
          console.log('🟢 Datos extend recibidos:', extendData)

          if (extendData.success) {
            // Preparar datos para el recibo (PSE - Colombia)
            setReceiptData({
              planId: currentPlanId,
              planName: currentPlanName,
              amount: pricing.finalPrice,
              currency: 'COP',
              months: selectedOption.months,
              discount: selectedOption.discount,
              status: 'success'
            })
            
            // Mostrar recibo de pago
            setShowReceipt(true)
          } else {
            toast.error('Error al extender la licencia', {
              description: extendData.error || 'Por favor intenta de nuevo'
            })
          }
        } else {
          toast.error('Error en el proceso de pago', {
            description: data.error || 'Por favor intenta de nuevo'
          })
        }
      } else {
        // Paddle Payment for International
        toast.loading('Procesando pago internacional...', { id: 'payment-process' })

        console.log('🔵 Iniciando pago Paddle con datos:', {
          planId: currentPlanId,
          months: selectedOption.months,
          amount: pricing.finalPrice,
          discount: selectedOption.discount
        })

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/license/extend/paddle`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              planId: currentPlanId,
              months: selectedOption.months,
              amount: pricing.finalPrice,
              discount: selectedOption.discount
            })
          }
        )

        console.log('🔵 Respuesta Paddle status:', response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.error('❌ Error en respuesta Paddle:', errorText)
          throw new Error(`Error en servidor: ${response.status}`)
        }

        const data = await response.json()
        console.log('🔵 Datos Paddle recibidos:', data)

        if (data.success) {
          toast.dismiss('payment-process')
          
          // Simulate Paddle payment success for demo
          toast.info('Modo demostración activado', {
            description: 'En producción serías redirigido a Paddle'
          })

          // Extend license directly
          console.log('🟢 Extendiendo licencia (Paddle) por', selectedOption.months, 'meses')
          
          const extendResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/license/extend`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                months: selectedOption.months
              })
            }
          )

          console.log('🟢 Respuesta extend (Paddle) status:', extendResponse.status)

          if (!extendResponse.ok) {
            const errorText = await extendResponse.text()
            console.error('❌ Error en extend response (Paddle):', errorText)
            toast.dismiss('payment-process')
            toast.error('Error al extender la licencia', {
              description: `Error del servidor: ${extendResponse.status}`
            })
            setLoading(false)
            return
          }

          const extendData = await extendResponse.json()
          console.log('🟢 Datos extend (Paddle) recibidos:', extendData)

          if (extendData.success) {
            // Preparar datos para el recibo (Paddle - Internacional)
            setReceiptData({
              planId: currentPlanId,
              planName: currentPlanName,
              amount: pricing.finalPrice,
              currency: 'USD',
              months: selectedOption.months,
              discount: selectedOption.discount,
              status: 'success'
            })
            
            // Mostrar recibo de pago
            setShowReceipt(true)
          } else {
            toast.error('Error al extender la licencia', {
              description: extendData.error || 'Por favor intenta de nuevo'
            })
          }
        } else {
          toast.error('Error en el proceso de pago', {
            description: data.error || 'Por favor intenta de nuevo'
          })
        }
      }
    } catch (error) {
      console.error('❌ Error extending license:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      toast.dismiss('payment-process')
      toast.error('Error al procesar el pago', {
        description: errorMessage
      })
    } finally {
      setLoading(false)
      toast.dismiss('payment-process')
    }
  }

  // Si estamos mostrando el recibo, renderizarlo en su lugar
  if (showReceipt && receiptData) {
    return (
      <PaymentReceipt
        accessToken={accessToken}
        paymentData={receiptData}
        transactionId={`TXN-${Date.now()}`}
        onComplete={() => {
          setShowReceipt(false)
          setReceiptData(null)
          onLicenseExtended()
        }}
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Clock className="text-blue-600" size={24} />
          <div>
            <CardTitle>Extender Licencia</CardTitle>
            <CardDescription>
              Compra tiempo adicional para tu plan {currentPlanName}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current License Info */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="text-sm text-blue-900 dark:text-blue-100 mb-1">
                <strong>Plan actual:</strong> {currentPlanName}
              </p>
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Vencimiento actual:</strong> {formatDate(new Date(currentExpiry))}
              </p>
            </div>
          </div>
        </div>

        {/* Duration Selection */}
        <div>
          <Label className="text-base mb-3 block">Selecciona la duración</Label>
          <RadioGroup
            value={selectedDuration.toString()}
            onValueChange={(value) => setSelectedDuration(parseInt(value))}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {durationOptions.map((option) => {
              const price = calculatePrice(option.months, option.discount)
              return (
                <div key={option.months} className="relative">
                  <RadioGroupItem
                    value={option.months.toString()}
                    id={`duration-${option.months}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`duration-${option.months}`}
                    className={`flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all peer-checked:border-blue-600 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-950 hover:border-blue-300 dark:hover:border-blue-700 ${
                      option.popular ? 'border-blue-400 dark:border-blue-600' : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{option.label}</span>
                      {option.badge && (
                        <Badge className="bg-green-600 text-white">{option.badge}</Badge>
                      )}
                      {option.popular && !option.badge && (
                        <Badge className="bg-blue-600 text-white">Más popular</Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      {option.discount > 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-through">
                          {formatPrice(price.totalBeforeDiscount)}
                        </p>
                      )}
                      <p className="text-lg text-blue-600 dark:text-blue-400">
                        {formatPrice(price.finalPrice)}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {formatPrice(price.perMonth)} / mes
                      </p>
                      {option.discount > 0 && (
                        <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                          Ahorras {formatPrice(price.discountAmount)}
                        </p>
                      )}
                    </div>
                  </Label>
                </div>
              )
            })}
          </RadioGroup>
        </div>

        {/* Country Selection */}
        <div>
          <Label className="text-base mb-3 block">Selecciona tu ubicación</Label>
          <RadioGroup
            value={selectedCountry}
            onValueChange={(value: 'colombia' | 'international') => setSelectedCountry(value)}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            <div>
              <RadioGroupItem value="colombia" id="colombia" className="peer sr-only" />
              <Label
                htmlFor="colombia"
                className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all peer-checked:border-blue-600 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-950 hover:border-blue-300 dark:hover:border-blue-700 border-gray-200 dark:border-gray-700"
              >
                <MapPin className="text-blue-600 flex-shrink-0" size={20} />
                <div>
                  <div className="font-medium">Colombia</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Pago con PSE</div>
                </div>
              </Label>
            </div>

            <div>
              <RadioGroupItem value="international" id="international" className="peer sr-only" />
              <Label
                htmlFor="international"
                className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all peer-checked:border-blue-600 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-950 hover:border-blue-300 dark:hover:border-blue-700 border-gray-200 dark:border-gray-700"
              >
                <Globe className="text-blue-600 flex-shrink-0" size={20} />
                <div>
                  <div className="font-medium">Internacional</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Pago con Paddle</div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Summary */}
        {pricing && newExpiryDate && (
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
            <h4 className="font-medium">Resumen de compra</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Duración:</span>
                <span className="font-medium">{selectedOption?.label}</span>
              </div>
              {selectedOption && selectedOption.discount > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Precio base:</span>
                    <span className="line-through text-gray-500">{formatPrice(pricing.totalBeforeDiscount)}</span>
                  </div>
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Descuento ({selectedOption.discount}%):</span>
                    <span>-{formatPrice(pricing.discountAmount)}</span>
                  </div>
                </>
              )}
              <div className="border-t border-gray-300 dark:border-gray-600 pt-2 mt-2"></div>
              <div className="flex justify-between text-base">
                <span className="font-medium">Total a pagar:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{formatPrice(pricing.finalPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Nueva fecha de vencimiento:</span>
                <span className="font-medium text-green-600 dark:text-green-400">{formatDate(newExpiryDate)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Discount Alert for 6+ months */}
        {selectedOption && selectedOption.discount > 0 && (
          <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <Percent className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900 dark:text-green-100">
              ¡Obtén un {selectedOption.discount}% de descuento al comprar {selectedOption.months} meses o más!
            </AlertDescription>
          </Alert>
        )}

        {/* Purchase Button */}
        <Button
          onClick={handleExtendLicense}
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Procesando...
            </>
          ) : (
            <>
              <CreditCard className="mr-2" size={20} />
              Comprar extensión - {pricing ? formatPrice(pricing.finalPrice) : ''}
            </>
          )}
        </Button>

        {/* Info Alert */}
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            El tiempo se sumará a tu licencia actual. No perderás días restantes.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
