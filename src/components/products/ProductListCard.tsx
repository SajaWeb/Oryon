import { ChevronRight } from 'lucide-react'
import type { Product, Branch } from './types'
import { formatPrice, getAvailableStock, isLowStock } from './utils'
import { PRODUCT_CATEGORIES } from './constants'

/**
 * Fila de producto en móvil. El artboard la resuelve como una línea densa: nombre y
 * categoría·sucursal a la izquierda, precio y chip de stock a la derecha, chevron al final.
 * Toda la tarjeta es el objetivo táctil — nada de botones de 28px.
 */
export function ProductListCard({
  product,
  branches,
  threshold,
  onOpen,
}: {
  product: Product
  branches: Branch[]
  threshold: number
  onOpen: () => void
}) {
  const stock = getAvailableStock(product)
  const low = isLowStock(product, threshold)
  const branch = branches.find((b) => b.id === product.branchId)?.name || 'Sin sucursal'
  const category =
    PRODUCT_CATEGORIES.find((c) => c.value === product.category)?.label || product.category

  const tone = stock === 0 ? 'var(--danger)' : low ? 'var(--warning)' : 'var(--text-secondary)'

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
          {product.name}
        </span>
        <span style={{ fontSize: 'var(--text-mono-sm)', color: 'var(--text-tertiary)' }}>
          {category} · {branch}
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
          {formatPrice(product.price)}
        </span>
        <span
          style={{
            padding: '1px 7px',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-mono-sm)',
            fontWeight: 'var(--fw-medium)',
            color: tone,
            border: `var(--border-width) solid color-mix(in srgb, ${tone} 40%, transparent)`,
            borderRadius: 'var(--radius-sm)',
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
          }}
        >
          {stock === 0 ? 'Agotado' : low ? `${stock} bajo` : `${stock} u.`}
        </span>
      </span>

      <ChevronRight size={16} strokeWidth={1.8} color="var(--text-disabled)" style={{ flex: '0 0 auto' }} />
    </button>
  )
}
