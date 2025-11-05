import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Package, Wrench, BarChart3, Building2, Shield, Zap } from 'lucide-react'

interface HomePageProps {
  onNavigateToLogin: () => void
}

/**
 * HomePage - Página de inicio pública de Oryon App
 * 
 * Esta página sirve como landing page para usuarios no autenticados.
 * Detecta automáticamente si hay una ruta de tracking en la URL.
 */
export function HomePage({ onNavigateToLogin }: HomePageProps) {
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // CRITICAL: Detectar inmediatamente si hay una ruta pública
    const pathname = window.location.pathname || '/'
    
    console.log('🏠 HomePage mounted, checking pathname:', pathname)
    
    if (pathname.startsWith('/tracking') || pathname.startsWith('/reset-password')) {
      console.log('🏠 Public route detected in pathname, letting App.tsx handle it')
      // No hacer nada, App.tsx manejará la ruta pública
      setIsChecking(false)
      return
    }
    
    // Si llegamos aquí, es la homepage normal
    console.log('🏠 Showing homepage')
    setIsChecking(false)
  }, [])

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-blue-200">Cargando Oryon App...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-white text-xl">Oryon App</h1>
                <p className="text-gray-400 text-xs">Sistema de Gestión Integral</p>
              </div>
            </div>
            <Button
              onClick={onNavigateToLogin}
              variant="default"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Iniciar Sesión
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl text-white mb-6">
            Gestiona tu negocio de <span className="text-blue-400">forma inteligente</span>
          </h2>
          <p className="text-gray-300 text-lg md:text-xl mb-8">
            Oryon App es la solución completa para la gestión de inventarios, reparaciones y ventas. 
            Todo en un solo lugar, optimizado para tu negocio.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={onNavigateToLogin}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-lg"
            >
              Comenzar Ahora
            </Button>
            <Button
              onClick={() => {
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
              }}
              size="lg"
              variant="outline"
              className="border-gray-600 text-white hover:bg-gray-800 text-lg"
            >
              Ver Características
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-16">
        <h3 className="text-3xl text-white text-center mb-12">
          Todo lo que necesitas para crecer
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Feature 1: Inventario */}
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <div className="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                <Package className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-white">Gestión de Inventario</CardTitle>
              <CardDescription className="text-gray-400">
                Control total de productos, stock y movimientos
              </CardDescription>
            </CardHeader>
            <CardContent className="text-gray-300 text-sm">
              <ul className="space-y-2">
                <li>• Multi-sucursal</li>
                <li>• Traslados de inventario</li>
                <li>• Alertas de stock bajo</li>
                <li>• Variantes y unidades</li>
              </ul>
            </CardContent>
          </Card>

          {/* Feature 2: Reparaciones */}
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <div className="h-12 w-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                <Wrench className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-white">Centro de Reparaciones</CardTitle>
              <CardDescription className="text-gray-400">
                Gestiona reparaciones de principio a fin
              </CardDescription>
            </CardHeader>
            <CardContent className="text-gray-300 text-sm">
              <ul className="space-y-2">
                <li>• Tracking con QR</li>
                <li>• Estados personalizables</li>
                <li>• Historial completo</li>
                <li>• Facturación integrada</li>
              </ul>
            </CardContent>
          </Card>

          {/* Feature 3: Reportes */}
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <div className="h-12 w-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-white">Reportes y Análisis</CardTitle>
              <CardDescription className="text-gray-400">
                Toma decisiones basadas en datos
              </CardDescription>
            </CardHeader>
            <CardContent className="text-gray-300 text-sm">
              <ul className="space-y-2">
                <li>• Dashboard en tiempo real</li>
                <li>• Gráficos interactivos</li>
                <li>• Exportación de datos</li>
                <li>• Métricas personalizadas</li>
              </ul>
            </CardContent>
          </Card>

          {/* Feature 4: Multi-sucursal */}
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <div className="h-12 w-12 bg-orange-600 rounded-lg flex items-center justify-center mb-4">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-white">Multi-Sucursal</CardTitle>
              <CardDescription className="text-gray-400">
                Gestiona múltiples ubicaciones
              </CardDescription>
            </CardHeader>
            <CardContent className="text-gray-300 text-sm">
              <ul className="space-y-2">
                <li>• Inventarios independientes</li>
                <li>• Asignación de usuarios</li>
                <li>• Traslados entre sucursales</li>
                <li>• Reportes por ubicación</li>
              </ul>
            </CardContent>
          </Card>

          {/* Feature 5: Seguridad */}
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <div className="h-12 w-12 bg-red-600 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-white">Seguridad y Permisos</CardTitle>
              <CardDescription className="text-gray-400">
                Control de acceso granular
              </CardDescription>
            </CardHeader>
            <CardContent className="text-gray-300 text-sm">
              <ul className="space-y-2">
                <li>• Roles personalizados</li>
                <li>• Autenticación segura</li>
                <li>• Historial de cambios</li>
                <li>• Backup automático</li>
              </ul>
            </CardContent>
          </Card>

          {/* Feature 6: PWA */}
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <div className="h-12 w-12 bg-yellow-600 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-white">Progressive Web App</CardTitle>
              <CardDescription className="text-gray-400">
                Funciona como app nativa
              </CardDescription>
            </CardHeader>
            <CardContent className="text-gray-300 text-sm">
              <ul className="space-y-2">
                <li>• Instalable en cualquier dispositivo</li>
                <li>• Funciona offline</li>
                <li>• Notificaciones push</li>
                <li>• Actualizaciones automáticas</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Plans Section */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-3xl text-white text-center mb-4">
          Planes que se adaptan a tu negocio
        </h3>
        <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
          Desde emprendedores hasta empresas establecidas, tenemos el plan perfecto para ti
        </p>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Plan Básico */}
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Básico</CardTitle>
              <CardDescription className="text-gray-400">
                Para empezar tu negocio
              </CardDescription>
              <div className="text-3xl text-white mt-4">
                Plan Starter
              </div>
            </CardHeader>
            <CardContent className="text-gray-300 text-sm space-y-2">
              <p>✓ 1 Sucursal</p>
              <p>✓ 1 Administrador</p>
              <p>✓ 1 Asesor</p>
              <p>✓ 2 Técnicos</p>
              <p>✓ Soporte por email</p>
            </CardContent>
          </Card>

          {/* Plan Pyme */}
          <Card className="bg-gradient-to-br from-blue-900 to-purple-900 border-blue-500 backdrop-blur-sm relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-xs">
                Más Popular
              </span>
            </div>
            <CardHeader>
              <CardTitle className="text-white">Pyme</CardTitle>
              <CardDescription className="text-blue-200">
                Para negocios en crecimiento
              </CardDescription>
              <div className="text-3xl text-white mt-4">
                Plan Growth
              </div>
            </CardHeader>
            <CardContent className="text-blue-100 text-sm space-y-2">
              <p>✓ 2 Sucursales</p>
              <p>✓ 2 Administradores</p>
              <p>✓ 4 Asesores</p>
              <p>✓ 8 Técnicos</p>
              <p>✓ Soporte prioritario</p>
            </CardContent>
          </Card>

          {/* Plan Enterprise */}
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Enterprise</CardTitle>
              <CardDescription className="text-gray-400">
                Para empresas establecidas
              </CardDescription>
              <div className="text-3xl text-white mt-4">
                Plan Enterprise
              </div>
            </CardHeader>
            <CardContent className="text-gray-300 text-sm space-y-2">
              <p>✓ 4 Sucursales</p>
              <p>✓ 4 Administradores</p>
              <p>✓ 8 Asesores</p>
              <p>✓ 16 Técnicos</p>
              <p>✓ Soporte 24/7</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-0 max-w-4xl mx-auto">
          <CardContent className="py-12 text-center">
            <h3 className="text-3xl text-white mb-4">
              ¿Listo para transformar tu negocio?
            </h3>
            <p className="text-blue-100 mb-8 text-lg">
              Únete a cientos de negocios que ya confían en Oryon App
            </p>
            <Button
              onClick={onNavigateToLogin}
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100 text-lg"
            >
              Comenzar Ahora
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-700 bg-gray-900/50 backdrop-blur-sm py-8">
        <div className="container mx-auto px-4">
          <div className="text-center text-gray-400 text-sm">
            <p>© 2025 Oryon App. Sistema de Gestión Integral.</p>
            <p className="mt-2">
              Diseñado para negocios de electrónica y centros de reparación.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
