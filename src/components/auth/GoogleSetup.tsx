import { useState } from 'react'
import { Alert, Button, FormField, Input } from '../oryon'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { AuthHeading, AuthLayout } from './AuthLayout'
import { authMessage, type AuthMessage } from './authErrors'
import { provisionAccount } from './provision'
import { BusinessTypePicker } from './BusinessTypePicker'
import { PENDING_BUSINESS_TYPE_KEY } from './Register'
import { isBusinessType, type BusinessTypeId } from '../../config/businessTypes'

function pendingBusinessType(): BusinessTypeId | null {
  try {
    const raw = window.localStorage.getItem(PENDING_BUSINESS_TYPE_KEY)
    return isBusinessType(raw) ? raw : null
  } catch {
    return null
  }
}

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
  const [businessType, setBusinessType] = useState<BusinessTypeId | null>(pendingBusinessType)
  const [companyName, setCompanyName] = useState('')
  const [name, setName] = useState(userName || '')
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [typeError, setTypeError] = useState<string | undefined>()
  const [alert, setAlert] = useState<AuthMessage | null>(null)
  const [loading, setLoading] = useState(false)

  const { isMobile } = useBreakpoint()
  const size = isMobile ? 'lg' : 'md'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const missingType = !businessType
    const missingName = !companyName.trim()
    setTypeError(missingType ? 'Elige el tipo de comercio.' : undefined)
    setFieldError(missingName ? 'Escribe el nombre del negocio.' : undefined)
    if (missingType || missingName) return

    setFieldError(undefined)
    setAlert(null)
    setLoading(true)
    try {
      const result = await provisionAccount(accessToken, {
        companyName: companyName.trim(),
        name: name.trim() || userEmail.split('@')[0],
        businessType: businessType ?? undefined,
      })
      if (!result.success) {
        setAlert({
          title: 'No se pudo crear el negocio',
          message: result.error ?? 'Vuelve a intentarlo en un momento.',
        })
        return
      }
      try {
        window.localStorage.removeItem(PENDING_BUSINESS_TYPE_KEY)
      } catch {
        /* nada que limpiar */
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
        <AuthHeading title="Faltan dos datos">Entraste con Google. Cuéntanos qué tipo de negocio tienes y cómo se llama.</AuthHeading>

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

        <BusinessTypePicker
          value={businessType}
          onChange={(v) => {
            setBusinessType(v)
            setTypeError(undefined)
          }}
          disabled={loading}
          error={typeError}
        />

        <FormField label="Nombre del negocio" error={fieldError}>
          <Input
            size={size}
            value={companyName}
            onChange={(e) => {
              setCompanyName(e.target.value)
              setFieldError(undefined)
            }}
            placeholder="Servitec Celulares"
            autoComplete="organization"
            disabled={loading}
          />
        </FormField>

        <Button type="submit" variant="primary" size={size} fullWidth loading={loading} disabled={loading}>
          {loading ? 'Creando cuenta' : 'Empezar'}
        </Button>
      </form>
    </AuthLayout>
  )
}
