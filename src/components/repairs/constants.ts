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
export const deviceTypes = [
  { value: 'celular', label: 'Celular' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'laptop', label: 'Laptop' },
  { value: 'computador', label: 'Computador' },
  { value: 'otro', label: 'Otro' }
]

export const defaultIdentificationTypes = [
  'Cédula de Ciudadanía',
  'NIT',
  'Pasaporte',
  'Cédula de Extranjería'
]
