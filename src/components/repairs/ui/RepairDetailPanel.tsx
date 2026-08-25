import { Lock } from 'lucide-react'
import { Alert, KeyValue, StatusBadge, normalizeState } from '../../oryon'
import { PatternLock } from '../../PatternLock'
import type { Repair } from '../types'
import { statusLabels, deviceTypes } from '../constants'

/**
 * Contenido de la ficha de una OT. Vive dentro de `ResponsiveDetail`, así que sirve tanto al
 * drawer de escritorio como a la hoja inferior de móvil; sustituye al antiguo
 * `RepairDetailsDialog`, que era un modal sobre el que se abrían otros modales.
 */
export function RepairDetailPanel({
  repair,
  branches,
  columns,
  onImageClick,
}: {
  repair: Repair
  branches?: Array<{ id: string; name: string }>
  columns: 1 | 2
  onImageClick: (image: string) => void
}) {
  const branchName = branches?.find((b) => b.id === repair.branchId)?.name
  const deviceLabel = deviceTypes.find((d) => d.value === repair.deviceType)?.label || repair.deviceType

  const money = (n: number) => `$${Number(n || 0).toLocaleString('es-CO')}`
  const received = new Date(repair.receivedDate)

  return (
    <>
      <Alert variant="info" title="Falla reportada">
        {repair.problem}
      </Alert>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <StatusBadge status={normalizeState(repair.status)} label={statusLabels[repair.status]} />
        {repair.invoiced && repair.invoiceId && (
          <span style={{ fontSize: 'var(--text-mono-sm)', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
            Facturada · venta #{repair.invoiceId}
          </span>
        )}
      </div>

      <KeyValue
        layout="stacked"
        columns={columns}
        items={[
          { label: 'Cliente', value: repair.customerName },
          { label: 'Teléfono', value: repair.customerPhone || '—', mono: true },
          { label: 'Tipo de equipo', value: deviceLabel },
          { label: 'Marca', value: repair.deviceBrand || '—' },
          { label: 'Modelo', value: repair.deviceModel || '—' },
          { label: 'IMEI', value: repair.imei || '—', mono: true },
          { label: 'Número de serie', value: repair.serialNumber || '—', mono: true },
          { label: 'Sucursal', value: branchName || '—' },
          {
            label: 'Recibido',
            value: Number.isNaN(received.getTime()) ? '—' : received.toLocaleString('es-CO', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }),
            mono: true,
          },
          { label: 'Costo estimado', value: money(repair.estimatedCost), mono: true },
        ]}
      />

      {(repair.devicePassword || (repair.devicePattern && repair.devicePattern.length > 0)) && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: '10px 12px',
            background: 'var(--warning-subtle)',
            border: 'var(--border-width) solid color-mix(in srgb, var(--warning) 30%, transparent)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Lock size={14} color="var(--warning)" strokeWidth={1.8} />
            <span
              style={{
                fontSize: 'var(--text-caption)',
                letterSpacing: 'var(--tr-caption)',
                textTransform: 'uppercase',
                fontWeight: 'var(--fw-semibold)',
                color: 'var(--text-secondary)',
              }}
            >
              Clave del equipo
            </span>
          </span>

          {repair.devicePasswordType === 'text' && repair.devicePassword && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-body-lg)',
                color: 'var(--text-primary)',
                letterSpacing: '0.05em',
              }}
            >
              {repair.devicePassword}
            </span>
          )}

          {repair.devicePasswordType === 'pattern' && repair.devicePattern && repair.devicePattern.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <PatternLock value={repair.devicePattern} onPatternComplete={() => {}} readOnly />
            </div>
          )}
        </div>
      )}

      {repair.notes && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span
            style={{
              fontSize: 'var(--text-caption)',
              letterSpacing: 'var(--tr-caption)',
              textTransform: 'uppercase',
              fontWeight: 'var(--fw-semibold)',
              color: 'var(--text-tertiary)',
            }}
          >
            Notas internas
          </span>
          <span style={{ fontSize: 'var(--text-small)', color: 'var(--text-secondary)', textWrap: 'pretty' }}>
            {repair.notes}
          </span>
        </div>
      )}

      {repair.images?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{
              fontSize: 'var(--text-caption)',
              letterSpacing: 'var(--tr-caption)',
              textTransform: 'uppercase',
              fontWeight: 'var(--fw-semibold)',
              color: 'var(--text-tertiary)',
            }}
          >
            Evidencia · {repair.images.length} {repair.images.length === 1 ? 'imagen' : 'imágenes'}
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
            {repair.images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onImageClick(img)}
                aria-label={`Ver imagen ${idx + 1}`}
                style={{
                  padding: 0,
                  border: 'var(--border-width) solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  background: 'var(--bg-sunken)',
                }}
              >
                <img
                  src={img}
                  alt={`Equipo ${idx + 1}`}
                  style={{ display: 'block', width: '100%', height: 72, objectFit: 'cover' }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Historial de estados: la línea de tiempo que el diseño pone en la ficha */}
      {repair.statusLogs?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span
            style={{
              fontSize: 'var(--text-caption)',
              letterSpacing: 'var(--tr-caption)',
              textTransform: 'uppercase',
              fontWeight: 'var(--fw-semibold)',
              color: 'var(--text-tertiary)',
            }}
          >
            Historial de estados
          </span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[...repair.statusLogs].reverse().map((log, i, all) => (
              <div key={`${log.timestamp}-${i}`} style={{ display: 'flex', gap: 10 }}>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      marginTop: 6,
                      borderRadius: 'var(--radius-pill)',
                      background: i === 0 ? 'var(--accent-fill)' : 'var(--border-strong)',
                    }}
                  />
                  {i < all.length - 1 && <span style={{ flex: 1, width: 1, background: 'var(--border-subtle)' }} />}
                </span>
                <div style={{ flex: 1, minWidth: 0, paddingBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)' }}>
                      {statusLabels[log.newStatus] || log.newStatus}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--text-mono-sm)',
                        color: 'var(--text-disabled)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {new Date(log.timestamp).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                  {log.notes && (
                    <div style={{ fontSize: 'var(--text-small)', color: 'var(--text-secondary)', textWrap: 'pretty' }}>
                      {log.notes}
                    </div>
                  )}
                  <div style={{ fontSize: 'var(--text-mono-sm)', color: 'var(--text-tertiary)' }}>
                    Por {log.userName}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
