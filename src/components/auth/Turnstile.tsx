import { useCallback, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * Cloudflare Turnstile para las pantallas de acceso.
 *
 * Supabase Auth valida el token del lado del servidor (Auth → Attack Protection),
 * así que aquí solo hay que conseguirlo y pasarlo en `options.captchaToken`.
 *
 * Tres cosas rompen esto y las tres están resueltas aquí:
 *
 *  1. **El token tarda en llegar.** El reto se resuelve solo, pero después de
 *     descargar el script y hablar con Cloudflare: entre uno y varios segundos.
 *     Leerlo de un estado de React en el momento del envío es una carrera que se
 *     pierde justo cuando el gestor de contraseñas autocompleta y el usuario pulsa
 *     Entrar de inmediato. Por eso lo que se expone es `getToken()`, que **espera**
 *     al token en vez de mirar si ya estaba.
 *
 *  2. **El widget se monta cuando le toca.** Antes se renderizaba desde un efecto
 *     que corría una sola vez al montar el hook; si el formulario aparecía después
 *     —el panel de superadmin enseña un cargador mientras comprueba la sesión— el
 *     contenedor todavía no existía y el widget no se creaba nunca. Ahora el
 *     contenedor es una ref de callback: se renderiza en cuanto el nodo entra en el
 *     DOM, sea cuando sea.
 *
 *  3. **El token es de un solo uso.** Tras cada intento —salga bien o mal— hay que
 *     resetear el widget, o el segundo envío falla siempre con captcha_failed.
 *
 * Sin `VITE_TURNSTILE_SITE_KEY` el hook se desactiva por completo y `getToken()`
 * devuelve `undefined`: en local se puede trabajar sin configurar Cloudflare.
 */

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

/** Cuánto se espera al reto antes de rendirse y decirlo con todas las letras. */
const TOKEN_TIMEOUT_MS = 20000

/**
 * El captcha no respondió. Lleva `code` porque `authMessage()` resuelve primero
 * por código, y así el aviso al usuario sale del mismo sitio que los de Supabase.
 */
export class CaptchaUnavailableError extends Error {
  readonly code = 'captcha_unavailable'
  constructor() {
    super('Turnstile no devolvió un token')
    this.name = 'CaptchaUnavailableError'
  }
}

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string
      callback: (token: string) => void
      'expired-callback'?: () => void
      'error-callback'?: () => void
      'timeout-callback'?: () => void
      theme?: 'auto' | 'light' | 'dark'
      language?: string
      appearance?: 'always' | 'execute' | 'interaction-only'
      'refresh-expired'?: 'auto' | 'manual' | 'never'
    }
  ) => string
  reset: (widgetId?: string) => void
  remove: (widgetId?: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let scriptPromise: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('turnstile')))
      return
    }
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      // Que un fallo de red no deje la promesa cacheada para siempre.
      scriptPromise = null
      reject(new Error('No se pudo cargar Turnstile'))
    }
    document.head.appendChild(script)
  })

  return scriptPromise
}

export interface TurnstileController {
  /** false cuando no hay clave de sitio: el formulario debe seguir funcionando. */
  enabled: boolean
  /** true mientras se espera al reto, para que el botón lo diga en vez de parecer colgado. */
  verifying: boolean
  /**
   * Token fresco de un solo uso, esperando al reto si aún no ha terminado.
   * Devuelve `undefined` cuando no hay captcha configurado, y lanza
   * `CaptchaUnavailableError` si el reto no responde.
   */
  getToken: () => Promise<string | undefined>
  /** Obligatorio tras cada intento de envío. */
  reset: () => void
  /** El widget, para colocarlo donde toque dentro del formulario. */
  widget: ReactNode
}

export function useTurnstile(): TurnstileController {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined
  const enabled = Boolean(siteKey)

  const widgetId = useRef<string | null>(null)
  const tokenRef = useRef<string | null>(null)
  /** Quien esté esperando un token ahora mismo. */
  const waiters = useRef<Array<(token: string | null) => void>>([])
  const [verifying, setVerifying] = useState(false)

  /** Reparte el resultado del reto a todo el que estuviera esperando. */
  const settle = useCallback((token: string | null) => {
    tokenRef.current = token
    const pending = waiters.current
    waiters.current = []
    pending.forEach((resolve) => resolve(token))
  }, [])

  /* Ref de callback en lugar de useRef + useEffect: React la invoca con el nodo en
     cuanto se monta y con null al desmontarse, así que el widget se crea en el
     momento exacto en que hay dónde ponerlo. */
  const attach = useCallback(
    (node: HTMLDivElement | null) => {
      if (!enabled) return

      if (!node) {
        if (widgetId.current && window.turnstile) {
          window.turnstile.remove(widgetId.current)
        }
        widgetId.current = null
        tokenRef.current = null
        return
      }

      if (widgetId.current) return

      loadScript()
        .then(() => {
          if (!window.turnstile || widgetId.current || !node.isConnected) return
          // El tema ya viene resuelto a light/dark por el script anti-FOUC de index.html.
          const theme = (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') ?? 'dark'
          widgetId.current = window.turnstile.render(node, {
            sitekey: siteKey!,
            callback: (token) => settle(token),
            // Cloudflare renueva solo los tokens vencidos; no es un fallo.
            'expired-callback': () => {
              tokenRef.current = null
            },
            'error-callback': () => settle(null),
            'timeout-callback': () => settle(null),
            'refresh-expired': 'auto',
            theme,
            language: 'es',
            appearance: 'interaction-only',
          })
        })
        .catch(() => {
          // Cloudflare caído o bloqueado por una extensión. No se puede entrar sin
          // token, pero al menos el usuario se entera de por qué.
          settle(null)
        })
    },
    [enabled, siteKey, settle]
  )

  const getToken = useCallback(async (): Promise<string | undefined> => {
    if (!enabled) return undefined
    if (tokenRef.current) return tokenRef.current

    setVerifying(true)
    try {
      const token = await new Promise<string | null>((resolve) => {
        waiters.current.push(resolve)
        window.setTimeout(() => {
          waiters.current = waiters.current.filter((w) => w !== resolve)
          resolve(null)
        }, TOKEN_TIMEOUT_MS)
      })
      if (!token) throw new CaptchaUnavailableError()
      return token
    } finally {
      setVerifying(false)
    }
  }, [enabled])

  const reset = useCallback(() => {
    tokenRef.current = null
    waiters.current = []
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current)
  }, [])

  return {
    enabled,
    verifying,
    getToken,
    reset,
    widget: enabled ? <div ref={attach} style={{ display: 'flex', justifyContent: 'center' }} /> : null,
  }
}
