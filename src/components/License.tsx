import { useState, useEffect } from "react";
import { projectId } from "../utils/supabase/info";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
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
    name: "Plan Básico (1 Sucursal)",
    priceCOP: 50000,
    limits: {
      branches: 1,
      admins: 1,
      advisors: 1,
      technicians: 2,
    },
    features: [
      "1 Sucursal incluida",
      "1 Administrador, 1 Asesor, 2 Técnicos",
      "Gestión de inventario y productos",
      "Punto de venta y facturación",
      "Órdenes de servicio técnico",
      "Reportes básicos y clientes",
      "Acceso móvil y PWA",
    ],
  },
  {
    id: "pyme",
    name: "Plan PYME (2 Sucursales)",
    priceCOP: 85000,
    badge: "Más Popular",
    limits: {
      branches: 2,
      admins: 2,
      advisors: 4,
      technicians: 8,
    },
    features: [
      "2 Sucursales incluidas",
      "2 Administradores, 4 Asesores, 8 Técnicos",
      "Todo del Plan Básico",
      "Transferencias entre sucursales",
      "Reportes avanzados y métricas",
      "Exportación PDF / Excel",
      "Soporte prioritario por WhatsApp",
    ],
  },
  {
    id: "enterprise",
    name: "Plan Enterprise (4 Sucursales)",
    priceCOP: 140000,
    badge: "Mejor Valor",
    limits: {
      branches: 4,
      admins: 4,
      advisors: 8,
      technicians: 16,
    },
    features: [
      "4 Sucursales incluidas",
      "4 Administradores, 8 Asesores, 16 Técnicos",
      "Todo del Plan PYME",
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
  const [selectedPlan, setSelectedPlan] = useState<string>("pyme");
  const [loading, setLoading] = useState(false);
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

  const loadCompanyData = async () => {
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
      const reference = `ORY-${companyId}-${Date.now()}`;

      // 1. Guardar la referencia del pago en backend (no bloqueante)
      try {
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
        console.warn("Backend payment tracking log skipped:", backendErr);
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
      });

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

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-3">
            Licenciamiento y Suscripción Oryon
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Elige el plan ideal según el número de sucursales de tu empresa. Pagos seguros en pesos colombianos (COP) mediante Wompi.
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadCompanyData}
              className="text-xs"
            >
              <Clock size={13} className="mr-1" />
              Actualizar Estado de Licencia
            </Button>
          </div>
        </div>

        {/* License Expired Alert if expired */}
        {licenseExpired && (
          <Alert className="mb-6 bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <AlertDescription className="ml-2 font-medium">
              ⚠️ <strong>Tu licencia ha expirado.</strong> Para continuar usando todas las funciones operativas de Oryon, por favor renueva tu suscripción o selecciona un plan a continuación.
            </AlertDescription>
          </Alert>
        )}

        {/* Current Plan Status Card */}
        {currentPlan && (
          <Card className="mb-8 border-border">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-full text-primary">
                    <Package size={24} />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Plan Activo</CardTitle>
                    <CardDescription>
                      {companyData?.name || userProfile?.companyName || "Tu Empresa"}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-primary text-primary-foreground px-3 py-1 text-sm font-semibold">
                    {currentPlan.name}
                  </Badge>
                  {inTrial && (
                    <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400 px-3 py-1">
                      <Clock size={13} className="mr-1" />
                      Período de Prueba Activo
                    </Badge>
                  )}
                  {licenseExpired && (
                    <Badge variant="destructive" className="px-3 py-1">
                      Licencia Vencida
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Expiry Details Banner */}
              <div className="bg-muted/50 rounded-xl p-4 sm:p-5 border border-border">
                <div className="flex items-start gap-4">
                  <Calendar className="text-primary flex-shrink-0 mt-1" size={24} />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        Fecha de Vencimiento:
                      </p>
                      <p className="text-base font-bold text-foreground">
                        {getRenewalDate()}
                      </p>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      {daysRemaining > 7 ? (
                        <>
                          <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                          <p className="text-sm text-muted-foreground">
                            Te quedan <strong className="text-foreground">{daysRemaining} días</strong> de servicio activo.
                          </p>
                        </>
                      ) : daysRemaining > 0 ? (
                        <>
                          <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />
                          <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                            ⚠️ Quedan solo <strong>{daysRemaining} días</strong> para el vencimiento. Renueva con anticipación.
                          </p>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                          <p className="text-sm text-red-600 dark:text-red-400 font-bold">
                            ⚠️ Tu licencia se encuentra vencida. Realiza el pago para reactivar el servicio.
                          </p>
                        </>
                      )}
                    </div>

                    {inTrial && (
                      <p className="mt-2 text-xs text-muted-foreground bg-background/60 p-2 rounded border border-border">
                        <strong>Período de prueba:</strong> Tienes acceso a las funcionalidades. Al vencer el período de prueba deberás realizar el pago para continuar utilizando el sistema.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Resource Limits */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Límites de tu plan actual
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex items-center gap-3 p-3.5 bg-muted/40 rounded-lg border border-border">
                    <Building2 className="text-primary flex-shrink-0" size={20} />
                    <div>
                      <p className="text-xs text-muted-foreground">Sucursales</p>
                      <p className="text-lg font-bold text-foreground">{currentPlan.limits.branches}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3.5 bg-muted/40 rounded-lg border border-border">
                    <UserCog className="text-emerald-500 flex-shrink-0" size={20} />
                    <div>
                      <p className="text-xs text-muted-foreground">Administradores</p>
                      <p className="text-lg font-bold text-foreground">{currentPlan.limits.admins}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3.5 bg-muted/40 rounded-lg border border-border">
                    <Users className="text-indigo-500 flex-shrink-0" size={20} />
                    <div>
                      <p className="text-xs text-muted-foreground">Asesores</p>
                      <p className="text-lg font-bold text-foreground">{currentPlan.limits.advisors}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3.5 bg-muted/40 rounded-lg border border-border">
                    <Wrench className="text-amber-500 flex-shrink-0" size={20} />
                    <div>
                      <p className="text-xs text-muted-foreground">Técnicos</p>
                      <p className="text-lg font-bold text-foreground">{currentPlan.limits.technicians}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Gateway Badge */}
        <Card className="mb-8 border-border bg-gradient-to-r from-muted/30 to-muted/10">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
                  <Shield size={22} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    Pasarela de Pago Segura: Wompi
                    <Badge variant="outline" className="text-xs font-normal">
                      PSE, Nequi, Bancolombia, Tarjetas
                    </Badge>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Procesamiento instantáneo en pesos colombianos (COP). Tu suscripción se renueva al instante de confirmarse el pago.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin size={14} className="text-primary" />
                <span>Colombia (COP)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs: Planes vs Extensión de Tiempo */}
        <Tabs defaultValue="plans" className="mb-8">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="plans">Planes por Sucursales</TabsTrigger>
            <TabsTrigger value="extend">Extender Duración</TabsTrigger>
          </TabsList>

          {/* Planes Tab */}
          <TabsContent value="plans" className="space-y-6">
            {/* Validation Alert */}
            {showValidation && validationResult && !validationResult.canChange && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-2">
                    No puedes cambiar a este plan porque excedes los límites actuales:
                  </p>
                  <ul className="list-disc ml-5 space-y-1 text-sm">
                    {validationResult.violations?.map((v: any, idx: number) => (
                      <li key={idx}>{v.message}</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs">
                    Ve a <strong>Configuración → Usuarios / Sucursales</strong> para ajustar los recursos antes de cambiar de plan.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {plans.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                const isCurrent = plan.id === currentPlan?.id;

                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`relative rounded-xl p-6 cursor-pointer transition-all border-2 flex flex-col justify-between ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-md scale-[1.02]"
                        : "border-border hover:border-border/80 bg-card hover:shadow-sm"
                    }`}
                  >
                    {plan.badge && (
                      <Badge className="absolute -top-3 right-4 bg-emerald-600 text-white font-semibold">
                        {plan.badge}
                      </Badge>
                    )}

                    {isCurrent && (
                      <Badge className="absolute -top-3 left-4 bg-primary text-primary-foreground font-semibold">
                        Plan Actual
                      </Badge>
                    )}

                    <div>
                      <div className="text-center mb-5 pt-2">
                        <h3 className="font-bold text-lg text-foreground mb-1">
                          {plan.name}
                        </h3>
                        <div className="my-3">
                          <p className="text-3xl font-extrabold text-foreground">
                            ${plan.priceCOP.toLocaleString("es-CO")}
                          </p>
                          <p className="text-xs text-muted-foreground font-medium mt-1">
                            COP / mes (Facturación 30 días)
                          </p>
                        </div>
                      </div>

                      {/* Limits list */}
                      <div className="space-y-2 mb-4 pb-4 border-b border-border text-sm">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Building2 size={14} className="text-primary" />
                            Sucursales
                          </span>
                          <span className="font-semibold text-foreground">{plan.limits.branches}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <UserCog size={14} className="text-emerald-500" />
                            Administradores
                          </span>
                          <span className="font-semibold text-foreground">{plan.limits.admins}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Users size={14} className="text-indigo-500" />
                            Asesores
                          </span>
                          <span className="font-semibold text-foreground">{plan.limits.advisors}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Wrench size={14} className="text-amber-500" />
                            Técnicos
                          </span>
                          <span className="font-semibold text-foreground">{plan.limits.technicians}</span>
                        </div>
                      </div>

                      {/* Features */}
                      <ul className="space-y-2 text-xs mb-6">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                            <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button
                      variant={isSelected ? "default" : "outline"}
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleValidatePlanChange(plan.id);
                      }}
                      disabled={loading}
                    >
                      {isCurrent && !licenseExpired
                        ? "Renovar Plan Actual"
                        : `Seleccionar ${plan.name.split(" ")[1]}`}
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Purchase CTA Summary */}
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Plan seleccionado:</p>
                  <p className="text-xl font-bold text-foreground">{selectedPlanData?.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pasarela: Wompi Colombia (PSE / Bancolombia / Nequi / Tarjetas)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-extrabold text-foreground flex items-center gap-1">
                    <DollarSign size={24} className="text-primary" />
                    ${selectedPlanData?.priceCOP.toLocaleString("es-CO")}
                  </p>
                  <p className="text-xs text-muted-foreground">COP por 30 días</p>
                </div>
              </div>

              <Button
                onClick={() => handleValidatePlanChange(selectedPlan)}
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
                    <Zap className="mr-2" size={18} />
                    {selectedPlan === currentPlan?.id && !licenseExpired
                      ? "Pagar Renovación con Wompi"
                      : "Pagar y Activar Plan con Wompi"}
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1">
                <Shield size={13} className="text-emerald-500" />
                Transacción segura cifrada y verificada por Wompi Colombia
              </p>
            </div>
          </TabsContent>

          {/* Extend License Tab */}
          <TabsContent value="extend">
            {currentPlan && companyData?.licenseExpiry && (
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
          </TabsContent>
        </Tabs>

        {/* Support Card */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info size={18} className="text-primary" />
              ¿Preguntas sobre licenciamiento o facturación?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">
              Si requieres soporte con tu pago de Wompi, asesoría sobre el plan para tus sucursales o planes personalizados a gran escala, nuestro equipo de soporte técnico está disponible para atenderte.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.open("https://wa.me/573004001077?text=Hola,%20requiero%20soporte%20con%20el%20pago%20de%20mi%20licencia%20Oryon", "_blank");
                }}
              >
                Contactar Soporte vía WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
export default License;
