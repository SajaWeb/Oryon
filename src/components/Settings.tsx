import { useEffect, useState } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
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

export function Settings({ accessToken, userProfile, licenseInfo }: SettingsProps) {
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

  useEffect(() => {
    fetchAllData()
  }, [])

  useEffect(() => {
    if (company?.identificationTypes && company.identificationTypes.length > 0) {
      setIdentificationTypes(company.identificationTypes)
    }
  }, [company])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon className="text-blue-600" size={32} />
          <h2 className="text-2xl sm:text-3xl">Configuración</h2>
        </div>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Gestiona todas las configuraciones de tu empresa
        </p>
      </div>

      {/* Company Info Header */}
      <div className="mb-6">
        <CompanyInfoSection company={company} licenseInfo={licenseInfo} />
      </div>

      {/* Tabs for organized settings */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="branches">Sucursales</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <GeneralSection 
            accessToken={accessToken}
            companyName={company?.name || ''}
          />
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <UsersSection
            accessToken={accessToken}
            userProfile={userProfile}
            users={users}
            branches={branches}
            onRefresh={fetchUsers}
          />
        </TabsContent>

        {/* Branches Tab */}
        <TabsContent value="branches" className="space-y-6">
          <BranchManager 
            accessToken={accessToken} 
            userProfile={userProfile}
            licenseInfo={licenseInfo}
          />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <DocumentsSection
            accessToken={accessToken}
            identificationTypes={identificationTypes}
            setIdentificationTypes={setIdentificationTypes}
          />
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          <AppearanceSection />
          <NotificationsSection />
          <PWAInfo />
        </TabsContent>
      </Tabs>
    </div>
  )
}
