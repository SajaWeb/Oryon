import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Lock, Plus, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import {
  Alert,
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  FieldGroup,
  MetricCard,
  Select,
  type Column,
} from '../oryon'
import { PageBody } from '../layout/PageBody'
import { usePageHeader } from '../layout/PageHeaderContext'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { getErrorMessage, makeAuthenticatedRequest } from '../../utils/api'
import { addMovement, closeSession, getHistory, getSession, openSession } from './api'
import { OpenCashDialog } from './OpenCashDialog'
import { MovementDialog } from './MovementDialog'
import { CloseCashDialog } from './CloseCashDialog'
import type { Branch, CashMovement, CashSession, CashTotals } from './types'

const money = (n: number) => `$${Number(n || 0).toLocaleString('es-CO')}`

const time = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '—'

const day = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '—'

interface CashProps {
  accessToken: string
  userProfile: { role?: string; name?: string; branchId?: string }
}

/**
 * Caja: una por sucursal y día.
 *
 * Esta pantalla no registra ventas. Las ventas y las facturas de reparación caen
 * solas en la caja abierta de su sucursal al cobrarse; aquí se abre, se anotan los
 * movimientos que no son ventas, y se cuadra al cerrar.
 */
export function Cash({ accessToken, userProfile }: CashProps) {
  const { isMobile, isDesktop } = useBreakpoint()

  /* Cada vista trae sus propias sucursales; App.tsx no las tiene. Un asesor solo
     ve la suya, así que la lista ya llega filtrada por el servidor. */
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchId, setBranchId] = useState(userProfile.branchId || '')
  const [session, setSession] = useState<CashSession | null>(null)
  const [totals, setTotals] = useState<CashTotals | null>(null)
  const [movements, setMovements] = useState<CashMovement[]>([])
  const [canClose, setCanClose] = useState(false)
  const [history, setHistory] = useState<CashSession[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [openDialog, setOpenDialog] = useState(false)
  const [movementDialog, setMovementDialog] = useState(false)
  const [closeDialog, setCloseDialog] = useState(false)

  useEffect(() => {
    let cancelled = false
    makeAuthenticatedRequest<{ success: boolean; branches: Branch[] }>('/branches', accessToken)
      .then((res) => {
        if (cancelled) return
        const list = res.branches ?? []
        setBranches(list)
        setBranchId((current) => current || list[0]?.id || '')
        if (list.length === 0) setLoading(false)
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(getErrorMessage(err))
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [accessToken])

  const load = useCallback(async () => {
    if (!branchId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [state, hist] = await Promise.all([
        getSession(accessToken, branchId),
        getHistory(accessToken).catch(() => ({ success: false, sessions: [] as CashSession[] })),
      ])
      setSession(state.session)
      setTotals(state.totals ?? null)
      setMovements(state.movements ?? [])
      setCanClose(Boolean(state.canClose))
      setHistory(hist.sessions ?? [])
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [accessToken, branchId])

  useEffect(() => {
    void load()
  }, [load])

  usePageHeader({
    title: 'Caja',
    subtitle: loading
      ? 'Cargando…'
      : session
        ? `Abierta desde las ${time(session.openedAt)} por ${session.openedByName}`
        : 'Sin caja abierta en esta sucursal',
    eyebrow: 'Operación',
    onRefresh: load,
    refreshing: loading,
  })

  const handleOpen = async (targetBranch: string, baseAmount: number) => {
    setSubmitting(true)
    try {
      const res = await openSession(accessToken, targetBranch, baseAmount)
      if (!res.success) {
        toast.error(res.error || 'No se pudo abrir la caja')
        return
      }
      toast.success('Caja abierta')
      setOpenDialog(false)
      setBranchId(targetBranch)
      await load()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleMovement = async (movement: Parameters<typeof addMovement>[2]) => {
    if (!session) return
    setSubmitting(true)
    try {
      const res = await addMovement(accessToken, session.id, movement)
      if (!res.success) {
        toast.error(res.error || 'No se pudo registrar')
        return
      }
      setTotals(res.totals)
      setMovements(res.movements)
      setMovementDialog(false)
      toast.success(movement.type === 'out' ? 'Salida registrada' : 'Entrada registrada')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = async (countedAmount: number, notes: string) => {
    if (!session) return
    setSubmitting(true)
    try {
      const res = await closeSession(accessToken, session.id, countedAmount, notes)
      if (!res.success) {
        toast.error(res.error || 'No se pudo cerrar la caja')
        return
      }
      const diff = res.session.difference ?? 0
      toast.success(diff === 0 ? 'Caja cerrada y cuadrada' : `Caja cerrada con ${money(Math.abs(diff))} de ${diff > 0 ? 'sobrante' : 'faltante'}`)
      setCloseDialog(false)
      await load()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const movementColumns: Column<CashMovement>[] = useMemo(
    () => [
      { key: 'createdAt', label: 'Hora', mono: true, width: 70, render: (m) => time(m.createdAt) },
      { key: 'concept', label: 'Concepto', render: (m) => m.concept },
      { key: 'createdByName', label: 'Quién', muted: true, hideOnCompact: true, render: (m) => m.createdByName },
      {
        key: 'amount',
        label: 'Monto',
        mono: true,
        align: 'right',
        width: 130,
        render: (m) => (
          <span style={{ color: m.type === 'in' ? 'var(--success)' : 'var(--danger)' }}>
            {m.type === 'in' ? '+' : '−'}
            {money(m.amount)}
          </span>
        ),
      },
    ],
    []
  )

  const historyColumns: Column<CashSession>[] = useMemo(
    () => [
      { key: 'date', label: 'Día', mono: true, width: 80, render: (s) => day(s.openedAt) },
      { key: 'branchName', label: 'Sucursal', hideOnCompact: true, render: (s) => s.branchName ?? '—' },
      { key: 'openedByName', label: 'Abrió', muted: true, hideOnCompact: true, render: (s) => s.openedByName },
      { key: 'expectedCash', label: 'Esperado', mono: true, align: 'right', render: (s) => (s.status === 'closed' ? money(s.expectedCash ?? 0) : '—') },
      { key: 'countedAmount', label: 'Contado', mono: true, align: 'right', render: (s) => (s.status === 'closed' ? money(s.countedAmount ?? 0) : '—') },
      {
        key: 'difference',
        label: 'Diferencia',
        mono: true,
        align: 'right',
        render: (s) => {
          if (s.status !== 'closed') return <Badge tone="accent">Abierta</Badge>
          const d = s.difference ?? 0
          if (d === 0) return <span style={{ color: 'var(--success)' }}>Cuadra</span>
          return (
            <span style={{ color: d > 0 ? 'var(--warning)' : 'var(--danger)' }}>
              {d > 0 ? '+' : '−'}
              {money(Math.abs(d))}
            </span>
          )
        },
      },
    ],
    []
  )

  if (loading) {
    return (
      <PageBody>
        <div style={{ display: 'grid', placeItems: 'center', height: 240 }}>
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: '2px solid var(--border-subtle)',
              borderBottomColor: 'var(--accent-400)',
              animation: 'oryon-spin 900ms linear infinite',
            }}
          />
        </div>
      </PageBody>
    )
  }

  return (
    <PageBody>
      {branches.length > 1 && (
        <div style={{ maxWidth: 280 }}>
          <Select
            size={isMobile ? 'lg' : 'md'}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            aria-label="Sucursal"
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
          />
        </div>
      )}

      {!session ? (
        <Card padding={0}>
          <EmptyState
            icon={Wallet}
            title="No hay caja abierta"
            description="Sin caja abierta no se pueden registrar cobros en esta sucursal. Ábrela con el dinero base del cajón."
            action={
              <Button variant="primary" iconLeft={Plus} onClick={() => setOpenDialog(true)}>
                Abrir caja
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isDesktop ? 'repeat(4, minmax(0,1fr))' : isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(3, minmax(0,1fr))',
              gap: 12,
            }}
          >
            <MetricCard label="Debería haber" value={money(totals?.expectedCash ?? 0)} sublabel="Efectivo en el cajón" />
            <MetricCard label="Base" value={money(totals?.baseAmount ?? 0)} sublabel={`Desde las ${time(session.openedAt)}`} />
            <MetricCard label="Ventas en efectivo" value={money(totals?.cashSales ?? 0)} sublabel={`${totals?.salesCount ?? 0} cobros en total`} />
            <MetricCard
              label="Otros métodos"
              value={money(totals?.otherSales ?? 0)}
              sublabel={totals?.creditSales ? `${money(totals.creditSales)} a crédito` : 'No entran al cajón'}
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Button variant="secondary" iconLeft={ArrowUpRight} onClick={() => setMovementDialog(true)}>
              Registrar movimiento
            </Button>
            {canClose ? (
              <Button variant="primary" iconLeft={Lock} onClick={() => setCloseDialog(true)}>
                Cerrar caja
              </Button>
            ) : (
              <Alert variant="info" title="No puedes cerrar esta caja" style={{ flex: 1, minWidth: 260 }}>
                La abrió {session.openedByName}. Solo esa persona o un administrador puede cerrarla.
              </Alert>
            )}
          </div>

          <Card
            title="Movimientos"
            subtitle="Solo lo que no viene de una venta"
            padding={0}
            actions={
              totals && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--success)' }}>+{money(totals.movementsIn)}</span>
                  {'  '}
                  <span style={{ color: 'var(--danger)' }}>−{money(totals.movementsOut)}</span>
                </span>
              )
            }
          >
            {movements.length === 0 ? (
              <EmptyState
                icon={ArrowDownLeft}
                title="Sin movimientos"
                description="Las ventas entran solas. Aquí solo se anotan gastos, retiros e ingresos sueltos."
              />
            ) : (
              <DataTable columns={movementColumns} rows={movements} compact={!isDesktop} rowKey="id" />
            )}
          </Card>
        </>
      )}

      {history.length > 0 && (
        <FieldGroup title="Cierres anteriores">
          <Card padding={0}>
            <DataTable columns={historyColumns} rows={history} compact={!isDesktop} rowKey="id" emptyMessage="Sin cierres" />
          </Card>
        </FieldGroup>
      )}

      <OpenCashDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        branches={branches}
        defaultBranchId={branchId}
        submitting={submitting}
        onSubmit={handleOpen}
      />

      <MovementDialog
        open={movementDialog}
        onClose={() => setMovementDialog(false)}
        submitting={submitting}
        onSubmit={handleMovement}
      />

      {totals && (
        <CloseCashDialog
          open={closeDialog}
          onClose={() => setCloseDialog(false)}
          totals={totals}
          submitting={submitting}
          onSubmit={handleClose}
        />
      )}
    </PageBody>
  )
}

export default Cash
