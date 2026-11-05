export const statusLabels: Record<string, string> = {
  received: 'Recibido',
  diagnosing: 'En Diagnóstico',
  waiting_parts: 'Esperando Repuestos',
  repairing: 'En Reparación',
  completed: 'Completado',
  delivered: 'Entregado',
  cancelled: 'Cancelado'
}

// El color de cada estado vive en el design system (StatusBadge / OT_STATES):
// tener aquí un mapa paralelo de clases era justo lo que el sistema prohíbe.
// Los tipos de bien (celular, moto, automóvil…) dependen del comercio: viven en
// config/businessTypes.ts (`assetTypes`).

export const defaultIdentificationTypes = [
  'Cédula de Ciudadanía',
  'NIT',
  'Pasaporte',
  'Cédula de Extranjería'
]
