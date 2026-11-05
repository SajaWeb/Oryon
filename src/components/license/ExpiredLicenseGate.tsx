import { useState } from 'react'
import { Alert as OryonAlert, Badge as OryonBadge, Button as OryonButton, Card as OryonCard, KeyValue } from '../oryon'
import { 
  ShieldAlert, 
  CreditCard, 
  CheckCircle2, 
  Building2, 
  UserCog, 
  Users, 
  Wrench, 
  MessageCircle, 
  RefreshCw, 
  LogOut, 
  Loader2, 
  Zap, 
  ShieldCheck,
  Lock
} from 'lucide-react'
import { toast } from 'sonner'
import { plans, Plan } from '../License'
import wompiService from '../../services/WompiService'
import { projectId } from '../../utils/supabase/info'
import { Logo } from '../brand/Logo'
import { getSupabaseClient } from "../../utils/supabase/client";

interface ExpiredLicenseGateProps {
  accessToken: string
  userProfile: any
  licenseInfo: any
  onRefreshLicense: () => Promise<void>
  onLogout: () => void
}

const planTierOrder: Record<string, number> = {
  basico: 1,
  pyme: 2,
  enterprise: 3,
}

export function ExpiredLicenseGate({
  accessToken,
  userProfile,
  licenseInfo,
  onRefreshLicense,
  onLogout,
}: ExpiredLicenseGateProps) {
  // Plan actual de la empresa (o el que tenía previamente)
  const currentCompanyPlan: string =
    licenseInfo?.planId ||
    userProfile?.company?.planId ||
    'basico'

  const currentTier = planTierOrder[currentCompanyPlan] || 1

  // Por defecto, seleccionar su plan actual o el mínimo permitido
  const initialPlanId =
    licenseInfo?.planId && planTierOrder[licenseInfo.planId] >= currentTier
      ? licenseInfo.planId
      : currentCompanyPlan

  const [selectedPlanId, setSelectedPlanId] = useState<string>(initialPlanId)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'superadmin'
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[1]

  const isPlanDisabled = (planId: string) => {
    const targetTier = planTierOrder[planId] || 1
    return targetTier < currentTier
  }

  const getDisabledReason = (planId: string) => {
    const targetTier = planTierOrder[planId] || 1
    if (targetTier < currentTier) {
      const currentName =
        currentCompanyPlan === 'enterprise'
          ? 'Enterprise (4 sucursales)'
          : 'PYME (2 sucursales)'
      return `Tu empresa ya cuenta con sucursales o personal creados bajo el Plan ${currentName}. Para mantener tu información y sedes activas sin bloqueos, reactiva en tu plan actual o superior.`
    }
    return null
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await onRefreshLicense()
      toast.success('Estado de licencia actualizado')
    } catch (err) {
      toast.error('No se pudo comprobar el estado')
    } finally {
      setRefreshing(false)
    }
  }

  const handlePlanSelect = (plan: Plan) => {
    if (isPlanDisabled(plan.id)) {
      const reason = getDisabledReason(plan.id)
      toast.error('Plan no disponible para degradación', {
        description: reason || 'No puedes reactivar en un plan inferior al que ya tienes configurado.',
      })
      return
    }
    setSelectedPlanId(plan.id)
  }

  const handlePay = async (plan: Plan) => {
    if (isPlanDisabled(plan.id)) {
      toast.error('No puedes reactivar en un plan menor debido a la cantidad de sucursales/empleados configurados.')
      return
    }

    setLoading(true)
    toast.loading('Generando enlace seguro en Wompi...', { id: 'wompi-gate-pay' })

    try {
      const companyId = userProfile?.companyId || 1
      const reference = `PLAN-${plan.id}-1M-${Date.now()}`
      const amount = plan.priceCOP

      // 1. Guardar la referencia del pago en KV y backend
      try {
        const supabase = getSupabaseClient()
        await supabase.from('kv_store_4d437e50').upsert({
          key: `payment:${reference}`,
          value: JSON.stringify({
            reference,
            planId: plan.id,
            amount: amount,
            currency: 'COP',
            paymentMethod: 'Wompi PSE',
            status: 'PENDING',
            companyId,
            companyName: userProfile?.companyName || `Empresa #${companyId}`,
            durationMonths: 1,
            customerEmail: userProfile?.email || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
        })

        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/license/payment/create`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              reference,
              planId: plan.id,
              amount: amount,
              currency: 'COP',
              paymentMethod: 'Wompi',
              status: 'pending',
              companyId: companyId,
              durationMonths: 1,
              customerEmail: userProfile?.email || '',
            }),
          }
        )
      } catch (err) {
        console.warn('Log de pago backend:', err)
      }

      // 2. Abrir Wompi Hosted Checkout oficial (checkout.wompi.co/l/:id)
      const redirectUrl = `${window.location.origin}/payment-callback?planId=${plan.id}&reference=${reference}&method=wompi`
      
      toast.dismiss('wompi-gate-pay')
      toast.success('Redirigiendo a Wompi...', {
        description: 'Serás dirigido a la pasarela segura para reactivar tu cuenta.',
      })

      await wompiService.openCheckout({
        name: `Reactivación Oryon - ${plan.name}`,
        description: `Reactivación mensual para el taller ${userProfile?.companyName || ''} (${plan.limits.branches} sucursales)`,
        amount_in_cents: amount * 100,
        currency: 'COP',
        reference: reference,
        customer_email: userProfile?.email || '',
        redirect_url: redirectUrl,
        customer_data: {
          full_name: userProfile?.name || userProfile?.companyName || '',
          phone_number: userProfile?.phone || '',
          legal_id: userProfile?.documentNumber || '',
          legal_id_type: userProfile?.documentType || 'CC',
        },
      }, accessToken)
      setLoading(false)
    } catch (error: any) {
      console.error('Error al procesar pago en pasarela:', error)
      toast.dismiss('wompi-gate-pay')
      toast.error('Error al iniciar el pago', {
        description: error.message || 'Por favor intenta nuevamente o contacta a soporte.',
      })
      setLoading(false)
    }
  }

  const handleSupportClick = () => {
    const message = encodeURIComponent(
      `Hola equipo de soporte Oryon, necesito ayuda para reactivar la licencia de ${
        userProfile?.companyName || ''
      } (Email: ${userProfile?.email || ''}).`
    )
    window.open(`https://wa.me/573004001077?text=${message}`, '_blank')
  }

  const PLAN_SHORT: Record<string, string> = { basico: 'Básico', pyme: 'Pyme', enterprise: 'Enterprise' }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '12px 20px',
          borderBottom: 'var(--border-width) solid var(--border-subtle)',
          background: 'var(--surface-card)',
        }}
      >
        <Logo />
        <div style={{ display: 'flex', gap: 6 }}>
          <OryonButton size="sm" variant="secondary" iconLeft={RefreshCw} onClick={handleRefresh} loading={refreshing} disabled={refreshing}>
            Ya pagué, verificar
          </OryonButton>
          <OryonButton size="sm" variant="ghost" iconLeft={LogOut} onClick={onLogout}>
            Salir
          </OryonButton>
        </div>
      </header>

      <main style={{ flex: 1, width: '100%', maxWidth: 1040, margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 640 }}>
          <span style={{ fontFamily: 'var(--font-mono-display)', fontSize: 'var(--text-caption)', letterSpacing: 'var(--tr-caption)', textTransform: 'uppercase', color: 'var(--danger)' }}>
            Licencia vencida
          </span>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 'var(--fw-black)', fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.05, letterSpacing: 'var(--tr-h1)' }}>
            Renueva para seguir trabajando
          </h1>
          <p style={{ margin: 0, fontSize: 'var(--text-body-lg)', lineHeight: 'var(--lh-body-lg)', color: 'var(--text-secondary)' }}>
            La suscripción de <strong style={{ color: 'var(--text-primary)' }}>{userProfile?.companyName || 'tu empresa'}</strong> terminó. Tus datos están a salvo: en cuanto se confirme el pago, todo vuelve a estar disponible.
          </p>
        </div>

        {!isAdmin ? (
          <OryonCard title="Solo un administrador puede renovar" subtitle="Pídele al administrador de tu empresa que entre y haga el pago.">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <OryonButton variant="secondary" iconLeft={MessageCircle} onClick={handleSupportClick}>
                Escribir a soporte
              </OryonButton>
              <OryonButton variant="ghost" iconLeft={LogOut} onClick={onLogout}>
                Salir
              </OryonButton>
            </div>
          </OryonCard>
        ) : (
          <>
            <div role="radiogroup" aria-label="Plan" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              {plans.map((plan) => {
                const isSelected = selectedPlanId === plan.id
                const disabled = isPlanDisabled(plan.id)
                const isCurrent = plan.id === currentCompanyPlan
                return (
                  <label
                    key={plan.id}
                    onClick={(e) => {
                      if (disabled) {
                        e.preventDefault()
                        handlePlanSelect(plan)
                      }
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      padding: 16,
                      background: isSelected ? 'var(--accent-subtle)' : 'var(--surface-card)',
                      border: `var(--border-width) ${disabled ? 'dashed' : 'solid'} ${isSelected ? 'var(--accent-fill)' : 'var(--border-default)'}`,
                      boxShadow: isSelected ? 'inset 0 0 0 1px var(--accent-fill)' : 'none',
                      borderRadius: 'var(--radius-md)',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.6 : 1,
                    }}
                  >
                    <input type="radio" name="gate-plan" checked={isSelected} disabled={disabled} onChange={() => handlePlanSelect(plan)} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--fw-semibold)' }}>{PLAN_SHORT[plan.id]}</span>
                      {disabled ? (
                        <OryonBadge tone="neutral">No alcanza</OryonBadge>
                      ) : isCurrent ? (
                        <OryonBadge tone="accent">Tu plan</OryonBadge>
                      ) : null}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--fw-black)', fontSize: 28, letterSpacing: 'var(--tr-h1)' }}>
                        ${plan.priceCOP.toLocaleString('es-CO')}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--text-tertiary)' }}>COP / 30 días</span>
                    </span>
                    <KeyValue
                      items={[
                        { label: 'Sucursales', value: String(plan.limits.branches), mono: true },
                        { label: 'Administradores', value: String(plan.limits.admins), mono: true },
                        { label: 'Asesores y cajeros', value: String(plan.limits.advisors), mono: true },
                        { label: 'Técnicos', value: String(plan.limits.technicians), mono: true },
                      ]}
                    />
                    {disabled && (
                      <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)' }}>
                        Tu empresa usa más de lo que este plan permite.
                      </span>
                    )}
                  </label>
                )
              })}
            </div>

            <OryonCard>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 'var(--text-h3)', fontWeight: 'var(--fw-semibold)' }}>Plan {PLAN_SHORT[selectedPlan.id]} · 30 días</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-h3)' }}>
                    ${selectedPlan.priceCOP.toLocaleString('es-CO')} <span style={{ fontSize: 'var(--text-mono-sm)', color: 'var(--text-tertiary)' }}>COP</span>
                  </span>
                </div>
                <OryonButton variant="primary" size="lg" fullWidth iconLeft={ShieldCheck} onClick={() => handlePay(selectedPlan)} loading={loading} disabled={loading}>
                  {loading ? 'Abriendo Wompi' : 'Pagar y reactivar'}
                </OryonButton>
                <p style={{ margin: 0, textAlign: 'center', fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>
                  Pago seguro con Wompi: PSE, Nequi, Bancolombia o tarjeta.
                </p>
              </div>
            </OryonCard>

            <OryonAlert variant="info" title="¿Ya pagaste y sigue bloqueado?">
              <span style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
                A veces la confirmación tarda unos minutos. Pulsa «Ya pagué, verificar» arriba o escríbenos.
                <OryonButton size="sm" variant="secondary" iconLeft={MessageCircle} onClick={handleSupportClick}>
                  Escribir a soporte
                </OryonButton>
              </span>
            </OryonAlert>
          </>
        )}
      </main>
    </div>
  )
}

export default ExpiredLicenseGate
