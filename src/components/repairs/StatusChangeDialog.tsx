import { useEffect, useMemo, useState } from 'react'
import { MessageCircle, Upload, X } from 'lucide-react'
import { toast } from 'sonner@2.0.3'
import { Alert, Button, FieldGroup, FormField, Select, StatusBadge, Switch, Textarea, normalizeState } from '../oryon'
import { FormDialog } from '../layout/FormDialog'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { useBusiness } from '../../utils/BusinessContext'
import { assetSummary } from '../../config/businessTypes'
import { statusUpdateMessage, toWhatsAppNumber, trackingUrl, whatsappUrl } from '../../utils/whatsapp'
import { Repair } from './types'
import { statusLabels } from './constants'

/**
 * Cambio de estado de una orden, con aviso opcional al cliente por WhatsApp.
 *
 * El aviso abre WhatsApp con el número del cliente y el mensaje ya escrito
 * (estado nuevo, nota y enlace de seguimiento); la persona lo revisa y lo envía.
 * La pestaña de WhatsApp se abre en el mismo clic —antes de esperar al
 * servidor— porque si se abre después, el navegador la bloquea como emergente.
 * Si falla el guardado, esa pestaña se cierra y no se avisa nada.
 */

interface StatusChangeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  repair: Repair | null
  /** Debe lanzar si falla: así el diálogo conserva la nota y no avisa al cliente. */
  onSubmit: (newStatus: string, notes: string, images: string[]) => Promise<void>
}

const FORM_ID = 'cambio-estado-form'
const NOTIFY_KEY = 'oryon-notify-whatsapp'

export function StatusChangeDialog({ open, onOpenChange, repair, onSubmit }: StatusChangeDialogProps) {
  const { profile, companyName } = useBusiness()
  const { isMobile } = useBreakpoint()
  const size = isMobile ? 'lg' : 'md'

  const [newStatus, setNewStatus] = useState('')
  const [notes, setNotes] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  /* Se recuerda la última elección: quien avisa siempre no tiene que marcarlo cada vez. */
  const [notify, setNotify] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(NOTIFY_KEY) !== '0'
    } catch {
      return true
    }
  })

  useEffect(() => {
    if (!open) return
    setNewStatus('')
    setNotes('')
    setImages([])
  }, [open, repair?.id])

  const waNumber = toWhatsAppNumber(repair?.customerPhone)
  const statusLabel = statusLabels[newStatus] ?? ''

  const message = useMemo(() => {
    if (!repair || !newStatus) return ''
    return statusUpdateMessage({
      customerName: repair.customerName,
      companyName,
      orderId: repair.id,
      assetLabel: profile.vocab.asset,
      assetDescription: assetSummary(repair, profile),
      statusLabel,
      notes,
      url: trackingUrl(repair.companyId, repair.id),
    })
  }, [repair, newStatus, statusLabel, notes, companyName, profile])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => setImages((prev) => [...prev, reader.result as string])
      reader.readAsDataURL(file)
    })
  }

  const toggleNotify = (value: boolean) => {
    setNotify(value)
    try {
      window.localStorage.setItem(NOTIFY_KEY, value ? '1' : '0')
    } catch {
      /* sin almacenamiento: solo dura esta sesión */
    }
  }

  const willNotify = notify && Boolean(waNumber)
  const sameStatus = Boolean(repair && newStatus === repair.status)

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!repair || !newStatus || sameStatus) return

    // En el mismo clic: después del await el navegador ya no la deja abrir.
    const waTab = willNotify ? window.open('', '_blank') : null
    const url = willNotify && waNumber ? whatsappUrl(waNumber, message) : ''

    setSubmitting(true)
    try {
      await onSubmit(newStatus, notes, images)
      if (!url) {
        toast.success('Estado actualizado', { description: `Orden #${repair.id} · ${statusLabel}` })
      } else {
        if (waTab) {
          waTab.opener = null
          waTab.location.href = url
          toast.success('Estado actualizado', { description: 'WhatsApp quedó abierto con el mensaje listo para enviar.' })
        } else {
          // Bloqueada igual (algunos navegadores): se ofrece el enlace a mano.
          toast.success('Estado actualizado', {
            description: 'Tu navegador bloqueó la ventana de WhatsApp.',
            action: { label: 'Abrir WhatsApp', onClick: () => window.open(url, '_blank', 'noopener') },
            duration: 12000,
          })
        }
      }
      onOpenChange(false)
    } catch {
      waTab?.close()
    } finally {
      setSubmitting(false)
    }
  }

  if (!repair) return null

  return (
    <FormDialog
      open={open}
      onClose={() => onOpenChange(false)}
      size="lg"
      title={`Cambiar estado · Orden #${repair.id}`}
      description={`${repair.customerName} · ${assetSummary(repair, profile)}`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            variant="primary"
            iconLeft={willNotify ? MessageCircle : undefined}
            loading={submitting}
            disabled={submitting || !newStatus || sameStatus}
          >
            {submitting ? (images.length > 0 ? 'Subiendo fotos' : 'Guardando') : willNotify ? 'Guardar y avisar por WhatsApp' : 'Guardar cambio'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <FieldGroup title="Estado">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            Ahora: <StatusBadge status={normalizeState(repair.status)} label={statusLabels[repair.status]} size="sm" />
          </div>
          <FormField label="Nuevo estado" required error={sameStatus ? 'La orden ya está en ese estado.' : undefined}>
            <Select
              size={size}
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              placeholder="Elige el estado"
              options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
              disabled={submitting}
            />
          </FormField>
          <FormField label="Nota del cambio" hint={willNotify ? 'Se incluye en el mensaje al cliente.' : 'Queda en el historial de la orden.'}>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Qué se hizo, qué sigue, cuándo puede pasar…"
              disabled={submitting}
            />
          </FormField>
        </FieldGroup>

        <FieldGroup title="Fotos" hint="Opcional. Quedan en el historial y en la página de seguimiento.">
          <label
            htmlFor="status-image-upload"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px',
              background: 'var(--bg-sunken)',
              border: '1px dashed var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: 'var(--text-small)',
              color: 'var(--text-secondary)',
            }}
          >
            <Upload size={16} strokeWidth={1.8} color="var(--text-tertiary)" />
            {isMobile ? 'Toca para tomar o subir fotos' : 'Haz clic para subir fotos'}
          </label>
          <input id="status-image-upload" type="file" accept="image/*" multiple capture="environment" onChange={handleImageUpload} style={{ display: 'none' }} />
          {images.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8 }}>
              {images.map((img, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <img
                    src={img}
                    alt={`Foto ${idx + 1}`}
                    style={{ display: 'block', width: '100%', height: 64, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: 'var(--border-width) solid var(--border-default)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                    aria-label={`Quitar foto ${idx + 1}`}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      display: 'grid',
                      placeItems: 'center',
                      width: 22,
                      height: 22,
                      color: 'var(--text-on-danger)',
                      background: 'var(--danger)',
                      border: 0,
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={13} strokeWidth={2.4} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </FieldGroup>

        <FieldGroup title="Avisar al cliente">
          {waNumber ? (
            <>
              <Switch
                checked={notify}
                onChange={(e) => toggleNotify(e.target.checked)}
                disabled={submitting}
                label={
                  <span>
                    Enviar el cambio por WhatsApp a{' '}
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{repair.customerPhone}</span>
                  </span>
                }
              />
              {notify && (
                <div
                  aria-label="Vista previa del mensaje"
                  style={{
                    padding: '10px 12px',
                    background: 'var(--bg-sunken)',
                    border: 'var(--border-width) solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-small)',
                    lineHeight: 'var(--lh-small)',
                    color: newStatus ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {newStatus ? message : 'Elige el nuevo estado para ver el mensaje que recibirá el cliente.'}
                </div>
              )}
            </>
          ) : (
            <Alert variant="warning" title="Esta orden no tiene un celular válido">
              {repair.customerPhone ? `«${repair.customerPhone}» no parece un número de WhatsApp.` : 'No hay teléfono registrado.'} El estado se
              guarda igual; el cliente puede verlo en la página de seguimiento.
            </Alert>
          )}
        </FieldGroup>
      </form>
    </FormDialog>
  )
}
