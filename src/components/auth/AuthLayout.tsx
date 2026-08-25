import type { CSSProperties, ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Logo } from '../brand/Logo'
import { DataTable, Eyebrow, StatusBadge, type Column } from '../oryon'
import { useBreakpoint } from '../../hooks/useBreakpoint'

/**
 * El split de `Oryon Acceso v2`: panel de marca a la izquierda sobre grafito
 * hundido, columna de formulario de 340px a la derecha.
 *
 * Antes cada una de las seis pantallas de acceso repetía el mismo
 * `min-h-screen flex items-center justify-center` con su propia tarjeta; el panel
 * de marca no existía. Aquí vive una sola vez.
 *
 * En móvil el panel no desaparece: se colapsa en una banda superior con el lockup
 * y el titular, porque es lo único que le dice al usuario dónde está antes de
 * escribir una contraseña.
 */

interface OtRow {
  id: number
  ot: string
  equipo: string
  estado: string
}

/* Las mismas cuatro órdenes del documento de diseño. Son muestra, no datos: el
   panel se pinta antes de que exista sesión. */
const OT_ROWS: OtRow[] = [
  { id: 1, ot: 'OT-2481', equipo: 'iPhone 12', estado: 'reparacion' },
  { id: 2, ot: 'OT-2480', equipo: 'Redmi Note 11', estado: 'listo' },
  { id: 3, ot: 'OT-2479', equipo: 'MacBook Air', estado: 'esperando' },
  { id: 4, ot: 'OT-2478', equipo: 'Galaxy A54', estado: 'diagnostico' },
]

const OT_COLUMNS: Column<OtRow>[] = [
  { key: 'ot', label: 'OT', mono: true, width: 86 },
  { key: 'equipo', label: 'Equipo' },
  { key: 'estado', label: 'Estado', width: 130, render: (r) => <StatusBadge status={r.estado} size="sm" /> },
]

export type AuthVariant = 'login' | 'register' | 'support'

/* Titular, cuerpo y pie de cada variante. `support` reutiliza el panel de acceso:
   el documento dice "mismo split del 01; solo cambia la columna derecha". */
const PANELS: Record<AuthVariant, { title: string; body: 'table' | string; footer: string }> = {
  login: {
    title: 'Ningún equipo se pierde',
    body: 'table',
    footer: 'Seis estados. Cero preguntas.',
  },
  support: {
    title: 'Ningún equipo se pierde',
    body: 'table',
    footer: 'Seis estados. Cero preguntas.',
  },
  register: {
    title: 'Denso a propósito',
    body: 'Tu técnico no quiere tarjetas bonitas con aire. Quiere ver treinta órdenes sin bajar el scroll.',
    footer: 'Un precio. Sin sorpresas.',
  },
}

/* Rejilla de plano técnico, 80px.
   Dos desvíos deliberados del documento, los dos por el tema claro:
   - No se usa .oryon-grid-texture: lleva una máscara radial pensada para el hero
     de la landing que aquí dejaría medio panel liso.
   - La línea no es --border-subtle: en claro ese token vale lo mismo que
     --bg-sunken (ambos --alu-100) y la rejilla desaparecía. Un tinte del color de
     texto funciona en los dos temas, porque --text-primary se invierte con ellos. */
const GRID_LINE = 'color-mix(in srgb, var(--text-primary) 7%, transparent)'

const gridTexture: CSSProperties = {
  backgroundImage:
    `linear-gradient(${GRID_LINE} 1px, transparent 1px), linear-gradient(90deg, ${GRID_LINE} 1px, transparent 1px)`,
  backgroundSize: '80px 80px',
}

export function AuthLayout({
  variant = 'login',
  children,
}: {
  variant?: AuthVariant
  children: ReactNode
}) {
  const { isMobile } = useBreakpoint()
  const panel = PANELS[variant]

  if (isMobile) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--surface-card)' }}>
        <div
          style={{
            padding: '28px 24px 24px',
            background: 'var(--bg-sunken)',
            borderBottom: 'var(--border-width) solid var(--border-default)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            ...gridTexture,
          }}
        >
          <Logo size={26} />
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 32,
              lineHeight: 0.95,
              fontWeight: 'var(--fw-black)',
              letterSpacing: '-0.045em',
              textTransform: 'uppercase',
              color: 'var(--text-primary)',
            }}
          >
            {panel.title}
          </h2>
        </div>
        <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column' }}>{children}</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', background: 'var(--surface-card)' }}>
      <div
        style={{
          width: '46%',
          maxWidth: 620,
          padding: 36,
          background: 'var(--bg-sunken)',
          borderRight: 'var(--border-width) solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 32,
          ...gridTexture,
        }}
      >
        <Logo size={28} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 44,
              lineHeight: 0.95,
              fontWeight: 'var(--fw-black)',
              letterSpacing: '-0.045em',
              textTransform: 'uppercase',
              color: 'var(--text-primary)',
            }}
          >
            {panel.title}
          </h2>

          {panel.body === 'table' ? (
            <div
              style={{
                border: 'var(--border-width) solid var(--border-default)',
                background: 'var(--surface-card)',
              }}
            >
              <DataTable columns={OT_COLUMNS} rows={OT_ROWS} dense />
            </div>
          ) : (
            <p
              style={{
                margin: 0,
                maxWidth: 400,
                fontSize: 'var(--text-body-lg)',
                lineHeight: 1.55,
                color: 'var(--text-secondary)',
                textWrap: 'pretty',
              }}
            >
              {panel.body}
            </p>
          )}
        </div>

        <Eyebrow tone="muted">{panel.footer}</Eyebrow>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 36 }}>
        <div style={{ width: 340, maxWidth: '100%' }}>{children}</div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------
   Encabezado de la columna de formulario: título Archivo + bajada.
   --------------------------------------------------------------------------- */
export function AuthHeading({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <h3
        style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          lineHeight: 1.2,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
        }}
      >
        {title}
      </h3>
      {children && (
        <p style={{ margin: 0, fontSize: 'var(--text-small)', lineHeight: 'var(--lh-small)', color: 'var(--text-secondary)' }}>
          {children}
        </p>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------------------
   Enlace de texto del sistema de acceso. Un <button> con aspecto de enlace: son
   navegaciones dentro de la SPA, no destinos con href propio.
   --------------------------------------------------------------------------- */
export function AuthLink({
  onClick,
  children,
  disabled = false,
  style,
}: {
  onClick: () => void
  children: ReactNode
  disabled?: boolean
  style?: CSSProperties
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: 0,
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-small)',
        lineHeight: 'var(--lh-small)',
        color: 'var(--text-accent)',
        background: 'transparent',
        border: 0,
        borderBottom: '1px solid transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderBottomColor = 'currentColor'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderBottomColor = 'transparent'
      }}
    >
      {children}
    </button>
  )
}

/* Volver — flecha + texto, como en las vistas de apoyo del documento. */
export function AuthBack({ onClick, children = 'Volver a iniciar sesión' }: { onClick: () => void; children?: ReactNode }) {
  return (
    <AuthLink onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
      <ArrowLeft size={14} strokeWidth={1.8} />
      {children}
    </AuthLink>
  )
}

/* ---------------------------------------------------------------------------
   Separador "o" entre credenciales y proveedor externo.
   --------------------------------------------------------------------------- */
export function AuthDivider({ children = 'o' }: { children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
      {/* Sin mayúsculas: la "O" de Martian Mono se lee como un cero, y aquí la
          letra es la conjunción "o", no una etiqueta. */}
      <Eyebrow tone="muted" style={{ flex: '0 0 auto', textTransform: 'none' }}>
        {children}
      </Eyebrow>
      <div style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
    </div>
  )
}

/* Pie de la columna: "¿Sin cuenta? Crear cuenta". */
export function AuthFootnote({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 'var(--text-small)',
        lineHeight: 'var(--lh-small)',
        color: 'var(--text-secondary)',
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  )
}
