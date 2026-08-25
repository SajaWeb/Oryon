import { Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Alert, AlertDescription } from '../ui/alert'

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

export function CompanyInfoSection({ company, licenseInfo }: CompanyInfoSectionProps) {
  if (!company) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Building2 className="text-primary" size={24} />
            <div>
              <CardTitle>{company.name}</CardTitle>
              <p className="text-sm text-ink-secondary">ID: {company.id}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-start sm:items-end">
            <Badge className="bg-primary text-on-accent px-4 py-2">
              Plan {licenseInfo?.planId || 'Básico'}
            </Badge>
            {licenseInfo?.inTrial && licenseInfo?.trialEndsAt && (
              <span className="text-xs text-ink-secondary">
                Prueba gratis hasta {new Date(licenseInfo.trialEndsAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-ink-secondary">Creada el</p>
            <p className="text-ink">
              {new Date(company.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-ink-secondary">Plan actual</p>
            <p className="text-ink capitalize">
              {licenseInfo?.planId || 'Básico'}
            </p>
          </div>
        </div>
        
        {licenseInfo?.trialExpired && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>
              Tu período de prueba ha expirado. Algunas funcionalidades pueden estar limitadas.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
