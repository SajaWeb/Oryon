import { useEffect, useState } from 'react'
import { Alert, Button, FieldGroup, FormField, Input, Select } from '../oryon'
import { FormDialog } from '../layout/FormDialog'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import type { Branch } from './types'

const FORM_ID = 'abrir-caja-form'

/**
 * Apertura de caja: la base declarada.
 *
 * Se abre también desde el cobro cuando no hay caja: bloquear al usuario con un
 * cliente delante y mandarlo a otra pantalla sería el peor momento posible.
 */
export function OpenCashDialog({
  open,
  onClose,
  branches,
  defaultBranchId,
  lockBranch = false,
  submitting,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  branches: Branch[]
  defaultBranchId?: string
  /** Cuando se abre desde un cobro, la sucursal ya está decidida. */
  lockBranch?: boolean
  submitting: boolean
  onSubmit: (branchId: string, baseAmount: number) => Promise<void>
}) {
  const [branchId, setBranchId] = useState(defaultBranchId ?? branches[0]?.id ?? '')
  const [base, setBase] = useState('')
  const [error, setError] = useState<string | undefined>()

  const { isMobile } = useBreakpoint()
  const size = isMobile ? 'lg' : 'md'

  useEffect(() => {
    if (!open) return
    setBranchId(defaultBranchId ?? branches[0]?.id ?? '')
    setBase('')
    setError(undefined)
  }, [open, defaultBranchId, branches])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!branchId) return setError('Elige la sucursal.')
    const amount = Number(base)
    if (base === '' || !Number.isFinite(amount) || amount < 0) {
      return setError('Escribe con cuánto dinero empieza el cajón. Si empieza vacío, escribe 0.')
    }
    setError(undefined)
    await onSubmit(branchId, amount)
  }

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      size="md"
      title="Abrir caja"
      description="Cuenta el dinero con el que empieza el cajón y déjalo registrado."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} variant="primary" loading={submitting} disabled={submitting}>
            Abrir caja
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <FieldGroup title="Apertura">
          <FormField label="Sucursal" required>
            <Select
              size={size}
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              disabled={lockBranch || branches.length <= 1}
              placeholder="Elige la sucursal"
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
            />
          </FormField>

          <FormField
            label="Base"
            required
            error={error}
            hint="El efectivo que hay en el cajón antes de la primera venta."
          >
            <Input
              size={size}
              type="number"
              min="0"
              inputMode="decimal"
              mono
              value={base}
              onChange={(e) => {
                setBase(e.target.value)
                setError(undefined)
              }}
              placeholder="0"
              autoFocus
            />
          </FormField>
        </FieldGroup>

        <Alert variant="info" title="Qué pasa después">
          Cada venta y cada factura de reparación de esta sucursal entrarán solas en esta caja. Al cerrar,
          compararemos lo que contaste con lo que debería haber.
        </Alert>
      </form>
    </FormDialog>
  )
}
