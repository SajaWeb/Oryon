import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { projectId, publicAnonKey } from './info'

/**
 * Cliente único de Supabase.
 *
 * Dos cosas que antes se quedaban en los valores por defecto y sí importan:
 *
 * 1. `flowType: 'pkce'`. Con el flujo implícito el token de acceso llega en el
 *    fragmento de la URL, queda en el historial y en el Referer. Además el código
 *    ya llamaba `exchangeCodeForSession`, que es API de PKCE, sin haberlo activado.
 *
 * 2. Almacenamiento conmutable. "Mantener sesión" tiene que hacer algo: cuando el
 *    usuario lo desmarca, la sesión vive en sessionStorage y se va al cerrar la
 *    pestaña. Es lo que se espera en un mostrador compartido.
 */

const PERSIST_KEY = 'oryon-persist-session'
/** Prefijo con el que supabase-js nombra sus entradas (`sb-<ref>-auth-token`). */
const SUPABASE_PREFIX = 'sb-'

let supabaseInstance: SupabaseClient | null = null

function safeStorage(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'session' ? window.sessionStorage : window.localStorage
  } catch {
    // Modo privado o cookies bloqueadas: el cliente se queda en memoria.
    return null
  }
}

function activeStorage(): Storage | null {
  let mode: string | null = null
  try {
    mode = window.localStorage.getItem(PERSIST_KEY)
  } catch {
    /* sin localStorage no hay preferencia que leer */
  }
  return safeStorage(mode === 'session' ? 'session' : 'local')
}

function purgeSupabaseKeys(storage: Storage | null) {
  if (!storage) return
  try {
    for (const key of Object.keys(storage)) {
      if (key.startsWith(SUPABASE_PREFIX)) storage.removeItem(key)
    }
  } catch {
    /* nada que limpiar */
  }
}

/**
 * Fija dónde se guarda la sesión. Debe llamarse ANTES de iniciar sesión: es lo
 * primero que consulta el adaptador cuando supabase-js escribe el token.
 */
export function setSessionPersistence(remember: boolean) {
  try {
    window.localStorage.setItem(PERSIST_KEY, remember ? 'local' : 'session')
  } catch {
    return
  }
  // Al cambiar de sitio, no dejar una copia vieja en el otro.
  purgeSupabaseKeys(safeStorage(remember ? 'session' : 'local'))
}

const switchableStorage = {
  getItem: (key: string) => activeStorage()?.getItem(key) ?? null,
  setItem: (key: string, value: string) => {
    try {
      activeStorage()?.setItem(key, value)
    } catch {
      /* cuota llena o almacenamiento bloqueado */
    }
  },
  removeItem: (key: string) => {
    // Al cerrar sesión se borra de los dos, sin depender de la preferencia actual.
    try {
      safeStorage('local')?.removeItem(key)
      safeStorage('session')?.removeItem(key)
    } catch {
      /* nada que borrar */
    }
  },
}

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(`https://${projectId}.supabase.co`, publicAnonKey, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: switchableStorage,
      },
    })
  }
  return supabaseInstance
}
