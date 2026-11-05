import { useState, useEffect } from 'react'
import { Smartphone, Wifi, WifiOff, Download } from 'lucide-react'
import { Badge } from './ui/badge'
import { Alert, Badge as OryonBadge, Card, KeyValue } from './oryon'

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
        <Badge variant="secondary" className="flex items-center gap-1 text-xs bg-[var(--accent-subtle)] text-primary hover:bg-[var(--accent-subtle)]">
          <Smartphone size={12} />
          <span className="hidden sm:inline">App Instalada</span>
        </Badge>
      )}
      
      {!isOnline && (
        <Badge variant="secondary" className="flex items-center gap-1 text-xs bg-[var(--warning-subtle)] text-warning hover:bg-[var(--warning-subtle)]">
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
    <Card title="Aplicación" subtitle="Estado de Oryon en este dispositivo">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <KeyValue
          items={[
            { label: 'Instalada', value: <OryonBadge tone={isInstalled ? 'success' : 'neutral'}>{isInstalled ? 'Sí' : 'No'}</OryonBadge> },
            { label: 'Trabajo sin conexión', value: <OryonBadge tone={swRegistered ? 'success' : 'neutral'}>{swRegistered ? 'Activo' : 'Inactivo'}</OryonBadge> },
            { label: 'Espacio usado', value: cacheSize, mono: true },
            { label: 'Conexión', value: <OryonBadge tone={navigator.onLine ? 'success' : 'danger'} dot>{navigator.onLine ? 'En línea' : 'Sin conexión'}</OryonBadge> },
          ]}
        />
        {!isInstalled && (
          <Alert variant="info" title="Instala Oryon en este dispositivo">
            Abre más rápido y funciona aunque se caiga el internet. Busca «Instalar» en el menú del navegador.
          </Alert>
        )}
      </div>
    </Card>
  )
}
