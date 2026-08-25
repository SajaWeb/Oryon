import { useState, useEffect } from "react";
import { getSupabaseClient } from "./utils/supabase/client";
import { projectId } from "./utils/supabase/info";
import { registerServiceWorker } from "./utils/registerServiceWorker";
import { ThemeProvider } from "./utils/ThemeContext";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import { GoogleSetup } from "./components/GoogleSetup";
import { ForgotPassword } from "./components/ForgotPassword";
import { ResetPassword } from "./components/ResetPassword";
import { ConfirmEmail } from "./components/ConfirmEmail";
import { Dashboard } from "./components/Dashboard";
import { Products } from "./components/products";
import { Repairs } from "./components/repairs";
import { Sales } from "./components/Sales";
import { Customers } from "./components/Customers";
import { Reports } from "./components/Reports";
import { Settings } from "./components/Settings";
import { License } from "./components/License";
import { ExpiredLicenseGate } from "./components/license/ExpiredLicenseGate";
import { SuperAdmin } from "./components/SuperAdmin";
import { PaymentCallback } from "./components/PaymentCallback";
import { TrackingPage } from "./components/TrackingPage";
import { HomePage } from "./components/HomePage";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { PWAUpdatePrompt } from "./components/PWAUpdatePrompt";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { AppShell } from "./components/layout/AppShell";
import {
  hasAccess as navHasAccess,
  defaultViewForRole,
  type ViewId,
} from "./components/layout/navItems";
import { Alert, AlertDescription } from "./components/ui/alert";
import { Button } from "./components/ui/button";
import { AlertCircle, CreditCard, ShieldAlert } from "lucide-react";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  console.log("🎯 App component rendering...");

  const initialPath = window.location.pathname || "/";
  const initialHash = window.location.hash || "";
  const isEmailConfirmationHash = initialHash.includes("type=signup") || initialHash.includes("type=email_change");
  const isPasswordRecoveryHash = initialHash.includes("type=recovery");

  const isInitialTrackingRoute = initialPath.startsWith("/tracking");
  const isInitialConfirmEmailRoute = initialPath.startsWith("/confirm-email") || isEmailConfirmationHash;
  const isInitialResetPasswordRoute = initialPath.startsWith("/reset-password") || isPasswordRecoveryHash;
  const isInitialPaymentCallbackRoute = initialPath.startsWith("/payment-callback");
  const isPublicRoute = isInitialTrackingRoute || isInitialConfirmEmailRoute || isInitialResetPasswordRoute || isInitialPaymentCallbackRoute;

  const [authView, setAuthView] = useState<
    "login" | "register" | "forgot-password" | "reset-password"
  >("login");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(!isPublicRoute);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [licenseInfo, setLicenseInfo] = useState<any>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [currentView, setCurrentView] = useState("dashboard");
  const [currentRoute, setCurrentRoute] = useState(initialPath);
  const [needsGoogleSetup, setNeedsGoogleSetup] = useState(false);
  const [googleUserInfo, setGoogleUserInfo] = useState<any>(null);

  const currentPath = window.location.pathname || "/";
  const effectiveRoute = currentPath || currentRoute;

  const isTrackingPage = effectiveRoute.startsWith("/tracking");
  const trackingParams =
    isTrackingPage && effectiveRoute.includes("/tracking/")
      ? effectiveRoute.split("/tracking/")[1]?.trim() || null
      : null;

  let trackingCompanyId = null;
  let trackingRepairId = null;
  if (trackingParams) {
    const parts = trackingParams.split("/");
    if (parts.length === 2) {
      trackingCompanyId = parts[0];
      trackingRepairId = parts[1];
    } else {
      trackingRepairId = parts[0];
    }
  }

  const isConfirmEmailPage = effectiveRoute.startsWith("/confirm-email") || isEmailConfirmationHash;
  const isResetPasswordPage = effectiveRoute.startsWith("/reset-password") || isPasswordRecoveryHash;
  const isPaymentCallbackPage = effectiveRoute.startsWith("/payment-callback");
  const isSuperAdminRoute = effectiveRoute.startsWith("/superadmin");

  useEffect(() => {
    if (initialPath !== "/") {
      setCurrentRoute(initialPath);
    }

    const handlePopState = () => {
      const newRoute = window.location.pathname || "/";
      setCurrentRoute(newRoute);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Registrar Service Worker para PWA
  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    const pathname = window.location.pathname || "/";
    const hash = window.location.hash || "";
    const isPublic =
      pathname.startsWith("/tracking") ||
      pathname.startsWith("/confirm-email") ||
      pathname.startsWith("/reset-password") ||
      pathname.startsWith("/payment-callback") ||
      hash.includes("type=signup") ||
      hash.includes("type=email_change") ||
      hash.includes("type=recovery");

    if (isPublic) {
      setIsLoading(false);
      return;
    }

    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        await verifySession(session.access_token);
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error checking session:", error);
      setIsLoading(false);
    }
  };

  const verifySession = async (token: string) => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // 1. Obtener perfil de usuario desde KV
      let profile: any = null;
      try {
        const { data: userRow } = await supabase
          .from("kv_store_4d437e50")
          .select("value")
          .eq("key", `user:${user.id}`)
          .single();

        if (userRow?.value) {
          profile = typeof userRow.value === "string" ? JSON.parse(userRow.value) : userRow.value;
        }
      } catch (err) {}

      // Fallback a metadata si no está en KV
      if (!profile) {
        profile = {
          userId: user.id,
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email?.split("@")[0] || "Usuario",
          role: user.user_metadata?.role || "admin",
          companyId: user.user_metadata?.companyId || 1,
          isSuperAdmin: user.user_metadata?.role === "superadmin" || user.user_metadata?.isSuperAdmin === true
        };
      }

      // Si es Super Admin, redirigir al portal exclusivo
      if (profile.role === "superadmin" || profile.isSuperAdmin === true) {
        setAccessToken(token);
        setUserProfile(profile);
        setIsAuthenticated(true);
        setNeedsGoogleSetup(false);
        setIsLoading(false);
        if (!window.location.pathname.startsWith("/superadmin")) {
          navigate("/superadmin");
        }
        return;
      }

      // 2. Obtener datos de la empresa desde KV
      let company: any = null;
      const targetCompanyId = profile.companyId || 1;
      try {
        const { data: compRow } = await supabase
          .from("kv_store_4d437e50")
          .select("value")
          .eq("key", `company:${targetCompanyId}`)
          .single();

        if (compRow?.value) {
          company = typeof compRow.value === "string" ? JSON.parse(compRow.value) : compRow.value;
        }
      } catch (err) {}

      // 3. Calcular estado de la licencia de forma segura
      const now = new Date();
      const expiryTime = company?.licenseExpiry ? new Date(company.licenseExpiry).getTime() : 0;
      const trialTime = company?.trialEndsAt ? new Date(company.trialEndsAt).getTime() : 0;
      const maxFutureTime = Math.max(now.getTime(), isNaN(expiryTime) ? 0 : expiryTime, isNaN(trialTime) ? 0 : trialTime);
      const isExpired = maxFutureTime <= now.getTime();
      const daysRemaining = Math.max(0, Math.ceil((maxFutureTime - now.getTime()) / (1000 * 60 * 60 * 24)));

      const license = {
        valid: !isExpired,
        isExpired,
        inTrial: Boolean(company?.trialEndsAt && new Date(company.trialEndsAt) > now),
        daysRemaining,
        planId: company?.planId || "basico",
        licenseExpiry: company?.licenseExpiry,
        trialEndsAt: company?.trialEndsAt
      };

      // Asignar todos los estados de forma sincronizada
      setAccessToken(token);
      setUserProfile(profile);
      setCompanyData(company);
      setLicenseInfo(license);
      setIsAuthenticated(true);
      setNeedsGoogleSetup(false);
    } catch (error) {
      console.error("Error verifying session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = async (token: string) => {
    await verifySession(token);
  };

  const handleGoogleSetupComplete = async (token: string) => {
    setNeedsGoogleSetup(false);
    setGoogleUserInfo(null);
    await verifySession(token);
  };

  // Vista inicial según el rol. La tabla vive en components/layout/navItems.ts
  useEffect(() => {
    if (userProfile) {
      setCurrentView(defaultViewForRole(userProfile.role));
    }
  }, [userProfile]);

  // Refresh token periodically to prevent expiration
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const refreshSession = async () => {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session) {
          console.error("❌ Session refresh failed:", error);
          handleLogout();
          return;
        }

        if (session.access_token !== accessToken) {
          setAccessToken(session.access_token);
        }
      } catch (error) {
        console.error("❌ Error refreshing session:", error);
      }
    };

    const interval = setInterval(refreshSession, 5 * 60 * 1000);
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshSession();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthenticated, accessToken]);

  const handleRegisterSuccess = () => {
    setAuthView("login");
  };

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setAccessToken(null);
      setUserProfile(null);
      setLicenseInfo(null);
      setCurrentView("dashboard");
      navigate("/");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    setCurrentRoute(path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  // Navegación y permisos comparten una sola definición: components/layout/navItems.ts
  const hasAccess = (view: string) => navHasAccess(view, userProfile?.role);

  const handleLicenseUpdated = async () => {
    if (accessToken) {
      await verifySession(accessToken);
    }
  };

  const isLicenseExpired = (() => {
    // Si aún está cargando la sesión o si el usuario no está autenticado o es Super Admin, no bloquear ni flashear
    if (isLoading || !isAuthenticated || !userProfile) return false;
    if (userProfile.role === "superadmin" || userProfile.isSuperAdmin === true) return false;

    // Si aún no se han terminado de cargar los datos de la empresa, no asumir vencimiento
    if (!companyData && !licenseInfo) return false;

    const now = new Date();

    // 1. Período de prueba activo
    const trialEndsAt = companyData?.trialEndsAt || licenseInfo?.trialEndsAt;
    if (trialEndsAt) {
      const trialDate = new Date(trialEndsAt);
      if (!isNaN(trialDate.getTime()) && now <= trialDate) {
        return false;
      }
    }

    // 2. Fecha de vencimiento de licencia (licenseExpiry)
    const expiryStr = companyData?.licenseExpiry || licenseInfo?.licenseExpiry || licenseInfo?.expiryDate;
    if (expiryStr) {
      const expiryDate = new Date(expiryStr);
      if (!isNaN(expiryDate.getTime())) {
        return now > expiryDate;
      }
    }

    // 3. Indicadores booleanos de la API
    if (licenseInfo?.isExpired === true || licenseInfo?.valid === false) {
      return true;
    }
    if (licenseInfo?.daysRemaining !== undefined && licenseInfo.daysRemaining <= 0 && !licenseInfo.inTrial) {
      return true;
    }

    return false;
  })();

  const renderView = () => {
    if (!accessToken || !userProfile) return null;

    if (!hasAccess(currentView)) {
      return (
        <div className="p-8">
          <Alert className="bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] border-[color-mix(in_srgb,var(--danger)_30%,transparent)] text-danger">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No tienes acceso a esta sección. Por favor contacta al administrador.
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    switch (currentView) {
      case "dashboard":
        return (
          <Dashboard
            accessToken={accessToken}
            userProfile={userProfile}
            onNavigate={setCurrentView}
          />
        );
      case "products":
        return (
          <Products
            accessToken={accessToken}
            userRole={userProfile.role}
            userProfile={userProfile}
          />
        );
      case "repairs":
        return (
          <Repairs
            accessToken={accessToken}
            userName={userProfile.name}
            userRole={userProfile.role}
            userProfile={userProfile}
          />
        );
      case "sales":
        return (
          <Sales
            accessToken={accessToken}
            userName={userProfile.name}
            userRole={userProfile.role}
            userProfile={userProfile}
          />
        );
      case "customers":
        return (
          <Customers accessToken={accessToken} userRole={userProfile.role} />
        );
      case "reports":
        return <Reports accessToken={accessToken} />;
      case "settings":
        return (
          <Settings
            accessToken={accessToken}
            userProfile={userProfile}
            licenseInfo={licenseInfo}
          />
        );
      case "license":
        return (
          <License
            accessToken={accessToken}
            userProfile={userProfile}
            licenseInfo={licenseInfo}
            onLicenseUpdated={handleLicenseUpdated}
          />
        );
      default:
        return (
          <Dashboard
            accessToken={accessToken}
            userProfile={userProfile}
            onNavigate={setCurrentView}
          />
        );
    }
  };

  // RUTA 1: Panel Super Admin Independiente
  if (isSuperAdminRoute) {
    return (
      <ThemeProvider>
        <Toaster position="top-right" />
        <SuperAdmin
          accessToken={accessToken || ""}
          userProfile={userProfile}
          onBackToApp={() => navigate("/")}
        />
      </ThemeProvider>
    );
  }

  // RUTAS PÚBLICAS 2: Tracking de reparaciones
  if (isTrackingPage) {
    return (
      <ThemeProvider>
        <Toaster position="top-right" />
        <TrackingPage
          companyId={trackingCompanyId}
          repairId={trackingRepairId}
        />
      </ThemeProvider>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm">Cargando Oryon...</p>
        </div>
      </div>
    );
  }

  // RUTAS PÚBLICAS 3: Callback de Wompi tras pagar
  if (isPaymentCallbackPage) {
    return (
      <ThemeProvider>
        <Toaster position="top-right" />
        <PaymentCallback
          accessToken={accessToken || ""}
          onComplete={async () => {
            try {
              const supabase = getSupabaseClient();
              const { data: { session } } = await supabase.auth.getSession();
              const token = session?.access_token || accessToken;
              if (token) {
                await verifySession(token);
              }
            } catch (err) {
              console.warn('Error refrescando sesión al completar pago:', err);
            }
            window.history.pushState({}, "", "/");
            setCurrentRoute("/");
            setCurrentView("dashboard");
            window.dispatchEvent(new PopStateEvent("popstate"));
          }}
        />
      </ThemeProvider>
    );
  }

  // RUTAS PÚBLICAS 4: Confirmación de Correo Electrónico
  if (isConfirmEmailPage) {
    return (
      <ThemeProvider>
        <Toaster position="top-right" />
        <ConfirmEmail
          onConfirmSuccess={() => {
            navigate("/login");
            setAuthView("login");
          }}
        />
      </ThemeProvider>
    );
  }

  // RUTAS PÚBLICAS 5: Recuperación de contraseña
  if (isResetPasswordPage) {
    return (
      <ThemeProvider>
        <Toaster position="top-right" />
        <ResetPassword
          onResetSuccess={() => {
            navigate("/login");
            setAuthView("login");
          }}
        />
      </ThemeProvider>
    );
  }

  // Setup Google
  if (needsGoogleSetup && accessToken && googleUserInfo) {
    return (
      <GoogleSetup
        accessToken={accessToken}
        userEmail={googleUserInfo.email}
        userName={googleUserInfo.name}
        onSetupComplete={handleGoogleSetupComplete}
      />
    );
  }

  // Rutas de autenticación y navegación pública
  if (!isAuthenticated) {
    if (isSuperAdminRoute) {
      return (
        <ThemeProvider>
          <Toaster position="top-right" />
          <SuperAdmin
            accessToken={accessToken || ""}
            userProfile={userProfile}
            onBackToApp={() => navigate("/")}
          />
        </ThemeProvider>
      );
    }

    if (effectiveRoute === "/login" || effectiveRoute === "login") {
      return (
        <ThemeProvider>
          <Toaster position="top-right" />
          <Login
            onLoginSuccess={handleLoginSuccess}
            onSwitchToRegister={() => {
              navigate("/register");
              setAuthView("register");
            }}
            onSwitchToForgotPassword={() => {
              navigate("/forgot-password");
              setAuthView("forgot-password");
            }}
          />
        </ThemeProvider>
      );
    }

    if (effectiveRoute === "/register" || effectiveRoute === "register") {
      return (
        <ThemeProvider>
          <Toaster position="top-right" />
          <Register
            onRegisterSuccess={handleRegisterSuccess}
            onSwitchToLogin={() => {
              navigate("/login");
              setAuthView("login");
            }}
            navigate={navigate}
          />
        </ThemeProvider>
      );
    }

    if (effectiveRoute === "/forgot-password" || effectiveRoute === "forgot-password") {
      return (
        <ThemeProvider>
          <Toaster position="top-right" />
          <ForgotPassword
            onBackToLogin={() => {
              navigate("/login");
              setAuthView("login");
            }}
          />
        </ThemeProvider>
      );
    }

    // Landing Page por defecto en la raíz "/"
    return (
      <ThemeProvider>
        <Toaster position="top-right" />
        <HomePage
          onNavigateToLogin={() => {
            navigate("/login");
            setAuthView("login");
          }}
          onNavigateToRegister={() => {
            navigate("/register");
            setAuthView("register");
          }}
        />
      </ThemeProvider>
    );
  }

  // Bloqueo total si la licencia está vencida: no se tiene acceso al dashboard
  if (isLicenseExpired) {
    return (
      <ThemeProvider>
        <Toaster position="top-right" />
        <ExpiredLicenseGate
          accessToken={accessToken || ""}
          userProfile={userProfile}
          licenseInfo={licenseInfo}
          onRefreshLicense={async () => {
            if (accessToken) await verifySession(accessToken);
          }}
          onLogout={handleLogout}
        />
      </ThemeProvider>
    );
  }

  // Aplicación autenticada normal
  return (
    <ThemeProvider>
      <OfflineIndicator />
      <Toaster position="top-right" />
      <AppShell
        currentView={currentView}
        onViewChange={(view: ViewId) => setCurrentView(view)}
        onLogout={handleLogout}
        userProfile={userProfile}
        licenseInfo={licenseInfo}
      >
        {renderView()}
      </AppShell>
      <PWAInstallPrompt />
      <PWAUpdatePrompt />
    </ThemeProvider>
  );
}
