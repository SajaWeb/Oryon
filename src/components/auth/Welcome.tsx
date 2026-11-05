import { Button } from '../oryon'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { AuthHeading, AuthLayout } from './AuthLayout'
import { getBusinessProfile } from '../../config/businessTypes'

interface WelcomeProps {
  companyName?: string
  businessType?: string
  onEnter: () => void
}

export function Welcome({ companyName, businessType, onEnter }: WelcomeProps) {
  const { isMobile } = useBreakpoint()
  const profile = getBusinessProfile(businessType)

  /* Los tres primeros movimientos, en el orden en que tienen sentido: sin OT no
     hay nada que ver en el panel, y sin repuestos no se puede facturar. */
  const STEPS = [
    profile.id === 'electronica'
      ? 'Registrar la primera OT'
      : `Recibir ${profile.vocab.article === 'la' ? 'la primera' : 'el primer'} ${profile.vocab.asset}`,
    `Cargar inventario de ${profile.productCategories[0]?.label.toLowerCase() ?? 'repuestos'}`,
    `Invitar a tus ${profile.vocab.technician.toLowerCase()}s`,
  ]

  return (
    <AuthLayout variant="register">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <AuthHeading title="Cuenta creada">
          {companyName ? `${companyName}. Empieza por la primera OT.` : 'Empieza por la primera OT.'}
        </AuthHeading>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            border: 'var(--border-width) solid var(--border-default)',
            background: 'var(--bg-sunken)',
          }}
        >
          {STEPS.map((step, i) => (
            <div
              key={step}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderBottom:
                  i < STEPS.length - 1 ? 'var(--border-width) solid var(--border-subtle)' : undefined,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono-display)',
                  fontSize: 'var(--text-caption)',
                  color: i === 0 ? 'var(--accent-400)' : 'var(--text-tertiary)',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span
                style={{
                  flex: 1,
                  fontSize: 'var(--text-small)',
                  lineHeight: 1.4,
                  color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                {step}
              </span>
            </div>
          ))}
        </div>

        <Button variant="primary" size={isMobile ? 'lg' : 'md'} fullWidth onClick={onEnter}>
          Ir al panel
        </Button>
      </div>
    </AuthLayout>
  )
}
