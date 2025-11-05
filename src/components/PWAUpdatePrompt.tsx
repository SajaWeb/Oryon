import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { RefreshCw, X } from 'lucide-react'

export function PWAUpdatePrompt() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    try {
      if (!('serviceWorker' in navigator)) {
        return
      }

      // Escuchar cuando haya una actualización disponible
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // Hay una nueva versión disponible
              setWaitingWorker(newWorker)
              setShowUpdatePrompt(true)
            }
          })
        })
      }).catch(err => {
        console.log('Service Worker not ready:', err)
      })

      // Escuchar mensajes del service worker
      const handleControllerChange = () => {
        window.location.reload()
      }
      
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
      
      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
      }
    } catch (err) {
      console.log('Error setting up update prompt:', err)
      return
    }
  }, [])

  const handleUpdate = () => {
    try {
      if (!waitingWorker) return

      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
      setShowUpdatePrompt(false)
    } catch (err) {
      console.log('Error updating service worker:', err)
      setShowUpdatePrompt(false)
    }
  }

  const handleDismiss = () => {
    setShowUpdatePrompt(false)
  }

  if (!showUpdatePrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-5 duration-500">
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg shadow-2xl p-4 border border-green-500">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-white/80 hover:text-white transition-colors"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>

        <div className="flex items-start gap-3 mb-3">
          <div className="bg-white/20 rounded-lg p-2">
            <RefreshCw size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Actualización Disponible</h3>
            <p className="text-sm text-white/90">
              Hay una nueva versión de Oryon App disponible. Actualiza para obtener las últimas mejoras.
            </p>
          </div>
        </div>

        <div className="flex gap-2 ml-11">
          <Button
            onClick={handleUpdate}
            className="flex-1 bg-white text-green-600 hover:bg-white/90"
          >
            <RefreshCw size={16} className="mr-2" />
            Actualizar Ahora
          </Button>
          <Button
            onClick={handleDismiss}
            variant="ghost"
            className="text-white hover:bg-white/10"
          >
            Más tarde
          </Button>
        </div>
      </div>
    </div>
  )
}
