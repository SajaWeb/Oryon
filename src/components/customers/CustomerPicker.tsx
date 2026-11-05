import { useState } from 'react'
import { ChevronDown, ChevronUp, Plus, UserRound } from 'lucide-react'
import { Alert, Button, FormField, Input, Select } from '../oryon'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { SearchCombobox, rankMatches } from '../patterns/SearchCombobox'
import {
  draftFromCustomer,
  emptyCustomerDraft,
  findDuplicate,
  normalizePhone,
  type Customer,
  type CustomerDraft,
  type CustomerErrors,
} from './customerDraft'

/**
 * Elegir o crear el cliente. El MISMO componente en «Nueva orden» y en «Nueva
 * venta».
 *
 * Un solo campo: se escribe nombre, teléfono o documento y aparecen las mejores
 * coincidencias. La última opción siempre es «Crear cliente "…"», así que no
 * hay que decidir antes entre "existente" y "nuevo".
 *
 * Al crear, solo se piden nombre y teléfono; documento, correo y dirección van
 * plegados en «Más datos» porque casi nunca se llenan en el mostrador. Si el
 * teléfono o el documento ya existen, se avisa y se ofrece usar ese cliente.
 */

export function CustomerPicker({
  customers,
  identificationTypes,
  value,
  onChange,
  errors,
  showAddress = false,
  disabled = false,
}: {
  customers: Customer[]
  identificationTypes: string[]
  value: CustomerDraft
  onChange: (draft: CustomerDraft) => void
  errors?: CustomerErrors
  /** La venta guarda dirección (va en la factura); la orden no la necesita. */
  showAddress?: boolean
  disabled?: boolean
}) {
  const [query, setQuery] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  const { isMobile } = useBreakpoint()
  const size = isMobile ? 'lg' : 'md'
  const twoUp = { display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'repeat(2, minmax(0,1fr))', gap: 12 } as const

  const selected = value.mode === 'existing' && value.customerId != null ? customers.find((c) => c.id === value.customerId) : undefined

  const { results, total } = rankMatches(customers, query, (c) => [c.name, c.phone, normalizePhone(c.phone), c.identificationNumber], 8)
  const duplicate = value.mode === 'new' ? findDuplicate(customers, value) : null

  const set = (patch: Partial<CustomerDraft>) => onChange({ ...value, ...patch })

  const hint = (c: Customer) =>
    [c.phone && c.phone !== 'N/A' ? c.phone : '', [c.identificationType, c.identificationNumber].filter(Boolean).join(' ')]
      .filter(Boolean)
      .join(' · ')

  const choose = (c: Customer) => {
    onChange(draftFromCustomer(c))
    setQuery('')
  }

  /* Lo que se buscó y no apareció suele ser el nombre o el teléfono del cliente
     nuevo: se aprovecha para no escribirlo dos veces. */
  const startNew = () => {
    const q = query.trim()
    const looksLikePhone = normalizePhone(q).length >= 7 && /^[\d\s+()-]+$/.test(q)
    onChange({ ...emptyCustomerDraft(), mode: 'new', name: looksLikePhone ? '' : q, phone: looksLikePhone ? q : '' })
    setMoreOpen(false)
  }

  const backToSearch = () => {
    setQuery(value.name || value.phone || '')
    onChange(emptyCustomerDraft())
  }

  /* ── Elegido: una ficha, no un formulario ── */
  if (selected) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '10px 12px',
          background: 'var(--accent-subtle)',
          border: 'var(--border-width) solid var(--accent-subtle-border)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <UserRound size={18} strokeWidth={1.8} color="var(--text-accent)" style={{ flex: '0 0 auto' }} />
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)', fontWeight: 'var(--fw-medium)' }}>{selected.name}</span>
            {hint(selected) && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--text-secondary)' }}>{hint(selected)}</span>
            )}
          </span>
        </span>
        <Button size="sm" variant="ghost" onClick={() => onChange(emptyCustomerDraft())} disabled={disabled}>
          Cambiar
        </Button>
      </div>
    )
  }

  /* ── Nuevo: lo mínimo a la vista ── */
  if (value.mode === 'new') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 'var(--text-small)', color: 'var(--text-secondary)' }}>Cliente nuevo</span>
          <Button size="sm" variant="ghost" onClick={backToSearch} disabled={disabled}>
            Buscar uno existente
          </Button>
        </div>

        <div style={twoUp}>
          <FormField label="Nombre completo" required error={errors?.name}>
            <Input size={size} value={value.name} onChange={(e) => set({ name: e.target.value })} placeholder="Andrés Chavarría" autoComplete="name" autoFocus={!value.name} disabled={disabled} />
          </FormField>
          <FormField label="Teléfono" required error={errors?.phone} hint={errors?.phone ? undefined : 'Por aquí se le avisa'}>
            <Input
              size={size}
              mono
              type="tel"
              inputMode="tel"
              value={value.phone}
              onChange={(e) => set({ phone: e.target.value })}
              placeholder="3001234567"
              autoComplete="tel"
              autoFocus={Boolean(value.name) && !value.phone}
              disabled={disabled}
            />
          </FormField>
        </div>

        {duplicate && (
          <Alert variant="warning" title={`Ya existe un cliente con ese ${duplicate.field === 'phone' ? 'teléfono' : 'documento'}`}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
              <span>
                {duplicate.customer.name}
                {hint(duplicate.customer) ? ` · ${hint(duplicate.customer)}` : ''}
              </span>
              <Button size="sm" variant="secondary" onClick={() => choose(duplicate.customer)} disabled={disabled}>
                Usar este cliente
              </Button>
            </span>
          </Alert>
        )}

        <button
          type="button"
          onClick={() => setMoreOpen((o) => !o)}
          aria-expanded={moreOpen || Boolean(errors?.email)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            alignSelf: 'flex-start',
            padding: '4px 0',
            background: 'none',
            border: 0,
            fontSize: 'var(--text-small)',
            color: 'var(--text-accent)',
            cursor: 'pointer',
          }}
        >
          {moreOpen || errors?.email ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Más datos{' '}
          <span style={{ color: 'var(--text-tertiary)' }}>· documento, correo{showAddress ? ', dirección' : ''} (opcional)</span>
        </button>

        {(moreOpen || errors?.email) && (
          <>
            <div style={twoUp}>
              <FormField label="Tipo de documento">
                <Select
                  size={size}
                  value={value.identificationType}
                  onChange={(e) => set({ identificationType: e.target.value })}
                  placeholder="Sin especificar"
                  options={identificationTypes.map((t) => ({ value: t, label: t }))}
                  disabled={disabled}
                />
              </FormField>
              <FormField label="Número de documento">
                <Input size={size} mono value={value.identificationNumber} onChange={(e) => set({ identificationNumber: e.target.value })} placeholder="1234567890" disabled={disabled} />
              </FormField>
            </div>
            <div style={showAddress ? twoUp : undefined}>
              <FormField label="Correo" error={errors?.email} hint={errors?.email ? undefined : 'Para enviarle avisos'}>
                <Input size={size} type="email" value={value.email} onChange={(e) => set({ email: e.target.value })} placeholder="cliente@correo.com" autoComplete="email" disabled={disabled} />
              </FormField>
              {showAddress && (
                <FormField label="Dirección">
                  <Input size={size} value={value.address} onChange={(e) => set({ address: e.target.value })} placeholder="Calle 123 # 45-67" autoComplete="street-address" disabled={disabled} />
                </FormField>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  /* ── Buscar ── */
  const q = query.trim()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <SearchCombobox<Customer>
        query={query}
        onQueryChange={setQuery}
        options={results.map((c) => ({ key: String(c.id), value: c }))}
        onSelect={choose}
        placeholder="Buscar por nombre, teléfono o documento"
        ariaLabel="Buscar cliente"
        size={size}
        invalid={Boolean(errors?.customer)}
        disabled={disabled}
        emptyText={customers.length === 0 ? 'Todavía no hay clientes.' : `Ningún cliente coincide con «${q}».`}
        footer={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-body)' }}>
            <Plus size={16} />
            {q ? (
              <>
                Crear cliente <span style={{ color: 'var(--text-primary)' }}>«{q}»</span>
              </>
            ) : (
              'Crear cliente nuevo'
            )}
          </span>
        }
        onFooterSelect={startNew}
        hint={total > results.length ? `Mostrando ${results.length} de ${total}. Escribe más para afinar.` : undefined}
        renderOption={(c) => (
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)' }}>{c.name}</span>
            {hint(c) && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--text-secondary)' }}>{hint(c)}</span>}
          </span>
        )}
      />
      {errors?.customer && (
        <p role="alert" style={{ margin: 0, fontSize: 'var(--text-caption)', color: 'var(--danger)' }}>
          {errors.customer}
        </p>
      )}
    </div>
  )
}
