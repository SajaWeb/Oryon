import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { X, Download, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    try {
      // Verificar si ya está instalada
      if (window.matchMedia('(display-mode: standalone)').matches || 
          (window.navigator as any).standalone === true) {
        setIsInstalled(true)
        return
      }

      // Escuchar el evento beforeinstallprompt
      const handleBeforeInstallPrompt = (e: Event) => {
        try {
          e.preventDefault()
          setDeferredPrompt(e as BeforeInstallPromptEvent)
          
          // Mostrar el prompt después de 10 segundos si no se ha cerrado
          setTimeout(() => {
            try {
              const dismissed = localStorage.getItem('pwa-prompt-dismissed')
              if (!dismissed) {
                setShowPrompt(true)
              }
            } catch (err) {
              console.log('Error checking prompt status:', err)
            }
          }, 10000)
        } catch (err) {
          console.log('Error handling install prompt:', err)
        }
      }

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

      // Escuchar cuando se instale la app
      const handleAppInstalled = () => {
        setIsInstalled(true)
        setShowPrompt(false)
        console.log('PWA installed successfully')
      }
      
      window.addEventListener('appinstalled', handleAppInstalled)

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        window.removeEventListener('appinstalled', handleAppInstalled)
      }
    } catch (err) {
      console.log('Error in PWA install prompt setup:', err)
      return
    }
  }, [])

  const handleInstallClick = async () => {
    try {
      if (!deferredPrompt) {
        return
      }

      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      console.log(`User response to install prompt: ${outcome}`)
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
      } else {
        console.log('User dismissed the install prompt')
      }
      
      setDeferredPrompt(null)
      setShowPrompt(false)
    } catch (err) {
      console.log('Error prompting install:', err)
      setShowPrompt(false)
    }
  }

  const handleDismiss = () => {
    try {
      setShowPrompt(false)
      localStorage.setItem('pwa-prompt-dismissed', 'true')
      
      // Mostrar nuevamente después de 7 días
      setTimeout(() => {
        try {
          localStorage.removeItem('pwa-prompt-dismissed')
        } catch (err) {
          console.log('Error removing dismissed flag:', err)
        }
      }, 7 * 24 * 60 * 60 * 1000)
    } catch (err) {
      console.log('Error dismissing prompt:', err)
    }
  }

  // No mostrar si ya está instalada o si no hay prompt disponible
  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-5 duration-500">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-2xl p-4 border border-blue-500">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-white/80 hover:text-white transition-colors"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>
        
        <div className="flex items-start gap-3 mb-3">
          <div className="bg-white/20 rounded-lg p-2">
            <Smartphone size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Instalar Oryon App</h3>
            <p className="text-sm text-white/90">
              Instala Oryon App en tu dispositivo para acceso rápido y experiencia mejorada
            </p>
          </div>
        </div>

        <div className="space-y-2 text-sm text-white/80 mb-4 ml-11">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-white/60"></div>
            <span>Acceso rápido desde tu pantalla de inicio</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-white/60"></div>
            <span>Funciona sin conexión (offline)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-white/60"></div>
            <span>Experiencia de app nativa</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleInstallClick}
            className="flex-1 bg-white text-blue-600 hover:bg-white/90"
          >
            <Download size={16} className="mr-2" />
            Instalar Ahora
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
