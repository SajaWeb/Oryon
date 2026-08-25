import { makeAuthenticatedRequest } from '../../utils/api'

/**
 * Crea empresa, sucursal `Principal` y perfil para una cuenta recién verificada.
 *
 * Sustituye al viejo `POST /auth/signup`, que era anónimo y creaba el usuario con
 * `email_confirm: true` —es decir, sin verificar nada—. Ahora el usuario lo crea
 * Supabase Auth, y esto solo corre **después** de que haya sesión: el servidor
 * saca el correo del JWT, no del cuerpo de la petición.
 *
 * Es idempotente: si el perfil ya existe lo devuelve tal cual, así que puede
 * llamarse en cada arranque sin duplicar empresas.
 */

export interface ProvisionResult {
  success: boolean
  /** Cuenta de Google sin nombre de empresa: hay que preguntarlo antes de seguir. */
  needsCompanyName?: boolean
  company?: { id: number; name: string; planId: string; trialEndsAt: string }
  branch?: { id: string; name: string }
  user?: { userId: string; email: string; name: string; companyId: number; role: string }
  error?: string
}

export function provisionAccount(
  accessToken: string,
  payload: { name?: string; companyName?: string } = {}
): Promise<ProvisionResult> {
  return makeAuthenticatedRequest<ProvisionResult>('/auth/provision', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
