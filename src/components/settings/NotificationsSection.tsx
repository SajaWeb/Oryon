import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Button } from '../ui/button'
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  showNotification
} from '../../utils/notifications'

export function NotificationsSection() {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const [testingNotification, setTestingNotification] = useState(false)

  useEffect(() => {
    if (isNotificationSupported()) {
      setNotificationPermission(getNotificationPermission())
    }
  }, [])

  const handleEnableNotifications = async () => {
    const permission = await requestNotificationPermission()
    setNotificationPermission(permission)
    
    if (permission === 'granted') {
      await showNotification({
        title: '🎉 Notificaciones Activadas',
        body: 'Recibirás notificaciones sobre el estado de las reparaciones y actualizaciones importantes',
        tag: 'welcome-notification'
      })
    }
  }

  const handleTestNotification = async () => {
    setTestingNotification(true)
    await showNotification({
      title: '🔔 Notificación de Prueba',
      body: 'Esta es una notificación de prueba de Oryon App. ¡Todo funciona correctamente!',
      tag: 'test-notification'
    })
    setTimeout(() => setTestingNotification(false), 2000)
  }

  if (!isNotificationSupported()) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Bell className="text-primary" size={24} />
          <CardTitle>Notificaciones Push</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label>Estado de Notificaciones</Label>
            <p className="text-sm text-ink-tertiary mb-3">
              Recibe actualizaciones en tiempo real sobre reparaciones, stock bajo y más
            </p>
          </div>

          {notificationPermission === 'default' && (
            <div className="bg-[var(--accent-subtle)] border border-[var(--accent-subtle-border)] rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Bell className="text-primary flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="text-sm text-primary mb-3">
                    Activa las notificaciones para recibir actualizaciones en tiempo real sobre tu negocio
                  </p>
                  <Button onClick={handleEnableNotifications} size="sm">
                    Activar Notificaciones
                  </Button>
                </div>
              </div>
            </div>
          )}

          {notificationPermission === 'granted' && (
            <div className="bg-[var(--success-subtle)] border border-[color-mix(in_srgb,var(--success)_30%,transparent)] rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Bell className="text-success flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="text-sm text-success mb-3">
                    ✓ Las notificaciones están activadas
                  </p>
                  <Button 
                    onClick={handleTestNotification} 
                    size="sm" 
                    variant="outline"
                    disabled={testingNotification}
                  >
                    {testingNotification ? 'Enviando...' : 'Enviar Notificación de Prueba'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {notificationPermission === 'denied' && (
            <div className="bg-[var(--danger-subtle)] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] rounded-lg p-4">
              <div className="flex items-start gap-3">
                <BellOff className="text-danger flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="text-sm text-danger mb-2">
                    Las notificaciones están bloqueadas
                  </p>
                  <p className="text-xs text-danger">
                    Para activarlas, ve a la configuración de tu navegador y permite las notificaciones para este sitio
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
