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
import { Sidebar } from "./components/Sidebar";
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
import { AppTopbar } from "./components/AppTopbar";
import { Alert, AlertDescription } from "./components/ui/alert";
import { Button } from "./components/ui/button";
import { AlertCircle, CreditCard, ShieldAlert } from "lucide-react";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  console.log("🎯 App component rendering...");

  const initialPath = window.location.pathname || "/";
  const isInitialTrackingRoute = initialPath.startsWith("/tracking");
  const isInitialResetPasswordRoute = initialPath.startsWith("/reset-password");
  const isInitialPaymentCallbackRoute = initialPath.startsWith("/payment-callback");
  const isPublicRoute = isInitialTrackingRoute || isInitialResetPasswordRoute || isInitialPaymentCallbackRoute;

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

  const isResetPasswordPage = effectiveRoute.startsWith("/reset-password");
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
    const isPublic =
      pathname.startsWith("/tracking") ||
      pathname.startsWith("/reset-password") ||
      pathname.startsWith("/payment-callback");

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
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/auth/session`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success && data.authenticated) {
        setAccessToken(token);
        setUserProfile(data.user);
        setLicenseInfo(data.license);
        setIsAuthenticated(true);
        setNeedsGoogleSetup(false);

        // Cargar datos directos de la empresa
        try {
          const compRes = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/company/info`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const compData = await compRes.json();
          if (compData.success && compData.company) {
            setCompanyData(compData.company);
          }
        } catch (compErr) {
          console.warn("No se pudo cargar company/info:", compErr);
        }
      } else if (data.needsSetup) {
        setAccessToken(token);
        setGoogleUserInfo(data.user);
        setNeedsGoogleSetup(true);
      } else if (response.status === 403) {
        const supabase = getSupabaseClient();
        await supabase.auth.signOut();
        alert(
          data.error ||
            "Tu cuenta ha sido desactivada. Contacta al administrador."
        );
      }
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

  // Set initial view based on user role
  useEffect(() => {
    if (userProfile) {
      const role = userProfile.role;
      if (role === "tecnico") {
        setCurrentView("repairs");
      } else if (role === "asesor") {
        setCurrentView("sales");
      } else {
        setCurrentView("dashboard");
      }
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

  const hasAccess = (view: string) => {
    const role = userProfile?.role || "asesor";

    const permissions: { [key: string]: string[] } = {
      dashboard: ["admin"],
      products: ["admin", "asesor"],
      repairs: ["admin", "asesor", "tecnico"],
      sales: ["admin", "asesor"],
      customers: ["admin"],
      reports: ["admin"],
      settings: ["admin"],
      license: ["admin"],
    };

    return permissions[view]?.includes(role) || false;
  };

  const handleLicenseUpdated = async () => {
    if (accessToken) {
      await verifySession(accessToken);
    }
  };

  const isLicenseExpired = (() => {
    if (!licenseInfo && !companyData) return false;

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

    // 4. Si no hay prueba ni fecha de expiración válida => Vencida
    if (!trialEndsAt && !expiryStr) {
      return true;
    }

    return false;
  })();

  const renderView = () => {
    if (!accessToken || !userProfile) return null;

    if (!hasAccess(currentView)) {
      return (
        <div className="p-8">
          <Alert className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400">
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

  // RUTAS PÚBLICAS 4: Recuperación de contraseña
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

  // Rutas de autenticación
  if (!isAuthenticated) {
    if (currentRoute === "/login" || currentRoute === "login") {
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
    } else if (currentRoute === "/register" || currentRoute === "register") {
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
    } else if (
      currentRoute === "/forgot-password" ||
      currentRoute === "forgot-password"
    ) {
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

    if (!currentRoute || currentRoute === "/") {
      return (
        <ThemeProvider>
          <Toaster position="top-right" />
          <HomePage
            onNavigateToLogin={() => {
              navigate("/login");
              setAuthView("login");
            }}
          />
        </ThemeProvider>
      );
    }

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
      <div className="flex min-h-screen bg-background">
        <Toaster position="top-right" />
        <Sidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          onLogout={handleLogout}
          userProfile={userProfile}
          licenseInfo={licenseInfo}
        />
        <div className="flex min-w-0 flex-1 flex-col pt-[var(--topbar-height)] lg:pt-0">
          <AppTopbar currentView={currentView} userProfile={userProfile} />
          <main className="min-h-0 flex-1 overflow-auto">{renderView()}</main>
        </div>
      </div>
      <PWAInstallPrompt />
      <PWAUpdatePrompt />
    </ThemeProvider>
  );
}
