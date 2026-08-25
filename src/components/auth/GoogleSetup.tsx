import { useState } from 'react'
import { Alert, Button, FormField, Input } from '../oryon'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { AuthHeading, AuthLayout } from './AuthLayout'
import { authMessage, type AuthMessage } from './authErrors'
import { provisionAccount } from './provision'

interface GoogleSetupProps {
  accessToken: string
  userEmail: string
  userName: string
  onSetupComplete: (accessToken: string) => void
}

/**
 * Paso que faltaba tras entrar con Google: Google da correo y nombre, pero no el
 * nombre del taller, y sin taller no hay a qué empresa pertenecer.
 *
 * Antes esta pantalla existía pero era inalcanzable —nadie ponía `needsGoogleSetup`
 * en true—, así que el usuario nuevo terminaba con un perfil sintético apuntando a
 * `companyId: 1`, es decir, dentro de la empresa de otro.
 */
export function GoogleSetup({ accessToken, userEmail, userName, onSetupComplete }: GoogleSetupProps) {
  const [companyName, setCompanyName] = useState('')
  const [name, setName] = useState(userName || '')
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [alert, setAlert] = useState<AuthMessage | null>(null)
  const [loading, setLoading] = useState(false)

  const { isMobile } = useBreakpoint()
  const size = isMobile ? 'lg' : 'md'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyName.trim()) {
      setFieldError('Escribe el nombre del taller.')
      return
    }

    setFieldError(undefined)
    setAlert(null)
    setLoading(true)
    try {
      const result = await provisionAccount(accessToken, {
        companyName: companyName.trim(),
        name: name.trim() || userEmail.split('@')[0],
      })
      if (!result.success) {
        setAlert({
          title: 'No se pudo crear el taller',
          message: result.error ?? 'Vuelve a intentarlo en un momento.',
        })
        return
      }
      onSetupComplete(accessToken)
    } catch (err) {
      setAlert(authMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout variant="register">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <AuthHeading title="Falta un dato">Entraste con Google. Nos falta saber cómo se llama el taller.</AuthHeading>

        {alert && (
          <Alert role="alert" variant="danger" title={alert.title} onDismiss={() => setAlert(null)}>
            {alert.message}
          </Alert>
        )}

        <FormField label="Correo">
          <Input size={size} value={userEmail} disabled readOnly />
        </FormField>

        <FormField label="Tu nombre completo">
          <Input
            size={size}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Andrés Chavarría"
            autoComplete="name"
            disabled={loading}
          />
        </FormField>

        <FormField label="Nombre de la empresa" error={fieldError}>
          <Input
            size={size}
            value={companyName}
            onChange={(e) => {
              setCompanyName(e.target.value)
              setFieldError(undefined)
            }}
            placeholder="Servitec Celulares"
            autoComplete="organization"
            autoFocus
            disabled={loading}
          />
        </FormField>

        <Button type="submit" variant="primary" size={size} fullWidth loading={loading} disabled={loading}>
          {loading ? 'Creando taller' : 'Crear taller'}
        </Button>
      </form>
    </AuthLayout>
  )
}
