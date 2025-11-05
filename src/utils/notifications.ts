// Notification utilities for Oryon App

export interface NotificationOptions {
  title: string
  body: string
  icon?: string
  tag?: string
  requireInteraction?: boolean
  url?: string
  data?: any
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

// Check if notifications are supported
export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator
}

// Check notification permission status
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) {
    return 'denied'
  }
  return Notification.permission
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    console.warn('Notifications are not supported in this browser')
    return 'denied'
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  if (Notification.permission === 'denied') {
    return 'denied'
  }

  try {
    const permission = await Notification.requestPermission()
    return permission
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return 'denied'
  }
}

// Show a local notification (doesn't require service worker)
export function showLocalNotification(options: NotificationOptions): void {
  if (!isNotificationSupported()) {
    console.warn('Notifications are not supported')
    return
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted')
    return
  }

  const notification = new Notification(options.title, {
    body: options.body,
    icon: options.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: options.tag || 'oryon-notification',
    requireInteraction: options.requireInteraction || false,
    data: options.data || {}
  })

  // Handle notification click
  notification.onclick = (event) => {
    event.preventDefault()
    window.focus()
    if (options.url) {
      window.location.href = options.url
    }
    notification.close()
  }
}

// Show notification through service worker (better for PWA)
export async function showNotification(options: NotificationOptions): Promise<void> {
  if (!isNotificationSupported()) {
    console.warn('Notifications are not supported')
    return
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted')
    return
  }

  try {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(options.title, {
      body: options.body,
      icon: options.icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: options.tag || 'oryon-notification',
      requireInteraction: options.requireInteraction || false,
      data: {
        url: options.url || '/',
        ...options.data
      },
      actions: options.actions || [],
      vibrate: [200, 100, 200]
    })
  } catch (error) {
    console.error('Error showing notification:', error)
    // Fallback to local notification
    showLocalNotification(options)
  }
}

// Utility to send notifications for specific repair status changes
export async function notifyRepairStatusChange(
  repairId: string,
  customerName: string,
  status: string,
  deviceType: string
): Promise<void> {
  const statusMessages: Record<string, string> = {
    diagnosing: 'está siendo diagnosticado',
    repairing: 'está en reparación',
    completed: 'ha sido completado',
    delivered: 'ha sido entregado',
    waiting_parts: 'está esperando repuestos'
  }

  const message = statusMessages[status] || 'ha cambiado de estado'

  await showNotification({
    title: '🔔 Estado de Reparación Actualizado',
    body: `El ${deviceType} de ${customerName} ${message}`,
    tag: `repair-${repairId}`,
    url: `/#/repairs`,
    data: {
      type: 'repair-status',
      repairId,
      status
    }
  })
}

// Utility for low stock notifications
export async function notifyLowStock(
  productName: string,
  quantity: number
): Promise<void> {
  await showNotification({
    title: '⚠️ Stock Bajo',
    body: `${productName} tiene solo ${quantity} unidades en stock`,
    tag: 'low-stock',
    url: '/#/products',
    requireInteraction: true,
    data: {
      type: 'low-stock',
      productName,
      quantity
    }
  })
}

// Utility for new sale notifications
export async function notifySale(
  total: number,
  customerName: string
): Promise<void> {
  await showNotification({
    title: '💰 Nueva Venta',
    body: `Venta de $${total.toLocaleString('es-CO')} a ${customerName}`,
    tag: 'new-sale',
    url: '/#/sales',
    data: {
      type: 'sale',
      total,
      customerName
    }
  })
}
