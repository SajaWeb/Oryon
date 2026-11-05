import { useMemo, useState } from 'react'
import { Search, UserRound } from 'lucide-react'
import { Alert, Button, FormField, Input, Select, Tabs, type TabItem } from '../oryon'
import { useBreakpoint } from '../../hooks/useBreakpoint'
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
 * venta»: mismas pestañas, mismos campos, mismas reglas.
 *
 *  - Cliente existente: se busca por nombre, teléfono o documento y se toca.
 *    Elegido, queda como una ficha con «Cambiar».
 *  - Cliente nuevo: se escribe en el mismo formulario (sin abrir otro diálogo
 *    encima). Si el teléfono o el documento ya existen, se avisa al momento y se
 *    ofrece usar ese cliente: así no se crean duplicados.
 */

const MODES: TabItem[] = [
  { id: 'existing', label: 'Cliente existente' },
  { id: 'new', label: 'Cliente nuevo' },
]

const LIST_LIMIT = 50

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
  const [search, setSearch] = useState('')
  const { isMobile } = useBreakpoint()
  const size = isMobile ? 'lg' : 'md'
  const twoUp = { display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'repeat(2, minmax(0,1fr))', gap: 12 } as const

  const selected = value.mode === 'existing' && value.customerId != null ? customers.find((c) => c.id === value.customerId) : undefined

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const qPhone = normalizePhone(search)
    if (!q) return customers
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (qPhone.length >= 3 && normalizePhone(c.phone).includes(qPhone)) ||
        (c.identificationNumber ?? '').toLowerCase().includes(q)
    )
  }, [customers, search])

  const duplicate = value.mode === 'new' ? findDuplicate(customers, value) : null

  const set = (patch: Partial<CustomerDraft>) => onChange({ ...value, ...patch })

  const changeMode = (next: string) => {
    if (next === value.mode) return
    if (next === 'new') {
      /* Lo que se buscó y no apareció suele ser el nombre o el teléfono del
         cliente nuevo: se aprovecha para no escribirlo dos veces. */
      const q = search.trim()
      const looksLikePhone = normalizePhone(q).length >= 7 && /^[\d\s+()-]+$/.test(q)
      onChange({
        ...emptyCustomerDraft(),
        mode: 'new',
        name: looksLikePhone ? '' : q,
        phone: looksLikePhone ? q : '',
      })
    } else {
      onChange(emptyCustomerDraft())
    }
  }

  const choose = (c: Customer) => {
    onChange(draftFromCustomer(c))
    setSearch('')
  }

  const hint = (c: Customer) =>
    [c.phone && c.phone !== 'N/A' ? c.phone : '', [c.identificationType, c.identificationNumber].filter(Boolean).join(' ')]
      .filter(Boolean)
      .join(' · ')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Tabs items={MODES} value={value.mode} onChange={disabled ? undefined : changeMode} />

      {value.mode === 'existing' ? (
        selected ? (
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
        ) : (
          <>
            <Input
              size={size}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre, teléfono o documento"
              iconLeft={Search}
              aria-label="Buscar cliente"
              invalid={Boolean(errors?.customer)}
              disabled={disabled}
            />

            <div
              role="listbox"
              aria-label="Clientes"
              style={{
                maxHeight: 216,
                overflowY: 'auto',
                background: 'var(--bg-sunken)',
                border: `var(--border-width) solid ${errors?.customer ? 'var(--danger)' : 'var(--border-default)'}`,
                borderRadius: 'var(--radius-md)',
              }}
            >
              {filtered.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 16 }}>
                  <p style={{ margin: 0, textAlign: 'center', fontSize: 'var(--text-small)', color: 'var(--text-tertiary)' }}>
                    {customers.length === 0 ? 'Todavía no hay clientes.' : 'Ningún cliente coincide.'}
                  </p>
                  <Button size="sm" variant="secondary" onClick={() => changeMode('new')} disabled={disabled}>
                    Crear {search.trim() ? `«${search.trim()}»` : 'cliente nuevo'}
                  </Button>
                </div>
              ) : (
                filtered.slice(0, LIST_LIMIT).map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => choose(c)}
                    disabled={disabled}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      width: '100%',
                      padding: '10px 12px',
                      minHeight: 'var(--tap-target)',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 0,
                      borderTop: i === 0 ? 0 : 'var(--border-width) solid var(--border-subtle)',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                      <span style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)' }}>{c.name}</span>
                      {hint(c) && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--text-secondary)' }}>{hint(c)}</span>
                      )}
                    </span>
                  </button>
                ))
              )}
              {filtered.length > LIST_LIMIT && (
                <p style={{ margin: 0, padding: '8px 12px', fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)', borderTop: 'var(--border-width) solid var(--border-subtle)' }}>
                  Mostrando {LIST_LIMIT} de {filtered.length}. Escribe para afinar la búsqueda.
                </p>
              )}
            </div>

            {errors?.customer && (
              <p role="alert" style={{ margin: 0, fontSize: 'var(--text-caption)', color: 'var(--danger)' }}>
                {errors.customer}
              </p>
            )}
          </>
        )
      ) : (
        <>
          <div style={twoUp}>
            <FormField label="Nombre completo" required error={errors?.name}>
              <Input size={size} value={value.name} onChange={(e) => set({ name: e.target.value })} placeholder="Andrés Chavarría" autoComplete="name" disabled={disabled} />
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
                disabled={disabled}
              />
            </FormField>
          </div>

          <div style={twoUp}>
            <FormField label="Tipo de documento" hint="Opcional">
              <Select
                size={size}
                value={value.identificationType}
                onChange={(e) => set({ identificationType: e.target.value })}
                placeholder="Sin especificar"
                options={identificationTypes.map((t) => ({ value: t, label: t }))}
                disabled={disabled}
              />
            </FormField>
            <FormField label="Número de documento" hint="Opcional">
              <Input size={size} mono value={value.identificationNumber} onChange={(e) => set({ identificationNumber: e.target.value })} placeholder="1234567890" disabled={disabled} />
            </FormField>
          </div>

          <div style={showAddress ? twoUp : undefined}>
            <FormField label="Correo" hint={errors?.email ? undefined : 'Opcional · para enviarle avisos'} error={errors?.email}>
              <Input size={size} type="email" value={value.email} onChange={(e) => set({ email: e.target.value })} placeholder="cliente@correo.com" autoComplete="email" disabled={disabled} />
            </FormField>
            {showAddress && (
              <FormField label="Dirección" hint="Opcional">
                <Input size={size} value={value.address} onChange={(e) => set({ address: e.target.value })} placeholder="Calle 123 # 45-67" autoComplete="street-address" disabled={disabled} />
              </FormField>
            )}
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
        </>
      )}
    </div>
  )
}
