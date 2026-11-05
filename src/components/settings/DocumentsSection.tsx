import { useEffect, useState } from 'react'
import { Plus, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button, Card, FormField, Input } from '../oryon'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { projectId } from '../../utils/supabase/info'

interface DocumentsSectionProps {
  accessToken: string
  identificationTypes: string[]
  setIdentificationTypes: (types: string[]) => void
}

/** Igual que el servidor al numerar: prefijo + 4 dígitos (FACT-0001). */
const invoicePreview = (prefix: string, n: number) => `${prefix || 'FACT'}-${String(Math.max(1, n || 1)).padStart(4, '0')}`

export function DocumentsSection({ accessToken, identificationTypes, setIdentificationTypes }: DocumentsSectionProps) {
  const { isMobile } = useBreakpoint()
  const size = isMobile ? 'lg' : 'md'
  const [newIdType, setNewIdType] = useState('')
  const [savingIds, setSavingIds] = useState(false)
  const [savingInvoice, setSavingInvoice] = useState(false)
  const [invoiceConfig, setInvoiceConfig] = useState({ prefix: 'FACT', startNumber: 1 })

  const api = (path: string, init?: RequestInit) =>
    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4d437e50${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${accessToken}`, ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
    }).then((r) => r.json())

  useEffect(() => {
    api('/company/print-config')
      .then((data) => {
        if (data.success && data.invoiceConfig) {
          setInvoiceConfig({ prefix: data.invoiceConfig.prefix || 'FACT', startNumber: data.invoiceConfig.startNumber || 1 })
        }
      })
      .catch((error) => console.error('Error loading invoice config:', error))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addIdType = () => {
    const value = newIdType.trim()
    if (!value) return
    if (identificationTypes.some((t) => t.toLowerCase() === value.toLowerCase())) {
      toast.info(`«${value}» ya está en la lista`)
      return
    }
    setIdentificationTypes([...identificationTypes, value])
    setNewIdType('')
  }

  const saveIdTypes = async () => {
    setSavingIds(true)
    try {
      const data = await api('/company/settings', { method: 'PUT', body: JSON.stringify({ identificationTypes }) })
      if (!data.success) throw new Error(data.error)
      toast.success('Tipos de documento guardados')
    } catch (error) {
      console.error('Error saving identification types:', error)
      toast.error('No se pudieron guardar los tipos de documento')
    } finally {
      setSavingIds(false)
    }
  }

  const saveInvoiceConfig = async () => {
    setSavingInvoice(true)
    try {
      const data = await api('/company/invoice-config', { method: 'PUT', body: JSON.stringify(invoiceConfig) })
      if (!data.success) throw new Error(data.error)
      toast.success('Numeración de facturas guardada')
    } catch (error) {
      console.error('Error saving invoice config:', error)
      toast.error('No se pudo guardar la numeración')
    } finally {
      setSavingInvoice(false)
    }
  }

  const saveButton = (onClick: () => void, loading: boolean) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <Button variant="primary" iconLeft={Save} onClick={onClick} loading={loading} disabled={loading}>
        Guardar
      </Button>
    </div>
  )

  return (
    <>
      <Card title="Documentos de identidad" subtitle="Los tipos que se ofrecen al registrar un cliente" footer={saveButton(saveIdTypes, savingIds)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {identificationTypes.length === 0 && (
              <span style={{ fontSize: 'var(--text-small)', color: 'var(--text-tertiary)' }}>Sin tipos. Agrega al menos uno.</span>
            )}
            {identificationTypes.map((type) => (
              <span
                key={type}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 30,
                  padding: '0 4px 0 10px',
                  background: 'var(--bg-sunken)',
                  border: 'var(--border-width) solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-small)',
                  color: 'var(--text-primary)',
                }}
              >
                {type}
                <button
                  type="button"
                  onClick={() => setIdentificationTypes(identificationTypes.filter((t) => t !== type))}
                  aria-label={`Quitar ${type}`}
                  style={{ display: 'grid', placeItems: 'center', width: 22, height: 22, background: 'none', border: 0, borderRadius: 'var(--radius-xs)', color: 'var(--text-tertiary)', cursor: 'pointer' }}
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              size={size}
              value={newIdType}
              onChange={(e) => setNewIdType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addIdType()
                }
              }}
              placeholder="Nuevo tipo, p. ej. Cédula de extranjería"
              aria-label="Nuevo tipo de documento"
            />
            <Button variant="secondary" size={size} iconLeft={Plus} onClick={addIdType} disabled={!newIdType.trim()}>
              Agregar
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Numeración de facturas" subtitle="Prefijo y consecutivo de las facturas de venta" footer={saveButton(saveInvoiceConfig, savingInvoice)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'repeat(2, minmax(0,1fr))', gap: 12 }}>
            <FormField label="Prefijo" hint="Letras que van antes del número: FACT, FV, VTA…">
              <Input
                size={size}
                mono
                value={invoiceConfig.prefix}
                onChange={(e) => setInvoiceConfig({ ...invoiceConfig, prefix: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                placeholder="FACT"
              />
            </FormField>
            <FormField label="Número inicial" hint="Solo cuenta si aún no has emitido ninguna factura; después sigue el consecutivo.">
              <Input
                size={size}
                mono
                type="number"
                min="1"
                inputMode="numeric"
                value={invoiceConfig.startNumber}
                onChange={(e) => setInvoiceConfig({ ...invoiceConfig, startNumber: parseInt(e.target.value) || 1 })}
              />
            </FormField>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 12,
              padding: '10px 12px',
              background: 'var(--bg-sunken)',
              border: 'var(--border-width) solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <span style={{ fontSize: 'var(--text-small)', color: 'var(--text-secondary)' }}>Así se verá</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-body-lg)', color: 'var(--text-primary)' }}>
              {invoicePreview(invoiceConfig.prefix, invoiceConfig.startNumber)}
            </span>
          </div>
        </div>
      </Card>
    </>
  )
}
