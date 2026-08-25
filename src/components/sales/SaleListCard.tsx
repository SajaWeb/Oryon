import { ChevronRight } from 'lucide-react'
import { Badge } from '../oryon'

/**
 * Fila de factura en móvil: número y marcas de estado arriba, cliente y fecha·pago debajo,
 * total a la derecha. La tarjeta anterior desplegaba todas las líneas del pedido en línea,
 * lo que hacía que una factura de 15 ítems ocupara varias pantallas.
 */
export function SaleListCard({
  sale,
  creditLabel,
  onOpen,
}: {
  sale: any
  creditLabel?: { text: string; overdue: boolean } | null
  onOpen: () => void
}) {
  const cancelled = sale.status === 'cancelled'
  const created = new Date(sale.createdAt)

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
            {sale.invoiceNumber || `FACT-${sale.id}`}
          </span>
          {cancelled && <Badge tone="danger">Anulada</Badge>}
          {!cancelled && creditLabel && (
            <Badge tone={creditLabel.overdue ? 'danger' : 'warning'}>{creditLabel.text}</Badge>
          )}
        </span>
        <span style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)', textWrap: 'pretty' }}>
          {sale.customerName}
        </span>
        <span style={{ fontSize: 'var(--text-mono-sm)', color: 'var(--text-tertiary)' }}>
          {Number.isNaN(created.getTime())
            ? '—'
            : created.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' })}
          {sale.paymentMethod ? ` · ${sale.paymentMethod}` : ''}
        </span>
      </span>

      <span
        style={{
          flex: '0 0 auto',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-body)',
          fontWeight: 'var(--fw-medium)',
          color: cancelled ? 'var(--text-disabled)' : 'var(--text-primary)',
          textDecoration: cancelled ? 'line-through' : undefined,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        ${Number(sale.total || 0).toLocaleString('es-CO')}
      </span>

      <ChevronRight size={16} strokeWidth={1.8} color="var(--text-disabled)" style={{ flex: '0 0 auto' }} />
    </button>
  )
}
