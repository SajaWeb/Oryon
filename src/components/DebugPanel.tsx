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
        className="fixed bottom-4 right-4 bg-[var(--state-diagnosis)] text-white p-3 rounded-full shadow-lg z-50 hover:bg-[var(--state-diagnosis)] transition-colors"
        aria-label="Mostrar panel de debug"
      >
        <Eye className="h-5 w-5" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-w-[calc(100vw-2rem)] z-50">
      <Card className="bg-[color-mix(in_srgb,var(--state-diagnosis)_12%,transparent)] text-white border-[color-mix(in_srgb,var(--state-diagnosis)_30%,transparent)] shadow-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white text-sm">Debug Panel - Routing</CardTitle>
              <CardDescription className="text-[var(--state-diagnosis)] text-xs">
                Panel de diagnóstico para QR móviles
              </CardDescription>
            </div>
            <Button
              onClick={() => setIsVisible(false)}
              variant="ghost"
              size="sm"
              className="text-white hover:text-[var(--state-diagnosis)] hover:bg-[var(--state-diagnosis)]"
            >
              <EyeOff className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {/* Current Route Info */}
          <div className="bg-[var(--state-diagnosis)] rounded p-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[var(--state-diagnosis)]">Hash:</span>
              <Badge variant="outline" className="text-white border-[var(--state-diagnosis)] font-mono text-xs">
                {routeInfo.hash || '(vacío)'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--state-diagnosis)]">Pathname:</span>
              <Badge variant="outline" className="text-white border-[var(--state-diagnosis)] font-mono text-xs">
                {routeInfo.pathname}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--state-diagnosis)]">SessionStorage:</span>
              <Badge 
                variant="outline" 
                className={`text-xs font-mono ${
                  sessionHash && sessionHash.startsWith('#/tracking') 
                    ? 'border-[var(--success)] text-success' 
                    : 'border-[var(--state-diagnosis)] text-white'
                }`}
              >
                {sessionHash || '(vacío)'}
              </Badge>
            </div>
          </div>

          {/* Detection Status */}
          <div className="space-y-1">
            <div className="text-[var(--state-diagnosis)] mb-1">Estado de Detección:</div>
            <div className="flex gap-2 flex-wrap">
              <Badge 
                className={
                  routeInfo.hash.includes('/tracking') 
                    ? 'bg-success hover:bg-success' 
                    : 'bg-[var(--alu-500)] hover:bg-surface-raised'
                }
              >
                Tracking: {routeInfo.hash.includes('/tracking') ? '✓' : '✗'}
              </Badge>
              <Badge 
                className={
                  routeInfo.hash.includes('/reset-password') 
                    ? 'bg-success hover:bg-success' 
                    : 'bg-[var(--alu-500)] hover:bg-surface-raised'
                }
              >
                Reset PWD: {routeInfo.hash.includes('/reset-password') ? '✓' : '✗'}
              </Badge>
            </div>
          </div>

          {/* Navigation Info */}
          <div className="bg-[var(--state-diagnosis)] rounded p-2 space-y-1">
            <div className="text-[var(--state-diagnosis)] mb-1">Navegación:</div>
            <div className="text-xs font-mono text-white break-all">
              {routeInfo.href}
            </div>
            <div className="text-xs text-[var(--state-diagnosis)]">
              Actualizado: {new Date(routeInfo.timestamp).toLocaleTimeString()}
            </div>
          </div>

          {/* Logs */}
          <div className="space-y-1">
            <div className="text-[var(--state-diagnosis)] text-xs">Historial (últimos cambios):</div>
            <div className="bg-[color-mix(in_srgb,var(--state-diagnosis)_12%,transparent)] rounded p-2 max-h-32 overflow-y-auto text-xs font-mono">
              {logs.length > 0 ? (
                logs.map((log, idx) => (
                  <div key={idx} className="text-[var(--state-diagnosis)] mb-1">
                    {log}
                  </div>
                ))
              ) : (
                <div className="text-[var(--state-diagnosis)] italic">No hay cambios aún...</div>
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
              className="flex-1 text-xs text-white border-[var(--state-diagnosis)] hover:bg-[var(--state-diagnosis)]"
            >
              Limpiar Logs
            </Button>
          </div>

          {/* Instructions */}
          <div className="bg-[color-mix(in_srgb,var(--state-diagnosis)_12%,transparent)] rounded p-2 text-xs text-[var(--state-diagnosis)]">
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
