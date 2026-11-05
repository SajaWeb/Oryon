import { FormField, Input, Select } from '../../oryon'
import type { FieldDef } from '../../../config/businessTypes'
import type { RepairFormData } from '../types'

/**
 * Campos propios del comercio, generados desde el perfil: placa y kilometraje
 * en un taller de motos, IMEI en uno de celulares, talla y rodado en bicicletas.
 *
 * Cada campo sabe dónde vive: en una columna clásica de la orden (`imei`,
 * `serialNumber`) o dentro de `assetDetails`.
 */
export function readField(formData: RepairFormData, field: FieldDef): string {
  if (field.source) return String(formData[field.source] ?? '')
  return formData.assetDetails?.[field.key] ?? ''
}

export function writeField(formData: RepairFormData, field: FieldDef, value: string): Partial<RepairFormData> {
  const v = field.uppercase ? value.toUpperCase() : value
  if (field.source) return { [field.source]: v } as Partial<RepairFormData>
  return { assetDetails: { ...(formData.assetDetails ?? {}), [field.key]: v } }
}

export function AssetFields({
  fields,
  formData,
  onChange,
  size,
  columns,
  errors,
}: {
  fields: FieldDef[]
  formData: RepairFormData
  onChange: (data: Partial<RepairFormData>) => void
  size: 'md' | 'lg'
  columns: 1 | 2
  errors?: Record<string, string | undefined>
}) {
  if (fields.length === 0) return null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: columns === 1 ? 'minmax(0,1fr)' : 'repeat(2, minmax(0,1fr))', gap: 12 }}>
      {fields.map((field) => {
        const value = readField(formData, field)
        const label = field.unit ? `${field.label} (${field.unit})` : field.label
        return (
          <FormField key={field.key} label={label} required={field.required} hint={field.hint} error={errors?.[field.key]}>
            {field.type === 'select' ? (
              <Select
                size={size}
                value={value}
                onChange={(e) => onChange(writeField(formData, field, e.target.value))}
                placeholder="Sin especificar"
                options={field.options ?? []}
              />
            ) : (
              <Input
                size={size}
                mono={field.mono}
                type={field.type === 'number' ? 'number' : 'text'}
                min={field.type === 'number' ? 0 : undefined}
                inputMode={field.inputMode}
                value={value}
                onChange={(e) => onChange(writeField(formData, field, e.target.value))}
                placeholder={field.placeholder}
                autoCapitalize={field.uppercase ? 'characters' : undefined}
              />
            )}
          </FormField>
        )
      })}
    </div>
  )
}
