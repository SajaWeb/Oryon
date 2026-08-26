/**
 * Aritmética de vigencia de licencia.
 *
 * Una sola regla, y vale para renovar, extender y cambiar de plan: **lo comprado se
 * suma a lo que quede, nunca lo reemplaza**. La base es la fecha futura más lejana
 * entre hoy, la licencia actual y el periodo de prueba; sobre ella se añaden los
 * meses o días adquiridos.
 *
 * Es el equivalente en el navegador de `calculateExtendedExpiryDate` del Edge
 * Function. Los dos tienen que dar lo mismo: la pantalla de retorno del pago aplica
 * la vigencia cuando el servidor no puede, y la pantalla de extensión enseña de
 * antemano la fecha resultante.
 */

export interface LicenseHolder {
  licenseExpiry?: string | null
  trialEndsAt?: string | null
}

/** La fecha desde la que se cuenta lo comprado. Nunca anterior a ahora. */
export function licenseBaseDate(company: LicenseHolder | null | undefined, now: Date = new Date()): Date {
  const time = (value?: string | null) => {
    if (!value) return 0
    const t = new Date(value).getTime()
    return Number.isNaN(t) ? 0 : t
  }
  return new Date(Math.max(now.getTime(), time(company?.licenseExpiry), time(company?.trialEndsAt)))
}

/** Suma meses y días a la vigencia, conservando lo que quedaba. */
export function extendLicense(
  company: LicenseHolder | null | undefined,
  monthsToAdd = 0,
  daysToAdd = 0,
  now: Date = new Date()
): Date {
  const result = licenseBaseDate(company, now)
  if (monthsToAdd > 0) result.setMonth(result.getMonth() + monthsToAdd)
  if (daysToAdd > 0) result.setDate(result.getDate() + daysToAdd)
  return result
}

/** Igual que `extendLicense`, en el ISO que se guarda en el KV. */
export function addMonthsToLicense(
  company: LicenseHolder | null | undefined,
  monthsToAdd = 0,
  now: Date = new Date()
): string {
  return extendLicense(company, monthsToAdd, 0, now).toISOString()
}

/** Días que faltan para vencer, hacia arriba y nunca negativos. */
export function daysRemaining(expiry?: string | null, now: Date = new Date()): number {
  if (!expiry) return 0
  const t = new Date(expiry).getTime()
  if (Number.isNaN(t)) return 0
  return Math.max(0, Math.ceil((t - now.getTime()) / (1000 * 60 * 60 * 24)))
}
