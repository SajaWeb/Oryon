import { useState } from 'react'
import { projectId } from '../utils/supabase/info'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import { Wrench } from 'lucide-react'

interface GoogleSetupProps {
  accessToken: string
  userEmail: string
  userName: string
  onSetupComplete: (accessToken: string) => void
}

export function GoogleSetup({ accessToken, userEmail, userName, onSetupComplete }: GoogleSetupProps) {
  const [companyName, setCompanyName] = useState('')
  const [name, setName] = useState(userName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!companyName.trim()) {
      setError('Por favor ingresa el nombre de tu empresa')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/auth/google-setup`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name,
            companyName
          })
        }
      )

      const data = await response.json()

      if (!data.success) {
        setError(data.error || 'Error al configurar la cuenta')
        setLoading(false)
        return
      }

      // Setup complete, proceed to main app
      onSetupComplete(accessToken)
    } catch (err) {
      console.error('Setup error:', err)
      setError('Error al configurar la cuenta. Por favor intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <Wrench className="text-white" size={32} />
          </div>
          <CardTitle className="text-3xl">¡Bienvenido a Oryon App!</CardTitle>
          <CardDescription>
            Completa tu perfil para comenzar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="email">Email (desde Google)</Label>
              <Input
                id="email"
                type="email"
                value={userEmail}
                disabled
                className="bg-gray-50"
              />
            </div>
            
            <div>
              <Label htmlFor="name">Tu Nombre Completo</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Juan Pérez"
                required
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="companyName">Nombre de tu Empresa</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Mi Empresa de Reparaciones"
                required
                disabled={loading}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                🎉 Obtendrás 7 días de prueba gratis para explorar todas las funcionalidades
              </p>
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Configurando...' : 'Completar Configuración'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
