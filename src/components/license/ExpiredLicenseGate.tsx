import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Alert, AlertDescription } from '../ui/alert'
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
      })
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
      `Hola equipo de soporte Oryon, requiero asistencia con la reactivación de licencia para mi taller ${
        userProfile?.companyName || ''
      } (Email: ${userProfile?.email || ''}).`
    )
    window.open(`https://wa.me/573004001077?text=${message}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between p-4 sm:p-8">
      {/* Top Bar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between border-b border-border pb-4">
        <Logo />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-xs"
          >
            <RefreshCw size={13} className={`mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Verificar Estado
          </Button>
          <Button variant="ghost" size="sm" onClick={onLogout} className="text-xs text-muted-foreground">
            <LogOut size={13} className="mr-1.5" />
            Cerrar Sesión
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl w-full mx-auto my-8 space-y-6">
        {/* Banner de Bloqueo */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-red-500/10 text-red-600 dark:text-red-400 rounded-full mb-1">
            <ShieldAlert size={36} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Tu Licencia de Oryon ha Expirado
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            El período de suscripción de <strong>{userProfile?.companyName || 'tu empresa'}</strong> ha finalizado. Para acceder nuevamente al dashboard, inventario, ventas y órdenes de trabajo, realiza el pago de renovación en Wompi o contacta a soporte técnico.
          </p>
        </div>

        {/* Si es empleado/asesor/técnico sin permisos de pago */}
        {!isAdmin ? (
          <Card className="border-border max-w-lg mx-auto text-center p-6 space-y-4">
            <CardHeader className="p-0">
              <CardTitle className="text-lg">Acceso Restringido</CardTitle>
              <CardDescription className="text-xs mt-1">
                Solo los administradores del taller pueden realizar el pago de renovación de la licencia.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-3 pt-3">
              <p className="text-xs text-muted-foreground">
                Por favor comunícate con el administrador de tu cuenta para que ingrese y efectúe el pago correspondiente.
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <Button onClick={handleSupportClick} className="w-full">
                  <MessageCircle size={15} className="mr-2" />
                  Contactar Soporte
                </Button>
                <Button variant="outline" onClick={onLogout} className="w-full">
                  Cerrar Sesión
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Si es Administrador: Selector de Planes y Pago con Wompi */
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {plans.map((plan) => {
                const isSelected = selectedPlanId === plan.id
                const disabled = isPlanDisabled(plan.id)
                const isCurrent = plan.id === currentCompanyPlan
                const isUpgrade = (planTierOrder[plan.id] || 1) > currentTier

                return (
                  <div
                    key={plan.id}
                    onClick={() => handlePlanSelect(plan)}
                    className={`relative rounded-xl p-5 transition-all border-2 flex flex-col justify-between bg-card ${
                      disabled
                        ? 'opacity-60 bg-muted/40 cursor-not-allowed border-dashed border-border/70'
                        : isSelected
                        ? 'border-primary shadow-md scale-[1.02] bg-primary/5 cursor-pointer'
                        : 'border-border hover:border-border/80 hover:shadow-sm cursor-pointer'
                    }`}
                  >
                    {/* Badges superiores */}
                    <div className="absolute -top-3 right-4 flex items-center gap-1.5">
                      {disabled ? (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] flex items-center gap-1">
                          <Lock size={10} /> No Disponible
                        </Badge>
                      ) : isCurrent ? (
                        <Badge className="bg-primary text-primary-foreground font-semibold text-[11px]">
                          Tu Plan Actual
                        </Badge>
                      ) : isUpgrade ? (
                        <Badge className="bg-emerald-600 text-white font-semibold text-[11px]">
                          Mejorar Plan (Upgrade)
                        </Badge>
                      ) : plan.badge ? (
                        <Badge className="bg-indigo-600 text-white font-semibold text-[11px]">
                          {plan.badge}
                        </Badge>
                      ) : null}
                    </div>

                    <div>
                      <div className="text-center pb-3 border-b border-border">
                        <h3 className="font-bold text-base text-foreground mb-1">{plan.name}</h3>
                        <p className="text-2xl font-extrabold text-foreground mt-2">
                          ${plan.priceCOP.toLocaleString('es-CO')}
                        </p>
                        <p className="text-[11px] text-muted-foreground">COP / mes (30 días)</p>
                      </div>

                      {/* Límites */}
                      <div className="py-3 space-y-1.5 text-xs border-b border-border text-muted-foreground">
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1.5">
                            <Building2 size={13} className="text-primary" /> Sucursales
                          </span>
                          <span className="font-semibold text-foreground">{plan.limits.branches}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1.5">
                            <UserCog size={13} className="text-emerald-500" /> Administradores
                          </span>
                          <span className="font-semibold text-foreground">{plan.limits.admins}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1.5">
                            <Users size={13} className="text-indigo-500" /> Asesores
                          </span>
                          <span className="font-semibold text-foreground">{plan.limits.advisors}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1.5">
                            <Wrench size={13} className="text-amber-500" /> Técnicos
                          </span>
                          <span className="font-semibold text-foreground">{plan.limits.technicians}</span>
                        </div>
                      </div>

                      {/* Features */}
                      <ul className="py-3 space-y-1.5 text-[11px] text-muted-foreground">
                        {plan.features.slice(0, 4).map((f, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>

                      {disabled && (
                        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-1.5 mt-2">
                          <Lock size={12} className="flex-shrink-0 mt-0.5" />
                          <span>Tu empresa ya tiene recursos del Plan {currentCompanyPlan === 'enterprise' ? 'Enterprise' : 'PYME'}. No puedes degradar a este plan.</span>
                        </div>
                      )}
                    </div>

                    <Button
                      variant={disabled ? 'ghost' : isSelected ? 'default' : 'outline'}
                      size="sm"
                      className="w-full mt-3 font-semibold text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (disabled) {
                          handlePlanSelect(plan)
                          return
                        }
                        setSelectedPlanId(plan.id)
                        handlePay(plan)
                      }}
                      disabled={disabled || loading}
                    >
                      {disabled ? (
                        <>
                          <Lock size={13} className="mr-1.5" />
                          Capacidad Insuficiente
                        </>
                      ) : loading && isSelected ? (
                        <Loader2 size={14} className="animate-spin mr-1.5" />
                      ) : (
                        <Zap size={14} className="mr-1.5" />
                      )}
                      {!disabled && `Reactivar con ${plan.name.split(' ')[1]}`}
                    </Button>
                  </div>
                )
              })}
            </div>

            {/* Resumen y Botón Principal de Pago Wompi */}
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <p className="text-xs uppercase font-semibold text-muted-foreground">Plan a renovar:</p>
                  <p className="text-lg font-bold text-foreground">
                    {selectedPlan.name} — ${selectedPlan.priceCOP.toLocaleString('es-CO')} COP
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    Pasarela segura Wompi (PSE, Bancolombia, Nequi, Tarjetas)
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={handleSupportClick}
                    className="h-11 px-4 text-xs"
                  >
                    <MessageCircle size={15} className="mr-2" />
                    Soporte WhatsApp
                  </Button>

                  <Button
                    onClick={() => handlePay(selectedPlan)}
                    disabled={loading}
                    className="h-11 px-6 text-sm font-semibold min-w-[220px]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Conectando con Wompi...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pagar y Reactivar Ahora
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground pt-4 border-t border-border">
        © {new Date().getFullYear()} Oryon. Todos los derechos reservados. Si ya realizaste tu pago y no se ha reflejado, haz clic en "Verificar Estado" o contacta a soporte técnico.
      </footer>
    </div>
  )
}

export default ExpiredLicenseGate
