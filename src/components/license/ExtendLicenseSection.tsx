import { useState } from 'react'
import { Clock, Zap, Percent, CreditCard, Shield, Info, Loader2 } from 'lucide-react'
import { Badge as OryonBadge, Button as OryonButton, Card as OryonCard, KeyValue } from '../oryon'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { projectId } from '../../utils/supabase/info'
import { toast } from 'sonner'
import { PaymentReceipt } from '../PaymentReceipt'
import wompiService from '../../services/WompiService'
import { getSupabaseClient } from "../../utils/supabase/client";
import { extendLicense, daysRemaining } from '../../utils/license'

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
  const { isMobile } = useBreakpoint()
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

  /* La misma función que aplica la vigencia al volver del pago: si aquí se
     calculara aparte, la fecha prometida y la guardada podrían no coincidir. */
  const calculateNewExpiryDate = (months: number) => {
    if (!currentExpiry) return null
    return extendLicense({ licenseExpiry: currentExpiry }, months)
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
  const diasActuales = daysRemaining(currentExpiry)

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
      }, accessToken)

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
    <OryonCard title="Pagar varios meses" subtitle={`Suma meses a tu plan ${currentPlanName}. Entre más meses, mayor descuento.`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div role="radiogroup" aria-label="Duración" style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))', gap: 8 }}>
          {durationOptions.map((option) => {
            const price = calculatePrice(option.months, option.discount)
            const on = selectedDuration === option.months
            return (
              <label
                key={option.months}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  padding: '12px 14px',
                  background: on ? 'var(--accent-subtle)' : 'var(--surface-card)',
                  border: `var(--border-width) solid ${on ? 'var(--accent-fill)' : 'var(--border-default)'}`,
                  boxShadow: on ? 'inset 0 0 0 1px var(--accent-fill)' : 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                }}
              >
                <input type="radio" name="duration" checked={on} onChange={() => setSelectedDuration(option.months)} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span style={{ fontSize: 'var(--text-body)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-primary)' }}>
                    {option.months} {option.months === 1 ? 'mes' : 'meses'}
                  </span>
                  {option.discount > 0 && <OryonBadge tone="success">−{option.discount}%</OryonBadge>}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-body-lg)', color: 'var(--text-primary)' }}>{formatPrice(price.finalPrice)}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--text-tertiary)' }}>{formatPrice(price.perMonth)} / mes</span>
              </label>
            )
          })}
        </div>

        {pricing && newExpiryDate && (
          <KeyValue
            items={[
              { label: 'Vence hoy', value: formatDate(new Date(currentExpiry)), mono: true },
              ...(selectedOption && selectedOption.discount > 0
                ? [{ label: `Descuento (${selectedOption.discount}%)`, value: `−${formatPrice(pricing.discountAmount)}`, mono: true }]
                : []),
              ...(diasActuales > 0
                ? [{ label: 'Días que conservas', value: `${diasActuales} ${diasActuales === 1 ? 'día' : 'días'} + ${selectedOption.months} ${selectedOption.months === 1 ? 'mes' : 'meses'}` }]
                : []),
              { label: 'Nuevo vencimiento', value: formatDate(newExpiryDate), mono: true },
              { label: 'Total a pagar', value: <strong style={{ color: 'var(--text-primary)' }}>{formatPrice(pricing.finalPrice)}</strong>, mono: true },
            ]}
          />
        )}

        <OryonButton variant="primary" size="lg" fullWidth iconLeft={Shield} onClick={handleExtendLicense} loading={loading} disabled={loading}>
          {loading ? 'Abriendo Wompi' : `Pagar ${formatPrice(pricing.finalPrice)} con Wompi`}
        </OryonButton>
        <p style={{ margin: 0, textAlign: 'center', fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>
          Los meses se suman a lo que te queda: no pierdes días.
        </p>
      </div>
    </OryonCard>
  )
}
export default ExtendLicenseSection
