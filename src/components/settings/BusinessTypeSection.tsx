import { useState } from 'react'
import { toast } from 'sonner@2.0.3'
import { Button, Card, ConfirmDialog } from '../oryon'
import { BusinessTypePicker } from '../auth/BusinessTypePicker'
import { useBusiness } from '../../utils/BusinessContext'
import { getErrorMessage, makeAuthenticatedRequest } from '../../utils/api'
import { getBusinessProfile, type BusinessTypeId } from '../../config/businessTypes'

/**
 * Tipo de comercio de la empresa. Solo el administrador lo cambia.
 *
 * Cambiarlo no toca datos: las órdenes y productos guardados siguen igual. Lo
 * que cambia es el vocabulario, los campos de las órdenes nuevas y las
 * categorías que se ofrecen. Por eso pide confirmación, pero no es destructivo.
 */
export function BusinessTypeSection({ accessToken }: { accessToken: string | null }) {
  const { businessType, setBusinessType } = useBusiness()
  const [selected, setSelected] = useState<BusinessTypeId>(businessType)
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)

  const dirty = selected !== businessType
  const next = getBusinessProfile(selected)

  const save = async () => {
    setSaving(true)
    try {
      const res = await makeAuthenticatedRequest<{ success: boolean; error?: string }>('/company/business-type', accessToken, {
        method: 'PUT',
        body: JSON.stringify({ businessType: selected }),
      })
      if (!res.success) {
        toast.error(res.error || 'No se pudo cambiar el tipo de comercio')
        return
      }
      setBusinessType(selected)
      toast.success(`Oryon ahora está preparado para ${next.label.toLowerCase()}`)
      setConfirming(false)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card
      title="Tipo de comercio"
      subtitle="Define el vocabulario, los campos de cada orden y las categorías de inventario."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <BusinessTypePicker value={selected} onChange={setSelected} compact name="settingsBusinessType" disabled={saving} />
        {dirty && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setSelected(businessType)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => setConfirming(true)} disabled={saving}>
              Guardar cambio
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirming}
        tone="primary"
        title={`¿Cambiar a ${next.label.toLowerCase()}?`}
        description="Las órdenes, clientes y productos que ya tienes se conservan tal cual. Cambian las etiquetas, los campos de las órdenes nuevas y las categorías de inventario que se ofrecen."
        confirmLabel="Cambiar"
        loading={saving}
        onConfirm={save}
        onCancel={() => setConfirming(false)}
      />
    </Card>
  )
}
