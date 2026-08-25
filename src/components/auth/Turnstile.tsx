import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * Cloudflare Turnstile para las pantallas de acceso.
 *
 * Supabase Auth valida el token del lado del servidor (Auth → Attack Protection),
 * así que aquí solo hay que conseguirlo y pasarlo en `options.captchaToken`.
 *
 * Dos cosas que suelen romperlo y que este componente resuelve:
 *
 *  1. El script se carga bajo demanda, no en index.html: no tiene sentido bajarlo
 *     en cada vista del panel cuando solo se usa en cuatro pantallas.
 *  2. **El token es de un solo uso.** Tras cada intento —salga bien o mal— hay que
 *     resetear el widget, o el segundo envío falla siempre con captcha_failed.
 *
 * Sin `VITE_TURNSTILE_SITE_KEY` el hook se desactiva por completo y devuelve
 * `undefined`: en local se puede trabajar sin configurar Cloudflare.
 */

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

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
    script.onerror = () => reject(new Error('No se pudo cargar Turnstile'))
    document.head.appendChild(script)
  })

  return scriptPromise
}

export interface TurnstileController {
  /** false cuando no hay clave de sitio: el formulario debe seguir funcionando. */
  enabled: boolean
  /** Token de un solo uso, o null mientras no haya. */
  token: string | null
  /** Lo que se pasa a supabase-js. undefined cuando el captcha está desactivado. */
  captchaToken: string | undefined
  /** Obligatorio tras cada intento de envío. */
  reset: () => void
  /** El widget, para colocarlo donde toque dentro del formulario. */
  widget: ReactNode
}

export function useTurnstile(): TurnstileController {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined
  const enabled = Boolean(siteKey)

  const container = useRef<HTMLDivElement | null>(null)
  const widgetId = useRef<string | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false

    loadScript()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return
        // El tema ya viene resuelto a light/dark por el script anti-FOUC de index.html.
        const theme = (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') ?? 'dark'
        widgetId.current = window.turnstile.render(container.current, {
          sitekey: siteKey!,
          callback: (t) => setToken(t),
          'expired-callback': () => setToken(null),
          'error-callback': () => setToken(null),
          'timeout-callback': () => setToken(null),
          theme,
          language: 'es',
          appearance: 'interaction-only',
        })
      })
      .catch(() => {
        // Cloudflare caído o bloqueado por una extensión: no dejamos al usuario
        // encerrado fuera de su cuenta por eso.
        if (!cancelled) setToken(null)
      })

    return () => {
      cancelled = true
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current)
        widgetId.current = null
      }
    }
  }, [enabled, siteKey])

  const reset = useCallback(() => {
    setToken(null)
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current)
  }, [])

  return {
    enabled,
    token,
    captchaToken: enabled ? token ?? undefined : undefined,
    reset,
    widget: enabled ? <div ref={container} style={{ display: 'flex', justifyContent: 'center' }} /> : null,
  }
}
