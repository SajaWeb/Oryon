import { useState, useEffect } from 'react'
import { Smartphone, Wifi, WifiOff, Download } from 'lucide-react'
import { Badge } from './ui/badge'

export function PWAStatus() {
  const [isInstalled, setIsInstalled] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    try {
      // Establecer estado inicial de conexión
      setIsOnline(navigator.onLine)

      // Verificar si está instalada como PWA
      const checkInstalled = () => {
        try {
          const isStandaloneMode =
            window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true ||
            document.referrer.includes('android-app://')

          setIsStandalone(isStandaloneMode)
          setIsInstalled(isStandaloneMode)
        } catch (err) {
          console.log('Error checking installation status:', err)
        }
      }

      checkInstalled()

      // Monitorear cambios en la conexión
      const handleOnline = () => setIsOnline(true)
      const handleOffline = () => setIsOnline(false)

      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)

      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    } catch (err) {
      console.log('Error in PWA status setup:', err)
      return
    }
  }, [])

  // No mostrar nada si no hay información relevante
  if (!isInstalled && isOnline) {
    return null
  }

  return (
    <div className="flex items-center gap-2 px-2">
      {isInstalled && (
        <Badge variant="secondary" className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">
          <Smartphone size={12} />
          <span className="hidden sm:inline">App Instalada</span>
        </Badge>
      )}
      
      {!isOnline && (
        <Badge variant="secondary" className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
          <WifiOff size={12} />
          <span className="hidden sm:inline">Offline</span>
        </Badge>
      )}
    </div>
  )
}

// Componente separado para usar en el sidebar o configuración
export function PWAInfo() {
  const [isInstalled, setIsInstalled] = useState(false)
  const [swRegistered, setSwRegistered] = useState(false)
  const [cacheSize, setCacheSize] = useState<string>('Calculando...')

  useEffect(() => {
    try {
      // Verificar instalación
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true

      setIsInstalled(isStandaloneMode)

      // Verificar Service Worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration()
          .then((registration) => {
            setSwRegistered(!!registration)
          })
          .catch((err) => {
            console.log('Error checking service worker:', err)
            setSwRegistered(false)
          })
      }

      // Estimar tamaño de caché
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        navigator.storage.estimate()
          .then((estimate) => {
            const usedMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(2)
            setCacheSize(`${usedMB} MB`)
          })
          .catch((err) => {
            console.log('Error estimating storage:', err)
            setCacheSize('No disponible')
          })
      } else {
        setCacheSize('No disponible')
      }
    } catch (err) {
      console.log('Error in PWA info setup:', err)
      setCacheSize('No disponible')
    }
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-2">Estado de la PWA</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className="text-gray-600">App Instalada</span>
            <Badge variant={isInstalled ? 'default' : 'secondary'}>
              {isInstalled ? 'Sí' : 'No'}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className="text-gray-600">Service Worker</span>
            <Badge variant={swRegistered ? 'default' : 'secondary'}>
              {swRegistered ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className="text-gray-600">Caché Utilizada</span>
            <span className="text-gray-900">{cacheSize}</span>
          </div>

          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className="text-gray-600">Conexión</span>
            <Badge variant={navigator.onLine ? 'default' : 'destructive'}>
              {navigator.onLine ? 'Online' : 'Offline'}
            </Badge>
          </div>
        </div>
      </div>

      {!isInstalled && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Download className="text-blue-600 mt-0.5" size={16} />
            <div className="text-sm">
              <p className="text-blue-900 font-medium mb-1">
                Instala la aplicación
              </p>
              <p className="text-blue-700 text-xs">
                Para mejor experiencia, instala Oryon App en tu dispositivo. Busca el botón de instalación en tu navegador.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
