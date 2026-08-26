import { useEffect, useState } from 'react'
import { Tabs, type TabItem } from './oryon'
import { PageBody } from './layout/PageBody'
import { Loading } from './oryon'
import { usePageHeader } from './layout/PageHeaderContext'
import { CompanyInfoSection } from './settings/CompanyInfoSection'
import { AppearanceSection } from './settings/AppearanceSection'
import { NotificationsSection } from './settings/NotificationsSection'
import { UsersSection } from './settings/UsersSection'
import { DocumentsSection } from './settings/DocumentsSection'
import { GeneralSection } from './settings/GeneralSection'
import { PWAInfo } from './PWAStatus'
import { BranchManager } from './BranchManager'
import { projectId } from '../utils/supabase/info'

interface User {
  userId: string
  email: string
  name: string
  role: string
  createdAt: string
  active?: boolean
  assignedBranches?: string[]
}

interface Branch {
  id: string
  companyId: number
  name: string
  address: string
  phone: string
  isMain: boolean
  createdAt: string
}

interface Company {
  id: number
  name: string
  licenseExpiry: string
  createdAt: string
  identificationTypes?: string[]
}

interface SettingsProps {
  accessToken: string
  userProfile: any
  licenseInfo?: any
}

const SETTINGS_TABS: TabItem[] = [
  { id: 'general', label: 'General' },
  { id: 'users', label: 'Usuarios' },
  { id: 'branches', label: 'Sucursales' },
  { id: 'documents', label: 'Documentos' },
  { id: 'system', label: 'Sistema' },
]

export function Settings({ accessToken, userProfile, licenseInfo }: SettingsProps) {
  const [tab, setTab] = useState('general')
  const [company, setCompany] = useState<Company | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [identificationTypes, setIdentificationTypes] = useState<string[]>([
    'Cédula de Ciudadanía',
    'NIT',
    'Pasaporte',
    'Cédula de Extranjería'
  ])
  const [loading, setLoading] = useState(true)
  /* Ver Reports: `loading` tapa la vista, y refrescar a mano no debe hacerlo. */
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchAllData()
  }, [])

  useEffect(() => {
    if (company?.identificationTypes && company.identificationTypes.length > 0) {
      setIdentificationTypes(company.identificationTypes)
    }
  }, [company])

  const refresh = async () => {
    setRefreshing(true)
    await fetchAllData()
    setRefreshing(false)
  }

  const fetchAllData = async () => {
    try {
      await Promise.all([
        fetchCompanyInfo(),
        fetchUsers(),
        fetchBranches()
      ])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCompanyInfo = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/company/info`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )
      const data = await response.json()
      if (data.success) {
        setCompany(data.company)
      }
    } catch (error) {
      console.error('Error fetching company info:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/company/users`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )
      const data = await response.json()
      if (data.success) {
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchBranches = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/branches`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )
      const data = await response.json()
      if (data.success) {
        setBranches(data.branches)
      }
    } catch (error) {
      console.error('Error fetching branches:', error)
    }
  }

  usePageHeader({
    title: 'Configuración',
    // El nombre de la empresa ya sale en la topbar; repetirlo aquí era ruido.
    subtitle: 'Empresa, usuarios y documentos',
    eyebrow: 'Cuenta',
    onRefresh: refresh,
    refreshing: refreshing || loading,
  })

  if (loading) {
    return (
      <PageBody>
        <Loading mode="screen" label="Cargando configuración" />
      </PageBody>
    )
  }

  return (
    <PageBody>
      <CompanyInfoSection company={company} licenseInfo={licenseInfo} />

      {/* Tabs del design system: hacen scroll horizontal en vez de envolverse.
          El TabsList de shadcn heredaba h-9 y, por debajo de lg, las cinco pestañas se
          envolvían en tres filas dentro de una caja de 36px, superponiéndose. */}
      <Tabs items={SETTINGS_TABS} value={tab} onChange={setTab} />

      {tab === 'general' && (
        <GeneralSection accessToken={accessToken} companyName={company?.name || ''} />
      )}

      {tab === 'users' && (
        <UsersSection
          accessToken={accessToken}
          userProfile={userProfile}
          users={users}
          branches={branches}
          onRefresh={fetchUsers}
        />
      )}

      {tab === 'branches' && (
        <BranchManager accessToken={accessToken} userProfile={userProfile} licenseInfo={licenseInfo} />
      )}

      {tab === 'documents' && (
        <DocumentsSection
          accessToken={accessToken}
          identificationTypes={identificationTypes}
          setIdentificationTypes={setIdentificationTypes}
        />
      )}

      {tab === 'system' && (
        <>
          <AppearanceSection />
          <NotificationsSection />
          <PWAInfo />
        </>
      )}
    </PageBody>
  )
}
