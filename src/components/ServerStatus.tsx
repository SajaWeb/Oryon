import { useState, useEffect } from 'react'
import { projectId } from '../utils/supabase/info'
import { Alert, AlertDescription } from './ui/alert'
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'
import { Button } from './ui/button'

interface ServerStatusProps {
  accessToken: string | null
}

export function ServerStatus({ accessToken }: ServerStatusProps) {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [checking, setChecking] = useState(false)

  const checkServerHealth = async () => {
    setChecking(true)
    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/health`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setStatus('online')
        } else {
          setStatus('offline')
        }
      } else {
        setStatus('offline')
      }
    } catch (error) {
      console.error('Server health check failed:', error)
      setStatus('offline')
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    checkServerHealth()
    // Check every 30 seconds
    const interval = setInterval(checkServerHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  if (status === 'checking') {
    return (
      <Alert className="bg-blue-50 border-blue-200">
        <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
        <AlertDescription className="text-blue-800">
          Verificando conexión con el servidor...
        </AlertDescription>
      </Alert>
    )
  }

  if (status === 'offline') {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            No se puede conectar al servidor backend. Por favor verifica que el Edge Function esté desplegado en Supabase.
          </span>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={checkServerHealth}
            disabled={checking}
            className="ml-4"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${checking ? 'animate-spin' : ''}`} />
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="bg-green-50 border-green-200">
      <CheckCircle2 className="h-4 w-4 text-green-600" />
      <AlertDescription className="text-green-800">
        Conectado al servidor correctamente
      </AlertDescription>
    </Alert>
  )
}
