import { Info, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription } from '../../ui/alert'
import { Button } from '../../ui/button'
import { ServerStatus } from '../../ServerStatus'

interface ErrorStateProps {
  error: string
  accessToken: string | null
}

export function ErrorState({ error, accessToken }: ErrorStateProps) {
  return (
    <div className="p-8 space-y-4">
      <ServerStatus accessToken={accessToken} />
      
      <Alert variant="destructive">
        <Info className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button 
            size="sm"
            variant="outline"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Recargar página
          </Button>
        </AlertDescription>
      </Alert>

      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h3 className="font-medium mb-3">Posibles soluciones:</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>• Verifica que el Edge Function esté desplegado en Supabase</li>
          <li>• Revisa tu conexión a internet</li>
          <li>• Asegúrate de que las credenciales de Supabase sean correctas</li>
          <li>• Revisa los logs en Supabase → Edge Functions → Logs</li>
        </ul>
      </div>
    </div>
  )
}
