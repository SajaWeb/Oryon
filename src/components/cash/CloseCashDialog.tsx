import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, FieldGroup, FormField, Input, KeyValue, Textarea } from '../oryon'
import { FormDialog } from '../layout/FormDialog'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import type { CashTotals } from './types'

const FORM_ID = 'cerrar-caja-form'

const money = (n: number) => `$${Number(n || 0).toLocaleString('es-CO')}`

/**
 * Arqueo de cierre.
 *
 * El orden importa: primero se cuenta el cajón y se escribe, y solo entonces
 * aparece la diferencia. Si enseñáramos el esperado antes, el conteo dejaría de
 * ser un conteo y pasaría a ser una confirmación — que es justo lo que un arqueo
 * existe para evitar.
 */
export function CloseCashDialog({
  open,
  onClose,
  totals,
  submitting,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  totals: CashTotals
  submitting: boolean
  onSubmit: (countedAmount: number, notes: string) => Promise<void>
}) {
  const [counted, setCounted] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | undefined>()

  const { isMobile } = useBreakpoint()
  const size = isMobile ? 'lg' : 'md'

  useEffect(() => {
    if (!open) return
    setCounted('')
    setNotes('')
    setError(undefined)
  }, [open])

  const difference = useMemo(() => {
    if (counted === '') return null
    const value = Number(counted)
    if (!Number.isFinite(value)) return null
    return value - totals.expectedCash
  }, [counted, totals.expectedCash])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = Number(counted)
    if (counted === '' || !Number.isFinite(value) || value < 0) {
      return setError('Escribe cuánto dinero contaste en el cajón.')
    }
    setError(undefined)
    await onSubmit(value, notes.trim())
  }

  const tone = difference === null ? null : difference === 0 ? 'ok' : difference > 0 ? 'over' : 'short'

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      size="md"
      title="Cerrar caja"
      description="Cuenta el efectivo del cajón y escríbelo. Después verás si cuadra."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} variant="primary" loading={submitting} disabled={submitting}>
            Cerrar caja
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <FieldGroup title="Conteo">
          <FormField
            label="Efectivo contado"
            required
            error={error}
            hint="Solo billetes y monedas del cajón. Lo de tarjeta o Nequi no se cuenta aquí."
          >
            <Input
              size={size}
              type="number"
              min="0"
              inputMode="decimal"
              mono
              value={counted}
              onChange={(e) => {
                setCounted(e.target.value)
                setError(undefined)
              }}
              placeholder="0"
              autoFocus
            />
          </FormField>
        </FieldGroup>

        {difference !== null && (
          <FieldGroup title="Resultado">
            <KeyValue
              items={[
                { label: 'Debería haber', value: money(totals.expectedCash), mono: true },
                { label: 'Contaste', value: money(Number(counted)), mono: true },
              ]}
            />
            {tone === 'ok' && (
              <Alert variant="success" title="Cuadra exacto">
                El cajón coincide con lo registrado.
              </Alert>
            )}
            {tone === 'short' && (
              <Alert variant="danger" title={`Faltan ${money(Math.abs(difference))}`}>
                Antes de cerrar, revisa si quedó algún gasto sin registrar. La diferencia queda guardada a tu nombre.
              </Alert>
            )}
            {tone === 'over' && (
              <Alert variant="warning" title={`Sobran ${money(difference)}`}>
                Suele ser un cobro que no se registró, o un vuelto mal dado. Anótalo abajo antes de cerrar.
              </Alert>
            )}
          </FieldGroup>
        )}

        <FormField label="Observaciones" hint={tone && tone !== 'ok' ? 'Explica la diferencia: es lo que se revisará después.' : 'Opcional.'}>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="" />
        </FormField>

        <Alert variant="info" title="Después de cerrar">
          No se podrán registrar más cobros en esta sucursal hasta abrir una caja nueva.
        </Alert>
      </form>
    </FormDialog>
  )
}
