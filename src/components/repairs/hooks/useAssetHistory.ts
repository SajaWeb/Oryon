import { useEffect, useState } from 'react'
import { makeAuthenticatedRequest } from '../../../utils/api'
import { normalizeAssetKey } from '../../../config/businessTypes'
import type { AssetHistoryEntry } from '../types'

/**
 * Visitas anteriores de un bien —por placa, IMEI o serial de marco—.
 *
 * Espera 500 ms desde la última tecla antes de preguntar, y no pregunta con
 * menos de 3 caracteres: una placa a medio escribir no tiene historial.
 * `excludeId` deja fuera la orden que se está mirando.
 */
export function useAssetHistory(accessToken: string | null, rawKey: string | undefined, excludeId?: number) {
  const key = normalizeAssetKey(rawKey)
  const [entries, setEntries] = useState<AssetHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!accessToken || key.length < 3) {
      setEntries([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ key })
        if (excludeId != null) params.set('exclude', String(excludeId))
        const res = await makeAuthenticatedRequest<{ success: boolean; repairs: AssetHistoryEntry[] }>(
          `/repairs/asset-history?${params.toString()}`,
          accessToken
        )
        if (!cancelled) setEntries(res.repairs ?? [])
      } catch {
        // El historial es una ayuda: si falla, la orden se crea igual.
        if (!cancelled) setEntries([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 500)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [accessToken, key, excludeId])

  return { key, entries, loading }
}
