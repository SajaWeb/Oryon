import { createContext, useContext, useMemo, type ReactNode } from 'react'
import {
  getBusinessProfile,
  DEFAULT_BUSINESS_TYPE,
  type BusinessProfile,
  type BusinessTypeId,
} from '../config/businessTypes'

/**
 * Perfil del comercio de la empresa con sesión abierta.
 *
 * App.tsx ya carga `companyData`; de ahí sale `businessType`. Fuera del
 * proveedor (landing, seguimiento público) el valor por defecto es electrónica,
 * así ningún componente se rompe si se monta suelto.
 */
interface BusinessContextValue {
  businessType: BusinessTypeId
  profile: BusinessProfile
  /** Nombre de la empresa: firma los mensajes al cliente (WhatsApp). */
  companyName?: string
  /** Aplica un cambio ya guardado en el servidor, sin recargar la app. */
  setBusinessType: (type: BusinessTypeId) => void
}

const BusinessContext = createContext<BusinessContextValue>({
  businessType: DEFAULT_BUSINESS_TYPE,
  profile: getBusinessProfile(DEFAULT_BUSINESS_TYPE),
  setBusinessType: () => {},
})

export function BusinessProvider({
  businessType,
  companyName,
  onChange,
  children,
}: {
  businessType?: string | null
  companyName?: string
  onChange: (type: BusinessTypeId) => void
  children: ReactNode
}) {
  const value = useMemo<BusinessContextValue>(() => {
    const profile = getBusinessProfile(businessType)
    return { businessType: profile.id, profile, companyName, setBusinessType: onChange }
  }, [businessType, companyName, onChange])

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>
}

export function useBusiness(): BusinessContextValue {
  return useContext(BusinessContext)
}
