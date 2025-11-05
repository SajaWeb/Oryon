import { useState, useEffect } from 'react'
import './styles/globals.css'
import { getSupabaseClient } from './utils/supabase/client'
import { projectId } from './utils/supabase/info'
import { registerServiceWorker } from './utils/registerServiceWorker'
import { ThemeProvider } from './utils/ThemeContext'
import { Login } from './components/Login'
import { Register } from './components/Register'
import { GoogleSetup } from './components/GoogleSetup'
import { ForgotPassword } from './components/ForgotPassword'
import { ResetPassword } from './components/ResetPassword'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './components/Dashboard'
import { Products } from './components/products'
import { Repairs } from './components/repairs'
import { Sales } from './components/Sales'
import { Customers } from './components/Customers'
import { Reports } from './components/Reports'
import { Settings } from './components/Settings'
import { License } from './components/License'
import { TrackingPage } from './components/TrackingPage'
import { HomePage } from './components/HomePage'
import { PWAInstallPrompt } from './components/PWAInstallPrompt'
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt'
import { OfflineIndicator } from './components/OfflineIndicator'
import { ThemeToggle } from './components/ThemeToggle'
import { Alert, AlertDescription } from './components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { Toaster } from './components/ui/sonner'

export default function App() {
  console.log('🎯 App component rendering...')
  
  // CRITICAL: Detect tracking route IMMEDIATELY before any state initialization
  // This prevents any flash of login/dashboard on mobile QR scans
  const initialPath = window.location.pathname || '/'
  const isInitialTrackingRoute = initialPath.startsWith('/tracking')
  const isInitialResetPasswordRoute = initialPath.startsWith('/reset-password')
  const isPublicRoute = isInitialTrackingRoute || isInitialResetPasswordRoute
  
  console.log('🚀 Initial route detection:', {
    initialPath,
    isInitialTrackingRoute,
    isInitialResetPasswordRoute,
    isPublicRoute,
    fullPath: window.location.pathname
  })
  
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot-password' | 'reset-password'>('login')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  // Start with isLoading = false for public routes to avoid unnecessary loading state
  const [isLoading, setIsLoading] = useState(!isPublicRoute)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [licenseInfo, setLicenseInfo] = useState<any>(null)
  const [currentView, setCurrentView] = useState('dashboard')
  const [currentRoute, setCurrentRoute] = useState(initialPath)
  const [needsGoogleSetup, setNeedsGoogleSetup] = useState(false)
  const [googleUserInfo, setGoogleUserInfo] = useState<any>(null)
  
  // MOBILE QR FIX: Track if we've rendered at least once
  const [hasRendered, setHasRendered] = useState(false)

  // Check if we're on a public route (tracking or reset-password)
  // CRITICAL: Always read from window.location.pathname for real-time detection
  // This ensures QR code scans on mobile work immediately without flashing
  const currentPath = window.location.pathname || '/'
  const effectiveRoute = currentPath || currentRoute
  
  console.log('🔍 Route detection:', {
    'window.location.pathname': window.location.pathname,
    'currentPath': currentPath,
    'currentRoute': currentRoute,
    'effectiveRoute': effectiveRoute
  })
  
  const isTrackingPage = effectiveRoute.startsWith('/tracking')
  const trackingParams = isTrackingPage && effectiveRoute.includes('/tracking/') 
    ? effectiveRoute.split('/tracking/')[1]?.trim() || null
    : null
  
  // Parse tracking params: can be either "companyId/repairId" or just "repairId" (legacy)
  let trackingCompanyId = null
  let trackingRepairId = null
  if (trackingParams) {
    const parts = trackingParams.split('/')
    if (parts.length === 2) {
      trackingCompanyId = parts[0]
      trackingRepairId = parts[1]
    } else {
      trackingRepairId = parts[0]
    }
  }
  
  const isResetPasswordPage = effectiveRoute.startsWith('/reset-password')
  
  console.log('📊 App state:', {
    currentRoute,
    isTrackingPage,
    trackingCompanyId,
    trackingRepairId,
    isLoading,
    isAuthenticated
  })
  
  // Debug logging
  useEffect(() => {
    console.log('🔄 Route changed:', currentRoute)
    console.log('   Is Tracking Page:', isTrackingPage)
    console.log('   Tracking Company ID:', trackingCompanyId)
    console.log('   Tracking Repair ID:', trackingRepairId)
  }, [currentRoute, isTrackingPage, trackingCompanyId, trackingRepairId])

  useEffect(() => {
    // Mark that we've rendered
    setHasRendered(true)
    
    // Set initial route from pathname
    const initialPath = window.location.pathname || '/'
    console.log('🎬 Initial path on mount:', initialPath)
    console.log('🎬 Full URL:', window.location.href)
    
    // CRITICAL FIX for mobile QR scans:
    // Set the current route immediately
    if (initialPath !== '/') {
      console.log('📱 Setting initial route from path (mobile QR fix):', initialPath)
      setCurrentRoute(initialPath)
    }
    
    // Listen for popstate (back/forward button)
    const handlePopState = () => {
      const newRoute = window.location.pathname || '/'
      console.log('🔄 Path changed to:', newRoute)
      console.log('🔄 Full URL after change:', window.location.href)
      setCurrentRoute(newRoute)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Registrar Service Worker para PWA
  useEffect(() => {
    registerServiceWorker()
  }, [])

  // CRITICAL: Add an immediate effect that runs BEFORE any render
  // to prevent the flash/redirect issue on mobile QR scans
  useEffect(() => {
    const pathname = window.location.pathname || '/'
    console.log('🚨 IMMEDIATE PATH CHECK:', {
      pathname,
      fullURL: window.location.href,
      timestamp: new Date().toISOString()
    })
    
    // If we detect a tracking or reset-password route, log it prominently
    if (pathname.startsWith('/tracking') || pathname.startsWith('/reset-password')) {
      console.log('🚨 PUBLIC ROUTE DETECTED IMMEDIATELY - NO AUTH CHECK')
      console.log('🚨 This should render directly without any redirects')
    }
  }, []) // Run ONCE on mount

  useEffect(() => {
    // Read the pathname directly to ensure we catch it immediately on mount
    const pathname = window.location.pathname || '/'
    const isPublicRoute = pathname.startsWith('/tracking') || pathname.startsWith('/reset-password')
    
    console.log('⚡ Auth check effect on mount:', { 
      pathname, 
      isPublicRoute,
      isTrackingPage, 
      isResetPasswordPage 
    })
    
    // Skip authentication check for public routes (tracking and reset-password)
    if (isPublicRoute) {
      console.log('⚡ Public route detected on mount, skipping auth check')
      setIsLoading(false)
      return
    }
    
    // For all other routes, check authentication
    checkSession()
  }, []) // Only run once on mount to avoid race conditions

  const checkSession = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.access_token) {
        await verifySession(session.access_token)
      } else {
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Error checking session:', error)
      setIsLoading(false)
    }
  }

  const verifySession = async (token: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/auth/session`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      const data = await response.json()

      if (data.success && data.authenticated) {
        setAccessToken(token)
        setUserProfile(data.user)
        setLicenseInfo(data.license)
        setIsAuthenticated(true)
        setNeedsGoogleSetup(false)
      } else if (data.needsSetup) {
        // User authenticated with Google but needs to complete profile
        setAccessToken(token)
        setGoogleUserInfo(data.user)
        setNeedsGoogleSetup(true)
      } else if (response.status === 403) {
        // User is deactivated
        const supabase = getSupabaseClient()
        await supabase.auth.signOut()
        alert(data.error || 'Tu cuenta ha sido desactivada. Contacta al administrador.')
      }
    } catch (error) {
      console.error('Error verifying session:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoginSuccess = async (token: string) => {
    await verifySession(token)
  }

  const handleGoogleSetupComplete = async (token: string) => {
    setNeedsGoogleSetup(false)
    setGoogleUserInfo(null)
    await verifySession(token)
  }

  // Set initial view based on user role
  useEffect(() => {
    if (userProfile) {
      // With feature-based licensing, all plans are valid
      // Just set view based on role
      const role = userProfile.role
      if (role === 'tecnico') {
        setCurrentView('repairs')
      } else if (role === 'asesor') {
        setCurrentView('sales')
      } else {
        setCurrentView('dashboard')
      }
    }
  }, [userProfile])

  // Refresh token periodically to prevent expiration
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return

    const refreshSession = async () => {
      try {
        const supabase = getSupabaseClient()
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error || !session) {
          console.error('❌ Session refresh failed:', error)
          // Session expired, logout user
          handleLogout()
          return
        }
        
        // Update token if it changed
        if (session.access_token !== accessToken) {
          console.log('🔄 Token refreshed')
          setAccessToken(session.access_token)
        }
      } catch (error) {
        console.error('❌ Error refreshing session:', error)
      }
    }

    // Check session every 5 minutes
    const interval = setInterval(refreshSession, 5 * 60 * 1000)
    
    // Also check on visibility change (when user returns to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshSession()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isAuthenticated, accessToken])

  const handleRegisterSuccess = () => {
    setAuthView('login')
  }

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseClient()
      await supabase.auth.signOut()
      setIsAuthenticated(false)
      setAccessToken(null)
      setUserProfile(null)
      setLicenseInfo(null)
      setCurrentView('dashboard')
      // Navigate to home page
      navigate('/')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  // Navigation function for programmatic routing
  const navigate = (path: string) => {
    window.history.pushState({}, '', path)
    setCurrentRoute(path)
    // Trigger popstate event manually
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  // Feature-based licensing - no expiry
  // Plans have limits on branches, users, etc.

  const hasAccess = (view: string) => {
    const role = userProfile?.role || 'asesor'
    
    const permissions: { [key: string]: string[] } = {
      dashboard: ['admin'],
      products: ['admin', 'asesor'],
      repairs: ['admin', 'asesor', 'tecnico'],
      sales: ['admin', 'asesor'],
      customers: ['admin'],
      reports: ['admin'],
      settings: ['admin'],
      license: ['admin'] // Only admin can access license page
    }
    
    return permissions[view]?.includes(role) || false
  }

  const handleLicenseUpdated = async () => {
    // Refresh session to get updated license info
    if (accessToken) {
      await verifySession(accessToken)
    }
  }

  const renderView = () => {
    if (!accessToken || !userProfile) return null

    // Check if user has access to current view
    if (!hasAccess(currentView)) {
      return (
        <div className="p-8">
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              No tienes acceso a esta sección. Por favor contacta a tu administrador.
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    switch (currentView) {
      case 'dashboard':
        return <Dashboard accessToken={accessToken} userProfile={userProfile} onNavigate={setCurrentView} />
      case 'products':
        return <Products accessToken={accessToken} userRole={userProfile.role} userProfile={userProfile} />
      case 'repairs':
        return <Repairs accessToken={accessToken} userName={userProfile.name} userRole={userProfile.role} userProfile={userProfile} />
      case 'sales':
        return <Sales accessToken={accessToken} userName={userProfile.name} userRole={userProfile.role} userProfile={userProfile} />
      case 'customers':
        return <Customers accessToken={accessToken} userRole={userProfile.role} />
      case 'reports':
        return <Reports accessToken={accessToken} />
      case 'settings':
        return <Settings accessToken={accessToken} userProfile={userProfile} licenseInfo={licenseInfo} />
      case 'license':
        return <License accessToken={accessToken} userProfile={userProfile} licenseInfo={licenseInfo} onLicenseUpdated={handleLicenseUpdated} />
      default:
        return <Dashboard accessToken={accessToken} userProfile={userProfile} onNavigate={setCurrentView} />
    }
  }

  // PRIORITY 1: If this is a public page, show it immediately (check first, before auth)
  // This ensures tracking pages work for anyone with the link, regardless of auth status
  // CRITICAL: This must be the FIRST check to prevent any flash of login/dashboard
  if (isTrackingPage) {
    console.log('✅ Rendering TrackingPage with companyId:', trackingCompanyId, 'repairId:', trackingRepairId)
    return (
      <ThemeProvider>
        <Toaster position="top-right" />
        <TrackingPage companyId={trackingCompanyId} repairId={trackingRepairId} />
      </ThemeProvider>
    )
  }

  // PRIORITY 2: If this is the reset password page, show it
  if (isResetPasswordPage) {
    return (
      <ThemeProvider>
        <Toaster position="top-right" />
        <ResetPassword
          onResetSuccess={() => {
            navigate('/login')
            setAuthView('login')
          }}
        />
      </ThemeProvider>
    )
  }

  // PRIORITY 3: Show loading state ONLY for authenticated routes
  // Public routes (tracking, reset-password) skip this completely
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    )
  }

  // Show Google setup if user needs to complete their profile
  if (needsGoogleSetup && accessToken && googleUserInfo) {
    return (
      <GoogleSetup
        accessToken={accessToken}
        userEmail={googleUserInfo.email}
        userName={googleUserInfo.name}
        onSetupComplete={handleGoogleSetupComplete}
      />
    )
  }

  if (!isAuthenticated) {
    // Check if user is navigating to specific auth routes
    if (currentRoute === '/login' || currentRoute === 'login') {
      return (
        <ThemeProvider>
          <Toaster position="top-right" />
          <Login
            onLoginSuccess={handleLoginSuccess}
            onSwitchToRegister={() => {
              navigate('/register')
              setAuthView('register')
            }}
            onSwitchToForgotPassword={() => {
              navigate('/forgot-password')
              setAuthView('forgot-password')
            }}
          />
        </ThemeProvider>
      )
    } else if (currentRoute === '/register' || currentRoute === 'register') {
      return (
        <ThemeProvider>
          <Toaster position="top-right" />
          <Register
            onRegisterSuccess={handleRegisterSuccess}
            onSwitchToLogin={() => {
              navigate('/login')
              setAuthView('login')
            }}
          />
        </ThemeProvider>
      )
    } else if (currentRoute === '/forgot-password' || currentRoute === 'forgot-password') {
      return (
        <ThemeProvider>
          <Toaster position="top-right" />
          <ForgotPassword
            onBackToLogin={() => {
              navigate('/login')
              setAuthView('login')
            }}
          />
        </ThemeProvider>
      )
    }
    
    // Show HomePage if no specific route (landing page for non-authenticated users)
    // This is the default view when accessing the root URL without authentication
    if (!currentRoute || currentRoute === '/') {
      return (
        <ThemeProvider>
          <Toaster position="top-right" />
          <HomePage onNavigateToLogin={() => {
            navigate('/login')
            setAuthView('login')
          }} />
        </ThemeProvider>
      )
    }
    
    // Fallback to login for any other unmatched route when not authenticated
    return (
      <ThemeProvider>
        <Toaster position="top-right" />
        <Login
          onLoginSuccess={handleLoginSuccess}
          onSwitchToRegister={() => {
            navigate('/register')
            setAuthView('register')
          }}
          onSwitchToForgotPassword={() => {
            navigate('/forgot-password')
            setAuthView('forgot-password')
          }}
        />
      </ThemeProvider>
    )
  }

  // Otherwise, show the authenticated app
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
        <main className="flex-1 overflow-auto pt-16 lg:pt-0">
          {renderView()}
        </main>
        <ThemeToggle />
      </div>
      <PWAInstallPrompt />
      <PWAUpdatePrompt />
    </ThemeProvider>
  )
}
