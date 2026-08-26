import { useMemo, useState } from 'react'
import { Check, Search } from 'lucide-react'
import { FormField, Input, Select, Tabs, type TabItem } from '../oryon'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { Customer, RepairFormData } from './types'

/**
 * Elegir cliente: uno que ya existe, o uno nuevo.
 *
 * Las dos vías eran dos botones que había que interpretar; ahora son pestañas del
 * sistema, que es lo que el diseño usa para "una cosa o la otra". La lista de
 * resultados sustituye a un desplegable: en un taller se busca por teléfono tanto
 * como por nombre, y hay que ver los dos a la vez para no traspapelar homónimos.
 */

const MODES: TabItem[] = [
  { id: 'select', label: 'Cliente existente' },
  { id: 'new', label: 'Cliente nuevo' },
]

interface CustomerSelectorProps {
  customers: Customer[]
  identificationTypes: string[]
  formData: RepairFormData
  onFormDataChange: (data: Partial<RepairFormData>) => void
  onCustomerSelect: (customerId: number) => void
}

export function CustomerSelector({
  customers,
  identificationTypes,
  formData,
  onFormDataChange,
  onCustomerSelect,
}: CustomerSelectorProps) {
  const [mode, setMode] = useState<'select' | 'new'>('select')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  const { isMobile } = useBreakpoint()
  const size = isMobile ? 'lg' : 'md'
  const twoUp = { display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'repeat(2, minmax(0,1fr))', gap: 12 } as const

  const filtered = useMemo(() => {
    if (!search) return customers
    const q = search.toLowerCase()
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.identificationNumber && c.identificationNumber.toLowerCase().includes(q))
    )
  }, [customers, search])

  const selectCustomer = (customerId: number) => {
    const customer = customers.find((c) => c.id === customerId)
    if (!customer) return
    setSelectedId(customerId)
    onCustomerSelect(customerId)
    onFormDataChange({
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      customerIdentificationType: customer.identificationType || '',
      customerIdentificationNumber: customer.identificationNumber || '',
    })
  }

  const changeMode = (next: string) => {
    const value = next as 'select' | 'new'
    setMode(value)
    if (value === 'new') {
      setSelectedId(null)
      onFormDataChange({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        customerIdentificationType: '',
        customerIdentificationNumber: '',
      })
    } else if (selectedId) {
      selectCustomer(selectedId)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Tabs items={MODES} value={mode} onChange={changeMode} />

      {mode === 'select' ? (
        <>
          <Input
            size={size}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre, teléfono o identificación"
            iconLeft={Search}
            aria-label="Buscar cliente"
          />

          <div
            style={{
              maxHeight: 208,
              overflowY: 'auto',
              background: 'var(--bg-sunken)',
              border: 'var(--border-width) solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            {filtered.length === 0 ? (
              <p style={{ margin: 0, padding: 16, textAlign: 'center', fontSize: 'var(--text-small)', color: 'var(--text-tertiary)' }}>
                {customers.length === 0 ? 'Todavía no hay clientes. Crea uno nuevo.' : 'Ningún cliente coincide.'}
              </p>
            ) : (
              filtered.map((customer, i) => {
                const active = selectedId === customer.id
                return (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => selectCustomer(customer.id)}
                    aria-pressed={active}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      width: '100%',
                      padding: '10px 12px',
                      minHeight: 'var(--tap-target)',
                      textAlign: 'left',
                      background: active ? 'var(--accent-subtle)' : 'transparent',
                      border: 0,
                      borderTop: i === 0 ? 0 : 'var(--border-width) solid var(--border-subtle)',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                      <span style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)' }}>{customer.name}</span>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 'var(--text-mono-sm)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {customer.phone}
                        {customer.identificationNumber ? ` · ${customer.identificationNumber}` : ''}
                      </span>
                    </span>
                    {active && <Check size={16} strokeWidth={2.2} color="var(--accent-fill)" style={{ flex: '0 0 auto' }} />}
                  </button>
                )
              })
            )}
          </div>

          {selectedId && (
            <p style={{ margin: 0, fontSize: 'var(--text-small)', color: 'var(--text-secondary)' }}>
              La orden quedará a nombre de{' '}
              <span style={{ color: 'var(--text-primary)' }}>{formData.customerName}</span>.
            </p>
          )}
        </>
      ) : (
        <>
          <div style={twoUp}>
            <FormField label="Nombre completo" required>
              <Input
                size={size}
                value={formData.customerName}
                onChange={(e) => onFormDataChange({ customerName: e.target.value })}
                placeholder="Andrés Chavarría"
                autoComplete="name"
              />
            </FormField>
            <FormField label="Teléfono" required>
              <Input
                size={size}
                mono
                inputMode="tel"
                value={formData.customerPhone}
                onChange={(e) => onFormDataChange({ customerPhone: e.target.value })}
                placeholder="3001234567"
                autoComplete="tel"
              />
            </FormField>
          </div>

          <div style={twoUp}>
            <FormField label="Tipo de identificación">
              <Select
                size={size}
                value={formData.customerIdentificationType}
                onChange={(e) => onFormDataChange({ customerIdentificationType: e.target.value })}
                placeholder="Sin especificar"
                options={identificationTypes.map((t) => ({ value: t, label: t }))}
              />
            </FormField>
            <FormField label="Número de identificación">
              <Input
                size={size}
                mono
                value={formData.customerIdentificationNumber}
                onChange={(e) => onFormDataChange({ customerIdentificationNumber: e.target.value })}
                placeholder="1234567890"
              />
            </FormField>
          </div>

          <FormField label="Correo" hint="Opcional. Sirve para avisarle cuando el equipo esté listo.">
            <Input
              size={size}
              type="email"
              value={formData.customerEmail}
              onChange={(e) => onFormDataChange({ customerEmail: e.target.value })}
              placeholder="cliente@correo.com"
              autoComplete="email"
            />
          </FormField>
        </>
      )}
    </div>
  )
}
