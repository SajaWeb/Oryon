import { useState } from 'react'
import { Clock, Zap, Percent, CreditCard, Shield, Info, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Alert, AlertDescription } from '../ui/alert'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { Label } from '../ui/label'
import { projectId } from '../../utils/supabase/info'
import { toast } from 'sonner'
import { PaymentReceipt } from '../PaymentReceipt'
import wompiService from '../../services/WompiService'

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
    discount: 15,
    badge: '15% OFF'
  }
]

// Precios en COP según sucursales
const planPrices: Record<string, number> = {
  basico: 50000,     // 1 sucursal: $50.000 COP/mes
  pyme: 85000,       // 2 sucursales: $85.000 COP/mes
  enterprise: 140000 // 4 sucursales: $140.000 COP/mes
}

export function ExtendLicenseSection({
  accessToken,
  currentPlanId,
  currentPlanName,
  currentExpiry,
  onLicenseExtended
}: ExtendLicenseSectionProps) {
  const [selectedDuration, setSelectedDuration] = useState<number>(6)
  const [loading, setLoading] = useState(false)
  
  // Estados para el recibo de pago
  const [showReceipt, setShowReceipt] = useState(false)
  const [receiptData, setReceiptData] = useState<any>(null)

  const calculatePrice = (months: number, discount: number) => {
    const basePrice = planPrices[currentPlanId] || planPrices.basico || 50000
    const totalBeforeDiscount = basePrice * months
    const discountAmount = totalBeforeDiscount * (discount / 100)
    const finalPrice = totalBeforeDiscount - discountAmount
    
    return {
      basePrice,
      totalBeforeDiscount,
      discountAmount,
      finalPrice,
      perMonth: Math.round(finalPrice / months)
    }
  }

  const calculateNewExpiryDate = (months: number) => {
    if (!currentExpiry) return null
    const currentDate = new Date(currentExpiry)
    const now = new Date()
    const baseDate = currentDate > now ? currentDate : now
    const newDate = new Date(baseDate)
    newDate.setMonth(newDate.getMonth() + months)
    return newDate
  }

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString('es-CO')} COP`
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'No disponible'
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const selectedOption = durationOptions.find(opt => opt.months === selectedDuration) || durationOptions[0]
  const pricing = calculatePrice(selectedOption.months, selectedOption.discount)
  const newExpiryDate = calculateNewExpiryDate(selectedOption.months)

  const handleExtendLicense = async () => {
    if (!selectedOption || !pricing) return

    setLoading(true)
    toast.loading('Iniciando pasarela de pago con Wompi...', { id: 'payment-process' })

    try {
      const reference = `EXT-${currentPlanId}-${selectedOption.months}M-${Date.now()}`
      
      // 1. Intentar registrar intención de pago en KV y en el backend
      try {
        const supabase = getSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        let companyId = 1
        if (user) {
          const { data: userRow } = await supabase.from('kv_store_4d437e50').select('value').eq('key', `user:${user.id}`).single()
          if (userRow?.value) {
            const parsedUser = typeof userRow.value === 'string' ? JSON.parse(userRow.value) : userRow.value
            companyId = parsedUser.companyId || 1
          }
        }

        await supabase.from('kv_store_4d437e50').upsert({
          key: `payment:${reference}`,
          value: JSON.stringify({
            reference,
            planId: currentPlanId,
            amount: pricing.finalPrice,
            currency: 'COP',
            paymentMethod: 'Wompi PSE',
            durationMonths: selectedOption.months,
            status: 'PENDING',
            companyId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
        })

        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/license/payment/create`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              reference,
              planId: currentPlanId,
              amount: pricing.finalPrice,
              currency: 'COP',
              paymentMethod: 'Wompi',
              durationMonths: selectedOption.months,
              status: 'pending'
            })
          }
        )
      } catch (backendErr) {
        console.warn('Backend payment tracking notice:', backendErr)
      }

      // 2. Abrir Checkout oficial de Wompi mediante Hosted Link
      const redirectUrl = `${window.location.origin}/payment-callback?planId=${currentPlanId}&reference=${reference}&months=${selectedOption.months}&method=wompi`
      
      toast.dismiss('payment-process')
      
      await wompiService.openCheckout({
        name: `Extensión Oryon - ${selectedOption.label} (${currentPlanName})`,
        description: `Extensión de licencia por ${selectedOption.months} meses para ${currentPlanName}`,
        amount_in_cents: pricing.finalPrice * 100,
        currency: 'COP',
        reference,
        customer_email: '',
        redirect_url: redirectUrl
      })

      setLoading(false)
    } catch (error: any) {
      console.error('Error al iniciar extensión con Wompi:', error)
      toast.dismiss('payment-process')
      toast.error('Error al procesar la extensión', {
        description: error.message || 'Por favor intenta de nuevo.'
      })
      setLoading(false)
    }
  }

  // Si estamos mostrando el recibo
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
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
            <Clock size={22} />
          </div>
          <div>
            <CardTitle>Extender Duración de Licencia</CardTitle>
            <CardDescription>
              Añade meses de vigencia a tu plan actual ({currentPlanName}) pagando de forma segura con Wompi (COP)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current License Info */}
        <div className="bg-muted/40 border border-border rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="text-primary flex-shrink-0 mt-0.5" size={18} />
            <div className="flex-1 text-sm">
              <p className="text-foreground">
                <strong>Plan actual:</strong> {currentPlanName}
              </p>
              <p className="text-muted-foreground mt-0.5">
                <strong>Vencimiento actual:</strong> {formatDate(new Date(currentExpiry))}
              </p>
            </div>
          </div>
        </div>

        {/* Duration Selection */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">Selecciona la duración</Label>
          <RadioGroup
            value={selectedDuration.toString()}
            onValueChange={(value) => setSelectedDuration(parseInt(value))}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3"
          >
            {durationOptions.map((option) => {
              const price = calculatePrice(option.months, option.discount)
              const isSelected = selectedDuration === option.months

              return (
                <div key={option.months} className="relative">
                  <RadioGroupItem
                    value={option.months.toString()}
                    id={`duration-${option.months}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`duration-${option.months}`}
                    className={`flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-border/80 bg-card'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-foreground">{option.label}</span>
                      {option.badge && (
                        <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5">
                          {option.badge}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      {option.discount > 0 && (
                        <p className="text-xs text-muted-foreground line-through">
                          {formatPrice(price.totalBeforeDiscount)}
                        </p>
                      )}
                      <p className="text-base font-extrabold text-foreground">
                        {formatPrice(price.finalPrice)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatPrice(price.perMonth)} / mes
                      </p>
                      {option.discount > 0 && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
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

        {/* Summary */}
        {pricing && newExpiryDate && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h4 className="font-semibold text-sm text-foreground">Resumen de Extensión</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan:</span>
                <span className="font-medium text-foreground">{currentPlanName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duración adicional:</span>
                <span className="font-medium text-foreground">{selectedOption?.label}</span>
              </div>
              {selectedOption && selectedOption.discount > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Precio sin descuento:</span>
                    <span className="line-through text-muted-foreground">{formatPrice(pricing.totalBeforeDiscount)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>Descuento aplicado ({selectedOption.discount}%):</span>
                    <span>-{formatPrice(pricing.discountAmount)}</span>
                  </div>
                </>
              )}
              <div className="border-t border-border pt-2 mt-2"></div>
              <div className="flex justify-between text-sm">
                <span className="font-bold text-foreground">Total a pagar:</span>
                <span className="font-extrabold text-primary">{formatPrice(pricing.finalPrice)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Nueva fecha de vencimiento:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatDate(newExpiryDate)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Purchase Button */}
        <Button
          onClick={handleExtendLicense}
          disabled={loading}
          className="w-full h-12 text-base font-semibold"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Procesando con Wompi...
            </>
          ) : (
            <>
              <CreditCard className="mr-2" size={18} />
              Pagar Extensión ({formatPrice(pricing.finalPrice)}) con Wompi
            </>
          )}
        </Button>

        {/* Info Alert */}
        <Alert className="bg-muted/30 border-border">
          <Zap className="h-4 w-4 text-primary" />
          <AlertDescription className="text-xs text-muted-foreground ml-1">
            Los meses comprados se sumarán al tiempo restante de tu licencia actual. No pierdes días acumulados.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
export default ExtendLicenseSection
