import { useCallback, useEffect, useMemo, useState } from 'react'
import { MapPin, MessageCircle, Phone, RefreshCw, Search } from 'lucide-react'
import { Button, Card, Input, KeyValue, Loading, StatusBadge, normalizeState } from './oryon'
import { Logo } from './brand/Logo'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { toWhatsAppNumber, whatsappUrl } from '../utils/whatsapp'
import { assetTypeLabel, cap, formatFieldValue, getBusinessProfile, type BusinessProfile } from '../config/businessTypes'

/**
 * Seguimiento público de una orden (la página del QR impreso).
 *
 * La lee el cliente, no el taller: en el teléfono, con prisa y sin saber qué es
 * "diagnóstico". Por eso:
 *  - arriba, una frase en lenguaje normal que dice qué está pasando y qué sigue;
 *  - una barra de pasos para ver cuánto falta;
 *  - el teléfono y el WhatsApp del taller a un toque;
 *  - el historial como línea de tiempo, lo más reciente primero.
 * Sigue el tema del dispositivo del cliente (no la preferencia guardada del
 * taller) y se actualiza sola cada minuto mientras la orden siga abierta.
 */

interface TrackingPageProps {
  companyId?: string | null
  repairId?: string | null
}

interface RepairTracking {
  id: number
  customerName: string
  deviceType: string
  deviceBrand: string
  deviceModel: string
  serialNumber?: string
  assetDetails?: Record<string, string>
  problem: string
  status: string
  estimatedCost: number
  receivedDate: string
  updatedAt?: string
  images?: string[]
  statusLogs?: Array<{ timestamp: string; newStatus: string; notes: string; images: string[] }>
}

interface Business {
  name?: string
  logo?: string
  branchName?: string
  phone?: string
  address?: string
}

/* Los pasos que ve el cliente. "Esperando repuesto" es una pausa dentro de la reparación. */
const STEPS = [
  { key: 'received', label: 'Recibida' },
  { key: 'diagnosing', label: 'Revisión' },
  { key: 'repairing', label: 'Trabajo' },
  { key: 'completed', label: 'Lista' },
  { key: 'delivered', label: 'Entregada' },
] as const

const STEP_INDEX: Record<string, number> = { received: 0, diagnosing: 1, waiting_parts: 2, repairing: 2, completed: 3, delivered: 4 }

const STATUS_TEXT: Record<string, string> = {
  received: 'Recibida',
  diagnosing: 'En revisión',
  waiting_parts: 'Esperando repuesto',
  repairing: 'En trabajo',
  completed: 'Lista para entregar',
  delivered: 'Entregada',
  cancelled: 'Cancelada',
}

/** Qué está pasando y qué sigue, dicho como lo diría el mostrador. */
function headline(status: string, p: BusinessProfile): { title: string; body: string } {
  const a = p.vocab.asset
  const tu = `tu ${a}`
  const la = p.vocab.article === 'la'
  switch (status) {
    case 'received':
      return { title: `Recibimos ${tu}`, body: 'En breve empieza la revisión. Te avisaremos cuando sepamos qué necesita.' }
    case 'diagnosing':
      return { title: `Estamos revisando ${tu}`, body: 'Buscamos la causa. Si hay que cambiar el presupuesto, te contactamos antes de seguir.' }
    case 'waiting_parts':
      return { title: 'Esperamos un repuesto', body: `Apenas llegue, seguimos con ${tu}. No tienes que hacer nada por ahora.` }
    case 'repairing':
      return { title: `Estamos trabajando en ${tu}`, body: 'Ya sabemos qué tiene y lo estamos resolviendo.' }
    case 'completed':
      return { title: `¡${cap(tu)} está ${la ? 'lista' : 'listo'}!`, body: 'Puedes pasar a recoger cuando quieras, en el horario del taller.' }
    case 'delivered':
      return { title: `Entregamos ${tu}`, body: 'Gracias por confiar en nosotros. Si algo no está bien, escríbenos.' }
    case 'cancelled':
      return { title: 'Esta orden fue cancelada', body: 'Si no esperabas esto o tienes dudas, comunícate con el taller.' }
    default:
      return { title: STATUS_TEXT[status] ?? 'Estado de tu orden', body: '' }
  }
}

const money = (n?: number) => `$${Math.round(Number(n) || 0).toLocaleString('es-CO')}`

const friendlyDate = (iso?: string, withTime = true) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}),
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  })
}

const relative = (iso?: string) => {
  if (!iso) return ''
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (Number.isNaN(mins)) return ''
  if (mins < 1) return 'hace un momento'
  if (mins < 60) return `hace ${mins} min`
  const h = Math.round(mins / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  return `hace ${d} ${d === 1 ? 'día' : 'días'}`
}

/* El cliente no tiene preferencia guardada en Oryon: se usa la de su dispositivo. */
function useDeviceTheme(): 'light' | 'dark' {
  const query = '(prefers-color-scheme: light)'
  const [light, setLight] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setLight(mq.matches)
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])
  return light ? 'light' : 'dark'
}

export function TrackingPage({ companyId, repairId }: TrackingPageProps) {
  const theme = useDeviceTheme()
  const [repair, setRepair] = useState<RepairTracking | null>(null)
  const [business, setBusiness] = useState<Business>({})
  const [businessType, setBusinessType] = useState<string | undefined>()
  const profile = getBusinessProfile(businessType)
  const [loading, setLoading] = useState(Boolean(repairId))
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchCode, setSearchCode] = useState('')

  const load = useCallback(
    async (silent = false) => {
      if (!repairId) return
      if (!silent) setLoading(true)
      else setRefreshing(true)
      try {
        const path = companyId ? `tracking/${companyId}/${repairId}` : `tracking-legacy/${repairId}`
        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/${path}`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        })
        const data = res.ok ? await res.json() : { success: false }
        if (!data.success) throw new Error('not-found')
        setRepair(data.repair)
        setBusinessType(data.businessType)
        setBusiness(data.business ?? {})
        setError(null)
      } catch {
        // En un refresco silencioso se conserva lo que ya se ve.
        if (!silent) setError('Revisa el número o el enlace que te enviaron. Si el problema sigue, comunícate con el taller.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [companyId, repairId]
  )

  useEffect(() => {
    void load()
  }, [load])

  // Se actualiza sola mientras la orden siga abierta.
  const open = repair && !['delivered', 'cancelled'].includes(repair.status)
  useEffect(() => {
    if (!open) return
    const id = window.setInterval(() => void load(true), 60_000)
    return () => window.clearInterval(id)
  }, [open, load])

  const logs = useMemo(
    () => [...(repair?.statusLogs ?? [])].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [repair]
  )

  const goToCode = () => {
    const raw = searchCode.trim().replace(/^#/, '')
    if (!raw) return
    const parts = raw.split('/').filter(Boolean)
    if (parts.length > 2 || parts.some((x) => !/^\d+$/.test(x))) {
      setError('Escribe solo números, por ejemplo 42 o 7/42.')
      return
    }
    window.location.href = `/tracking/${parts.join('/')}`
  }

  const shell = (children: React.ReactNode) => (
    <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderBottom: 'var(--border-width) solid var(--border-subtle)', background: 'var(--surface-card)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          {business.logo ? (
            <img src={business.logo} alt="" style={{ height: 28, maxWidth: 120, objectFit: 'contain' }} />
          ) : null}
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: 'var(--text-body)', fontWeight: 'var(--fw-semibold)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {business.name || 'Seguimiento de tu orden'}
            </span>
            {business.name && <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>Seguimiento de tu orden</span>}
          </span>
        </span>
        {!business.name && <Logo />}
      </header>
      <main style={{ width: '100%', maxWidth: 720, margin: '0 auto', padding: '20px 16px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</main>
      <footer style={{ padding: '0 16px 28px', textAlign: 'center', fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>
        Seguimiento con Oryon · Guarda este enlace para consultar cuando quieras.
      </footer>
    </div>
  )

  /* ── Buscar por número ── */
  if (!repairId) {
    return shell(
      <Card title="Consulta tu orden" subtitle="El número está en el recibo que te entregaron al dejar tu equipo o vehículo.">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            goToCode()
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <Input
            size="lg"
            mono
            inputMode="numeric"
            value={searchCode}
            onChange={(e) => {
              setSearchCode(e.target.value)
              setError(null)
            }}
            placeholder="Ej.: 7/42"
            aria-label="Número de orden"
            iconLeft={Search}
            invalid={Boolean(error)}
          />
          {error && <p role="alert" style={{ margin: 0, fontSize: 'var(--text-small)', color: 'var(--danger)' }}>{error}</p>}
          <Button type="submit" variant="primary" size="lg" fullWidth disabled={!searchCode.trim()}>
            Ver estado
          </Button>
          <p style={{ margin: 0, fontSize: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            Lo más fácil: escanea con la cámara el código QR del recibo.
          </p>
        </form>
      </Card>
    )
  }

  if (loading) {
    return shell(<Loading mode="inline" minHeight={320} label="Buscando tu orden" />)
  }

  if (error || !repair) {
    return shell(
      <Card title="No encontramos esta orden" subtitle={error ?? undefined}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="primary" iconLeft={RefreshCw} onClick={() => void load()}>
            Intentar de nuevo
          </Button>
          <Button variant="secondary" iconLeft={Search} onClick={() => (window.location.href = '/tracking')}>
            Buscar con el número
          </Button>
        </div>
      </Card>
    )
  }

  const h = headline(repair.status, profile)
  const cancelled = repair.status === 'cancelled'
  const stepAt = STEP_INDEX[repair.status] ?? 0
  const asset = [assetTypeLabel(profile, repair.deviceType), repair.deviceBrand, repair.deviceModel].filter(Boolean).join(' ')
  const ids = profile.assetFields.filter((f) => f.showOnTracking).map((f) => formatFieldValue(repair, f)).filter(Boolean)
  const lastUpdate = repair.updatedAt || logs[0]?.timestamp || repair.receivedDate
  const wa = toWhatsAppNumber(business.phone)
  const telDigits = String(business.phone ?? '').replace(/[^\d+]/g, '')

  return shell(
    <>
      {/* Estado actual: la respuesta a "¿y mi moto?" */}
      <Card padding={20}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--text-tertiary)' }}>
            Orden #{repair.id} · {[asset, ...ids].filter(Boolean).join(' · ')}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 'var(--fw-black)', fontSize: 'clamp(26px, 6vw, 36px)', lineHeight: 1.08, letterSpacing: 'var(--tr-h1)' }}>
              {repair.customerName ? `${repair.customerName}, ` : ''}
              {repair.customerName ? h.title.replace(/\p{L}/u, (c) => c.toLowerCase()) : h.title}
            </h1>
            {h.body && <p style={{ margin: 0, fontSize: 'var(--text-body-lg)', lineHeight: 'var(--lh-body-lg)', color: 'var(--text-secondary)' }}>{h.body}</p>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <StatusBadge status={normalizeState(repair.status)} label={STATUS_TEXT[repair.status] ?? repair.status} />
            <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>
              Actualizado {relative(lastUpdate)}
              {refreshing ? ' · actualizando…' : ''}
            </span>
          </div>

          {!cancelled && <Progress at={stepAt} waiting={repair.status === 'waiting_parts'} />}
        </div>
      </Card>

      {(wa || telDigits) && (
        <div style={{ display: 'grid', gridTemplateColumns: wa && telDigits ? '1fr 1fr' : '1fr', gap: 8 }}>
          {wa && (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              iconLeft={MessageCircle}
              onClick={() => window.open(whatsappUrl(wa, `Hola, quiero saber de mi orden #${repair.id}.`), '_blank', 'noopener')}
            >
              WhatsApp
            </Button>
          )}
          {telDigits && (
            <Button variant="secondary" size="lg" fullWidth iconLeft={Phone} onClick={() => (window.location.href = `tel:${telDigits}`)}>
              Llamar
            </Button>
          )}
        </div>
      )}

      <Card title="Detalles de la orden">
        <KeyValue
          layout="stacked"
          items={[
            { label: profile.vocab.problem, value: repair.problem || '—' },
            { label: 'Recibida', value: friendlyDate(repair.receivedDate, false) },
            {
              label: repair.status === 'delivered' ? 'Presupuesto inicial' : 'Presupuesto estimado',
              value: (
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{money(repair.estimatedCost)}</span>
                  {['received', 'diagnosing'].includes(repair.status) && (
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>Puede cambiar tras la revisión; te avisamos antes.</span>
                  )}
                </span>
              ),
            },
            ...(business.branchName || business.address
              ? [
                  {
                    label: 'Dónde recoger',
                    value: (
                      <span style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <MapPin size={14} style={{ flex: '0 0 auto', marginTop: 3 }} />
                        {[business.branchName, business.address].filter(Boolean).join(' · ')}
                      </span>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Card>

      {logs.length > 0 && (
        <Card title="Historial" subtitle={`Todo lo que ha pasado con tu ${profile.vocab.asset}, lo más reciente primero`}>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {logs.map((log, i) => (
              <li key={`${log.timestamp}-${i}`} style={{ display: 'grid', gridTemplateColumns: '18px minmax(0,1fr)', gap: 12 }}>
                <span aria-hidden style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      marginTop: 5,
                      borderRadius: 'var(--radius-pill)',
                      background: i === 0 ? 'var(--accent-fill)' : 'var(--border-strong)',
                      boxShadow: i === 0 ? '0 0 0 3px var(--accent-subtle)' : 'none',
                    }}
                  />
                  {i < logs.length - 1 && <span style={{ flex: 1, width: 1, background: 'var(--border-default)', margin: '4px 0' }} />}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: i < logs.length - 1 ? 18 : 0, minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 'var(--text-body)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-primary)' }}>
                      {STATUS_TEXT[log.newStatus] ?? log.newStatus}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--text-tertiary)' }}>{friendlyDate(log.timestamp)}</span>
                  </span>
                  {log.notes && <p style={{ margin: 0, fontSize: 'var(--text-body)', lineHeight: 'var(--lh-body)', color: 'var(--text-secondary)', textWrap: 'pretty' }}>{log.notes}</p>}
                  {log.images?.length > 0 && <Photos images={log.images} />}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {repair.images && repair.images.length > 0 && (
        <Card title="Fotos de recepción" subtitle={`Así llegó tu ${profile.vocab.asset} al taller`}>
          <Photos images={repair.images} />
        </Card>
      )}
    </>
  )
}

function Progress({ at, waiting }: { at: number; waiting: boolean }) {
  return (
    <div role="list" aria-label="Avance de la orden" style={{ display: 'grid', gridTemplateColumns: `repeat(${STEPS.length}, minmax(0,1fr))`, gap: 4 }}>
      {STEPS.map((s, i) => {
        const done = i < at
        const current = i === at
        return (
          <div key={s.key} role="listitem" aria-current={current ? 'step' : undefined} style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <span
              style={{
                height: 6,
                borderRadius: 'var(--radius-xs)',
                background: done || current ? (current && waiting ? 'var(--state-waiting)' : 'var(--accent-fill)') : 'var(--border-default)',
                opacity: done ? 0.55 : 1,
              }}
            />
            <span
              style={{
                display: 'block',
                fontSize: 'var(--text-caption)',
                fontWeight: current ? 'var(--fw-semibold)' : undefined,
                color: current ? 'var(--text-primary)' : done ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {s.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function Photos({ images }: { images: string[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 8 }}>
      {images.map((img, i) => (
        <a key={i} href={img} target="_blank" rel="noopener noreferrer" aria-label={`Ver foto ${i + 1} en grande`}>
          <img
            src={img}
            alt={`Foto ${i + 1}`}
            loading="lazy"
            style={{ display: 'block', width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: 'var(--border-width) solid var(--border-default)' }}
          />
        </a>
      ))}
    </div>
  )
}
