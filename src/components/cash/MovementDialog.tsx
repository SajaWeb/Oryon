import { useEffect, useState } from 'react'
import { Button, FieldGroup, FormField, Input, RadioCard, Textarea } from '../oryon'
import { FormDialog } from '../layout/FormDialog'
import { useBreakpoint } from '../../hooks/useBreakpoint'

const FORM_ID = 'movimiento-caja-form'

/* Conceptos que salen a diario en un taller. Escribir a mano «almuerzo» veinte
   veces al mes es lo que hace que la gente deje de registrar los gastos. */
const QUICK_OUT = ['Almuerzo', 'Domicilio', 'Repuesto comprado', 'Retiro a banco', 'Transporte']
const QUICK_IN = ['Abono de cliente', 'Devolución de proveedor', 'Aporte del dueño']

export function MovementDialog({
  open,
  onClose,
  submitting,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  submitting: boolean
  onSubmit: (movement: { type: 'in' | 'out'; amount: number; concept: string; notes?: string }) => Promise<void>
}) {
  const [type, setType] = useState<'in' | 'out'>('out')
  const [amount, setAmount] = useState('')
  const [concept, setConcept] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<{ amount?: string; concept?: string }>({})

  const { isMobile } = useBreakpoint()
  const size = isMobile ? 'lg' : 'md'
  const quick = type === 'out' ? QUICK_OUT : QUICK_IN

  useEffect(() => {
    if (!open) return
    setType('out')
    setAmount('')
    setConcept('')
    setNotes('')
    setErrors({})
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    const value = Number(amount)
    if (amount === '' || !Number.isFinite(value) || value <= 0) next.amount = 'El monto tiene que ser mayor que 0.'
    if (!concept.trim()) next.concept = 'Escribe en qué se gastó o de dónde entró.'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    await onSubmit({ type, amount: value, concept: concept.trim(), notes: notes.trim() || undefined })
  }

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      size="md"
      title="Movimiento de caja"
      description="Solo para dinero que no viene de una venta: las ventas entran solas."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} variant="primary" loading={submitting} disabled={submitting}>
            Registrar
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <FieldGroup title="Tipo">
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0,1fr))', gap: 8 }}>
            <RadioCard
              name="movement-type"
              checked={type === 'out'}
              onChange={() => {
                setType('out')
                setConcept('')
              }}
              title="Salida"
              description="Sale dinero del cajón"
            />
            <RadioCard
              name="movement-type"
              checked={type === 'in'}
              onChange={() => {
                setType('in')
                setConcept('')
              }}
              title="Entrada"
              description="Entra dinero que no es una venta"
            />
          </div>
        </FieldGroup>

        <FieldGroup title="Detalle">
          <FormField label="Monto" required error={errors.amount}>
            <Input
              size={size}
              type="number"
              min="0"
              inputMode="decimal"
              mono
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                setErrors((p) => ({ ...p, amount: undefined }))
              }}
              placeholder="0"
              autoFocus
            />
          </FormField>

          <FormField label="Concepto" required error={errors.concept}>
            <Input
              size={size}
              value={concept}
              onChange={(e) => {
                setConcept(e.target.value)
                setErrors((p) => ({ ...p, concept: undefined }))
              }}
              placeholder={type === 'out' ? 'Almuerzo' : 'Abono de cliente'}
            />
          </FormField>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {quick.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setConcept(q)
                  setErrors((p) => ({ ...p, concept: undefined }))
                }}
                style={{
                  padding: '4px 10px',
                  fontSize: 'var(--text-small)',
                  color: concept === q ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                  background: concept === q ? 'var(--accent-fill)' : 'var(--surface-card)',
                  border: `var(--border-width) solid ${concept === q ? 'var(--accent-fill)' : 'var(--border-default)'}`,
                  borderRadius: 'var(--radius-pill)',
                  cursor: 'pointer',
                }}
              >
                {q}
              </button>
            ))}
          </div>

          <FormField label="Nota" hint="Opcional. Por ejemplo, a quién se le pagó.">
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="" />
          </FormField>
        </FieldGroup>
      </form>
    </FormDialog>
  )
}
