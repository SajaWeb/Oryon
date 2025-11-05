import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Eye, EyeOff } from 'lucide-react'

/**
 * COMPONENTE TEMPORAL DE DEBUGGING
 * 
 * Este componente muestra información en tiempo real sobre el routing
 * para ayudar a diagnosticar problemas con códigos QR en móviles.
 * 
 * IMPORTANTE: Eliminar este componente en producción o dejarlo solo
 * accesible para administradores.
 * 
 * USO: Agregar <DebugPanel /> en App.tsx temporalmente
 */
export function DebugPanel() {
  const [isVisible, setIsVisible] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [routeInfo, setRouteInfo] = useState({
    hash: '',
    pathname: '',
    href: '',
    timestamp: new Date().toISOString()
  })

  useEffect(() => {
    // Update route info
    const updateRouteInfo = () => {
      const info = {
        hash: window.location.hash,
        pathname: window.location.pathname,
        href: window.location.href,
        timestamp: new Date().toISOString()
      }
      setRouteInfo(info)
      
      // Add to logs
      const logMessage = `[${new Date().toLocaleTimeString()}] Hash: ${info.hash || '(empty)'}`
      setLogs(prev => [logMessage, ...prev].slice(0, 20)) // Keep last 20 logs
    }

    // Initial update
    updateRouteInfo()

    // Listen for hash changes
    window.addEventListener('hashchange', updateRouteInfo)
    
    // Also listen for popstate (back/forward buttons)
    window.addEventListener('popstate', updateRouteInfo)

    return () => {
      window.removeEventListener('hashchange', updateRouteInfo)
      window.removeEventListener('popstate', updateRouteInfo)
    }
  }, [])

  // Check if sessionStorage has the backup hash
  const [sessionHash, setSessionHash] = useState<string | null>(null)
  
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('_initial_hash')
      setSessionHash(stored)
    } catch (e) {
      setSessionHash('Error: ' + e)
    }
  }, [routeInfo])

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-purple-600 text-white p-3 rounded-full shadow-lg z-50 hover:bg-purple-700 transition-colors"
        aria-label="Mostrar panel de debug"
      >
        <Eye className="h-5 w-5" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-w-[calc(100vw-2rem)] z-50">
      <Card className="bg-purple-900 text-white border-purple-700 shadow-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white text-sm">Debug Panel - Routing</CardTitle>
              <CardDescription className="text-purple-200 text-xs">
                Panel de diagnóstico para QR móviles
              </CardDescription>
            </div>
            <Button
              onClick={() => setIsVisible(false)}
              variant="ghost"
              size="sm"
              className="text-white hover:text-purple-200 hover:bg-purple-800"
            >
              <EyeOff className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {/* Current Route Info */}
          <div className="bg-purple-800 rounded p-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-purple-200">Hash:</span>
              <Badge variant="outline" className="text-white border-purple-500 font-mono text-xs">
                {routeInfo.hash || '(vacío)'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-purple-200">Pathname:</span>
              <Badge variant="outline" className="text-white border-purple-500 font-mono text-xs">
                {routeInfo.pathname}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-purple-200">SessionStorage:</span>
              <Badge 
                variant="outline" 
                className={`text-xs font-mono ${
                  sessionHash && sessionHash.startsWith('#/tracking') 
                    ? 'border-green-500 text-green-200' 
                    : 'border-purple-500 text-white'
                }`}
              >
                {sessionHash || '(vacío)'}
              </Badge>
            </div>
          </div>

          {/* Detection Status */}
          <div className="space-y-1">
            <div className="text-purple-200 mb-1">Estado de Detección:</div>
            <div className="flex gap-2 flex-wrap">
              <Badge 
                className={
                  routeInfo.hash.includes('/tracking') 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-gray-600 hover:bg-gray-700'
                }
              >
                Tracking: {routeInfo.hash.includes('/tracking') ? '✓' : '✗'}
              </Badge>
              <Badge 
                className={
                  routeInfo.hash.includes('/reset-password') 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-gray-600 hover:bg-gray-700'
                }
              >
                Reset PWD: {routeInfo.hash.includes('/reset-password') ? '✓' : '✗'}
              </Badge>
            </div>
          </div>

          {/* Navigation Info */}
          <div className="bg-purple-800 rounded p-2 space-y-1">
            <div className="text-purple-200 mb-1">Navegación:</div>
            <div className="text-xs font-mono text-white break-all">
              {routeInfo.href}
            </div>
            <div className="text-xs text-purple-300">
              Actualizado: {new Date(routeInfo.timestamp).toLocaleTimeString()}
            </div>
          </div>

          {/* Logs */}
          <div className="space-y-1">
            <div className="text-purple-200 text-xs">Historial (últimos cambios):</div>
            <div className="bg-purple-950 rounded p-2 max-h-32 overflow-y-auto text-xs font-mono">
              {logs.length > 0 ? (
                logs.map((log, idx) => (
                  <div key={idx} className="text-purple-100 mb-1">
                    {log}
                  </div>
                ))
              ) : (
                <div className="text-purple-400 italic">No hay cambios aún...</div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={() => {
                console.log('🔍 Debug Info:', {
                  currentRoute: routeInfo,
                  sessionHash,
                  logs
                })
                alert('Info enviada a la consola')
              }}
              size="sm"
              variant="secondary"
              className="flex-1 text-xs"
            >
              Log a Consola
            </Button>
            <Button
              onClick={() => setLogs([])}
              size="sm"
              variant="outline"
              className="flex-1 text-xs text-white border-purple-500 hover:bg-purple-800"
            >
              Limpiar Logs
            </Button>
          </div>

          {/* Instructions */}
          <div className="bg-purple-950 rounded p-2 text-xs text-purple-200">
            <strong className="text-white">Instrucciones:</strong>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              <li>Escanea un QR de tracking</li>
              <li>Observa si el Hash se detecta correctamente</li>
              <li>Verifica que "Tracking: ✓" aparezca verde</li>
              <li>Revisa el historial de cambios</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
