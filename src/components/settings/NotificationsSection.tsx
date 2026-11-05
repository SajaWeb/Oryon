import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { Alert, Button, Card } from '../oryon'
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  showNotification,
} from '../../utils/notifications'

/** Notificaciones del navegador en este dispositivo. */
export function NotificationsSection() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    if (isNotificationSupported()) setPermission(getNotificationPermission())
  }, [])

  const enable = async () => {
    const next = await requestNotificationPermission()
    setPermission(next)
    if (next === 'granted') {
      await showNotification({
        title: 'Notificaciones activadas',
        body: 'Te avisaremos de cambios en las órdenes, stock bajo y novedades importantes.',
        tag: 'welcome-notification',
      })
    }
  }

  const test = async () => {
    setTesting(true)
    await showNotification({
      title: 'Notificación de prueba',
      body: 'Si ves esto, las notificaciones de Oryon funcionan en este dispositivo.',
      tag: 'test-notification',
    })
    window.setTimeout(() => setTesting(false), 2000)
  }

  if (!isNotificationSupported()) return null

  return (
    <Card title="Notificaciones" subtitle="Avisos del navegador sobre órdenes, stock bajo y más">
      {permission === 'default' && (
        <Alert variant="info" title="Las notificaciones están apagadas">
          <span style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
            Actívalas para enterarte a tiempo aunque no tengas Oryon abierto.
            <Button size="sm" variant="primary" iconLeft={Bell} onClick={enable}>
              Activar notificaciones
            </Button>
          </span>
        </Alert>
      )}
      {permission === 'granted' && (
        <Alert variant="success" title="Notificaciones activadas">
          <span style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
            Recibirás los avisos en este dispositivo.
            <Button size="sm" variant="secondary" onClick={test} loading={testing} disabled={testing}>
              {testing ? 'Enviando' : 'Enviar una de prueba'}
            </Button>
          </span>
        </Alert>
      )}
      {permission === 'denied' && (
        <Alert variant="danger" title="Las notificaciones están bloqueadas">
          Para activarlas, permite las notificaciones para este sitio en la configuración del navegador.
        </Alert>
      )}
    </Card>
  )
}
