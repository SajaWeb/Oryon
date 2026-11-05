import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Save, Upload, X } from 'lucide-react'
import { Button, Card, FieldGroup, FormField, Input, Select, Textarea } from '../oryon'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { useBusiness } from '../../utils/BusinessContext'
import { FORMATS, normalizeFormat, type PrintConfig, type PrintFormat } from '../../utils/printing'
import { projectId } from '../../utils/supabase/info'
import { TAX_ID_TYPES, getTaxIdType } from '../../utils/tax-id-types'

interface GeneralSectionProps {
  accessToken: string
  companyName: string
}

/* Los datos viejos guardaban 'NIT' a secas, que no es ninguna opción de la
   lista (allí es 'NIT-CO'): el selector aparecía vacío. */
const normalizeTaxType = (v?: string) => (!v || v === 'NIT' ? 'NIT-CO' : v === 'RUT' ? 'RUT-CO' : v)

/* Colombia primero (es donde está la mayoría de talleres); el resto, por país. */
const TAX_OPTIONS = [...TAX_ID_TYPES]
  .sort((a, b) => Number(b.countryCode === 'CO') - Number(a.countryCode === 'CO') || a.country.localeCompare(b.country, 'es'))
  .map((t) => ({ value: t.value, label: `${t.value.replace(/-[A-Z]{2}$/, '')} · ${t.country}` }))

export function GeneralSection({ accessToken, companyName }: GeneralSectionProps) {
  const { isMobile } = useBreakpoint()
  const { profile } = useBusiness()
  const size = isMobile ? 'lg' : 'md'
  const twoUp = { display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'repeat(2, minmax(0,1fr))', gap: 12 } as const

  const [logoPreview, setLogoPreview] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [savingPrint, setSavingPrint] = useState(false)
  const [savingStock, setSavingStock] = useState(false)
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5)
  const [printConfig, setPrintConfig] = useState<PrintConfig>({
    format: '80mm',
    companyName: companyName || 'Oryon',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    taxId: '',
    taxIdType: 'NIT-CO',
    companyLogo: '',
    website: '',
    socialMedia: '',
    warrantyNotes: '',
    welcomeMessage: '',
    farewellMessage: '',
  })

  const set = (patch: Partial<PrintConfig>) => setPrintConfig((prev) => ({ ...prev, ...patch }))

  useEffect(() => {
    void loadPrintConfig()
    void loadCompanySettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    set({ companyName: companyName || 'Oryon' })
  }, [companyName])

  const api = (path: string, init?: RequestInit) =>
    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4d437e50${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${accessToken}`, ...(init?.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...(init?.headers ?? {}) },
    }).then((r) => r.json())

  const loadPrintConfig = async () => {
    try {
      const data = await api('/company/print-config')
      if (data.success && data.printConfig) {
        const c = data.printConfig
        setPrintConfig({
          ...c,
          taxIdType: normalizeTaxType(c.taxIdType),
          website: c.website || '',
          socialMedia: c.socialMedia || '',
          warrantyNotes: c.warrantyNotes || '',
          welcomeMessage: c.welcomeMessage || '',
          farewellMessage: c.farewellMessage || '',
        })
        if (c.companyLogo) setLogoPreview(c.companyLogo)
      }
    } catch (error) {
      console.error('Error loading print config:', error)
    }
  }

  const loadCompanySettings = async () => {
    try {
      const data = await api('/company/settings')
      if (data.success && data.settings) setLowStockThreshold(data.settings.lowStockThreshold || 5)
    } catch (error) {
      console.error('Error loading company settings:', error)
    }
  }

  /** Guarda y dice la verdad: antes mostraba "guardado" aunque el servidor fallara. */
  const savePrintConfig = async (config: PrintConfig): Promise<boolean> => {
    try {
      const data = await api('/company/print-config', { method: 'PUT', body: JSON.stringify(config) })
      if (!data.success) throw new Error(data.error || 'No se pudo guardar')
      return true
    } catch (error) {
      console.error('Error saving print config:', error)
      toast.error('No se pudo guardar la configuración de impresión', { description: error instanceof Error ? error.message : undefined })
      return false
    }
  }

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return void toast.error('El logo pesa más de 2 MB.')
    if (!file.type.startsWith('image/')) return void toast.error('Elige una imagen PNG o JPG.')

    const reader = new FileReader()
    reader.onloadend = () => setLogoPreview(reader.result as string)
    reader.readAsDataURL(file)

    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('logo', file)
      const data = await api('/company/logo', { method: 'POST', body: formData })
      if (!data.success || !data.logoUrl) throw new Error(data.error)
      const next = { ...printConfig, companyLogo: data.logoUrl }
      setPrintConfig(next)
      if (await savePrintConfig(next)) toast.success('Logo actualizado')
    } catch (error) {
      console.error('Error uploading logo:', error)
      toast.error('No se pudo subir el logo')
      setLogoPreview(printConfig.companyLogo || '')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleRemoveLogo = async () => {
    const next = { ...printConfig, companyLogo: '' }
    setLogoPreview('')
    setPrintConfig(next)
    if (await savePrintConfig(next)) toast.success('Logo quitado')
  }

  const handleSavePrint = async () => {
    setSavingPrint(true)
    if (await savePrintConfig(printConfig)) toast.success('Configuración de impresión guardada')
    setSavingPrint(false)
  }

  const saveStockSettings = async () => {
    setSavingStock(true)
    try {
      const data = await api('/company/settings', { method: 'PUT', body: JSON.stringify({ lowStockThreshold }) })
      if (!data.success) throw new Error(data.error)
      const { cache } = await import('../../utils/cache')
      cache.invalidatePattern('dashboard-stats')
      toast.success('Umbral de stock guardado')
    } catch (error) {
      console.error('Error saving stock settings:', error)
      toast.error('No se pudo guardar el umbral de stock')
    } finally {
      setSavingStock(false)
    }
  }

  const tax = getTaxIdType(printConfig.taxIdType || '')

  return (
    <>
      <Card
        title="Inventario"
        subtitle="Cuándo un producto aparece como «stock bajo» en el inventario y el panel"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" iconLeft={Save} onClick={saveStockSettings} loading={savingStock} disabled={savingStock}>
              Guardar
            </Button>
          </div>
        }
      >
        <FormField label="Avisar con" hint={`Se marca en cuanto quedan ${lowStockThreshold} unidades o menos.`} style={{ maxWidth: 240 }}>
          <Input
            size={size}
            type="number"
            min="0"
            inputMode="numeric"
            mono
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 0)}
            suffix={<span style={{ fontSize: 'var(--text-small)', color: 'var(--text-tertiary)' }}>unidades</span>}
          />
        </FormField>
      </Card>

      <Card
        title="Documentos impresos"
        subtitle="Lo que sale en facturas, órdenes de servicio y recibos"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" iconLeft={Save} onClick={handleSavePrint} loading={savingPrint} disabled={savingPrint}>
              Guardar
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <FieldGroup title="Logo y formato">
            <div style={twoUp}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 'var(--text-small)', fontWeight: 'var(--fw-medium)', color: 'var(--text-primary)' }}>Logo</span>
                {logoPreview ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: 10,
                      background: 'var(--bg-sunken)',
                      border: 'var(--border-width) solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <img src={logoPreview} alt="Logo de la empresa" style={{ height: 56, maxWidth: 180, objectFit: 'contain' }} />
                    <Button size="sm" variant="ghost" iconLeft={X} onClick={handleRemoveLogo} disabled={uploadingLogo}>
                      Quitar
                    </Button>
                  </div>
                ) : (
                  <label
                    htmlFor="logo-upload"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      minHeight: 78,
                      padding: 12,
                      textAlign: 'center',
                      background: 'var(--bg-sunken)',
                      border: '1px dashed var(--border-strong)',
                      borderRadius: 'var(--radius-md)',
                      cursor: uploadingLogo ? 'wait' : 'pointer',
                    }}
                  >
                    <Upload size={18} strokeWidth={1.8} color="var(--text-tertiary)" />
                    <span style={{ fontSize: 'var(--text-small)', color: 'var(--text-secondary)' }}>{uploadingLogo ? 'Subiendo…' : 'Subir logo'}</span>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>PNG o JPG, hasta 2 MB</span>
                  </label>
                )}
                <input id="logo-upload" type="file" accept="image/*" onChange={handleLogoChange} disabled={uploadingLogo} style={{ display: 'none' }} />
              </div>

              <FormField label="Formato de impresión" hint={`Facturas y órdenes. La ${profile.labelTitle.toLowerCase()} va siempre en rollo de 55 mm.`}>
                <Select
                  size={size}
                  value={normalizeFormat(printConfig.format)}
                  onChange={(e) => set({ format: e.target.value as PrintFormat })}
                  options={(Object.keys(FORMATS) as PrintFormat[]).map((key) => ({ value: key, label: FORMATS[key].label }))}
                />
              </FormField>
            </div>
          </FieldGroup>

          <FieldGroup title="Contacto">
            <div style={twoUp}>
              <FormField label="Dirección">
                <Input size={size} value={printConfig.companyAddress} onChange={(e) => set({ companyAddress: e.target.value })} placeholder="Calle 123 # 45-67, Medellín" />
              </FormField>
              <FormField label="Teléfono">
                <Input size={size} mono inputMode="tel" value={printConfig.companyPhone} onChange={(e) => set({ companyPhone: e.target.value })} placeholder="300 123 4567" />
              </FormField>
              <FormField label="Correo">
                <Input size={size} type="email" value={printConfig.companyEmail} onChange={(e) => set({ companyEmail: e.target.value })} placeholder="contacto@empresa.com" />
              </FormField>
              <FormField label="Sitio web">
                <Input size={size} value={printConfig.website} onChange={(e) => set({ website: e.target.value })} placeholder="www.empresa.com" />
              </FormField>
            </div>
          </FieldGroup>

          <FieldGroup title="Identificación tributaria">
            <div style={twoUp}>
              <FormField label="Tipo" hint={tax?.description}>
                <Select size={size} value={printConfig.taxIdType || 'NIT-CO'} onChange={(e) => set({ taxIdType: e.target.value })} options={TAX_OPTIONS} />
              </FormField>
              <FormField label="Número" hint={tax?.format ? `Formato: ${tax.format}` : undefined}>
                <Input size={size} mono value={printConfig.taxId} onChange={(e) => set({ taxId: e.target.value })} placeholder={tax?.example || '900123456-7'} />
              </FormField>
            </div>
          </FieldGroup>

          <FieldGroup title="Mensajes" hint="Opcionales. Van al inicio y al pie de cada documento.">
            <FormField label="Bienvenida">
              <Textarea rows={2} value={printConfig.welcomeMessage} onChange={(e) => set({ welcomeMessage: e.target.value })} placeholder="¡Gracias por tu compra!" />
            </FormField>
            <FormField label="Despedida">
              <Textarea rows={2} value={printConfig.farewellMessage} onChange={(e) => set({ farewellMessage: e.target.value })} placeholder="Esperamos verte pronto." />
            </FormField>
            <FormField label="Garantía">
              <Textarea rows={3} value={printConfig.warrantyNotes} onChange={(e) => set({ warrantyNotes: e.target.value })} placeholder="Garantía de 90 días en mano de obra. No cubre daños por golpes o líquidos." />
            </FormField>
          </FieldGroup>
        </div>
      </Card>
    </>
  )
}
