export const statusLabels: Record<string, string> = {
  received: 'Recibido',
  diagnosing: 'En Diagnóstico',
  waiting_parts: 'Esperando Repuestos',
  repairing: 'En Reparación',
  completed: 'Completado',
  delivered: 'Entregado',
  cancelled: 'Cancelado'
}

export const statusColors: Record<string, string> = {
  received: 'bg-blue-100 text-blue-800',
  diagnosing: 'bg-yellow-100 text-yellow-800',
  waiting_parts: 'bg-orange-100 text-orange-800',
  repairing: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  delivered: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800'
}

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
