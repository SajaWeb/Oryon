/**
 * Alta y edición de producto.
 *
 * En escritorio el formulario va a dos columnas: a la izquierda lo que identifica
 * al producto (texto que se escribe de corrido), a la derecha las decisiones que
 * cambian cómo se comporta el inventario y cuánto cuesta. Antes era una sola
 * columna estrecha con doce campos apilados, y el método de seguimiento —que es
 * irreversible una vez creado el producto— quedaba a mitad del scroll.
 *
 * Las acciones no viven aquí: van en el pie del FormDialog, enlazadas por el id
 * del <form>.
 */

import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { FieldGroup, FormField, Input, RadioCard, Select, Textarea } from '../oryon'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { PRODUCT_CATEGORIES, TRACKING_METHODS } from './constants'
import type { Product, ProductFormData, Branch } from './types'

export const PRODUCT_FORM_ID = 'producto-form'

interface ProductFormProps {
  product?: Product | null
  branches: Branch[]
  onSubmit: (data: ProductFormData) => Promise<void>
  userRole?: string
  formId?: string
}

type FieldErrors = Partial<Record<'name' | 'price' | 'branchId' | 'quantity', string>>


const money = (value: string) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export function ProductForm({ product, branches, onSubmit, userRole, formId = PRODUCT_FORM_ID }: ProductFormProps) {
  const { isMobile, isDesktop } = useBreakpoint()
  const size = isMobile ? 'lg' : 'md'

  const emptyForm = (): ProductFormData => ({
    name: '',
    category: 'celulares',
    price: '',
    cost: '',
    storage: '',
    ram: '',
    color: '',
    description: '',
    trackByUnit: false,
    hasVariants: false,
    quantity: '',
    branchId: branches.length > 0 ? branches[0].id : '',
  })

  const [formData, setFormData] = useState<ProductFormData>(emptyForm)
  const [errors, setErrors] = useState<FieldErrors>({})

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        category: product.category,
        price: product.price.toString(),
        cost: product.cost ? product.cost.toString() : '',
        storage: product.storage || '',
        ram: product.ram || '',
        color: product.color || '',
        description: product.description,
        trackByUnit: product.trackByUnit || false,
        hasVariants: product.hasVariants || false,
        quantity: product.quantity ? product.quantity.toString() : '',
        branchId: product.branchId || (branches.length > 0 ? branches[0].id : ''),
      })
    } else {
      setFormData(emptyForm())
    }
    setErrors({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, branches])

  const isEditing = !!product
  const isSimple = !formData.trackByUnit && !formData.hasVariants
  const quantityLocked = isEditing && userRole === 'asesor'

  /* Margen en vivo: es el número por el que se pregunta al fijar un precio, y
     tenerlo delante evita la calculadora del celular.
     La fórmula es sobre el COSTO, igual que getMarginPercentage() en utils.ts y que
     la columna «Margen» del listado. Con (precio-costo)/precio salía otro número
     para el mismo producto según dónde se mirara. */
  const margin = useMemo(() => {
    const cost = money(formData.cost)
    const price = money(formData.price)
    if (cost <= 0 || price <= 0) return null
    return { amount: price - cost, percent: ((price - cost) / cost) * 100 }
  }, [formData.cost, formData.price])

  const updateField = (field: keyof ProductFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    /* Los errores se muestran en el campo que falla. Antes esto era un alert()
       del navegador: sacaba al usuario del formulario y solo decía el primer
       problema, sin señalar dónde estaba. */
    const next: FieldErrors = {}
    if (!formData.name.trim()) next.name = 'Escribe el nombre del producto.'
    if (!formData.price || money(formData.price) <= 0) next.price = 'El precio tiene que ser mayor que 0.'
    if (!formData.branchId) next.branchId = 'Elige la sucursal.'
    if (isSimple && (formData.quantity === '' || Number(formData.quantity) < 0)) {
      next.quantity = 'Escribe la cantidad, aunque sea 0.'
    }

    setErrors(next)
    if (Object.keys(next).length > 0) {
      const first = document.querySelector<HTMLElement>(`#${formId} [aria-invalid="true"]`)
      first?.focus()
      return
    }

    await onSubmit(formData)
  }

  const trackingNote = formData.hasVariants
    ? 'Las variantes (colores) se agregan después de crear el producto.'
    : formData.trackByUnit
      ? 'Las unidades con IMEI o serial se agregan después de crear el producto.'
      : null

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      noValidate
      style={{
        display: 'grid',
        gridTemplateColumns: isDesktop ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)',
        alignItems: 'start',
        gap: isDesktop ? 28 : 22,
      }}
    >
      {/* ── Columna izquierda: qué es el producto ───────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, minWidth: 0 }}>
        <FieldGroup title="Producto">
          <FormField label="Nombre" required error={errors.name}>
            <Input
              size={size}
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="iPhone 15 Pro"
              autoFocus={!isMobile}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <FormField label="Categoría" required>
              <Select
                size={size}
                value={formData.category}
                onChange={(e) => updateField('category', e.target.value)}
                options={PRODUCT_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
              />
            </FormField>

            <FormField
              label="Sucursal"
              required
              error={errors.branchId}
              hint={branches.length === 1 ? `Se asignará a ${branches[0].name}` : undefined}
            >
              <Select
                size={size}
                value={formData.branchId}
                onChange={(e) => updateField('branchId', e.target.value)}
                placeholder={branches.length > 0 ? 'Elige una sucursal' : 'No hay sucursales'}
                disabled={branches.length === 0}
                options={branches.map((b) => ({ value: b.id, label: b.name }))}
              />
            </FormField>
          </div>
        </FieldGroup>

        <FieldGroup title="Especificaciones" hint="Opcionales. Ayudan a distinguir productos parecidos en el listado.">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))',
              gap: 12,
            }}
          >
            <FormField label="Almacenamiento">
              <Input size={size} value={formData.storage} onChange={(e) => updateField('storage', e.target.value)} placeholder="256 GB" />
            </FormField>
            <FormField label="RAM">
              <Input size={size} value={formData.ram} onChange={(e) => updateField('ram', e.target.value)} placeholder="8 GB" />
            </FormField>
            <FormField label="Color" style={{ gridColumn: isMobile ? undefined : '1 / -1' }}>
              <Input size={size} value={formData.color} onChange={(e) => updateField('color', e.target.value)} placeholder="Titanio negro" />
            </FormField>
          </div>

          <FormField label="Descripción">
            <Textarea
              rows={3}
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Detalles que convenga recordar al venderlo o repararlo."
            />
          </FormField>
        </FieldGroup>
      </div>

      {/* ── Columna derecha: cómo se controla y cuánto cuesta ───────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, minWidth: 0 }}>
        <FieldGroup
          title="Control de inventario"
          hint={isEditing ? 'No se puede cambiar una vez creado el producto.' : 'Elige cómo se cuenta este producto. Después no se puede cambiar.'}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} role="radiogroup" aria-label="Método de seguimiento">
            {TRACKING_METHODS.map((method) => (
              <RadioCard
                key={method.id}
                name="trackMethod"
                title={method.title}
                description={method.description}
                disabled={isEditing}
                checked={
                  method.id === 'simple'
                    ? isSimple
                    : method.id === 'variants'
                      ? formData.hasVariants
                      : formData.trackByUnit
                }
                onChange={() => {
                  updateField('trackByUnit', method.id === 'units')
                  updateField('hasVariants', method.id === 'variants')
                }}
              />
            ))}
          </div>

          {isSimple && (
            <FormField
              label="Cantidad inicial"
              error={errors.quantity}
              hint={
                quantityLocked
                  ? 'Solo un administrador puede cambiarla. Usa «Gestionar inventario» para agregar stock.'
                  : 'Unidades disponibles hoy en la sucursal elegida.'
              }
            >
              <Input
                size={size}
                type="number"
                min="0"
                inputMode="numeric"
                mono
                value={formData.quantity}
                onChange={(e) => updateField('quantity', e.target.value)}
                placeholder="0"
                disabled={quantityLocked}
              />
            </FormField>
          )}

          {trackingNote && (
            <p style={{ margin: 0, fontSize: 'var(--text-small)', lineHeight: 'var(--lh-small)', color: 'var(--text-secondary)' }}>
              {trackingNote}
            </p>
          )}
        </FieldGroup>

        <FieldGroup title="Precio">
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <FormField label="Costo" hint="Lo que te costó a ti">
              <Input
                size={size}
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                mono
                value={formData.cost}
                onChange={(e) => updateField('cost', e.target.value)}
                placeholder="0"
              />
            </FormField>
            <FormField label="Precio de venta" required error={errors.price} hint="Lo que paga el cliente">
              <Input
                size={size}
                type="number"
                step="0.01"
                min="0.01"
                inputMode="decimal"
                mono
                value={formData.price}
                onChange={(e) => updateField('price', e.target.value)}
                placeholder="0"
              />
            </FormField>
          </div>

          {margin && (
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 12px',
                background: 'var(--bg-sunken)',
                border: 'var(--border-width) solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <span style={{ fontSize: 'var(--text-small)', color: 'var(--text-secondary)' }}>Ganancia y margen</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: 'var(--text-body)',
                  fontWeight: 'var(--fw-medium)',
                  color: margin.amount > 0 ? 'var(--success)' : 'var(--danger)',
                }}
              >
                {margin.amount.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                <span style={{ color: 'var(--text-tertiary)', marginLeft: 8 }}>
                  {margin.percent.toFixed(1).replace('.', ',')}%
                </span>
              </span>
            </div>
          )}
        </FieldGroup>
      </div>
    </form>
  )
}
