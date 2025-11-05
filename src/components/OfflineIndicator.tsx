import { useState, useEffect } from 'react'
import { WifiOff, Wifi } from 'lucide-react'
import { Alert, AlertDescription } from './ui/alert'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    try {
      // Establecer estado inicial
      setIsOnline(navigator.onLine)

      const handleOnline = () => {
        setIsOnline(true)
        setShowReconnected(true)
        
        // Ocultar el mensaje de reconexión después de 3 segundos
        setTimeout(() => {
          setShowReconnected(false)
        }, 3000)
      }

      const handleOffline = () => {
        setIsOnline(false)
        setShowReconnected(false)
      }

      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)

      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    } catch (err) {
      console.log('Error setting up offline indicator:', err)
      return
    }
  }, [])

  // Mostrar indicador cuando está offline
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 lg:left-64">
        <Alert className="rounded-none border-0 border-b bg-yellow-600 text-white">
          <WifiOff className="h-4 w-4" />
          <AlertDescription className="ml-2">
            Sin conexión a internet. Trabajando en modo offline.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Mostrar mensaje de reconexión temporalmente
  if (showReconnected) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 lg:left-64 animate-in slide-in-from-top duration-300">
        <Alert className="rounded-none border-0 border-b bg-green-600 text-white">
          <Wifi className="h-4 w-4" />
          <AlertDescription className="ml-2">
            Conexión restaurada
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return null
}
