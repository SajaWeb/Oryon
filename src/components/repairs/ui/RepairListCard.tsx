import { ChevronRight } from 'lucide-react'
import { StatusBadge, normalizeState } from '../../oryon'
import type { Repair } from '../types'
import { statusLabels } from '../constants'

/**
 * Fila de OT en móvil: número de orden y estado arriba, equipo y cliente debajo, costo y
 * fecha corta a la derecha. Toda la tarjeta abre el detalle — no hay botones de 28px como
 * en la tarjeta anterior.
 */
export function RepairListCard({ repair, onOpen }: { repair: Repair; onOpen: () => void }) {
  const received = new Date(repair.receivedDate)
  const shortDate = Number.isNaN(received.getTime())
    ? '—'
    : received.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' })

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '12px 13px',
        textAlign: 'left',
        background: 'var(--surface-card)',
        border: 'var(--border-width) solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
      }}
    >
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-mono)',
              fontWeight: 'var(--fw-medium)',
              color: 'var(--text-primary)',
            }}
          >
            #{repair.id}
          </span>
          <StatusBadge status={normalizeState(repair.status)} label={statusLabels[repair.status]} size="sm" />
        </span>
        <span style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)', textWrap: 'pretty' }}>
          {repair.deviceBrand} {repair.deviceModel}
        </span>
        <span style={{ fontSize: 'var(--text-mono-sm)', color: 'var(--text-tertiary)' }}>
          {repair.customerName}
        </span>
      </span>

      <span style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-body)',
            fontWeight: 'var(--fw-medium)',
            color: 'var(--text-primary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          ${Number(repair.estimatedCost || 0).toLocaleString('es-CO')}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-mono-sm)',
            color: 'var(--text-disabled)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {shortDate}
        </span>
      </span>

      <ChevronRight size={16} strokeWidth={1.8} color="var(--text-disabled)" style={{ flex: '0 0 auto' }} />
    </button>
  )
}
