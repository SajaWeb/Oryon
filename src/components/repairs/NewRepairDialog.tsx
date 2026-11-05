import { useEffect, useMemo, useState } from 'react'
import { History, Lock, Upload, X } from 'lucide-react'
import { Alert, Button, FieldGroup, FormField, Input, Select, Tabs, Textarea, type TabItem } from '../oryon'
import { FormDialog } from '../layout/FormDialog'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { PatternLock } from '../PatternLock'
import { useBusiness } from '../../utils/BusinessContext'
import { cap, computeAssetKey, thisAsset, type BusinessProfile } from '../../config/businessTypes'
import { CustomerSelector, type CustomerPreselect } from './CustomerSelector'
import { Customer, RepairFormData } from './types'
import { useAssetHistory } from './hooks/useAssetHistory'
import { AssetFields, readField } from './ui/AssetFields'
import { entryMileage, historySummary } from './ui/AssetHistory'

/**
 * Alta de orden de reparación o de servicio.
 *
 * El formulario se arma desde el perfil del comercio (config/businessTypes):
 * un taller de motos pide placa, cilindraje y kilometraje; uno de celulares,
 * IMEI y clave de desbloqueo. Al escribir el identificador (placa, IMEI,
 * serial de marco) aparecen las visitas anteriores y se pueden reusar sus datos.
 *
 * En escritorio va a dos columnas: a la izquierda quién trae el equipo y cuál es,
 * a la derecha qué le pasa y qué se acordó. Antes eran once bloques apilados en
 * 672px, con el costo estimado —lo que el cliente firma— al final del scroll.
 *
 * El bloque de contraseña/patrón se queda en la derecha junto al problema: son los
 * datos que el técnico necesita para empezar a trabajar.
 */

export const REPAIR_FORM_ID = 'nueva-orden-form'

const PASSWORD_MODES: TabItem[] = [
  { id: 'text', label: 'PIN o contraseña' },
  { id: 'pattern', label: 'Patrón' },
]

interface Branch {
  id: string
  name: string
}

interface NewRepairDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customers: Customer[]
  identificationTypes: string[]
  branches: Branch[]
  userRole?: string
  accessToken: string | null
  onSubmit: (formData: RepairFormData, uploadedImages: string[], selectedCustomerId: number | null) => Promise<void>
}


const emptyForm = (profile: BusinessProfile, branchId?: string): RepairFormData => ({
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  customerIdentificationType: '',
  customerIdentificationNumber: '',
  deviceType: profile.assetTypes[0]?.value ?? 'otro',
  deviceBrand: '',
  deviceModel: '',
  imei: '',
  serialNumber: '',
  problem: '',
  estimatedCost: '',
  notes: '',
  devicePasswordType: 'text',
  devicePassword: '',
  devicePattern: [],
  branchId,
  assetDetails: {},
})

export function NewRepairDialog({
  open,
  onOpenChange,
  customers,
  identificationTypes,
  branches,
  userRole,
  accessToken,
  onSubmit,
}: NewRepairDialogProps) {
  const { profile } = useBusiness()
  const { vocab } = profile
  const [formData, setFormData] = useState<RepairFormData>(() => emptyForm(profile, branches[0]?.id))
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [customerPreselect, setCustomerPreselect] = useState<CustomerPreselect | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})

  /* El identificador va arriba, solo: es lo primero que se escribe y lo que
     dispara el historial. El resto de campos del comercio va tras marca y modelo. */
  const identifier = profile.assetFields.find((f) => f.key === profile.identifierKey)
  const otherFields = profile.assetFields.filter((f) => f.key !== profile.identifierKey)

  const assetKey = computeAssetKey(formData, profile)
  const history = useAssetHistory(accessToken, assetKey)
  const lastVisit = history.entries[0]
  const lastMileage = lastVisit ? entryMileage(lastVisit) : null
  const currentMileage = Number(formData.assetDetails?.mileage)
  const mileageWentBack = lastMileage != null && Number.isFinite(currentMileage) && currentMileage > 0 && currentMileage < lastMileage

  /* Si el admin cambia el tipo de comercio con el formulario cerrado, el
     siguiente alta arranca con los tipos de bien del comercio nuevo. */
  useEffect(() => {
    setFormData((prev) => ({ ...emptyForm(profile, prev.branchId) }))
    setErrors({})
  }, [profile.id])

  /** Reusar la última visita: tipo, marca, modelo, datos fijos del bien y cliente. */
  const applyLastVisit = () => {
    if (!lastVisit) return
    // El kilometraje y la falla son de hoy, no de la visita anterior.
    const { mileage: _km, ...stableDetails } = lastVisit.assetDetails ?? {}
    setFormData((prev) => ({
      ...prev,
      deviceType: lastVisit.deviceType || prev.deviceType,
      deviceBrand: lastVisit.deviceBrand || prev.deviceBrand,
      deviceModel: lastVisit.deviceModel || prev.deviceModel,
      imei: prev.imei || lastVisit.imei || '',
      serialNumber: prev.serialNumber || lastVisit.serialNumber || '',
      assetDetails: { ...stableDetails, ...pickNonEmpty(prev.assetDetails) },
      customerName: lastVisit.customerName || prev.customerName,
      customerPhone: lastVisit.customerPhone || prev.customerPhone,
      customerEmail: lastVisit.customerEmail || prev.customerEmail,
    }))
    setErrors({})
    setCustomerPreselect({ id: lastVisit.customerId, nonce: Date.now() })
  }

  const { isMobile, isDesktop } = useBreakpoint()
  const size = isMobile ? 'lg' : 'md'
  const twoUp = { display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'repeat(2, minmax(0,1fr))', gap: 12 } as const

  useEffect(() => {
    if (branches.length > 0 && !formData.branchId) {
      setFormData((prev) => ({ ...prev, branchId: branches[0].id }))
    }
  }, [branches, formData.branchId])

  const change = (data: Partial<RepairFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }))
    setErrors((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(data)) delete next[key as keyof typeof next]
      return next
    })
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => setUploadedImages((prev) => [...prev, reader.result as string])
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => setUploadedImages((prev) => prev.filter((_, i) => i !== index))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const next: typeof errors = {}
    if (!formData.customerName.trim()) next.customerName = 'Elige un cliente o escribe su nombre.'
    if (!formData.customerPhone.trim()) next.customerPhone = 'El teléfono es como se le avisa al cliente.'
    if (!formData.deviceBrand.trim()) next.deviceBrand = 'Escribe la marca.'
    if (!formData.deviceModel.trim()) next.deviceModel = 'Escribe el modelo.'
    for (const field of profile.assetFields) {
      if (field.required && !readField(formData, field).trim()) next[field.key] = `Escribe ${field.label.toLowerCase()}.`
    }
    if (!formData.problem.trim()) next.problem = `Escribe ${vocab.problem.toLowerCase()}.`
    if (formData.estimatedCost === '' || Number(formData.estimatedCost) < 0) {
      next.estimatedCost = 'Escribe el costo estimado, aunque sea 0.'
    }

    setErrors(next)
    if (Object.keys(next).length > 0) {
      document.querySelector<HTMLElement>(`#${REPAIR_FORM_ID} [aria-invalid="true"]`)?.focus()
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(formData, uploadedImages, selectedCustomerId)
      setFormData(emptyForm(profile, branches[0]?.id))
      setUploadedImages([])
      setSelectedCustomerId(null)
      setCustomerPreselect(null)
      setErrors({})
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onClose={() => onOpenChange(false)}
      title={profile.id === 'electronica' ? 'Nueva orden de reparación' : `Nueva ${vocab.order}`}
      description="Los campos con * son los que necesita la orden para poder entregarse y cobrarse."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form={REPAIR_FORM_ID} variant="primary" loading={submitting} disabled={submitting}>
            {submitting && uploadedImages.length > 0 ? 'Subiendo fotos' : 'Crear orden'}
          </Button>
        </>
      }
    >
      <form
        id={REPAIR_FORM_ID}
        onSubmit={handleSubmit}
        noValidate
        style={{
          display: 'grid',
          gridTemplateColumns: isDesktop ? 'minmax(0,1fr) minmax(0,1fr)' : 'minmax(0,1fr)',
          alignItems: 'start',
          gap: isDesktop ? 28 : 22,
        }}
      >
        {/* ── Quién trae el bien y cuál es ──────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, minWidth: 0 }}>
          <FieldGroup title="Cliente">
            <CustomerSelector
              customers={customers}
              identificationTypes={identificationTypes}
              formData={formData}
              onFormDataChange={change}
              onCustomerSelect={setSelectedCustomerId}
              preselect={customerPreselect}
            />
            {(errors.customerName || errors.customerPhone) && (
              <p role="alert" style={{ margin: 0, fontSize: 'var(--text-caption)', color: 'var(--danger)' }}>
                {errors.customerName ?? errors.customerPhone}
              </p>
            )}
          </FieldGroup>

          <FieldGroup title={cap(vocab.asset)}>
            {identifier && profile.id !== 'electronica' && (
              <>
                <AssetFields fields={[identifier]} formData={formData} onChange={change} size={size} columns={1} errors={errors} />
                {lastVisit && (
                  <Alert variant="info" title={`Ya conocemos ${thisAsset(profile)}`}>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
                      <span>{historySummary(history.entries)}{lastVisit.customerName ? ` · ${lastVisit.customerName}` : ''}</span>
                      <Button size="sm" variant="secondary" iconLeft={History} onClick={applyLastVisit}>
                        Usar datos
                      </Button>
                    </span>
                  </Alert>
                )}
              </>
            )}

            <div style={twoUp}>
              <FormField label="Tipo">
                <Select
                  size={size}
                  value={formData.deviceType}
                  onChange={(e) => change({ deviceType: e.target.value })}
                  options={profile.assetTypes}
                />
              </FormField>
              <FormField label="Sucursal" required hint={branches.length === 1 ? `Se asignará a ${branches[0].name}` : undefined}>
                <Select
                  size={size}
                  value={formData.branchId ?? ''}
                  onChange={(e) => change({ branchId: e.target.value })}
                  placeholder="Elige la sucursal"
                  disabled={userRole !== 'admin' && branches.length === 1}
                  options={branches.map((b) => ({ value: b.id, label: b.name }))}
                />
              </FormField>
            </div>

            <div style={twoUp}>
              <FormField label="Marca" required error={errors.deviceBrand}>
                <Input size={size} value={formData.deviceBrand} onChange={(e) => change({ deviceBrand: e.target.value })} placeholder={profile.brandPlaceholder} />
              </FormField>
              <FormField label="Modelo" required error={errors.deviceModel}>
                <Input size={size} value={formData.deviceModel} onChange={(e) => change({ deviceModel: e.target.value })} placeholder={profile.modelPlaceholder} />
              </FormField>
            </div>

            <AssetFields
              fields={profile.id === 'electronica' ? profile.assetFields : otherFields}
              formData={formData}
              onChange={change}
              size={size}
              columns={isMobile ? 1 : 2}
              errors={errors}
            />

            {/* En electrónica el IMEI va con los demás campos; el historial, debajo. */}
            {profile.id === 'electronica' && lastVisit && (
              <Alert variant="info" title={`Ya conocemos ${thisAsset(profile)}`}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
                  <span>{historySummary(history.entries)}{lastVisit.customerName ? ` · ${lastVisit.customerName}` : ''}</span>
                  <Button size="sm" variant="secondary" iconLeft={History} onClick={applyLastVisit}>
                    Usar datos
                  </Button>
                </span>
              </Alert>
            )}

            {mileageWentBack && (
              <Alert variant="warning" title="El kilometraje es menor que en la última visita">
                La última vez se registraron {lastMileage!.toLocaleString('es-CO')} km. Revisa que esté bien escrito.
              </Alert>
            )}
          </FieldGroup>

          <FieldGroup title="Estado de recepción" hint={`Las fotos son la prueba de cómo llegó ${profile.vocab.article} ${vocab.asset}. Evitan discusiones al entregar.`}>
            <label
              htmlFor="image-upload"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '18px 12px',
                background: 'var(--bg-sunken)',
                border: '1px dashed var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              <Upload size={22} strokeWidth={1.6} color="var(--text-tertiary)" />
              <span style={{ fontSize: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                {isMobile ? 'Toca para tomar o subir fotos' : 'Haz clic para subir fotos'}
              </span>
              <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>PNG o JPG, hasta 5 MB</span>
            </label>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />

            {uploadedImages.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8 }}>
                {uploadedImages.map((image, index) => (
                  <div key={index} style={{ position: 'relative' }}>
                    <img
                      src={image}
                      alt={`Foto ${index + 1}`}
                      style={{
                        display: 'block',
                        width: '100%',
                        height: 72,
                        objectFit: 'cover',
                        border: 'var(--border-width) solid var(--border-default)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      aria-label={`Quitar foto ${index + 1}`}
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        display: 'grid',
                        placeItems: 'center',
                        width: 22,
                        height: 22,
                        color: '#fff',
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
        </div>

        {/* ── Qué le pasa y qué se acordó ──────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, minWidth: 0 }}>
          <FieldGroup title="Servicio">
            <FormField label={vocab.problem} required error={errors.problem}>
              <Textarea
                rows={3}
                value={formData.problem}
                onChange={(e) => change({ problem: e.target.value })}
                placeholder={vocab.problemPlaceholder}
              />
            </FormField>

            <FormField label="Costo estimado" required error={errors.estimatedCost} hint={`Lo que se le dice al cliente al recibir ${profile.vocab.article} ${vocab.asset}.`}>
              <Input
                size={size}
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                mono
                value={formData.estimatedCost}
                onChange={(e) => change({ estimatedCost: e.target.value })}
                placeholder="0"
              />
            </FormField>

            <FormField label="Notas internas" hint="No las ve el cliente.">
              <Textarea rows={2} value={formData.notes} onChange={(e) => change({ notes: e.target.value })} placeholder={`Detalles para el ${vocab.technician.toLowerCase()}.`} />
            </FormField>
          </FieldGroup>

          {profile.devicePassword && (
          <FieldGroup title="Desbloqueo" hint="Opcional, pero sin esto el técnico no puede probar el equipo.">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-tertiary)' }}>
              <Lock size={14} strokeWidth={1.8} />
              <Tabs
                items={PASSWORD_MODES}
                value={formData.devicePasswordType}
                onChange={(value) => change({ devicePasswordType: value as 'text' | 'pattern', devicePassword: '', devicePattern: [] })}
                style={{ flex: 1 }}
              />
            </div>

            {formData.devicePasswordType === 'text' ? (
              <FormField label="PIN o contraseña">
                <Input
                  size={size}
                  mono
                  value={formData.devicePassword}
                  onChange={(e) => change({ devicePassword: e.target.value })}
                  placeholder="1234"
                />
              </FormField>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <PatternLock
                  value={formData.devicePattern}
                  onPatternComplete={(pattern) => change({ devicePattern: pattern })}
                />
                <p style={{ margin: 0, fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>
                  Dibuja el patrón tal como lo hace el cliente.
                </p>
              </div>
            )}
          </FieldGroup>
          )}

        </div>
      </form>
    </FormDialog>
  )
}

/** Solo los valores ya escritos: lo que el usuario tecleó gana a lo reusado. */
function pickNonEmpty(details?: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(details ?? {})) if (v) out[k] = v
  return out
}
