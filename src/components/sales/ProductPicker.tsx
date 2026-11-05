import { useMemo, useState } from 'react'
import { Check, Minus, Plus, ScanLine } from 'lucide-react'
import { Badge, Button, Input } from '../oryon'
import { SearchCombobox, fold, rankMatches } from '../patterns/SearchCombobox'
import { productCategoryLabel } from '../../config/businessTypes'

/**
 * Agregar productos a la venta con un solo buscador.
 *
 *  - Producto por cantidad: un toque (o Enter) y entra al carrito. El campo se
 *    limpia y conserva el foco, listo para el siguiente.
 *  - Producto con variantes: aparece debajo un panel con las variantes que
 *    tienen stock y la cantidad.
 *  - Producto por unidades (IMEI/serial): panel con las unidades disponibles.
 *    Si lo que se escribió o escaneó ES un IMEI o serial, esa unidad llega ya
 *    marcada.
 *
 * Antes eran dos pasos (elegir y luego "Agregar") y un diálogo encima de otro
 * para unidades y variantes. El stock que se muestra descuenta lo que ya está
 * en el carrito.
 */

export interface PickerUnit {
  id: number
  imei?: string
  serialNumber?: string
  status: string
}
export interface PickerVariant {
  id: number
  name: string
  sku?: string
  stock: number
}
export interface PickerProduct {
  id: number
  name: string
  category: string
  price: number
  cost?: number
  trackByUnit?: boolean
  hasVariants?: boolean
  quantity?: number
  units?: PickerUnit[]
  variants?: PickerVariant[]
}

/** Lo que se agrega al carrito. */
export interface CartAddition {
  productId: number
  productName: string
  price: number
  cost: number
  quantity: number
  unitIds?: number[]
  unitDetails?: string[]
  variantId?: number
  variantName?: string
}

export interface CartLike {
  productId: number
  quantity: number
  unitIds?: number[]
  variantId?: number
}

const money = (n: number) => `$${Math.round(n || 0).toLocaleString('es-CO')}`
const unitLabel = (u: PickerUnit) => u.imei || u.serialNumber || `Unidad #${u.id}`
const compact = (v?: string) => fold(v).replace(/[^a-z0-9]/g, '')

/** Stock que queda para vender, descontando el carrito. */
export function remainingStock(product: PickerProduct, cart: CartLike[], variantId?: number): number {
  if (product.trackByUnit) {
    const taken = new Set(cart.filter((c) => c.productId === product.id).flatMap((c) => c.unitIds ?? []))
    return (product.units ?? []).filter((u) => u.status === 'available' && !taken.has(u.id)).length
  }
  if (product.hasVariants) {
    const variants = (product.variants ?? []).filter((v) => variantId == null || v.id === variantId)
    return variants.reduce((sum, v) => {
      const inCart = cart.filter((c) => c.productId === product.id && c.variantId === v.id).reduce((s, c) => s + c.quantity, 0)
      return sum + Math.max(0, v.stock - inCart)
    }, 0)
  }
  const inCart = cart.filter((c) => c.productId === product.id && c.variantId == null).reduce((s, c) => s + c.quantity, 0)
  return Math.max(0, (product.quantity ?? 0) - inCart)
}

type Pending =
  | { kind: 'variant'; product: PickerProduct }
  | { kind: 'units'; product: PickerProduct; preselected: number[] }

export function ProductPicker({
  products,
  cart,
  onAdd,
  size = 'md',
  unitLabelName = 'IMEI/serial',
}: {
  products: PickerProduct[]
  cart: CartLike[]
  onAdd: (item: CartAddition) => void
  size?: 'md' | 'lg'
  /** Cómo se llama la unidad en este comercio (IMEI/serial, serial de marco…). */
  unitLabelName?: string
}) {
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState<Pending | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  /* Si lo escrito es un IMEI o serial, se busca la unidad exacta: así funciona
     un lector de códigos, que "teclea" el número y pulsa Enter. */
  const unitHits = useMemo(() => {
    const q = compact(query)
    const hits = new Map<number, number>()
    if (q.length < 4) return hits
    for (const p of products) {
      if (!p.trackByUnit) continue
      const u = (p.units ?? []).find((x) => x.status === 'available' && (compact(x.imei).includes(q) || compact(x.serialNumber).includes(q)))
      if (u) hits.set(p.id, u.id)
    }
    return hits
  }, [products, query])

  const { results, total } = useMemo(() => {
    const ranked = rankMatches(products, query, (p) => [p.name, productCategoryLabel(p.category), p.category], 8)
    // Los productos encontrados por IMEI/serial van primero.
    const byUnit = products.filter((p) => unitHits.has(p.id) && !ranked.results.includes(p))
    // Lo agotado al final: que Enter nunca elija algo que no se puede vender.
    const merged = [...byUnit, ...ranked.results]
    const sorted = [...merged.filter((p) => remainingStock(p, cart) > 0), ...merged.filter((p) => remainingStock(p, cart) <= 0)]
    return { results: sorted.slice(0, 8), total: ranked.total + byUnit.length }
  }, [products, query, unitHits, cart])

  const flash = (msg: string) => {
    setNotice(msg)
    window.setTimeout(() => setNotice((m) => (m === msg ? null : m)), 2500)
  }

  const select = (p: PickerProduct) => {
    if (remainingStock(p, cart) <= 0) {
      flash(`«${p.name}» ya no tiene stock disponible${cart.some((c) => c.productId === p.id) ? ' (está todo en el carrito)' : ''}.`)
      return
    }
    if (p.trackByUnit) {
      const hit = unitHits.get(p.id)
      setPending({ kind: 'units', product: p, preselected: hit != null ? [hit] : [] })
    } else if (p.hasVariants) {
      setPending({ kind: 'variant', product: p })
    } else {
      onAdd({ productId: p.id, productName: p.name, price: p.price, cost: p.cost || 0, quantity: 1 })
      flash(`Agregado: ${p.name}`)
    }
    setQuery('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {pending ? (
        pending.kind === 'variant' ? (
          <VariantPanel
            product={pending.product}
            cart={cart}
            size={size}
            onCancel={() => setPending(null)}
            onAdd={(item) => {
              onAdd(item)
              setPending(null)
              flash(`Agregado: ${item.productName}`)
            }}
          />
        ) : (
          <UnitsPanel
            product={pending.product}
            cart={cart}
            preselected={pending.preselected}
            size={size}
            unitLabelName={unitLabelName}
            onCancel={() => setPending(null)}
            onAdd={(item) => {
              onAdd(item)
              setPending(null)
              flash(`Agregado: ${item.quantity} × ${item.productName}`)
            }}
          />
        )
      ) : (
        <SearchCombobox<PickerProduct>
          query={query}
          onQueryChange={setQuery}
          options={results.map((p) => ({ key: String(p.id), value: p }))}
          onSelect={select}
          placeholder={`Buscar producto, o escanear ${unitLabelName}`}
          ariaLabel="Buscar producto"
          size={size}
          emptyText={`Ningún producto coincide con «${query.trim()}».`}
          hint={total > results.length ? `Mostrando ${results.length} de ${total}. Escribe más para afinar.` : undefined}
          renderOption={(p) => {
            const left = remainingStock(p, cart)
            const unitHit = unitHits.get(p.id)
            const unit = unitHit != null ? p.units?.find((u) => u.id === unitHit) : undefined
            return (
              <>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, opacity: left > 0 ? 1 : 0.5 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    {p.trackByUnit && <Badge tone="neutral">Por unidad</Badge>}
                    {p.hasVariants && <Badge tone="neutral">Variantes</Badge>}
                  </span>
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>
                    {unit ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-accent)' }}>
                        <ScanLine size={12} /> {unitLabel(unit)}
                      </span>
                    ) : (
                      <>
                        {productCategoryLabel(p.category)} · {left > 0 ? `${left} disponible${left === 1 ? '' : 's'}` : 'Sin stock'}
                      </>
                    )}
                  </span>
                </span>
                <span style={{ flex: '0 0 auto', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 'var(--text-small)', color: 'var(--text-primary)' }}>
                  {money(p.price)}
                </span>
              </>
            )
          }}
        />
      )}

      {notice && (
        <p role="status" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-caption)', color: 'var(--text-secondary)' }}>
          <Check size={13} color="var(--success)" /> {notice}
        </p>
      )}
    </div>
  )
}

/* ───────────── Panel de variante ───────────── */

function PanelShell({ title, price, children, footer }: { title: string; price: number; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 12,
        background: 'var(--surface-raised)',
        border: 'var(--border-width) solid var(--accent-subtle-border)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: 'var(--text-body)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-primary)' }}>{title}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-small)', color: 'var(--text-secondary)' }}>{money(price)} c/u</span>
      </div>
      {children}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>{footer}</div>
    </div>
  )
}

export function QuantityStepper({ value, max, onChange, size = 'md' }: { value: number; max: number; onChange: (n: number) => void; size?: 'sm' | 'md' }) {
  const h = size === 'sm' ? 28 : 34
  const btn: React.CSSProperties = {
    display: 'grid',
    placeItems: 'center',
    width: h,
    height: h,
    background: 'var(--surface-card)',
    border: 'var(--border-width) solid var(--border-default)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <button type="button" aria-label="Quitar uno" style={{ ...btn, opacity: value <= 1 ? 0.4 : 1 }} disabled={value <= 1} onClick={() => onChange(value - 1)}>
        <Minus size={14} />
      </button>
      <span aria-live="polite" style={{ minWidth: 28, textAlign: 'center', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 'var(--text-mono-size)' }}>
        {value}
      </span>
      <button type="button" aria-label="Agregar uno" style={{ ...btn, opacity: value >= max ? 0.4 : 1 }} disabled={value >= max} onClick={() => onChange(value + 1)}>
        <Plus size={14} />
      </button>
    </span>
  )
}

function VariantPanel({
  product,
  cart,
  size,
  onAdd,
  onCancel,
}: {
  product: PickerProduct
  cart: CartLike[]
  size: 'md' | 'lg'
  onAdd: (item: CartAddition) => void
  onCancel: () => void
}) {
  const options = (product.variants ?? []).map((v) => ({ v, left: remainingStock(product, cart, v.id) }))
  const firstAvailable = options.find((o) => o.left > 0)?.v.id ?? null
  const [variantId, setVariantId] = useState<number | null>(firstAvailable)
  const [qty, setQty] = useState(1)
  const chosen = options.find((o) => o.v.id === variantId)
  const max = chosen?.left ?? 0

  return (
    <PanelShell
      title={product.name}
      price={product.price}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!chosen || max <= 0}
            onClick={() =>
              chosen &&
              onAdd({
                productId: product.id,
                productName: `${product.name} - ${chosen.v.name}`,
                price: product.price,
                cost: product.cost || 0,
                quantity: Math.min(qty, max),
                variantId: chosen.v.id,
                variantName: chosen.v.name,
              })
            }
          >
            Agregar {Math.min(qty, Math.max(max, 1))} al carrito
          </Button>
        </>
      }
    >
      <div role="radiogroup" aria-label="Variante" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map(({ v, left }) => {
          const on = v.id === variantId
          return (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={left <= 0}
              onClick={() => {
                setVariantId(v.id)
                setQty(1)
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 6,
                minHeight: size === 'lg' ? 40 : 32,
                padding: '0 10px',
                background: on ? 'var(--accent-subtle)' : 'var(--surface-card)',
                border: `var(--border-width) solid ${on ? 'var(--accent-fill)' : 'var(--border-default)'}`,
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-small)',
                cursor: left > 0 ? 'pointer' : 'not-allowed',
                opacity: left > 0 ? 1 : 0.45,
              }}
            >
              {v.name}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--text-tertiary)' }}>{left > 0 ? left : 'agotada'}</span>
            </button>
          )
        })}
      </div>
      {chosen && max > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 'var(--text-small)', color: 'var(--text-secondary)' }}>Cantidad</span>
          <QuantityStepper value={Math.min(qty, max)} max={max} onChange={setQty} />
        </div>
      )}
    </PanelShell>
  )
}

/* ───────────── Panel de unidades ───────────── */

function UnitsPanel({
  product,
  cart,
  preselected,
  size,
  unitLabelName,
  onAdd,
  onCancel,
}: {
  product: PickerProduct
  cart: CartLike[]
  preselected: number[]
  size: 'md' | 'lg'
  unitLabelName: string
  onAdd: (item: CartAddition) => void
  onCancel: () => void
}) {
  const taken = new Set(cart.filter((c) => c.productId === product.id).flatMap((c) => c.unitIds ?? []))
  // La unidad escaneada o buscada, primero.
  const available = (product.units ?? [])
    .filter((u) => u.status === 'available' && !taken.has(u.id))
    .sort((a, b) => Number(preselected.includes(b.id)) - Number(preselected.includes(a.id)))
  const [picked, setPicked] = useState<number[]>(preselected.filter((id) => available.some((u) => u.id === id)))
  const [filter, setFilter] = useState('')
  const q = compact(filter)
  const shown = q ? available.filter((u) => compact(u.imei).includes(q) || compact(u.serialNumber).includes(q)) : available

  const toggle = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  return (
    <PanelShell
      title={product.name}
      price={product.price}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={picked.length === 0}
            onClick={() =>
              onAdd({
                productId: product.id,
                productName: product.name,
                price: product.price,
                cost: product.cost || 0,
                quantity: picked.length,
                unitIds: picked,
                unitDetails: picked.map((id) => unitLabel(available.find((u) => u.id === id)!)),
              })
            }
          >
            {picked.length === 0 ? 'Elige una unidad' : `Agregar ${picked.length} ${picked.length === 1 ? 'unidad' : 'unidades'}`}
          </Button>
        </>
      }
    >
      {available.length > 6 && (
        <Input size={size} mono value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={`Filtrar por ${unitLabelName}`} iconLeft={ScanLine} aria-label={`Filtrar por ${unitLabelName}`} />
      )}
      <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', border: 'var(--border-width) solid var(--border-default)', borderRadius: 'var(--radius-sm)' }}>
        {shown.length === 0 && <p style={{ margin: 0, padding: 12, fontSize: 'var(--text-small)', color: 'var(--text-tertiary)' }}>Ninguna unidad coincide.</p>}
        {shown.map((u, i) => {
          const on = picked.includes(u.id)
          return (
            <label
              key={u.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                minHeight: 'var(--tap-target)',
                background: on ? 'var(--accent-subtle)' : 'var(--surface-card)',
                borderTop: i === 0 ? 0 : 'var(--border-width) solid var(--border-subtle)',
                cursor: 'pointer',
              }}
            >
              <input type="checkbox" checked={on} onChange={() => toggle(u.id)} style={{ width: 16, height: 16, accentColor: 'var(--accent-fill)' }} />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-size)', color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>{unitLabel(u)}</span>
                {u.imei && u.serialNumber && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--text-tertiary)' }}>{u.serialNumber}</span>}
              </span>
            </label>
          )
        })}
      </div>
    </PanelShell>
  )
}
