import { useEffect, useState } from 'react'
import { Lock, Upload, X } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { Button, FieldGroup, FormField, Input, Select, Tabs, Textarea, type TabItem } from '../oryon'
import { FormDialog } from '../layout/FormDialog'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { PatternLock } from '../PatternLock'
import { CustomerSelector } from './CustomerSelector'
import { Customer, RepairFormData } from './types'
import { deviceTypes } from './constants'

/**
 * Alta de orden de reparación.
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
  onSubmit: (formData: RepairFormData, uploadedImages: string[], selectedCustomerId: number | null) => Promise<void>
}


const emptyForm = (branchId?: string): RepairFormData => ({
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  customerIdentificationType: '',
  customerIdentificationNumber: '',
  deviceType: 'celular',
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
})

export function NewRepairDialog({
  open,
  onOpenChange,
  customers,
  identificationTypes,
  branches,
  userRole,
  onSubmit,
}: NewRepairDialogProps) {
  const [formData, setFormData] = useState<RepairFormData>(() => emptyForm(branches[0]?.id))
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<'customerName' | 'customerPhone' | 'deviceBrand' | 'deviceModel' | 'problem' | 'estimatedCost', string>>>({})

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
    if (!formData.problem.trim()) next.problem = 'Describe la falla que reporta el cliente.'
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
      setFormData(emptyForm(branches[0]?.id))
      setUploadedImages([])
      setSelectedCustomerId(null)
      setErrors({})
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onClose={() => onOpenChange(false)}
      title="Nueva orden de reparación"
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
        {/* ── Quién trae el equipo y cuál es ──────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, minWidth: 0 }}>
          <FieldGroup title="Cliente">
            <CustomerSelector
              customers={customers}
              identificationTypes={identificationTypes}
              formData={formData}
              onFormDataChange={change}
              onCustomerSelect={setSelectedCustomerId}
            />
            {(errors.customerName || errors.customerPhone) && (
              <p role="alert" style={{ margin: 0, fontSize: 'var(--text-caption)', color: 'var(--danger)' }}>
                {errors.customerName ?? errors.customerPhone}
              </p>
            )}
          </FieldGroup>

          <FieldGroup title="Equipo">
            <div style={twoUp}>
              <FormField label="Tipo">
                <Select
                  size={size}
                  value={formData.deviceType}
                  onChange={(e) => change({ deviceType: e.target.value })}
                  options={deviceTypes.map((t) => ({ value: t.value, label: t.label }))}
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
                <Input size={size} value={formData.deviceBrand} onChange={(e) => change({ deviceBrand: e.target.value })} placeholder="Apple" />
              </FormField>
              <FormField label="Modelo" required error={errors.deviceModel}>
                <Input size={size} value={formData.deviceModel} onChange={(e) => change({ deviceModel: e.target.value })} placeholder="iPhone 12" />
              </FormField>
            </div>

            <div style={twoUp}>
              <FormField label="IMEI" hint="Opcional">
                <Input size={size} mono inputMode="numeric" value={formData.imei} onChange={(e) => change({ imei: e.target.value })} placeholder="356938035643809" />
              </FormField>
              <FormField label="Número de serie" hint="Opcional">
                <Input size={size} mono value={formData.serialNumber} onChange={(e) => change({ serialNumber: e.target.value })} placeholder="SN123456789" />
              </FormField>
            </div>
          </FieldGroup>

          <FieldGroup title="Estado de recepción" hint="Las fotos son la prueba de cómo llegó el equipo. Evitan discusiones al entregar.">
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
            <FormField label="Falla reportada" required error={errors.problem}>
              <Textarea
                rows={3}
                value={formData.problem}
                onChange={(e) => change({ problem: e.target.value })}
                placeholder="Lo que dice el cliente, con sus palabras."
              />
            </FormField>

            <FormField label="Costo estimado" required error={errors.estimatedCost} hint="Lo que se le dice al cliente al recibir el equipo.">
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
              <Textarea rows={2} value={formData.notes} onChange={(e) => change({ notes: e.target.value })} placeholder="Detalles para el técnico." />
            </FormField>
          </FieldGroup>

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

        </div>
      </form>
    </FormDialog>
  )
}
