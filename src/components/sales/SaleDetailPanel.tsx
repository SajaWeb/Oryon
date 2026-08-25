import { Alert, KeyValue } from '../oryon'

/**
 * Ficha de una factura: datos, líneas (mano de obra, repuestos, productos) y totales.
 * Vive dentro de `ResponsiveDetail`, así que sirve al drawer y a la hoja inferior.
 * Antes esta información se volcaba entera dentro de la tarjeta de la lista, de modo que
 * una factura de quince líneas ocupaba varias pantallas de scroll.
 */
const money = (n: number) => `$${Number(n || 0).toLocaleString('es-CO')}`

interface Line {
  d: string
  meta: string
  total: number
}

export function SaleDetailPanel({
  sale,
  columns,
  creditStatus,
}: {
  sale: any
  columns: 1 | 2
  creditStatus?: { status: string; label: string } | null
}) {
  const cancelled = sale.status === 'cancelled'
  const created = new Date(sale.createdAt)

  const labor: Line[] = (sale.laborItems || []).map((l: any) => ({
    d: l.description,
    meta: `${l.hours} h × ${money(l.hourlyRate)}`,
    total: (l.hours || 0) * (l.hourlyRate || 0),
  }))
  const parts: Line[] = (sale.parts || []).map((p: any) => ({
    d: p.description,
    meta: `${p.quantity} × ${money(p.salePrice)}`,
    total: (p.quantity || 0) * (p.salePrice || 0),
  }))
  const items: Line[] = (sale.items || []).map((i: any) => ({
    d: i.name || i.description || 'Producto',
    meta: `${i.quantity ?? 1} × ${money(i.price ?? 0)}`,
    total: (i.quantity ?? 1) * (i.price ?? 0),
  }))

  const groups = [
    { title: 'Mano de obra', lines: labor },
    { title: 'Repuestos', lines: parts },
    { title: 'Productos', lines: items },
  ].filter((g) => g.lines.length > 0)

  const hasCost = (sale.totalCost || 0) > 0
  const profit = hasCost ? sale.total - sale.totalCost : 0

  return (
    <>
      {cancelled && (
        <Alert variant="danger" title="Venta anulada">
          {[sale.cancelReason, sale.cancelledBy && `Por ${sale.cancelledBy}`, sale.cancelledAt &&
            new Date(sale.cancelledAt).toLocaleDateString('es-CO')]
            .filter(Boolean)
            .join(' · ')}
        </Alert>
      )}

      {!cancelled && creditStatus && (
        <Alert variant={creditStatus.status === 'overdue' ? 'danger' : 'warning'} title="Venta a crédito">
          {creditStatus.label}
          {sale.creditDueDate
            ? ` · vence el ${new Date(sale.creditDueDate).toLocaleDateString('es-CO')}`
            : ''}
        </Alert>
      )}

      <KeyValue
        layout="stacked"
        columns={columns}
        items={[
          { label: 'Factura', value: sale.invoiceNumber || `FACT-${sale.id}`, mono: true },
          {
            label: 'Fecha y hora',
            value: Number.isNaN(created.getTime())
              ? '—'
              : created.toLocaleString('es-CO', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                }),
            mono: true,
          },
          { label: 'Cliente', value: sale.customerName },
          { label: 'Teléfono', value: sale.customerPhone || '—', mono: true },
          { label: 'Método de pago', value: sale.paymentMethod || '—' },
          {
            label: 'Origen',
            value: sale.repairId ? `Reparación #${sale.repairId}` : 'Venta de mostrador',
          },
        ]}
      />

      {groups.map((g) => (
        <div key={g.title} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{
              fontSize: 'var(--text-caption)',
              letterSpacing: 'var(--tr-caption)',
              textTransform: 'uppercase',
              fontWeight: 'var(--fw-semibold)',
              color: 'var(--text-tertiary)',
            }}
          >
            {g.title}
          </span>
          {g.lines.map((l, i) => (
            <div
              key={`${l.d}-${i}`}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 12,
                padding: '6px 0',
                borderBottom: 'var(--border-width) solid var(--border-subtle)',
              }}
            >
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 'var(--text-small)', color: 'var(--text-primary)' }}>{l.d}</span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-mono-sm)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {l.meta}
                </span>
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-mono)',
                  color: 'var(--text-primary)',
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                }}
              >
                {money(l.total)}
              </span>
            </div>
          ))}
        </div>
      ))}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: '10px 12px',
          background: 'var(--bg-sunken)',
          border: 'var(--border-width) solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        {[
          { k: 'Total facturado', v: money(sale.total), strong: true },
          ...(hasCost
            ? [
                { k: 'Costo de mercancía', v: money(sale.totalCost), strong: false },
                { k: 'Ganancia', v: money(profit), strong: false },
                {
                  k: 'Margen',
                  v: sale.total ? `${((profit / sale.total) * 100).toFixed(1).replace('.', ',')}%` : '—',
                  strong: false,
                },
              ]
            : []),
        ].map((row) => (
          <div key={row.k} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontSize: 'var(--text-small)', color: 'var(--text-secondary)' }}>{row.k}</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: row.strong ? 'var(--text-body-lg)' : 'var(--text-mono)',
                fontWeight: row.strong ? 'var(--fw-semibold)' : 'var(--fw-regular)',
                color: 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {row.v}
            </span>
          </div>
        ))}
      </div>

      {sale.notes && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span
            style={{
              fontSize: 'var(--text-caption)',
              letterSpacing: 'var(--tr-caption)',
              textTransform: 'uppercase',
              fontWeight: 'var(--fw-semibold)',
              color: 'var(--text-tertiary)',
            }}
          >
            Notas
          </span>
          <span style={{ fontSize: 'var(--text-small)', color: 'var(--text-secondary)', textWrap: 'pretty' }}>
            {sale.notes}
          </span>
        </div>
      )}
    </>
  )
}
