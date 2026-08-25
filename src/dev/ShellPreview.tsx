import { useState } from 'react'
import { Download, Package, Plus, ReceiptText, Trash2, Users, Wrench } from 'lucide-react'
import { ThemeProvider } from '../utils/ThemeContext'
import { AppShell } from '../components/layout/AppShell'
import { PageBody } from '../components/layout/PageBody'
import { ResponsiveDetail } from '../components/layout/ResponsiveDetail'
import { usePageHeader } from '../components/layout/PageHeaderContext'
import { NAV_ITEMS, type ViewId } from '../components/layout/navItems'
import { Alert, Badge, Button, Card, DataTable, KeyValue, MetricCard, StatusBadge } from '../components/oryon'
import { useBreakpoint } from '../hooks/useBreakpoint'

/**
 * Banco de pruebas SOLO para desarrollo (`/dev-preview.html`). Monta el shell con datos
 * falsos para revisar móvil, tablet y escritorio sin credenciales ni backend.
 * No entra en el build de producción: Vite solo empaqueta `index.html`.
 */
const PROFILE = { name: 'Alejandro Echavarria', role: 'admin', companyName: 'Saja', branchName: 'Guayabal' }
const LICENSE = { expiryDate: new Date(Date.now() - 86400000 * 30).toISOString(), plan: 'enterprise' }

const STATUS_ROWS = [
  { id: 1, label: 'Recibido', ds: 'cola', n: '12', p: '39%', days: '0,8' },
  { id: 2, label: 'En Diagnóstico', ds: 'diagnostico', n: '8', p: '26%', days: '1,2' },
  { id: 3, label: 'Esperando Repuestos', ds: 'esperando', n: '5', p: '16%', days: '4,6' },
  { id: 4, label: 'En Reparación', ds: 'reparacion', n: '6', p: '19%', days: '1,9' },
  { id: 5, label: 'Completado', ds: 'listo', n: '4', p: '13%', days: '0,4' },
]

function Demo({ view }: { view: ViewId }) {
  const item = NAV_ITEMS.find((i) => i.id === view)!
  const { compact, isMobile } = useBreakpoint()
  const [selected, setSelected] = useState<number | null>(null)

  usePageHeader({ subtitle: 'Datos de prueba del shell', eyebrow: item.section })

  return (
    <>
      <PageBody>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${isMobile || compact ? 2 : 4},minmax(0,1fr))`,
            gap: 12,
          }}
        >
          <MetricCard label="Productos" value="9" icon={Package} sublabel="En inventario" />
          <MetricCard label="Reparac. activas" value="31" icon={Wrench} sublabel="43 en total" />
          <MetricCard label="Ventas totales" value="1.007" icon={ReceiptText} delta="+24,9%" deltaTone="up" sublabel="Este mes" />
          <MetricCard label="Clientes" value="32" icon={Users} delta="+6" deltaTone="up" sublabel="Nuevos" />
        </div>

        <Alert variant="danger" title="5 productos con stock bajo">
          Parlante PC J5217, Parlante PC Mini J5141 y 3 más están en o por debajo del umbral de 5 unidades.
        </Alert>

        <Card padding={0} title="Estado de reparaciones" subtitle="31 órdenes activas">
          <DataTable
            dense
            compact={compact}
            selectedId={selected}
            onRowClick={(r: any) => setSelected((s) => (s === r.id ? null : r.id))}
            columns={[
              { key: 'label', label: 'Estado', render: (r: any) => <StatusBadge status={r.ds} label={r.label} size="sm" /> },
              { key: 'n', label: 'Órdenes', mono: true, align: 'right' },
              { key: 'p', label: '%', mono: true, align: 'right', muted: true, hideOnCompact: true },
              { key: 'days', label: 'Días prom.', mono: true, align: 'right', muted: true },
            ]}
            rows={STATUS_ROWS}
          />
        </Card>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="primary" iconLeft={Plus}>Nueva OT</Button>
          <Button iconLeft={Download}>Exportar</Button>
          <Button variant="danger" iconLeft={Trash2}>Eliminar</Button>
          <Badge tone="warning">1 bajo</Badge>
          <Badge tone="success">Activa</Badge>
        </div>
      </PageBody>

      <ResponsiveDetail
        open={selected != null}
        onClose={() => setSelected(null)}
        kind="Orden de trabajo"
        title={`Orden #${selected ?? ''}`}
        meta="Xiaomi 14 C · Luís Alfredo Limarez"
        actions={
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Button variant="primary" fullWidth>Cambiar estado</Button>
            <Button fullWidth>Imprimir OT</Button>
          </div>
        }
      >
        <Alert variant="info" title="Falla reportada">Visor</Alert>
        <KeyValue
          layout="stacked"
          columns={compact ? 1 : 2}
          items={[
            { label: 'Estado', value: 'Recibido' },
            { label: 'Cliente', value: 'Luís Alfredo Limarez' },
            { label: 'Teléfono', value: '3225325054', mono: true },
            { label: 'IMEI', value: '356938035643809', mono: true },
            { label: 'Técnico', value: 'Camilo Ríos' },
            { label: 'Costo est.', value: '$90.000', mono: true },
          ]}
        />
      </ResponsiveDetail>
    </>
  )
}

export function ShellPreview() {
  const [view, setView] = useState<ViewId>('dashboard')
  return (
    <ThemeProvider>
      <AppShell
        currentView={view}
        onViewChange={setView}
        onLogout={() => console.log('logout')}
        userProfile={PROFILE}
        licenseInfo={LICENSE}
      >
        <Demo view={view} />
      </AppShell>
    </ThemeProvider>
  )
}
