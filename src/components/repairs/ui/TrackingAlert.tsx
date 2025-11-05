import { Info } from 'lucide-react'
import { Alert, AlertDescription } from '../../ui/alert'

export function TrackingAlert() {
  return (
    <Alert className="mb-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertDescription className="text-blue-800 dark:text-blue-300">
        <strong>Seguimiento para clientes:</strong> Los clientes pueden rastrear sus reparaciones ingresando a{' '}
        <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-sm">{window.location.origin}/tracking</code>{' '}
        con el código de su orden de servicio (el número que aparece en el documento impreso).
      </AlertDescription>
    </Alert>
  )
}
