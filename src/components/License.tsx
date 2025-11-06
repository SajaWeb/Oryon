import { useState, useEffect } from "react";
import { projectId, publicAnonKey } from "../utils/supabase/info";
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
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Globe,
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

interface Plan {
  id: "basico" | "pyme" | "enterprise";
  name: string;
  price: number;
  priceUSD: number;
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

const plans: Plan[] = [
  {
    id: "basico",
    name: "Plan Básico",
    price: 15,
    priceUSD: 15,
    priceCOP: 50000,
    limits: {
      branches: 1,
      admins: 1,
      advisors: 1,
      technicians: 2,
    },
    features: [
      "Gestión de inventario",
      "Punto de venta",
      "Órdenes de reparación",
      "Reportes básicos",
      "Gestión de clientes",
      "Dashboard en tiempo real",
    ],
  },
  {
    id: "pyme",
    name: "Plan PYME",
    price: 28,
    priceUSD: 28,
    priceCOP: 90000,
    badge: "Popular",
    limits: {
      branches: 2,
      admins: 2,
      advisors: 4,
      technicians: 8,
    },
    features: [
      "Todo del Plan Básico",
      "Múltiples sucursales",
      "Reportes avanzados",
      "Notificaciones push",
      "Exportación PDF/Excel",
      "Soporte prioritario",
    ],
  },
  {
    id: "enterprise",
    name: "Plan Enterprise",
    price: 50,
    priceUSD: 50,
    priceCOP: 160000,
    badge: "Mejor Valor",
    limits: {
      branches: 4,
      admins: 4,
      advisors: 8,
      technicians: 16,
    },
    features: [
      "Todo del Plan PYME",
      "Máximo número de sucursales",
      "Máximo número de usuarios",
      "API personalizada",
      "Integración WhatsApp",
      "Soporte dedicado 24/7",
    ],
  },
];

export function License({
  accessToken,
  userProfile,
  licenseInfo,
  onLicenseUpdated,
}: LicenseProps) {
  const [selectedCountry, setSelectedCountry] = useState<
    "colombia" | "international"
  >("international");
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
  paymentMethod: "wompi" | "paddle";
  reference?: string;
  planId?: string;
} | null>(null);


  // Al inicio del render del componente License, agregar esta condición:
  if (showPaymentSuccess && paymentSuccessData) {
    return (
      <PaymentSuccess
        transactionId={paymentSuccessData.transactionId}
        accessToken={accessToken}
        paymentMethod={paymentSuccessData.paymentMethod}
        reference={paymentSuccessData.reference}
        planId={paymentSuccessData.planId}
        onComplete={async () => {
          setShowPaymentSuccess(false);
          setPaymentSuccessData(null);

          // Recargar datos
          await loadCompanyData();
          onLicenseUpdated();

          // Opcional: recargar la página
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }}
      />
    );
  }
  // Get current plan info and company data
  useEffect(() => {
    console.log(
      "License component mounted/updated with licenseInfo:",
      licenseInfo
    );

    if (licenseInfo?.planId) {
      const plan = plans.find((p) => p.id === licenseInfo.planId);
      setCurrentPlan(plan || null);
      setSelectedPlan(licenseInfo.planId);
    } else {
      // Default to basico if no plan
      setCurrentPlan(plans[0]);
      setSelectedPlan("basico");
    }

    if (accessToken) {
      loadCompanyData();
    }
  }, [licenseInfo, accessToken]);

  const loadCompanyData = async () => {
    try {
      console.log("Loading company data...");
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/company/info`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const data = await response.json();
      console.log("Company data response:", data);
      if (data.success) {
        console.log("Company licenseExpiry:", data.company.licenseExpiry);
        setCompanyData(data.company);
      }
    } catch (error) {
      console.error("Error loading company data:", error);
    }
  };

  const getDaysRemaining = () => {
    if (!companyData?.licenseExpiry) return 0;
    const now = new Date();
    const expiry = new Date(companyData.licenseExpiry);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const isInTrial = () => {
    return licenseInfo?.inTrial === true;
  };

  const getRenewalDate = () => {
    if (!companyData?.licenseExpiry) {
      console.log("No licenseExpiry found in companyData:", companyData);
      return "No disponible";
    }
    try {
      const date = new Date(companyData.licenseExpiry);
      if (isNaN(date.getTime())) {
        console.error("Invalid date:", companyData.licenseExpiry);
        return "Fecha inválida";
      }
      return date.toLocaleDateString("es-ES", {
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

    if (targetPlanId === currentPlanId) {
      toast.info("Ya tienes este plan activo");
      return;
    }

    setLoading(true);
    setShowValidation(false);

    try {
      console.log("Validating plan change to:", targetPlanId);

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
      console.log("Validation result:", data);

      if (data.success) {
        setValidationResult(data);
        setShowValidation(true);

        // If can change, proceed to payment
        if (data.canChange) {
          setSelectedPlan(targetPlanId);
          // Continue to payment
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
  const targetPlanId = planId || selectedPlan
  
  if (!loading) {
    setLoading(true)
  }

  try {
    const plan = plans.find(p => p.id === targetPlanId)
    if (!plan) {
      toast.error('Plan no válido')
      setLoading(false)
      return
    }

    const amount = selectedCountry === 'colombia' ? plan.priceCOP : plan.priceUSD

    // Create payment based on country
    if (selectedCountry === 'colombia') {
      // PSE Payment for Colombia usando Wompi
      toast.loading('Preparando pago con PSE...', { id: 'payment-process' })
      
      try {
        // Crear referencia única para el pago
        const reference = `ORY-${userProfile?.companyId || 'COMP'}-${Date.now()}`
        
        // Guardar la referencia del pago en Supabase para tracking
        const saveResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/license/payment/create`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              reference: reference,
              planId: plan.id,
              amount: amount,
              currency: 'COP',
              paymentMethod: 'PSE',
              status: 'pending',
              companyId: companyData?.id || userProfile?.companyId
            })
          }
        )

        const saveData = await saveResponse.json()
        
        if (saveData.success) {
          // Crear link de pago de Wompi
          const paymentLink = wompiService.createPaymentLink({
            amount_in_cents: amount * 100, // Convertir a centavos
            currency: 'COP',
            reference: reference,
            customer_email: userProfile?.email || '',
            redirect_url: `${window.location.origin}/payment-callback?planId=${plan.id}&reference=${reference}&method=wompi`,
            customer_data: {
              full_name: userProfile?.fullName || userProfile?.companyName || '',
              phone_number: userProfile?.phone || '',
              legal_id: userProfile?.documentNumber || '',
              legal_id_type: userProfile?.documentType || 'CC'
            }
          })

          toast.dismiss('payment-process')
          toast.success('Redirigiendo a Wompi para completar el pago...', {
            description: 'Serás redirigido al checkout seguro'
          })
          
          // Redirigir a Wompi después de un breve delay
          setTimeout(() => {
            window.location.href = paymentLink
          }, 1500)
        } else {
          throw new Error('No se pudo guardar el registro del pago')
        }
        
      } catch (error) {
        console.error('Error al crear el pago PSE:', error)
        toast.dismiss('payment-process')
        toast.error('Error al procesar el pago', {
          description: 'No se pudo crear el link de pago. Por favor intenta de nuevo.'
        })
        setLoading(false)
      }
    } else {
      // Paddle Payment for International
      toast.loading('Preparando pago con Paddle...', { id: 'payment-process' })
      
      try {
        const reference = `ORY-${userProfile?.companyId || 'COMP'}-${Date.now()}`
        
        // Guardar el pago en la BD
        const saveResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/license/payment/create`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              reference: reference,
              planId: plan.id,
              amount: amount,
              currency: 'USD',
              paymentMethod: 'Paddle',
              status: 'pending'
            })
          }
        )

        const saveData = await saveResponse.json()
        
        if (saveData.success) {
          // Iniciar checkout de Paddle
          const paddleResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/license/paddle/create`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                planId: plan.id,
                amount: amount,
                reference: reference,
                customerEmail: userProfile?.email || ''
              })
            }
          )

          const paddleData = await paddleResponse.json()
          
          if (paddleData.success && paddleData.checkoutUrl) {
            toast.dismiss('payment-process')
            toast.success('Redirigiendo a Paddle...', {
              description: 'Serás redirigido al checkout seguro'
            })
            
            // Redirigir a Paddle
            setTimeout(() => {
              window.location.href = paddleData.checkoutUrl
            }, 1500)
          } else {
            throw new Error('No se pudo crear el checkout de Paddle')
          }
        } else {
          throw new Error('No se pudo guardar el registro del pago')
        }
        
      } catch (error) {
        console.error('Error al crear el pago Paddle:', error)
        toast.dismiss('payment-process')
        toast.error('Error al procesar el pago', {
          description: 'No se pudo crear el link de pago. Por favor intenta de nuevo.'
        })
        setLoading(false)
      }
    }
  } catch (err) {
    console.error('Error processing plan upgrade:', err)
    toast.error('Error al procesar la actualización')
    setLoading(false)
  }
}

  const selectedPlanData = plans.find((p) => p.id === selectedPlan);
  const daysRemaining = getDaysRemaining();
  const inTrial = isInTrial();

  // Debug logging
  useEffect(() => {
    console.log("License Component State:", {
      companyData,
      currentPlan,
      daysRemaining,
      inTrial,
      licenseExpiry: companyData?.licenseExpiry,
      renewalDate: getRenewalDate(),
    });
  }, [companyData, currentPlan, daysRemaining, inTrial]);

  // Si estamos mostrando el recibo, renderizarlo en su lugar
  if (showReceipt && receiptData) {
    return (
      <PaymentReceipt
        accessToken={accessToken}
        paymentData={receiptData}
        transactionId={`TXN-${Date.now()}`}
        onComplete={async () => {
          setShowReceipt(false);
          setReceiptData(null);

          // Recargar datos de la empresa
          await loadCompanyData();
          onLicenseUpdated();

          // Recargar la página para reflejar cambios
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl mb-3 text-gray-900 dark:text-gray-100">
            Gestión de Licencia
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-400">
            Administra tu suscripción y actualiza tu plan según las necesidades
            de tu negocio
          </p>
          {/* Debug button to reload company data */}
          <Button
            variant="outline"
            size="sm"
            onClick={loadCompanyData}
            className="mt-3"
          >
            <Loader2 size={14} className="mr-2" />
            Recargar Datos de Licencia
          </Button>
        </div>

        {/* Current Plan Status with Expiry */}
        {currentPlan && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                    <Package
                      className="text-blue-600 dark:text-blue-400"
                      size={24}
                    />
                  </div>
                  <div>
                    <CardTitle>Plan Actual</CardTitle>
                    <CardDescription>
                      {userProfile?.companyName || "Tu empresa"}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-blue-600 text-white px-4 py-2 text-base">
                    {currentPlan.name}
                  </Badge>
                  {inTrial && (
                    <Badge
                      variant="outline"
                      className="border-orange-500 text-orange-600 px-4 py-2"
                    >
                      <Clock size={14} className="mr-1" />
                      Período de Prueba
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* License Expiry Information */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <Calendar
                    className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1"
                    size={24}
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      Fecha de Renovación
                    </p>
                    {companyData?.licenseExpiry ? (
                      <>
                        <p className="text-blue-800 dark:text-blue-200 text-lg">
                          {getRenewalDate()}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          {daysRemaining > 7 ? (
                            <>
                              <CheckCircle2
                                size={16}
                                className="text-green-600"
                              />
                              <p className="text-sm text-blue-700 dark:text-blue-300">
                                Quedan <strong>{daysRemaining} días</strong>{" "}
                                hasta la renovación
                              </p>
                            </>
                          ) : daysRemaining > 0 ? (
                            <>
                              <AlertCircle
                                size={16}
                                className="text-orange-500"
                              />
                              <p className="text-sm text-orange-700 dark:text-orange-300">
                                ⚠️ Quedan solo{" "}
                                <strong>{daysRemaining} días</strong> - Renueva
                                pronto
                              </p>
                            </>
                          ) : (
                            <>
                              <AlertCircle size={16} className="text-red-500" />
                              <p className="text-sm text-red-700 dark:text-red-300">
                                ⚠️ Tu licencia ha expirado - Renueva ahora
                              </p>
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-blue-800 dark:text-blue-200 text-lg">
                          Cargando información...
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <Info size={16} className="text-blue-600" />
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            Haz clic en "Recargar Datos de Licencia" para
                            inicializar tu licencia
                          </p>
                        </div>
                      </>
                    )}
                    {inTrial && (
                      <div className="mt-2 bg-orange-100 dark:bg-orange-950 border border-orange-300 dark:border-orange-800 rounded px-3 py-2">
                        <p className="text-xs text-orange-800 dark:text-orange-200">
                          <strong>Período de Prueba:</strong> Disfruta de todas
                          las funcionalidades. Al finalizar, deberás renovar
                          para continuar usando el sistema.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Plan Limits */}
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Límites de tu Plan Actual
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                    <Building2 className="text-blue-600" size={24} />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Sucursales
                      </p>
                      <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {currentPlan.limits.branches}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                    <UserCog className="text-green-600" size={24} />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Administradores
                      </p>
                      <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {currentPlan.limits.admins}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                    <Users className="text-purple-600" size={24} />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Asesores
                      </p>
                      <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {currentPlan.limits.advisors}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                    <Wrench className="text-orange-600" size={24} />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Técnicos
                      </p>
                      <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {currentPlan.limits.technicians}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Methods Info */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="text-green-600" size={24} />
              <div>
                <CardTitle>Métodos de Pago Disponibles</CardTitle>
                <CardDescription>
                  Procesamos pagos de forma segura según tu ubicación
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded">
                    <MapPin
                      className="text-blue-600 dark:text-blue-400"
                      size={20}
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      PSE - Colombia
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Pagos Seguros en Línea
                    </p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <CheckCircle2
                      size={16}
                      className="text-green-600 flex-shrink-0 mt-0.5"
                    />
                    <span>Pago directo desde tu banco</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2
                      size={16}
                      className="text-green-600 flex-shrink-0 mt-0.5"
                    />
                    <span>Procesamiento inmediato</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2
                      size={16}
                      className="text-green-600 flex-shrink-0 mt-0.5"
                    />
                    <span>Precios en pesos colombianos (COP)</span>
                  </li>
                </ul>
              </div>

              <div className="border dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded">
                    <Globe
                      className="text-green-600 dark:text-green-400"
                      size={20}
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      Paddle - Internacional
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Pagos Globales
                    </p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <CheckCircle2
                      size={16}
                      className="text-green-600 flex-shrink-0 mt-0.5"
                    />
                    <span>Tarjetas de crédito/débito</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2
                      size={16}
                      className="text-green-600 flex-shrink-0 mt-0.5"
                    />
                    <span>PayPal y más métodos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2
                      size={16}
                      className="text-green-600 flex-shrink-0 mt-0.5"
                    />
                    <span>Precios en dólares (USD)</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Plan Management and License Extension */}
        <Tabs defaultValue="plans" className="mb-8">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="plans">Cambiar Plan</TabsTrigger>
            <TabsTrigger value="extend">Extender Licencia</TabsTrigger>
          </TabsList>

          {/* Change Plan Tab */}
          <TabsContent value="plans" className="space-y-8">
            {/* Country Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe size={20} />
                  Selecciona tu ubicación
                </CardTitle>
                <CardDescription>
                  Esto determinará la moneda y método de pago
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={selectedCountry}
                  onValueChange={(val: any) => setSelectedCountry(val as any)}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                      className={`flex items-center space-x-3 border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedCountry === "colombia"
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                      onClick={() => setSelectedCountry("colombia")}
                    >
                      <RadioGroupItem value="colombia" id="colombia" />
                      <Label
                        htmlFor="colombia"
                        className="flex-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin
                            size={20}
                            className="text-blue-600 dark:text-blue-400"
                          />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              Colombia (PSE)
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Precios en COP
                            </p>
                          </div>
                        </div>
                      </Label>
                    </div>

                    <div
                      className={`flex items-center space-x-3 border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedCountry === "international"
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                      onClick={() => setSelectedCountry("international")}
                    >
                      <RadioGroupItem
                        value="international"
                        id="international"
                      />
                      <Label
                        htmlFor="international"
                        className="flex-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Globe
                            size={20}
                            className="text-green-600 dark:text-green-400"
                          />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              Internacional (Paddle)
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Precios en USD
                            </p>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Plans */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard size={24} />
                  Selecciona tu plan
                </CardTitle>
                <CardDescription>
                  Elige el plan que mejor se adapte al tamaño de tu negocio
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Validation Alert */}
                {showValidation &&
                  validationResult &&
                  !validationResult.canChange && (
                    <Alert variant="destructive" className="mb-6">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <p className="font-semibold mb-2">
                          No puedes cambiar a este plan porque excedes los
                          límites:
                        </p>
                        <ul className="list-disc ml-5 space-y-1">
                          {validationResult.violations.map(
                            (v: any, idx: number) => (
                              <li key={idx}>{v.message}</li>
                            )
                          )}
                        </ul>
                        <p className="mt-3 text-sm">
                          <strong>
                            Ve a Configuración → Gestión de Usuarios y
                            Sucursales
                          </strong>{" "}
                          para eliminar los recursos excedentes.
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`relative border-2 rounded-lg p-6 cursor-pointer transition-all ${
                        selectedPlan === plan.id
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-950 shadow-lg scale-105"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow"
                      }`}
                      onClick={() => setSelectedPlan(plan.id)}
                    >
                      {plan.badge && (
                        <Badge className="absolute -top-2 -right-2 bg-green-600">
                          {plan.badge}
                        </Badge>
                      )}

                      {plan.id === currentPlan?.id && (
                        <Badge className="absolute -top-2 -left-2 bg-blue-600">
                          Plan Actual
                        </Badge>
                      )}

                      <div className="text-center mb-4">
                        <h3 className="font-semibold text-xl mb-3 text-gray-900 dark:text-gray-100">
                          {plan.name}
                        </h3>
                        <div className="mb-4">
                          {selectedCountry === "colombia" ? (
                            <>
                              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                                ${plan.priceCOP.toLocaleString()}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                COP / mes
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                                ${plan.priceUSD}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                USD / mes
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Limits */}
                      <div className="space-y-2 mb-4 pb-4 border-b dark:border-gray-700">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                            <Building2 size={16} />
                            Sucursales
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {plan.limits.branches}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                            <UserCog size={16} />
                            Administradores
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {plan.limits.admins}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                            <Users size={16} />
                            Asesores
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {plan.limits.advisors}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                            <Wrench size={16} />
                            Técnicos
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {plan.limits.technicians}
                          </span>
                        </div>
                      </div>

                      {/* Features */}
                      <ul className="space-y-2 text-sm">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2
                              size={16}
                              className="text-green-600 flex-shrink-0 mt-0.5"
                            />
                            <span className="text-gray-700 dark:text-gray-300">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* Purchase Summary */}
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-950 rounded-lg p-6 border dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Plan seleccionado:
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {selectedPlanData?.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Método:{" "}
                        {selectedCountry === "colombia"
                          ? "PSE (Colombia)"
                          : "Paddle (Internacional)"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold flex items-center gap-1 text-gray-900 dark:text-gray-100">
                        <DollarSign size={28} />
                        {selectedCountry === "colombia"
                          ? selectedPlanData?.priceCOP.toLocaleString()
                          : selectedPlanData?.priceUSD}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedCountry === "colombia" ? "COP" : "USD"} / mes
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleValidatePlanChange(selectedPlan)}
                    disabled={loading || selectedPlan === currentPlan?.id}
                    className="w-full h-12 text-lg"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Procesando...
                      </>
                    ) : selectedPlan === currentPlan?.id ? (
                      <>
                        <CheckCircle2 className="mr-2" size={20} />
                        Este es tu Plan Actual
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2" size={20} />
                        {currentPlan &&
                        plans.findIndex((p) => p.id === selectedPlan) >
                          plans.findIndex((p) => p.id === currentPlan.id)
                          ? "Mejorar Plan Ahora"
                          : "Cambiar Plan Ahora"}
                      </>
                    )}
                  </Button>

                  {selectedPlan !== currentPlan?.id && (
                    <div className="mt-3 bg-blue-100 dark:bg-blue-900 rounded-lg p-3">
                      <p className="text-xs text-blue-900 dark:text-blue-100 flex items-start gap-2">
                        <Info size={14} className="flex-shrink-0 mt-0.5" />
                        <span>
                          Al cambiar de plan, los nuevos límites se aplicarán
                          inmediatamente y tu fecha de renovación se
                          actualizará.
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
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

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle>¿Necesitas ayuda?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Si tienes preguntas sobre los planes, necesitas un plan
              personalizado para tu negocio, o tienes problemas con tu pago, no
              dudes en contactarnos.
            </p>
            <div className="flex gap-3">
              <Button variant="outline">Contactar Soporte</Button>
              <Button variant="outline">Ver Documentación</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
