import { History } from 'lucide-react'
import { StatusBadge, normalizeState } from '../../oryon'
import { statusLabels } from '../constants'
import { formatFieldValue, type BusinessProfile } from '../../../config/businessTypes'
import type { AssetHistoryEntry } from '../types'

const money = (n?: number) => `$${Number(n || 0).toLocaleString('es-CO')}`

const shortDate = (iso?: string) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Kilometraje de una visita, si el comercio lo registra. */
export function entryMileage(entry: AssetHistoryEntry): number | null {
  const n = Number(entry.assetDetails?.mileage)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** "Visto 3 veces · último ingreso 12 mar 2026 · 45.000 km" */
export function historySummary(entries: AssetHistoryEntry[]): string {
  if (entries.length === 0) return ''
  const last = entries[0]
  const km = entryMileage(last)
  return [
    `Visto ${entries.length} ${entries.length === 1 ? 'vez' : 'veces'}`,
    `último ingreso ${shortDate(last.createdAt)}`,
    km ? `${km.toLocaleString('es-CO')} km` : '',
  ]
    .filter(Boolean)
    .join(' · ')
}

/**
 * Lista de visitas anteriores de un bien. La usa el detalle de una orden
 * ("Historial de esta moto") y es lo que hace útil escribir bien la placa.
 */
export function AssetHistoryList({
  entries,
  profile,
  loading,
}: {
  entries: AssetHistoryEntry[]
  profile: BusinessProfile
  loading?: boolean
}) {
  const mileageField = profile.assetFields.find((f) => f.key === 'mileage')

  if (loading) {
    return <p style={{ margin: 0, fontSize: 'var(--text-small)', color: 'var(--text-tertiary)' }}>Buscando visitas anteriores…</p>
  }
  if (entries.length === 0) {
    return (
      <p style={{ margin: 0, fontSize: 'var(--text-small)', color: 'var(--text-tertiary)' }}>
        Es la primera vez que {profile.vocab.article === 'la' ? 'esta' : 'este'} {profile.vocab.asset} entra al {profile.vocab.business}.
      </p>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-sunken)',
        border: 'var(--border-width) solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      {entries.map((entry, i) => (
        <div
          key={entry.id}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            padding: '10px 12px',
            borderTop: i === 0 ? 0 : 'var(--border-width) solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--text-secondary)' }}>
              #{entry.id} · {shortDate(entry.createdAt)}
            </span>
            <StatusBadge status={normalizeState(entry.status)} label={statusLabels[entry.status] ?? entry.status} />
          </div>
          {entry.problem && (
            <span style={{ fontSize: 'var(--text-small)', color: 'var(--text-primary)', textWrap: 'pretty' }}>{entry.problem}</span>
          )}
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>
            {[
              entry.customerName,
              mileageField ? formatFieldValue(entry, mileageField) : '',
              entry.invoicedTotal ? `Facturado ${money(entry.invoicedTotal)}` : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </div>
      ))}
    </div>
  )
}

export function AssetHistoryHeading({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 'var(--text-caption)',
        letterSpacing: 'var(--tr-caption)',
        textTransform: 'uppercase',
        fontWeight: 'var(--fw-semibold)',
        color: 'var(--text-tertiary)',
      }}
    >
      <History size={13} strokeWidth={1.8} />
      {children}
    </span>
  )
}
