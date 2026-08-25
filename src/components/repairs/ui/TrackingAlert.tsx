import { Info } from 'lucide-react'
import { Alert, AlertDescription } from '../../ui/alert'

export function TrackingAlert() {
  return (
    <Alert className="mb-4 bg-[var(--accent-subtle)] border-[var(--accent-subtle-border)]">
      <Info className="h-4 w-4 text-primary" />
      <AlertDescription className="text-primary">
        <strong>Seguimiento para clientes:</strong> Los clientes pueden rastrear sus reparaciones ingresando a{' '}
        <code className="bg-[var(--accent-subtle)] px-2 py-1 rounded text-sm">{window.location.origin}/tracking</code>{' '}
        con el código de su orden de servicio (el número que aparece en el documento impreso).
      </AlertDescription>
    </Alert>
  )
}
