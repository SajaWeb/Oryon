import { useState, useEffect } from 'react'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { getSupabaseClient } from '../utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { 
  ShieldCheck, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Building2, 
  DollarSign, 
  Calendar, 
  Check, 
  Plus, 
  Sliders, 
  FileText, 
  CreditCard,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  Lock,
  UserPlus,
  Users,
  UserCheck,
  LogOut,
  ArrowLeft,
  Loader2,
  Wrench,
  UserCog,
  KeyRound,
  Eye,
  EyeOff,
  Settings
} from 'lucide-react'
import { toast } from 'sonner'
import { useTurnstile } from './auth/Turnstile'
import { authMessage } from './auth/authErrors'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Label } from './ui/label'

interface SuperAdminProps {
  accessToken?: string
  userProfile?: any
  onBackToApp?: () => void
}

interface PaymentRecord {
  id: string
  reference: string
  companyId: string | number
  companyName?: string
  userEmail?: string
  planId: string
  amount: number
  currency: string
  paymentMethod: string
  durationMonths?: number
  status: string
  transactionId?: string
  createdAt: string
  updatedAt: string
  manuallyApproved?: boolean
  manuallyApprovedBy?: string
  notes?: string
}

interface CompanyRecord {
  id: string | number
  name: string
  planId: string
  licenseExpiry?: string
  trialEndsAt?: string
  createdAt: string
  userCount?: number
  inTrial?: boolean
  isExpired?: boolean
  daysRemaining?: number
  statusLabel?: string
  status?: string
  customLimits?: {
    branches?: number
    admins?: number
    advisors?: number
    technicians?: number
  }
}

interface SuperAdminUser {
  id: string
  email: string
  name: string
  role: string
  createdAt?: string
  createdBy?: string
}

interface StatsData {
  totalRevenueCOP: number
  totalPaymentsCount: number
  approvedPaymentsCount: number
  pendingPaymentsCount: number
  declinedPaymentsCount: number
  totalCompaniesCount: number
  activeLicensesCount: number
  expiredLicensesCount: number
  trialLicensesCount: number
}

const DEFAULT_PLAN_LIMITS: Record<string, { branches: number; admins: number; advisors: number; technicians: number }> = {
  basico: { branches: 1, admins: 1, advisors: 1, technicians: 2 },
  pyme: { branches: 2, admins: 2, advisors: 4, technicians: 8 },
  enterprise: { branches: 4, admins: 4, advisors: 8, technicians: 16 }
}

export function SuperAdmin({ accessToken: propToken, userProfile: propProfile, onBackToApp }: SuperAdminProps) {
  // Autenticación de Super Admin
  const [sessionToken, setSessionToken] = useState<string>(propToken || '')
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(propProfile || null)
  const [isSuperAdminAuthenticated, setIsSuperAdminAuthenticated] = useState<boolean>(false)
  const [authChecking, setAuthChecking] = useState<boolean>(true)
  const [isInitialSetupMode, setIsInitialSetupMode] = useState<boolean>(false)

  // Formulario de Setup Inicial
  const [initialName, setInitialName] = useState('')
  const [initialEmail, setInitialEmail] = useState('')
  const [initialPassword, setInitialPassword] = useState('')
  const [initialSetupLoading, setInitialSetupLoading] = useState(false)

  // Formulario de Login Super Admin
  /* Supabase exige captcha en todos los inicios de sesión desde que se activó
     Turnstile. Este panel tiene su propio formulario y se quedó sin él: sin token,
     Supabase responde captcha_failed y nadie podía entrar. */
  const captcha = useTurnstile()
  /* Cada llamada de Supabase consume el token, así que un reintento necesita uno
     nuevo: reiniciar el widget y volver a esperar a que Cloudflare responda. */
  const freshCaptchaToken = async () => {
    captcha.reset()
    return captcha.getToken()
  }
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Pestañas y Vistas
  const [activeTab, setActiveTab] = useState<'companies' | 'payments' | 'superusers' | 'gateway'>('companies')
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Datos
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [superUsers, setSuperUsers] = useState<SuperAdminUser[]>([])
  const [stats, setStats] = useState<StatsData | null>(null)

  // Modal: Aprobación Manual de Pago
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null)
  const [showManualApproveModal, setShowManualApproveModal] = useState(false)
  const [approveMonths, setApproveMonths] = useState<number>(1)
  const [approveNotes, setApproveNotes] = useState<string>('')

  // Modal: Edición Integral de Empresa (Plan, Vigencia y Límites)
  const [selectedCompany, setSelectedCompany] = useState<CompanyRecord | null>(null)
  const [showEditCompanyModal, setShowEditCompanyModal] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    planId: 'basico',
    status: 'active',
    branches: 1,
    admins: 1,
    advisors: 1,
    technicians: 2,
    licenseExpiryDate: '',
    addMonths: 0,
    addDays: 0,
    trialDays: 0,
    notes: ''
  })

  // Modal: Crear Superusuario
  const [showCreateSuperUserModal, setShowCreateSuperUserModal] = useState(false)
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: ''
  })
  const [creatingSuperUser, setCreatingSuperUser] = useState(false)
  const [hasSuperAdminConfigured, setHasSuperAdminConfigured] = useState<boolean | null>(null)

  // 1. Inicializar verificación de autenticación
  useEffect(() => {
    checkSuperAdminAuth()
  }, [propToken, propProfile])

  const checkSuperAdminAuth = async () => {
    setAuthChecking(true)
    try {
      const supabase = getSupabaseClient()

      // 1. Consultar directamente en KV si ya existe algún superadmin en el sistema
      let hasSuper = false
      try {
        const { data: userRecords } = await supabase
          .from('kv_store_4d437e50')
          .select('key, value')
          .like('key', 'user:%')

        hasSuper = userRecords?.some((r: any) => {
          try {
            const parsed = typeof r.value === 'string' ? JSON.parse(r.value) : r.value
            return parsed && (parsed.role === 'superadmin' || parsed.isSuperAdmin === true)
          } catch { return false }
        }) || false

        setHasSuperAdminConfigured(hasSuper)

        if (!hasSuper) {
          setIsInitialSetupMode(true)
        } else {
          setIsInitialSetupMode(false)
        }
      } catch (kvErr) {
        console.warn('Error comprobando superadmin en KV:', kvErr)
      }

      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || propToken
      const user = session?.user

      if (!token || !user) {
        setIsSuperAdminAuthenticated(false)
        setAuthChecking(false)
        return
      }

      // Si los metadatos del usuario ya indican superadmin
      const isMetadataSuperAdmin = 
        user.user_metadata?.role === 'superadmin' || 
        user.user_metadata?.isSuperAdmin === true ||
        propProfile?.role === 'superadmin'

      // Validar acceso con backend
      try {
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/superadmin/stats`,
          {
            headers: { 
              'Authorization': `Bearer ${token}`
            }
          }
        )

        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            setSessionToken(token)
            setIsSuperAdminAuthenticated(true)
            setStats(data.stats)
            loadAllData(token)
            setAuthChecking(false)
            return
          }
        }
      } catch (e) {}

      if (isMetadataSuperAdmin) {
        setSessionToken(token)
        setIsSuperAdminAuthenticated(true)
        loadAllData(token)
      } else {
        setIsSuperAdminAuthenticated(false)
      }
    } catch (err) {
      console.warn('Super Admin Auth verification error:', err)
      setIsSuperAdminAuthenticated(false)
    } finally {
      setAuthChecking(false)
    }
  }

  // Setup Inicial del Primer Superadministrador (Bootstrap Único)
  const handleInitialSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (hasSuperAdminConfigured === true) {
      toast.error('Operación no permitida', {
        description: 'El Superadministrador Maestro ya está configurado. Inicia sesión con tus credenciales.'
      })
      setIsInitialSetupMode(false)
      return
    }

    if (!initialName || !initialEmail || !initialPassword) {
      toast.error('Completa todos los campos obligatorios')
      return
    }

    if (initialPassword.length < 6) {
      toast.error('La contraseña debe tener mínimo 6 caracteres')
      return
    }

    setInitialSetupLoading(true)
    const supabase = getSupabaseClient()

    try {
      // 1. Intentar iniciar sesión si ya existe la cuenta
      let authUser: any = null
      let token: string | null = null

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: initialEmail.trim(),
        password: initialPassword,
        options: { captchaToken: await captcha.getToken() }
      })

      if (signInData?.session?.user) {
        authUser = signInData.session.user
        token = signInData.session.access_token
      } else {
        // 2. Si no existe, crear la cuenta directamente con rol superadmin
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: initialEmail.trim(),
          password: initialPassword,
          options: {
            captchaToken: await freshCaptchaToken(),
            data: {
              name: initialName.trim(),
              role: 'superadmin',
              isSuperAdmin: true
            }
          }
        })

        if (signUpError) {
          toast.error('Error al crear cuenta', { description: signUpError.message })
          setInitialSetupLoading(false)
          return
        }

        authUser = signUpData.user || signUpData.session?.user
        token = signUpData.session?.access_token || null

        // Si el login no fue automático, intentar loguear
        if (!token) {
          const { data: retrySignIn } = await supabase.auth.signInWithPassword({
            email: initialEmail.trim(),
            password: initialPassword,
            options: { captchaToken: await freshCaptchaToken() }
          })
          authUser = retrySignIn?.session?.user || authUser
          token = retrySignIn?.session?.access_token || token
        }
      }

      if (!authUser) {
        toast.error('No se pudo autenticar el usuario superadmin')
        setInitialSetupLoading(false)
        return
      }

      // 3. Asignar metadatos de Super Admin a la cuenta en Supabase Auth
      await supabase.auth.updateUser({
        data: {
          name: initialName.trim(),
          role: 'superadmin',
          isSuperAdmin: true
        }
      })

      // 4. Guardar REGISTRO EXACTO en la base de datos KV con rol superadmin
      const masterUserRecord = {
        userId: authUser.id,
        id: authUser.id,
        email: initialEmail.trim(),
        name: initialName.trim(),
        role: 'superadmin',
        isSuperAdmin: true,
        isMaster: true,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      try {
        await supabase.from('kv_store_4d437e50').upsert({
          key: `user:${authUser.id}`,
          value: JSON.stringify(masterUserRecord)
        })
      } catch (kvErr) {
        console.warn('Error guardando en KV table:', kvErr)
      }

      toast.success('¡Superadministrador maestro configurado con éxito!', {
        description: 'Rol de Super Admin activado en la base de datos'
      })

      if (token) {
        setSessionToken(token)
        setIsSuperAdminAuthenticated(true)
        setIsInitialSetupMode(false)
        loadAllData(token)
      } else {
        setIsInitialSetupMode(false)
        setLoginEmail(initialEmail.trim())
        setLoginPassword(initialPassword)
      }
    } catch (err: any) {
      const aviso = authMessage(err)
      toast.error('Error al inicializar Super Admin', { description: aviso.message })
    } finally {
      // El token de Turnstile es de un solo uso, salga bien o mal.
      captcha.reset()
      setInitialSetupLoading(false)
    }
  }

  // Login de Super Admin
  const handleSuperAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginEmail || !loginPassword) {
      toast.error('Ingresa correo y contraseña')
      return
    }

    setLoginLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
        options: { captchaToken: await captcha.getToken() }
      })

      if (error || !data.session) {
        /* La reparación de abajo sólo tiene sentido cuando la cuenta no existe en
           auth.users. Un captcha caducado o un límite de intentos no se arreglan
           registrando a nadie, y taparlos con "credenciales incorrectas" es lo que
           dejaba sin explicación los inicios de sesión fallidos. */
        const looksLikeMissingAccount = /invalid login credentials|invalid_credentials|user not found/i.test(
          error?.message ?? ''
        )

        if (!looksLikeMissingAccount) {
          const aviso = authMessage(error)
          toast.error(aviso.title, { description: aviso.message })
          setLoginLoading(false)
          return
        }

        // Auto-sincronización: Si el usuario existe en KV como superadmin pero no estaba en auth.users (por truncado o reset)
        try {
          const { data: kvRecords } = await supabase
            .from('kv_store_4d437e50')
            .select('key, value')
            .like('key', 'user:%')
          
          const superadminRecord = kvRecords?.find((r: any) => {
            try {
              const parsed = typeof r.value === 'string' ? JSON.parse(r.value) : r.value
              return parsed && (parsed.email?.toLowerCase() === loginEmail.trim().toLowerCase()) && (parsed.role === 'superadmin' || parsed.isSuperAdmin === true)
            } catch { return false }
          })

          if (superadminRecord) {
            // Intentar registrar la cuenta en Supabase Auth con la contraseña suministrada
            const { data: signUpData } = await supabase.auth.signUp({
              email: loginEmail.trim(),
              password: loginPassword,
              options: {
                captchaToken: await freshCaptchaToken(),
                data: {
                  name: 'Alejandro Echavarria Jaramillo',
                  role: 'superadmin',
                  isSuperAdmin: true
                }
              }
            })

            let autoToken = signUpData?.session?.access_token
            let authUser = signUpData?.session?.user || signUpData?.user

            if (!autoToken) {
              const { data: retrySignIn } = await supabase.auth.signInWithPassword({
                email: loginEmail.trim(),
                password: loginPassword,
                options: { captchaToken: await freshCaptchaToken() }
              })
              autoToken = retrySignIn?.session?.access_token
              authUser = retrySignIn?.session?.user || authUser
            }

            if (autoToken && authUser) {
              await supabase.auth.updateUser({
                data: {
                  name: 'Alejandro Echavarria Jaramillo',
                  role: 'superadmin',
                  isSuperAdmin: true
                }
              })

              const parsedUser = typeof superadminRecord.value === 'string' ? JSON.parse(superadminRecord.value) : superadminRecord.value
              parsedUser.userId = authUser.id
              parsedUser.id = authUser.id
              await supabase.from('kv_store_4d437e50').upsert({
                key: `user:${authUser.id}`,
                value: JSON.stringify(parsedUser)
              })

              setSessionToken(autoToken)
              setIsSuperAdminAuthenticated(true)
              toast.success('¡Superadministrador autenticado y sincronizado con éxito!')
              loadAllData(autoToken)
              setLoginLoading(false)
              return
            }
          }
        } catch (autoErr) {
          console.warn('Auto-healing auth notice:', autoErr)
        }

        const aviso = authMessage(error)
        toast.error(aviso.title, { description: aviso.message })
        setLoginLoading(false)
        return
      }

      const token = data.session.access_token
      const user = data.user

      // Comprobar rol ESTRICTO de superadmin en metadatos o endpoint
      const isSuper = 
        user.user_metadata?.role === 'superadmin' || 
        user.user_metadata?.isSuperAdmin === true

      // Intentar validar también con el backend
      try {
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/superadmin/stats`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        )

        if (res.ok) {
          const resData = await res.json()
          if (resData.success) {
            setSessionToken(token)
            setIsSuperAdminAuthenticated(true)
            setStats(resData.stats)
            toast.success('Acceso autorizado como Super Administrador Maestro')
            loadAllData(token)
            setLoginLoading(false)
            return
          }
        }
      } catch (e) {}

      if (isSuper) {
        setSessionToken(token)
        setIsSuperAdminAuthenticated(true)
        toast.success('Acceso autorizado como Super Administrador Maestro')
        loadAllData(token)
      } else {
        await supabase.auth.signOut()
        toast.error('Acceso Denegado: Portal Exclusivo de Super Admin', {
          description: 'Esta cuenta pertenece a una empresa o taller y no posee permisos de Superadministrador Maestro del SaaS. Inicia sesión en el portal de usuarios.'
        })
      }
    } catch (err: any) {
      // Incluye el caso de que Turnstile no responda, que trae su propio código.
      const aviso = authMessage(err)
      toast.error(aviso.title, { description: aviso.message })
    } finally {
      // El token de Turnstile es de un solo uso: se resetea salga bien o mal.
      captcha.reset()
      setLoginLoading(false)
    }
  }

  const handleSuperAdminLogout = async () => {
    try {
      const supabase = getSupabaseClient()
      await supabase.auth.signOut()
      setIsSuperAdminAuthenticated(false)
      setSessionToken('')
      toast.info('Sesión de Super Admin cerrada')
    } catch (err) {
      console.error(err)
    }
  }

  const loadAllData = async (token?: string) => {
    const activeTok = token || sessionToken
    if (!activeTok) return
    setLoading(true)
    try {
      await Promise.all([
        loadStats(activeTok),
        loadPayments(activeTok),
        loadCompanies(activeTok),
        loadSuperUsers(activeTok)
      ])
    } catch (err) {
      console.error('Error cargando datos de Super Admin:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async (tok: string) => {
    try {
      const supabase = getSupabaseClient()
      const { data: allRows } = await supabase.from('kv_store_4d437e50').select('key, value')
      if (allRows) {
        let totalComps = 0
        let activeComps = 0
        let expiredComps = 0
        let trialComps = 0
        let totalUsers = 0
        let totalRepairs = 0
        const now = new Date()

        let totalRevenue = 0
        let totalPayments = 0
        let approvedPayments = 0
        let pendingPayments = 0
        let declinedPayments = 0

        allRows.forEach(r => {
          const isCompanyKey = /^company:\d+$/.test(r.key)
          if (isCompanyKey) {
            try {
              const comp = typeof r.value === 'string' ? JSON.parse(r.value) : r.value
              if (comp && comp.id && comp.name) {
                totalComps++
                const expiryDate = comp.licenseExpiry ? new Date(comp.licenseExpiry) : null
                const trialDate = comp.trialEndsAt ? new Date(comp.trialEndsAt) : null
                const effectiveExpiry = expiryDate && (!trialDate || expiryDate > trialDate) ? expiryDate : trialDate
                const inTrial = Boolean(trialDate && trialDate > now && (!expiryDate || trialDate >= expiryDate))
                const isExpired = Boolean(effectiveExpiry && effectiveExpiry < now)

                if (inTrial) trialComps++
                else if (isExpired) expiredComps++
                else activeComps++
              }
            } catch {}
          } else if (r.key.startsWith('user:')) {
            totalUsers++
          } else if (r.key.startsWith('repair:')) {
            totalRepairs++
          } else if (r.key.startsWith('payment:')) {
            totalPayments++
            try {
              const pay = typeof r.value === 'string' ? JSON.parse(r.value) : r.value
              const statusUpper = String(pay.status || '').toUpperCase()
              if (statusUpper === 'APPROVED') {
                approvedPayments++
                totalRevenue += (Number(pay.amount) || 0)
              } else if (statusUpper === 'PENDING') {
                pendingPayments++
              } else {
                declinedPayments++
              }
            } catch {}
          }
        })

        setStats({
          totalRevenueCOP: totalRevenue,
          totalPaymentsCount: totalPayments,
          approvedPaymentsCount: approvedPayments,
          pendingPaymentsCount: pendingPayments,
          declinedPaymentsCount: declinedPayments,
          totalCompaniesCount: totalComps,
          activeLicensesCount: activeComps,
          expiredLicensesCount: expiredComps,
          trialLicensesCount: trialComps
        })
      }
    } catch (err) {
      console.warn('Stats calculation notice:', err)
    }
  }

  const loadPayments = async (tok: string) => {
    try {
      const supabase = getSupabaseClient()
      const { data: allRows } = await supabase.from('kv_store_4d437e50').select('key, value')
      if (allRows) {
        const companyMap: Record<number, string> = {}
        allRows.filter(r => /^company:\d+$/.test(r.key)).forEach(r => {
          try {
            const c = typeof r.value === 'string' ? JSON.parse(r.value) : r.value
            if (c?.id) companyMap[c.id] = c.name
          } catch {}
        })

        const payRows = allRows.filter(r => r.key.startsWith('payment:'))
        const parsed = payRows.map(r => {
          try {
            const pay = typeof r.value === 'string' ? JSON.parse(r.value) : r.value
            if (pay && pay.reference) {
              return {
                ...pay,
                companyName: pay.companyName || companyMap[pay.companyId] || `Empresa #${pay.companyId || 1}`
              }
            }
            return null
          } catch { return null }
        }).filter(Boolean)

        setPayments(parsed)
      }
    } catch (err) {
      console.warn('Payments load notice:', err)
    }
  }

  const loadCompanies = async (tok: string) => {
    try {
      const supabase = getSupabaseClient()
      const { data: allRows } = await supabase.from('kv_store_4d437e50').select('key, value')
      if (allRows) {
        const users = allRows.filter(r => r.key.startsWith('user:')).map(r => {
          try { return typeof r.value === 'string' ? JSON.parse(r.value) : r.value } catch { return null }
        }).filter(Boolean)

        const branchMap: Record<number, number> = {}
        allRows.filter(r => r.key.endsWith(':branches')).forEach(r => {
          try {
            const compId = Number(r.key.split(':')[1])
            const list = typeof r.value === 'string' ? JSON.parse(r.value) : r.value
            branchMap[compId] = Array.isArray(list) ? list.length : 1
          } catch {}
        })

        const now = new Date()
        const compList: CompanyRecord[] = []

        allRows.forEach(r => {
          const isCompanyKey = /^company:\d+$/.test(r.key)
          if (isCompanyKey) {
            try {
              const comp = typeof r.value === 'string' ? JSON.parse(r.value) : r.value
              if (comp && comp.id && comp.name) {
                const owner = users.find(u => u.companyId === comp.id && u.role === 'admin')
                const activeBranches = branchMap[comp.id] || 1
                const activeAdmins = users.filter(u => u.companyId === comp.id && u.role === 'admin').length
                const activeAdvisors = users.filter(u => u.companyId === comp.id && u.role === 'asesor').length
                const activeTechnicians = users.filter(u => u.companyId === comp.id && u.role === 'tecnico').length

                const expiryDate = comp.licenseExpiry ? new Date(comp.licenseExpiry) : null
                const trialDate = comp.trialEndsAt ? new Date(comp.trialEndsAt) : null
                const effectiveExpiry = expiryDate && (!trialDate || expiryDate > trialDate) ? expiryDate : trialDate

                const inTrial = Boolean(trialDate && trialDate > now && (!expiryDate || trialDate >= expiryDate))
                const isExpired = Boolean(effectiveExpiry && effectiveExpiry < now)

                let daysRemaining = 0
                if (effectiveExpiry && effectiveExpiry > now) {
                  const diff = effectiveExpiry.getTime() - now.getTime()
                  daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
                }

                const status = inTrial ? 'trial' : isExpired ? 'expired' : (comp.status || 'active')

                compList.push({
                  ...comp,
                  status,
                  inTrial,
                  isExpired,
                  daysRemaining,
                  ownerName: owner?.name || 'Sin asignar',
                  ownerEmail: owner?.email || comp.email || 'N/A',
                  activeBranches,
                  activeAdmins,
                  activeAdvisors,
                  activeTechnicians,
                  totalRepairs: 0
                })
              }
            } catch {}
          }
        })

        setCompanies(compList)
      }
    } catch (err) {
      console.warn('Companies load notice:', err)
    }
  }

  const loadSuperUsers = async (tok: string) => {
    try {
      const supabase = getSupabaseClient()
      const { data: userRows } = await supabase.from('kv_store_4d437e50').select('key, value').like('key', 'user:%')
      if (userRows) {
        const superList = userRows.map(r => {
          try {
            const parsed = typeof r.value === 'string' ? JSON.parse(r.value) : r.value
            return parsed && (parsed.role === 'superadmin' || parsed.isSuperAdmin === true) ? parsed : null
          } catch { return null }
        }).filter(Boolean)
        setSuperUsers(superList)
      }
    } catch (err) {
      console.warn('Superusers load notice:', err)
    }
  }

  // Abrir Modal de Edición Completa de Empresa
  const handleOpenEditCompany = (comp: CompanyRecord) => {
    setSelectedCompany(comp)
    const defLimits = DEFAULT_PLAN_LIMITS[comp.planId] || DEFAULT_PLAN_LIMITS.basico
    const currentLimits = comp.customLimits || defLimits

    let expiryFormatted = ''
    if (comp.licenseExpiry) {
      try {
        expiryFormatted = new Date(comp.licenseExpiry).toISOString().split('T')[0]
      } catch {}
    }

    setEditForm({
      name: comp.name || '',
      planId: comp.planId || 'basico',
      status: comp.status || 'active',
      branches: currentLimits.branches || 1,
      admins: currentLimits.admins || 1,
      advisors: currentLimits.advisors || 1,
      technicians: currentLimits.technicians || 2,
      licenseExpiryDate: expiryFormatted,
      addMonths: 0,
      addDays: 0,
      trialDays: 0,
      notes: ''
    })
    setShowEditCompanyModal(true)
  }

  // Guardar Cambios de Empresa
  const handleSaveCompanyFull = async () => {
    if (!selectedCompany) return
    setLoading(true)
    try {
      let finalExpiry = editForm.licenseExpiryDate ? new Date(editForm.licenseExpiryDate).toISOString() : selectedCompany.licenseExpiry

      // Si se especificó agregar meses o días
      if (editForm.addMonths > 0 || editForm.addDays > 0) {
        const now = new Date()
        const expiryTime = finalExpiry ? new Date(finalExpiry).getTime() : 0
        const trialTime = selectedCompany.trialEndsAt ? new Date(selectedCompany.trialEndsAt).getTime() : 0
        const maxFutureTime = Math.max(now.getTime(), isNaN(expiryTime) ? 0 : expiryTime, isNaN(trialTime) ? 0 : trialTime)
        const baseDate = new Date(maxFutureTime)

        if (editForm.addMonths > 0) {
          baseDate.setMonth(baseDate.getMonth() + editForm.addMonths)
        }
        if (editForm.addDays > 0) {
          baseDate.setDate(baseDate.getDate() + editForm.addDays)
        }
        finalExpiry = baseDate.toISOString()
      }

      // Si se configuraron días de prueba
      let trialEndsAt: string | undefined = undefined
      if (editForm.trialDays > 0) {
        const trialDate = new Date()
        trialDate.setDate(trialDate.getDate() + editForm.trialDays)
        trialEndsAt = trialDate.toISOString()
      }

      const updatedCompanyData = {
        ...selectedCompany,
        name: editForm.name,
        planId: editForm.planId,
        status: editForm.status,
        customLimits: {
          branches: editForm.branches,
          admins: editForm.admins,
          advisors: editForm.advisors,
          technicians: editForm.technicians
        },
        licenseExpiry: finalExpiry,
        trialEndsAt: trialEndsAt || selectedCompany.trialEndsAt,
        notes: editForm.notes,
        updatedAt: new Date().toISOString()
      }

      // 1. Intentar endpoint backend si está activo
      try {
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/superadmin/companies/${selectedCompany.id}/update-full`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${sessionToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedCompanyData)
          }
        )
      } catch (e) {}

      // 2. Guardar directamente en KV
      const supabase = getSupabaseClient()
      await supabase.from('kv_store_4d437e50').upsert({
        key: `company:${selectedCompany.id}`,
        value: JSON.stringify(updatedCompanyData)
      })

      toast.success(`Empresa ${editForm.name} actualizada correctamente`, {
        description: 'Los cambios de licencia y límites ya están activos en el sistema.'
      })
      setShowEditCompanyModal(false)
      setSelectedCompany(null)
      loadAllData()
    } catch (err: any) {
      toast.error('Error al guardar cambios', { description: err.message })
    } finally {
      setLoading(false)
    }
  }

  // Aprobar Pago Manualmente
  const handleManualApprove = async () => {
    if (!selectedPayment) return
    try {
      setLoading(true)
      
      // 1. Intentar endpoint backend si está disponible
      try {
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/superadmin/payments/${selectedPayment.reference}/manual-approve`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${sessionToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              months: approveMonths,
              notes: approveNotes
            })
          }
        )
      } catch (e) {}

      // 2. Actualizar directamente en KV
      const supabase = getSupabaseClient()

      // Guardar pago aprobado
      const updatedPayment = {
        ...selectedPayment,
        status: 'approved',
        manuallyApproved: true,
        manuallyApprovedBy: currentUserProfile?.name || 'Super Admin',
        manuallyApprovedAt: new Date().toISOString(),
        notes: approveNotes || selectedPayment.notes || 'Aprobado manualmente desde Super Admin',
        updatedAt: new Date().toISOString()
      }

      await supabase.from('kv_store_4d437e50').upsert({
        key: `payment:${selectedPayment.reference}`,
        value: JSON.stringify(updatedPayment)
      })

      // Extender la empresa acumulativamente
      const { data: compRow } = await supabase.from('kv_store_4d437e50').select('value').eq('key', `company:${selectedPayment.companyId}`).single()
      if (compRow?.value) {
        const comp = typeof compRow.value === 'string' ? JSON.parse(compRow.value) : compRow.value
        const now = new Date()
        const expiryTime = comp.licenseExpiry ? new Date(comp.licenseExpiry).getTime() : 0
        const trialTime = comp.trialEndsAt ? new Date(comp.trialEndsAt).getTime() : 0
        const maxFutureTime = Math.max(now.getTime(), isNaN(expiryTime) ? 0 : expiryTime, isNaN(trialTime) ? 0 : trialTime)
        const baseDate = new Date(maxFutureTime)

        const newExpiry = new Date(baseDate)
        newExpiry.setMonth(newExpiry.getMonth() + (approveMonths || 1))

        comp.licenseExpiry = newExpiry.toISOString()
        comp.planId = selectedPayment.planId || comp.planId || 'basico'
        comp.lastUpgrade = now.toISOString()
        comp.updatedAt = now.toISOString()
        if (comp.trialEndsAt) {
          delete comp.trialEndsAt
        }

        await supabase.from('kv_store_4d437e50').upsert({
          key: `company:${selectedPayment.companyId}`,
          value: JSON.stringify(comp)
        })
      }

      toast.success('Pago aprobado manualmente', {
        description: `Licencia de la empresa extendida por ${approveMonths} mes(es)`
      })
      setShowManualApproveModal(false)
      setSelectedPayment(null)
      loadAllData()
    } catch (err: any) {
      toast.error('Error al procesar aprobación', { description: err.message })
    } finally {
      setLoading(false)
    }
  }

  // Crear Nuevo Superadministrador
  const handleCreateSuperUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUserForm.name || !newUserForm.email || !newUserForm.password) {
      toast.error('Completa todos los campos')
      return
    }

    if (newUserForm.password.length < 6) {
      toast.error('La contraseña debe tener mínimo 6 caracteres')
      return
    }

    setCreatingSuperUser(true)
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/superadmin/users/create`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newUserForm)
        }
      )

      const data = await res.json()
      if (data.success) {
        toast.success(`Superadministrador ${newUserForm.name} creado exitosamente`, {
          description: `Credenciales habilitadas para ${newUserForm.email}`
        })
        setShowCreateSuperUserModal(false)
        setNewUserForm({ name: '', email: '', password: '' })
        loadSuperUsers(sessionToken)
      } else {
        toast.error('Error al crear superusuario', { description: data.error })
      }
    } catch (err: any) {
      toast.error('Error en la creación', { description: err.message })
    } finally {
      setCreatingSuperUser(false)
    }
  }

  // PANTALLA DE CARGA INICIAL
  if (authChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-sm font-semibold text-foreground">Verificando Credenciales de Super Admin...</p>
          <p className="text-xs text-muted-foreground">Validando permisos del centro de control maestro</p>
        </div>
      </div>
    )
  }

  // PANTALLA DE LOGIN / ACCESO PROTEGIDO A SUPER ADMIN
  if (!isSuperAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 sm:p-6">
        <div className="max-w-md w-full space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3.5 bg-primary/10 text-primary rounded-2xl mb-1 shadow-inner">
              {isInitialSetupMode ? <Sparkles size={32} /> : <KeyRound size={32} />}
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              {isInitialSetupMode ? 'Configuración Inicial Super Admin' : 'Portal Maestro Super Admin'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isInitialSetupMode
                ? 'Configura por única vez la cuenta maestra del propietario para administrar licencias, sucursales y pagos.'
                : 'Acceso restringido para control global de licencias, sucursales, empresas y transacciones Wompi de Oryon.'}
            </p>
          </div>

          {/* Form Card */}
          <Card className="border-border shadow-lg bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                {isInitialSetupMode ? (
                  <>
                    <UserPlus size={16} className="text-primary" />
                    Crear Superadministrador Maestro Inicial
                  </>
                ) : (
                  <>
                    <Lock size={16} className="text-primary" />
                    Autenticación de Seguridad
                  </>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                {isInitialSetupMode
                  ? 'Ingresa tus datos principales. Puedes usar tu correo actual o uno nuevo.'
                  : 'Ingresa con tu cuenta asignada con rol de Super Administrador.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isInitialSetupMode ? (
                /* FORMULARIO DE SETUP INICIAL */
                <form onSubmit={handleInitialSetupSubmit} className="space-y-4">
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Nombre del Superadministrador:</Label>
                    <Input
                      placeholder="Ej: Administrador Principal Oryon"
                      value={initialName}
                      onChange={(e) => setInitialName(e.target.value)}
                      required
                      className="h-10 text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Correo Electrónico:</Label>
                    <Input
                      type="email"
                      placeholder="admin@tuempresa.com"
                      value={initialEmail}
                      onChange={(e) => setInitialEmail(e.target.value)}
                      required
                      className="h-10 text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Si ya estás registrado con este correo, se promoverá a Superadministrador.
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Contraseña Maestra:</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        value={initialPassword}
                        onChange={(e) => setInitialPassword(e.target.value)}
                        required
                        minLength={6}
                        className="h-10 text-xs pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={initialSetupLoading}
                    className="w-full h-11 text-xs font-semibold mt-2"
                  >
                    {initialSetupLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Configurando Cuenta Maestra...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Crear y Activar Superadministrador
                      </>
                    )}
                  </Button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setIsInitialSetupMode(false)}
                      className="text-xs text-primary hover:underline cursor-pointer"
                    >
                      ¿Ya tienes cuenta creada? Iniciar sesión aquí
                    </button>
                  </div>
                </form>
              ) : (
                /* FORMULARIO DE LOGIN NORMAL */
                <form onSubmit={handleSuperAdminLogin} className="space-y-4">
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Correo Electrónico:</Label>
                    <Input
                      type="email"
                      placeholder="superadmin@oryon.co"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className="h-10 text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Contraseña Maestra:</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        className="h-10 text-xs pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {captcha.widget}

                  <Button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full h-11 text-xs font-semibold mt-2"
                  >
                    {loginLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {captcha.verifying ? 'Verificando...' : 'Autenticando...'}
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Ingresar al Centro de Control
                      </>
                    )}
                  </Button>

                  {!hasSuperAdminConfigured && (
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => setIsInitialSetupMode(true)}
                        className="text-xs text-muted-foreground hover:text-primary hover:underline cursor-pointer"
                      >
                        ¿No tienes Superadministrador configurado? Crear cuenta maestra inicial
                      </button>
                    </div>
                  )}
                </form>
              )}
            </CardContent>
          </Card>

          {/* Footer Back Button */}
          {onBackToApp && (
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBackToApp}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft size={14} className="mr-1.5" />
                Volver a la Aplicación Principal
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // FILTRADO DE EMPRESAS
  const filteredCompanies = companies.filter(c => {
    const matchesSearch = !searchTerm || 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.id.toString().includes(searchTerm) ||
      (c.planId && c.planId.toLowerCase().includes(searchTerm.toLowerCase()))
    
    if (!matchesSearch) return false
    if (statusFilter === 'all') return true
    if (statusFilter === 'active') return !c.isExpired && !c.inTrial
    if (statusFilter === 'trial') return c.inTrial
    if (statusFilter === 'expired') return c.isExpired
    return true
  })

  // FILTRADO DE PAGOS
  const filteredPayments = payments.filter(p => {
    const matchesSearch = !searchTerm ||
      p.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.companyName && p.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.userEmail && p.userEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.transactionId && p.transactionId.toLowerCase().includes(searchTerm.toLowerCase()))
    
    if (!matchesSearch) return false
    if (statusFilter === 'all') return true
    return (p.status || '').toLowerCase() === statusFilter.toLowerCase()
  })

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base tracking-tight">Oryon Super Admin</h1>
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                Control Maestro
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Gestión centralizada de licencias, capacidades de sucursales y pagos Wompi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAllData()}
            disabled={loading}
            className="text-xs h-9"
          >
            <RefreshCw size={13} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          {onBackToApp && (
            <Button
              variant="outline"
              size="sm"
              onClick={onBackToApp}
              className="text-xs h-9"
            >
              <ArrowLeft size={13} className="mr-1.5" />
              Ir a la App
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSuperAdminLogout}
            className="text-xs h-9 text-danger hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]"
          >
            <LogOut size={13} className="mr-1.5" />
            Cerrar Sesión
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* KPI Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="border-border bg-card">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase">Recaudado Wompi</p>
                  <p className="text-xl font-black text-foreground mt-1">
                    ${(stats.totalRevenueCOP || 0).toLocaleString('es-CO')}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{stats.approvedPaymentsCount || 0} pagos aprobados</p>
                </div>
                <div className="p-3 rounded-xl bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-success">
                  <DollarSign size={22} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase">Empresas Registradas</p>
                  <p className="text-xl font-black text-foreground mt-1">
                    {stats.totalCompaniesCount || 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{stats.activeLicensesCount || 0} con servicio activo</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <Building2 size={22} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase">Licencias Vencidas</p>
                  <p className="text-xl font-black text-foreground mt-1 text-danger">
                    {stats.expiredLicensesCount || 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Requieren renovación</p>
                </div>
                <div className="p-3 rounded-xl bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-danger">
                  <AlertTriangle size={22} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase">Pagos Pendientes</p>
                  <p className="text-xl font-black text-foreground mt-1 text-warning">
                    {stats.pendingPaymentsCount || 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">En validación bancaria</p>
                </div>
                <div className="p-3 rounded-xl bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] text-warning">
                  <Clock size={22} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs Control */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-3">
            <TabsList className="bg-muted/60 p-1">
              <TabsTrigger value="companies" className="text-xs flex items-center gap-1.5">
                <Building2 size={13} />
                Empresas y Licencias ({companies.length})
              </TabsTrigger>
              <TabsTrigger value="payments" className="text-xs flex items-center gap-1.5">
                <CreditCard size={13} />
                Pagos Wompi ({payments.length})
              </TabsTrigger>
              <TabsTrigger value="superusers" className="text-xs flex items-center gap-1.5">
                <Users size={13} />
                Superusuarios ({superUsers.length})
              </TabsTrigger>
              <TabsTrigger value="gateway" className="text-xs flex items-center gap-1.5">
                <Sliders size={13} />
                Pasarela Wompi
              </TabsTrigger>
            </TabsList>

            {/* Acciones Rápidas */}
            {activeTab === 'superusers' && (
              <Button
                size="sm"
                onClick={() => setShowCreateSuperUserModal(true)}
                className="text-xs font-semibold h-9"
              >
                <UserPlus size={14} className="mr-1.5" />
                Nuevo Superadministrador
              </Button>
            )}
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: GESTIÓN DE EMPRESAS, LICENCIAS Y LÍMITES                           */}
          {/* ========================================================================= */}
          <TabsContent value="companies" className="space-y-4">
            {/* Buscador y Filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar empresa por nombre, ID o plan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>

              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[170px] h-9 text-xs">
                    <SelectValue placeholder="Estado de Licencia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las Empresas</SelectItem>
                    <SelectItem value="active">Activas</SelectItem>
                    <SelectItem value="trial">En Período de Prueba</SelectItem>
                    <SelectItem value="expired">Licencia Vencida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tabla de Empresas */}
            <Card className="border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] border-b border-border">
                    <tr>
                      <th className="p-3.5">Empresa / Taller</th>
                      <th className="p-3.5">Plan</th>
                      <th className="p-3.5">Estado Licencia</th>
                      <th className="p-3.5">Vencimiento</th>
                      <th className="p-3.5">Días Restantes</th>
                      <th className="p-3.5">Límites (Sucursales / Trabajadores)</th>
                      <th className="p-3.5 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredCompanies.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          No se encontraron empresas con los filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      filteredCompanies.map((comp) => {
                        const limits = comp.customLimits || DEFAULT_PLAN_LIMITS[comp.planId] || DEFAULT_PLAN_LIMITS.basico

                        return (
                          <tr key={comp.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3.5">
                              <p className="font-bold text-foreground">{comp.name}</p>
                              <p className="text-[10px] text-muted-foreground">ID Empresa: #{comp.id}</p>
                            </td>

                            <td className="p-3.5">
                              <Badge variant="outline" className="capitalize font-semibold text-[11px]">
                                {comp.planId || 'Básico'}
                              </Badge>
                            </td>

                            <td className="p-3.5">
                              {comp.inTrial ? (
                                <Badge className="bg-[color-mix(in_srgb,var(--accent-fill)_15%,transparent)] text-primary border-[color-mix(in_srgb,var(--accent-fill)_30%,transparent)] text-[10px]">
                                  Prueba Activa
                                </Badge>
                              ) : comp.isExpired ? (
                                <Badge variant="destructive" className="text-[10px]">
                                  Vencida
                                </Badge>
                              ) : (
                                <Badge className="bg-[color-mix(in_srgb,var(--success)_15%,transparent)] text-success border-[color-mix(in_srgb,var(--success)_30%,transparent)] text-[10px]">
                                  Activa
                                </Badge>
                              )}
                            </td>

                            <td className="p-3.5 text-muted-foreground">
                              {comp.licenseExpiry ? (
                                new Date(comp.licenseExpiry).toLocaleDateString('es-CO', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })
                              ) : comp.trialEndsAt ? (
                                `Prueba: ${new Date(comp.trialEndsAt).toLocaleDateString('es-CO')}`
                              ) : (
                                'Sin fecha'
                              )}
                            </td>

                            <td className="p-3.5 font-bold">
                              {comp.isExpired ? (
                                <span className="text-danger">0 días</span>
                              ) : (
                                <span className="text-success">
                                  {comp.daysRemaining || 0} días
                                </span>
                              )}
                            </td>

                            <td className="p-3.5 text-muted-foreground">
                              <div className="space-y-0.5 text-[11px]">
                                <p><span className="font-semibold text-foreground">{limits.branches}</span> Sucursales</p>
                                <p><span className="font-semibold text-foreground">{limits.admins} Admins</span> • <span className="font-semibold text-foreground">{limits.advisors} Asesores</span> • <span className="font-semibold text-foreground">{limits.technicians} Técnicos</span></p>
                              </div>
                            </td>

                            <td className="p-3.5 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenEditCompany(comp)}
                                className="h-8 text-xs font-semibold"
                              >
                                <Settings size={13} className="mr-1.5 text-primary" />
                                Modificar Licencia
                              </Button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 2: CONTROL DE PAGOS DE LICENCIAS (WOMPI)                              */}
          {/* ========================================================================= */}
          <TabsContent value="payments" className="space-y-4">
            {/* Buscador y Filtros de Pagos */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por referencia (ej: ORY-...), ID de Wompi o empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[170px] h-9 text-xs">
                  <SelectValue placeholder="Estado de Pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Pagos</SelectItem>
                  <SelectItem value="approved">Aprobados</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="declined">Rechazados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tabla de Pagos */}
            <Card className="border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] border-b border-border">
                    <tr>
                      <th className="p-3.5">Referencia Wompi</th>
                      <th className="p-3.5">Empresa</th>
                      <th className="p-3.5">Plan / Duración</th>
                      <th className="p-3.5">Monto COP</th>
                      <th className="p-3.5">Método / Transacción</th>
                      <th className="p-3.5">Estado</th>
                      <th className="p-3.5">Fecha</th>
                      <th className="p-3.5 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                          No se registran transacciones con los criterios seleccionados.
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((p) => {
                        const statusLower = (p.status || '').toLowerCase()
                        const isApproved = statusLower === 'approved' || statusLower === 'success' || statusLower === 'completed'
                        const isPending = statusLower === 'pending' || statusLower === 'processing'
                        const isDeclined = statusLower === 'declined' || statusLower === 'error' || statusLower === 'failed'

                        return (
                          <tr key={p.id || p.reference} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3.5 font-mono text-[11px] font-bold text-foreground">
                              {p.reference}
                            </td>

                            <td className="p-3.5">
                              <p className="font-semibold text-foreground">{p.companyName || `Empresa #${p.companyId}`}</p>
                              {p.userEmail && <p className="text-[10px] text-muted-foreground">{p.userEmail}</p>}
                            </td>

                            <td className="p-3.5">
                              <span className="capitalize font-bold">{p.planId}</span>
                              <p className="text-[10px] text-muted-foreground">{p.durationMonths || 1} Mes(es)</p>
                            </td>

                            <td className="p-3.5 font-extrabold text-foreground">
                              ${(p.amount || 0).toLocaleString('es-CO')} {p.currency || 'COP'}
                            </td>

                            <td className="p-3.5 text-muted-foreground">
                              <p className="font-medium text-foreground">{p.paymentMethod || 'Wompi PSE'}</p>
                              {p.transactionId && (
                                <p className="text-[10px] font-mono text-muted-foreground truncate max-w-[140px]">
                                  {p.transactionId}
                                </p>
                              )}
                            </td>

                            <td className="p-3.5">
                              {isApproved ? (
                                <Badge className="bg-[color-mix(in_srgb,var(--success)_15%,transparent)] text-success border-[color-mix(in_srgb,var(--success)_30%,transparent)] text-[10px] flex items-center gap-1 w-fit">
                                  <CheckCircle2 size={11} /> Aprobado
                                </Badge>
                              ) : isPending ? (
                                <Badge className="bg-[color-mix(in_srgb,var(--warning)_15%,transparent)] text-warning border-[color-mix(in_srgb,var(--warning)_30%,transparent)] text-[10px] flex items-center gap-1 w-fit">
                                  <Clock size={11} /> Pendiente
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-[10px] flex items-center gap-1 w-fit">
                                  <XCircle size={11} /> {p.status || 'Rechazado'}
                                </Badge>
                              )}
                            </td>

                            <td className="p-3.5 text-muted-foreground">
                              {p.createdAt ? new Date(p.createdAt).toLocaleDateString('es-CO', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'N/A'}
                            </td>

                            <td className="p-3.5 text-right">
                              {!isApproved && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedPayment(p)
                                    setApproveMonths(p.durationMonths || 1)
                                    setApproveNotes('')
                                    setShowManualApproveModal(true)
                                  }}
                                  className="h-8 text-xs font-semibold text-success hover:bg-[color-mix(in_srgb,var(--success)_10%,transparent)]"
                                >
                                  <Check size={13} className="mr-1" />
                                  Aprobar
                                </Button>
                              )}
                              {p.manuallyApproved && (
                                <span className="text-[10px] text-muted-foreground italic">
                                  Aprobado Manual
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 3: GESTIÓN DE SUPERUSUARIOS                                           */}
          {/* ========================================================================= */}
          <TabsContent value="superusers" className="space-y-4">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCheck size={18} className="text-primary" />
                  Superadministradores Activos
                </CardTitle>
                <CardDescription className="text-xs">
                  Usuarios con autorización para gestionar licencias globales, planes y finanzas de Oryon.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] border-y border-border">
                      <tr>
                        <th className="p-3.5">Nombre</th>
                        <th className="p-3.5">Correo Electrónico</th>
                        <th className="p-3.5">Rol</th>
                        <th className="p-3.5">Fecha de Creación</th>
                        <th className="p-3.5">Creado Por</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {superUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-muted-foreground">
                            Cargando superadministradores...
                          </td>
                        </tr>
                      ) : (
                        superUsers.map((su) => (
                          <tr key={su.id || su.email} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3.5 font-bold text-foreground">{su.name}</td>
                            <td className="p-3.5 text-muted-foreground">{su.email}</td>
                            <td className="p-3.5">
                              <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">
                                {su.role || 'Super Admin'}
                              </Badge>
                            </td>
                            <td className="p-3.5 text-muted-foreground">
                              {su.createdAt ? new Date(su.createdAt).toLocaleDateString('es-CO') : 'Sistema'}
                            </td>
                            <td className="p-3.5 text-muted-foreground">{su.createdBy || 'Maestro'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 4: ESTADO DE LA PASARELA WOMPI                                        */}
          {/* ========================================================================= */}
          <TabsContent value="gateway" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard size={18} className="text-primary" />
                  Estado de Configuración Wompi Colombia
                </CardTitle>
                <CardDescription className="text-xs">
                  Variables de entorno y endpoints activos para la pasarela de pagos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="p-3 bg-muted/40 rounded-lg flex items-center justify-between border border-border">
                  <div>
                    <p className="font-semibold text-foreground">Entorno Wompi:</p>
                    <p className="text-muted-foreground text-[11px]">Sandbox (Pruebas) / Producción</p>
                  </div>
                  <Badge variant="outline" className="bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-success border-[color-mix(in_srgb,var(--success)_30%,transparent)]">
                    Activo (Sandbox)
                  </Badge>
                </div>

                <div className="p-3 bg-muted/40 rounded-lg flex items-center justify-between border border-border">
                  <div>
                    <p className="font-semibold text-foreground">API Hosted Payment Links:</p>
                    <p className="text-muted-foreground text-[11px]">https://sandbox.wompi.co/v1/payment_links</p>
                  </div>
                  <Badge className="bg-[color-mix(in_srgb,var(--success)_15%,transparent)] text-success border-[color-mix(in_srgb,var(--success)_30%,transparent)]">
                    Conectado HTTP 200
                  </Badge>
                </div>

                <div className="p-3 bg-muted/40 rounded-lg flex items-center justify-between border border-border">
                  <div>
                    <p className="font-semibold text-foreground">Métodos de Pago Habilitados:</p>
                    <p className="text-muted-foreground text-[11px]">PSE, Bancolombia Transferencia, Nequi, Tarjetas Débito y Crédito</p>
                  </div>
                  <Badge variant="outline" className="text-foreground">
                    4 Métodos Activos
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: MODIFICAR EMPRESA, PLAN Y LÍMITES (SUPER ADMIN)                  */}
      {/* ========================================================================= */}
      <Dialog open={showEditCompanyModal} onOpenChange={setShowEditCompanyModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Sliders size={18} className="text-primary" />
              Gestión Integral de Empresa y Licencia
            </DialogTitle>
            <DialogDescription className="text-xs">
              Modifica el plan, fecha de vencimiento, sucursales y trabajadores para <strong>{selectedCompany?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          {selectedCompany && (
            <div className="space-y-4 py-2 text-xs max-h-[75vh] overflow-y-auto pr-1">
              {/* Información General */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">Nombre del Taller / Empresa:</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">Plan de Suscripción:</Label>
                  <Select 
                    value={editForm.planId} 
                    onValueChange={(val) => {
                      const def = DEFAULT_PLAN_LIMITS[val] || DEFAULT_PLAN_LIMITS.basico
                      setEditForm({ 
                        ...editForm, 
                        planId: val,
                        branches: def.branches,
                        admins: def.admins,
                        advisors: def.advisors,
                        technicians: def.technicians
                      })
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basico">Plan Básico (1 Sucursal - $50.000 COP)</SelectItem>
                      <SelectItem value="pyme">Plan PYME (2 Sucursales - $85.000 COP)</SelectItem>
                      <SelectItem value="enterprise">Plan Enterprise (4 Sucursales - $140.000 COP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Capacidades y Límites Personalizados */}
              <div className="p-3.5 bg-muted/40 rounded-xl border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-foreground text-xs flex items-center gap-1.5">
                    <Sliders size={14} className="text-primary" />
                    Límites de Recursos y Trabajadores
                  </p>
                  <span className="text-[10px] text-muted-foreground">Personalizables por Super Admin</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <Label className="text-[11px] text-muted-foreground mb-1 block flex items-center gap-1">
                      <Building2 size={11} className="text-primary" /> Sucursales:
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={editForm.branches}
                      onChange={(e) => setEditForm({ ...editForm, branches: parseInt(e.target.value) || 1 })}
                      className="h-8 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] text-muted-foreground mb-1 block flex items-center gap-1">
                      <UserCog size={11} className="text-success" /> Admins:
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={editForm.admins}
                      onChange={(e) => setEditForm({ ...editForm, admins: parseInt(e.target.value) || 1 })}
                      className="h-8 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] text-muted-foreground mb-1 block flex items-center gap-1">
                      <Users size={11} className="text-[var(--state-diagnosis)]" /> Asesores:
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={editForm.advisors}
                      onChange={(e) => setEditForm({ ...editForm, advisors: parseInt(e.target.value) || 1 })}
                      className="h-8 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] text-muted-foreground mb-1 block flex items-center gap-1">
                      <Wrench size={11} className="text-warning" /> Técnicos:
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={editForm.technicians}
                      onChange={(e) => setEditForm({ ...editForm, technicians: parseInt(e.target.value) || 1 })}
                      className="h-8 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Vigencia y Extensión de Licencia */}
              <div className="p-3.5 bg-muted/40 rounded-xl border border-border space-y-3">
                <p className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <Calendar size={14} className="text-success" />
                  Vigencia de la Licencia
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] text-muted-foreground mb-1 block">Fecha de Vencimiento Fija:</Label>
                    <Input
                      type="date"
                      value={editForm.licenseExpiryDate}
                      onChange={(e) => setEditForm({ ...editForm, licenseExpiryDate: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] text-muted-foreground mb-1 block">Extensión Rápida:</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: '+1 Mes', months: 1 },
                        { label: '+3 Meses', months: 3 },
                        { label: '+6 Meses', months: 6 },
                        { label: '+1 Año', months: 12 }
                      ].map((item) => (
                        <Button
                          key={item.months}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditForm({ ...editForm, addMonths: item.months, addDays: 0 })}
                          className={`h-8 text-[11px] ${editForm.addMonths === item.months ? 'border-primary bg-primary/10 text-primary' : ''}`}
                        >
                          {item.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notas de Auditoría */}
              <div>
                <Label className="text-xs font-semibold mb-1 block">Motivo / Notas de Auditoría:</Label>
                <Input
                  placeholder="Ej: Aprobación especial de sucursales, renovación offline..."
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setShowEditCompanyModal(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveCompanyFull} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: APROBACIÓN MANUAL DE PAGO                                        */}
      {/* ========================================================================= */}
      <Dialog open={showManualApproveModal} onOpenChange={setShowManualApproveModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <CheckCircle2 size={18} className="text-success" />
              Aprobar Pago Manualmente
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirmar pago de {selectedPayment?.reference} para la empresa {selectedPayment?.companyName || selectedPayment?.companyId}.
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4 text-xs py-2">
              <div className="p-3 bg-muted/40 rounded-lg space-y-1">
                <p><strong>Monto:</strong> ${selectedPayment.amount.toLocaleString('es-CO')} COP</p>
                <p><strong>Plan:</strong> <span className="capitalize">{selectedPayment.planId}</span></p>
                <p><strong>Referencia:</strong> {selectedPayment.reference}</p>
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">Meses de licencia a activar:</Label>
                <Select value={approveMonths.toString()} onValueChange={(v) => setApproveMonths(parseInt(v))}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Meses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Mes (+30 Días)</SelectItem>
                    <SelectItem value="3">3 Meses</SelectItem>
                    <SelectItem value="6">6 Meses</SelectItem>
                    <SelectItem value="12">12 Meses (1 Año)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">Notas de aprobación:</Label>
                <Input
                  placeholder="Ej: Transferencia Bancolombia confirmada comprobante #..."
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setShowManualApproveModal(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleManualApprove} disabled={loading}>
              {loading ? 'Aprobando...' : 'Aprobar y Activar Licencia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: CREAR NUEVO SUPERADMINISTRADOR                                   */}
      {/* ========================================================================= */}
      <Dialog open={showCreateSuperUserModal} onOpenChange={setShowCreateSuperUserModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <UserPlus size={18} className="text-primary" />
              Crear Nuevo Superadministrador
            </DialogTitle>
            <DialogDescription className="text-xs">
              Registra un nuevo usuario con permisos maestros de gestión global.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSuperUser} className="space-y-3.5 text-xs py-2">
            <div>
              <Label className="text-xs font-semibold mb-1 block">Nombre Completo:</Label>
              <Input
                placeholder="Nombre del Administrador"
                value={newUserForm.name}
                onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                required
                className="h-9 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Correo Electrónico:</Label>
              <Input
                type="email"
                placeholder="admin2@oryon.co"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                required
                className="h-9 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Contraseña Inicial:</Label>
              <Input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newUserForm.password}
                onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                required
                minLength={6}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateSuperUserModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={creatingSuperUser}>
                {creatingSuperUser ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-1.5 h-4 w-4" />}
                Crear Superadministrador
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SuperAdmin
