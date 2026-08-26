/**
 * Verificación de firma Standard Webhooks (lo que usa Supabase para sus hooks).
 *
 * Vive en su propio módulo por una razón práctica: es la única pieza del hook que
 * conviene poder probar sin levantar el servidor.
 *
 * Firma esperada:  base64( HMAC-SHA256( clave, `${id}.${timestamp}.${payload}` ) )
 * La clave es el base64 que sigue a `whsec_` dentro de `v1,whsec_...`.
 */

/** Tolerancia del sello de tiempo, como manda la especificación. */
export const TIMESTAMP_TOLERANCE_S = 5 * 60

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

/** Comparar con `===` filtra la firma byte a byte por temporización. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export interface WebhookHeaders {
  id: string | null
  timestamp: string | null
  signature: string | null
}

/**
 * Sin esta comprobación el endpoint sería un relé de correo abierto: cualquiera
 * podría hacer que el dominio de Oryon enviara lo que quisiera a quien quisiera.
 *
 * @param nowSeconds inyectable para poder probar el desfase de reloj.
 */
export async function verifyWebhookSignature(
  payload: string,
  headers: WebhookHeaders,
  rawSecret: string | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): Promise<boolean> {
  if (!rawSecret) return false
  const { id, timestamp, signature } = headers
  if (!id || !timestamp || !signature) return false

  const sent = Number(timestamp)
  if (!Number.isFinite(sent) || Math.abs(nowSeconds - sent) > TIMESTAMP_TOLERANCE_S) return false

  const secret = rawSecret.replace(/^v\d+,/, '').replace(/^whsec_/, '')

  let expected: string
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      base64ToBytes(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const mac = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(`${id}.${timestamp}.${payload}`)
    )
    expected = bytesToBase64(new Uint8Array(mac))
  } catch {
    // Secreto mal formado: no es base64 válido.
    return false
  }

  // La cabecera admite varias firmas separadas por espacio, cada una `v1,<base64>`.
  return signature
    .split(' ')
    .map((part) => part.split(',')[1] ?? '')
    .some((candidate) => timingSafeEqual(candidate, expected))
}
