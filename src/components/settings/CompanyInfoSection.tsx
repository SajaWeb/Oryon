import { Alert, Badge, Card, KeyValue } from '../oryon'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { useBusiness } from '../../utils/BusinessContext'

interface Company {
  id: number
  name: string
  licenseExpiry: string
  createdAt: string
  identificationTypes?: string[]
}

interface CompanyInfoSectionProps {
  company: Company | null
  licenseInfo: any
}

const PLAN_LABELS: Record<string, string> = { basico: 'Básico', pyme: 'Pyme', enterprise: 'Enterprise' }

const shortDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

/** Ficha de la empresa: lo que identifica la cuenta, en una línea de datos. */
export function CompanyInfoSection({ company, licenseInfo }: CompanyInfoSectionProps) {
  const { isMobile } = useBreakpoint()
  const { profile } = useBusiness()
  if (!company) return null

  const plan = PLAN_LABELS[licenseInfo?.planId] ?? 'Básico'
  const expiry = licenseInfo?.licenseExpiry

  return (
    <Card
      title={company.name}
      subtitle={`Empresa #${company.id} · ${profile.label}`}
      actions={
        <Badge tone={licenseInfo?.inTrial ? 'warning' : 'accent'} dot>
          {licenseInfo?.inTrial ? `Prueba · ${plan}` : `Plan ${plan}`}
        </Badge>
      }
    >
      <KeyValue
        columns={isMobile ? 1 : 2}
        items={[
          { label: 'Cuenta creada', value: shortDate(company.createdAt), mono: true },
          {
            label: licenseInfo?.inTrial ? 'Prueba hasta' : 'Licencia hasta',
            value: shortDate(licenseInfo?.inTrial ? licenseInfo?.trialEndsAt : expiry),
            mono: true,
          },
        ]}
      />
      {licenseInfo?.trialExpired && (
        <Alert variant="danger" title="Tu período de prueba terminó" style={{ marginTop: 12 }}>
          Algunas funciones pueden estar limitadas hasta activar un plan.
        </Alert>
      )}
    </Card>
  )
}
