import { useState, useEffect } from "react";
import { projectId } from "../utils/supabase/info";
import {
  Tabs,
  Alert as OryonAlert,
  Badge as OryonBadge,
  Button as OryonButton,
  Card as OryonCard,
  KeyValue,
  MetricCard,
  type TabItem,
} from "./oryon";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { PageBody } from "./layout/PageBody";
import { usePageHeader } from "./layout/PageHeaderContext";

const LICENSE_TABS: TabItem[] = [
  { id: 'plans', label: 'Planes' },
  { id: 'extend', label: 'Pagar varios meses' },
];
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  MapPin,
  DollarSign,
  Loader2,
  Building2,
  Users,
  UserCog,
  Wrench,
  Package,
  Calendar,
  Clock,
  Zap,
  Shield,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { ExtendLicenseSection } from "./license/ExtendLicenseSection";
import { PaymentReceipt } from "./PaymentReceipt";
import wompiService from "../services/WompiService";
import PaymentSuccess from "./PaymentSuccess";
import { getSupabaseClient } from "../utils/supabase/client";

interface LicenseProps {
  accessToken: string;
  userProfile: any;
  licenseInfo: any;
  onLicenseUpdated: () => void;
}

export interface Plan {
  id: "basico" | "pyme" | "enterprise";
  name: string;
  priceCOP: number;
  badge?: string;
  limits: {
    branches: number;
    admins: number;
    advisors: number;
    technicians: number;
  };
  features: string[];
}

export const plans: Plan[] = [
  {
    id: "basico",
    name: "Básico",
    priceCOP: 50000,
    limits: {
      branches: 1,
      admins: 1,
      advisors: 1,
      technicians: 2,
    },
    features: [
      "1 Sucursal incluida",
      "1 administrador, 1 asesor o cajero, 2 técnicos",
      "Gestión de inventario y productos",
      "Punto de venta y facturación",
      "Órdenes de servicio y caja diaria",
      "Reportes básicos y clientes",
      "Acceso móvil y PWA",
    ],
  },
  {
    id: "pyme",
    name: "Pyme",
    priceCOP: 85000,
    badge: "El más elegido",
    limits: {
      branches: 2,
      admins: 2,
      advisors: 4,
      technicians: 8,
    },
    features: [
      "2 Sucursales incluidas",
      "2 administradores, 4 asesores o cajeros, 8 técnicos",
      "Todo lo del plan Básico",
      "Transferencias entre sucursales",
      "Reportes avanzados y métricas",
      "Exportación PDF / Excel",
      "Soporte prioritario por WhatsApp",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceCOP: 140000,
    badge: "Para crecer",
    limits: {
      branches: 4,
      admins: 4,
      advisors: 8,
      technicians: 16,
    },
    features: [
      "4 Sucursales incluidas",
      "4 administradores, 8 asesores o cajeros, 16 técnicos",
      "Todo lo del plan Pyme",
      "Máximo volumen y rendimiento",
      "Auditoría y trazabilidad completa",
      "Integración de recibos digitales",
      "Soporte VIP prioritario 24/7",
    ],
  },
];

export function License({
  accessToken,
  userProfile,
  licenseInfo,
  onLicenseUpdated,
}: LicenseProps) {
  const [tab, setTab] = useState('plans');
  const { isMobile } = useBreakpoint();
  const [selectedPlan, setSelectedPlan] = useState<string>("pyme");
  const [loading, setLoading] = useState(false);
  /** Carga de los datos de la empresa; distinto del `loading` del cobro. */
  const [loadingData, setLoadingData] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [showValidation, setShowValidation] = useState(false);

  // Estados para el recibo de pago
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<{
    transactionId: string;
    paymentMethod: "wompi";
    reference?: string;
    planId?: string;
  } | null>(null);

  // Get current plan info and company data
  useEffect(() => {
    if (licenseInfo?.planId) {
      const plan = plans.find((p) => p.id === licenseInfo.planId);
      setCurrentPlan(plan || plans[0]);
      setSelectedPlan(licenseInfo.planId);
    } else {
      setCurrentPlan(plans[0]);
      setSelectedPlan("basico");
    }

    if (accessToken) {
      loadCompanyData();
    }
  }, [licenseInfo, accessToken]);

  /* `loading` ya estaba ocupado por el procesamiento del pago. Enganchar el
     refresco a ese estado hacía girar el botón mientras se cobraba y sellaba la
     hora al terminar un pago, que no es lo que informa el sello. */
  const loadCompanyData = async () => {
    setLoadingData(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/company/info`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setCompanyData(data.company);
      }
    } catch (error) {
      console.error("Error loading company data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const getDaysRemaining = () => {
    const expiryStr = companyData?.licenseExpiry || licenseInfo?.licenseExpiry;
    if (!expiryStr) return 0;
    const now = new Date();
    const expiry = new Date(expiryStr);
    if (isNaN(expiry.getTime())) return 0;
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const isInTrial = () => {
    const trialEndsAt = companyData?.trialEndsAt || licenseInfo?.trialEndsAt;
    if (trialEndsAt) {
      return new Date() <= new Date(trialEndsAt);
    }
    return licenseInfo?.inTrial === true;
  };

  const isExpired = () => {
    if (isInTrial()) return false;
    const expiryStr = companyData?.licenseExpiry || licenseInfo?.licenseExpiry;
    if (!expiryStr) return false;
    const expiry = new Date(expiryStr);
    if (isNaN(expiry.getTime())) return false;
    return new Date() > expiry;
  };

  const getRenewalDate = () => {
    const expiryStr = companyData?.licenseExpiry || licenseInfo?.licenseExpiry;
    if (!expiryStr) {
      return "No disponible";
    }
    try {
      const date = new Date(expiryStr);
      if (isNaN(date.getTime())) {
        return "Fecha inválida";
      }
      return date.toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error parsing date:", error);
      return "Error al cargar fecha";
    }
  };

  /** "19 nov 2026": cabe en una tarjeta de cifra. La fecha larga va debajo. */
  const shortRenewalDate = () => {
    const iso = companyData?.licenseExpiry || licenseInfo?.licenseExpiry;
    const d = iso ? new Date(iso) : null;
    return d && !isNaN(d.getTime()) ? d.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }).replace(/ de /g, " ").replace(".", "") : "—";
  };

  const handleValidatePlanChange = async (targetPlanId: string) => {
    const currentPlanId = currentPlan?.id || "basico";

    if (targetPlanId === currentPlanId && !isExpired()) {
      toast.info("Ya tienes este plan activo");
      return;
    }

    setLoading(true);
    setShowValidation(false);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/plans/validate-change`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ targetPlanId }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setValidationResult(data);
        setShowValidation(true);

        if (data.canChange) {
          setSelectedPlan(targetPlanId);
          await handlePurchase(targetPlanId);
        } else {
          setLoading(false);
        }
      } else {
        toast.error("Error al validar el cambio de plan", {
          description: data.error || "Error desconocido",
        });
        setLoading(false);
      }
    } catch (error) {
      console.error("Error validating plan change:", error);
      toast.error("Error al validar el cambio de plan", {
        description: "Por favor intenta de nuevo más tarde",
      });
      setLoading(false);
    }
  };

  const handlePurchase = async (planId?: string) => {
    const targetPlanId = planId || selectedPlan;

    if (!loading) {
      setLoading(true);
    }

    try {
      const plan = plans.find((p) => p.id === targetPlanId);
      if (!plan) {
        toast.error("Plan no válido");
        setLoading(false);
        return;
      }

      const amount = plan.priceCOP;
      toast.loading("Preparando pago seguro con Wompi (PSE / Tarjetas / Nequi)...", {
        id: "payment-process",
      });

      const companyId = companyData?.id || userProfile?.companyId || 1;
      const reference = `PLAN-${plan.id}-1M-${Date.now()}`;

      // 1. Guardar la referencia del pago en backend y directamente en KV
      try {
        const supabase = getSupabaseClient();
        await supabase.from('kv_store_4d437e50').upsert({
          key: `payment:${reference}`,
          value: JSON.stringify({
            reference: reference,
            planId: plan.id,
            amount: amount,
            currency: "COP",
            paymentMethod: "Wompi PSE",
            status: "PENDING",
            companyId: companyId,
            companyName: companyData?.name || userProfile?.companyName || `Empresa #${companyId}`,
            durationMonths: 1,
            customerEmail: userProfile?.email || "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
        });

        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/license/payment/create`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              reference: reference,
              planId: plan.id,
              amount: amount,
              currency: "COP",
              paymentMethod: "Wompi",
              status: "pending",
              companyId: companyId,
              durationMonths: 1,
              customerEmail: userProfile?.email || "",
            }),
          }
        );
      } catch (backendErr) {
        console.warn("Backend payment tracking log:", backendErr);
      }

      // 2. Abrir Checkout oficial de Wompi mediante Widget
      const redirectUrl = `${window.location.origin}/payment-callback?planId=${plan.id}&reference=${reference}&method=wompi`;

      toast.dismiss("payment-process");

      await wompiService.openCheckout({
        amount_in_cents: amount * 100, // Convertir a centavos
        currency: "COP",
        reference: reference,
        customer_email: userProfile?.email || "",
        redirect_url: redirectUrl,
        customer_data: {
          full_name: userProfile?.name || userProfile?.companyName || "",
          phone_number: userProfile?.phone || "",
          legal_id: userProfile?.documentNumber || "",
          legal_id_type: userProfile?.documentType || "CC",
        },
      }, accessToken);

      setLoading(false);
    } catch (error: any) {
      console.error("Error al iniciar el pago con Wompi:", error);
      toast.dismiss("payment-process");
      toast.error("Error al procesar el pago", {
        description: error.message || "Por favor intenta nuevamente.",
      });
      setLoading(false);
    }
  };

  // Renderizar recibo si está activo
  usePageHeader({
    title: 'Gestión de licencia',
    subtitle: 'Suscripción y facturación',
    eyebrow: 'Cuenta',
    onRefresh: loadCompanyData,
    refreshing: loadingData,
  });

  if (showReceipt && receiptData) {
    return (
      <PaymentReceipt
        accessToken={accessToken}
        paymentData={receiptData}
        transactionId={`TXN-${Date.now()}`}
        onComplete={async () => {
          setShowReceipt(false);
          setReceiptData(null);
          await loadCompanyData();
          onLicenseUpdated();
        }}
      />
    );
  }

  // Renderizar pantalla de confirmación si viene de callback
  if (showPaymentSuccess && paymentSuccessData) {
    return (
      <PaymentSuccess
        transactionId={paymentSuccessData.transactionId}
        accessToken={accessToken}
        paymentMethod="wompi"
        reference={paymentSuccessData.reference}
        planId={paymentSuccessData.planId}
        onComplete={async () => {
          setShowPaymentSuccess(false);
          setPaymentSuccessData(null);
          await loadCompanyData();
          onLicenseUpdated();
        }}
      />
    );
  }

  const selectedPlanData = plans.find((p) => p.id === selectedPlan);
  const daysRemaining = getDaysRemaining();
  const inTrial = isInTrial();
  const licenseExpired = isExpired();

  const PLAN_SHORT: Record<string, string> = { basico: "Básico", pyme: "Pyme", enterprise: "Enterprise" };
  const limitItems = (p: Plan) => [
    { label: "Sucursales", value: p.limits.branches },
    { label: "Administradores", value: p.limits.admins },
    { label: "Asesores y cajeros", value: p.limits.advisors },
    { label: "Técnicos", value: p.limits.technicians },
  ];
  const statusTone: "success" | "warning" | "danger" = licenseExpired ? "danger" : daysRemaining <= 7 ? "warning" : "success";
  const isRenewal = selectedPlan === currentPlan?.id && !licenseExpired;

  return (
    <PageBody>
      {licenseExpired && (
        <OryonAlert variant="danger" title="Tu licencia venció">
          Elige un plan y paga para volver a usar ventas, órdenes y caja.
        </OryonAlert>
      )}

      {currentPlan && (
        <OryonCard
          title={`Plan ${PLAN_SHORT[currentPlan.id]}`}
          subtitle={companyData?.name || userProfile?.companyName || "Tu empresa"}
          actions={
            <OryonBadge tone={inTrial ? "warning" : statusTone} dot>
              {licenseExpired ? "Vencida" : inTrial ? "En prueba" : "Activa"}
            </OryonBadge>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "minmax(0,1fr)" : "repeat(2, minmax(0,1fr))", gap: 12 }}>
              <MetricCard label={inTrial ? "La prueba termina" : "Vence"} value={shortRenewalDate()} icon={Calendar} sublabel={getRenewalDate()} />
              <MetricCard
                label="Días restantes"
                value={licenseExpired ? "0" : String(daysRemaining)}
                unit="días"
                icon={Clock}
                delta={licenseExpired ? "Vencida" : daysRemaining <= 7 ? "Renueva pronto" : undefined}
                deltaTone={licenseExpired || daysRemaining <= 7 ? "down" : "neutral"}
              />
            </div>
            {inTrial && (
              <OryonAlert variant="info" title="Estás en el período de prueba">
                Tienes todas las funciones. Al terminar la prueba hay que pagar un plan para seguir.
              </OryonAlert>
            )}
            <div>
              <div style={{ fontSize: "var(--text-caption)", letterSpacing: "var(--tr-caption)", textTransform: "uppercase", fontWeight: "var(--fw-semibold)", color: "var(--text-tertiary)", marginBottom: 6 }}>
                Incluye
              </div>
              <KeyValue columns={isMobile ? 1 : 2} items={limitItems(currentPlan).map((l) => ({ label: l.label, value: String(l.value), mono: true }))} />
            </div>
          </div>
        </OryonCard>
      )}

      <Tabs items={LICENSE_TABS} value={tab} onChange={setTab} />

      {tab === "plans" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {showValidation && validationResult && !validationResult.canChange && (
            <OryonAlert variant="danger" title="No puedes bajar a ese plan todavía">
              <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span>Tu empresa usa más de lo que ese plan permite:</span>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {validationResult.violations?.map((v: any, idx: number) => (
                    <li key={idx}>{v.message}</li>
                  ))}
                </ul>
                <span>Ajusta usuarios o sucursales en Configuración y vuelve a intentarlo.</span>
              </span>
            </OryonAlert>
          )}

          {/* Elegir plan: tarjetas como radios; el pago está en un solo botón, abajo. */}
          <div role="radiogroup" aria-label="Plan" style={{ display: "grid", gridTemplateColumns: isMobile ? "minmax(0,1fr)" : "repeat(3, minmax(0,1fr))", gap: 12 }}>
            {plans.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              const isCurrent = plan.id === currentPlan?.id;
              return (
                <label
                  key={plan.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    padding: 16,
                    background: isSelected ? "var(--accent-subtle)" : "var(--surface-card)",
                    border: `var(--border-width) solid ${isSelected ? "var(--accent-fill)" : "var(--border-subtle)"}`,
                    boxShadow: isSelected ? "inset 0 0 0 1px var(--accent-fill)" : "var(--shadow-sm)",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                  }}
                >
                  <input type="radio" name="plan" value={plan.id} checked={isSelected} onChange={() => setSelectedPlan(plan.id)} style={{ position: "absolute", opacity: 0, pointerEvents: "none" }} />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 22 }}>
                    <span style={{ fontSize: "var(--text-h4)", fontWeight: "var(--fw-semibold)", color: "var(--text-primary)" }}>{PLAN_SHORT[plan.id]}</span>
                    <span style={{ display: "flex", gap: 6 }}>
                      {isCurrent && <OryonBadge tone="accent">Tu plan</OryonBadge>}
                      {plan.badge && !isCurrent && <OryonBadge tone="neutral">{plan.badge}</OryonBadge>}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: "var(--fw-black)", fontSize: 32, letterSpacing: "var(--tr-h1)", color: "var(--text-primary)" }}>
                      ${plan.priceCOP.toLocaleString("es-CO")}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-mono-sm)", color: "var(--text-tertiary)" }}>COP / 30 días</span>
                  </div>
                  <KeyValue items={limitItems(plan).map((l) => ({ label: l.label, value: String(l.value), mono: true }))} />
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    {plan.features.slice(2).map((f) => (
                      <li key={f} style={{ display: "flex", gap: 8, fontSize: "var(--text-small)", color: "var(--text-secondary)" }}>
                        <CheckCircle2 size={14} color="var(--text-accent)" style={{ flex: "0 0 auto", marginTop: 2 }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </label>
              );
            })}
          </div>

          <OryonCard>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: "var(--text-caption)", letterSpacing: "var(--tr-caption)", textTransform: "uppercase", fontWeight: "var(--fw-semibold)", color: "var(--text-tertiary)" }}>
                    {isRenewal ? "Renovación" : "Cambio de plan"}
                  </span>
                  <span style={{ fontSize: "var(--text-h3)", fontWeight: "var(--fw-semibold)", color: "var(--text-primary)" }}>
                    Plan {PLAN_SHORT[selectedPlan] ?? ""} · 30 días
                  </span>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-h3)", color: "var(--text-primary)" }}>
                  ${selectedPlanData?.priceCOP.toLocaleString("es-CO")} <span style={{ fontSize: "var(--text-mono-sm)", color: "var(--text-tertiary)" }}>COP</span>
                </span>
              </div>
              <OryonButton variant="primary" size="lg" fullWidth iconLeft={Shield} onClick={() => handleValidatePlanChange(selectedPlan)} loading={loading} disabled={loading}>
                {loading ? "Abriendo Wompi" : isRenewal ? "Renovar con Wompi" : "Pagar y activar con Wompi"}
              </OryonButton>
              <p style={{ margin: 0, textAlign: "center", fontSize: "var(--text-caption)", color: "var(--text-tertiary)" }}>
                Pago seguro con Wompi: PSE, Nequi, Bancolombia o tarjeta. El plan se activa al confirmarse el pago.
              </p>
            </div>
          </OryonCard>
        </div>
      )}

      {tab === "extend" && currentPlan && companyData?.licenseExpiry && (
        <ExtendLicenseSection
          accessToken={accessToken}
          currentPlanId={currentPlan.id}
          currentPlanName={currentPlan.name}
          currentExpiry={companyData.licenseExpiry}
          onLicenseExtended={() => {
            loadCompanyData();
            onLicenseUpdated();
          }}
        />
      )}

      <OryonCard>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: "var(--text-body)", fontWeight: "var(--fw-semibold)", color: "var(--text-primary)" }}>¿Dudas con tu licencia o un pago?</span>
            <span style={{ fontSize: "var(--text-small)", color: "var(--text-secondary)" }}>Planes a la medida, pagos que no se reflejan o cambios de plan.</span>
          </span>
          <OryonButton
            size="sm"
            variant="secondary"
            onClick={() => window.open("https://wa.me/573004001077?text=Hola,%20necesito%20ayuda%20con%20mi%20licencia%20de%20Oryon", "_blank", "noopener")}
          >
            Escribir por WhatsApp
          </OryonButton>
        </div>
      </OryonCard>
    </PageBody>
  );
}
export default License;
