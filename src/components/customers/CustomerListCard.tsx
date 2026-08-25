import { ChevronRight } from 'lucide-react'

/**
 * Fila de cliente en móvil: iniciales, nombre y contacto. La tarjeta anterior no seguía el
 * lenguaje del resto de la app (sin acento, sin fichas de datos), así que convivían dos
 * idiomas de tarjeta distintos.
 */
export function CustomerListCard({
  customer,
  initials,
  onOpen,
}: {
  customer: any
  initials: string
  onOpen: () => void
}) {
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
      <span
        style={{
          display: 'grid',
          placeItems: 'center',
          flex: '0 0 auto',
          width: 36,
          height: 36,
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-mono-sm)',
          fontWeight: 'var(--fw-medium)',
          color: 'var(--text-accent)',
          background: 'var(--accent-subtle)',
          border: 'var(--border-width) solid var(--accent-subtle-border)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        {initials}
      </span>

      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span
          style={{
            fontSize: 15,
            lineHeight: '21px',
            fontWeight: 'var(--fw-semibold)',
            color: 'var(--text-primary)',
            textWrap: 'pretty',
          }}
        >
          {customer.name}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--text-tertiary)' }}>
          #{customer.id} · {customer.phone || 'Sin teléfono'}
        </span>
      </span>

      <ChevronRight size={16} strokeWidth={1.8} color="var(--text-disabled)" style={{ flex: '0 0 auto' }} />
    </button>
  )
}
