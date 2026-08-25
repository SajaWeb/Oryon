import { useState } from 'react'
import type { ButtonHTMLAttributes, CSSProperties } from 'react'
import type { LucideIcon } from 'lucide-react'
import { LoaderCircle } from 'lucide-react'

/* ---------------------------------------------------------------------------
   Escalas y variantes compartidas por Button e IconButton.
   Press es un paso más de superficie, sin transform ni escala: el sistema no
   mueve nada al pulsar, solo cambia de color.
   --------------------------------------------------------------------------- */
const SIZES = {
  sm: { h: 'var(--control-height-sm)', px: 10, fs: 'var(--text-small)', gap: 5, ic: 14 },
  md: { h: 'var(--control-height)', px: 12, fs: 'var(--text-body)', gap: 6, ic: 16 },
  lg: { h: 'var(--control-height-lg)', px: 16, fs: 'var(--text-body)', gap: 8, ic: 16 },
} as const

const VARIANTS = {
  primary: {
    bg: 'var(--accent-fill)', bd: 'var(--accent-fill)', fg: 'var(--text-on-accent)',
    hbg: 'var(--accent-fill-hover)', hbd: 'var(--accent-fill-hover)', abg: 'var(--accent-fill-active)',
  },
  secondary: {
    bg: 'var(--surface-card)', bd: 'var(--border-default)', fg: 'var(--text-primary)',
    hbg: 'var(--surface-hover)', hbd: 'var(--border-strong)', abg: 'var(--surface-active)',
  },
  ghost: {
    bg: 'transparent', bd: 'transparent', fg: 'var(--text-secondary)',
    hbg: 'var(--surface-hover)', hbd: 'transparent', abg: 'var(--surface-active)',
  },
  danger: {
    bg: 'var(--danger)', bd: 'var(--danger)', fg: '#fff',
    hbg: 'var(--danger-hover)', hbd: 'var(--danger-hover)', abg: 'var(--danger-hover)',
  },
} as const

export type ButtonVariant = keyof typeof VARIANTS
export type ButtonSize = keyof typeof SIZES

/* ---------------------------------------------------------------------------
   Button — verbo + objeto, máximo tres palabras. Radio 4px, borde de 1px
   siempre presente: sobre grafito el borde es la estructura, no un adorno.
   --------------------------------------------------------------------------- */
export function Button({
  variant = 'secondary',
  size = 'md',
  iconLeft: IconLeft,
  iconRight: IconRight,
  loading = false,
  disabled = false,
  fullWidth = false,
  children,
  style,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  onMouseUp,
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  iconLeft?: LucideIcon
  iconRight?: LucideIcon
  loading?: boolean
  fullWidth?: boolean
  style?: CSSProperties
}) {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  const s = SIZES[size]
  const v = VARIANTS[variant]
  const off = disabled || loading

  return (
    <button
      type="button"
      disabled={off}
      {...rest}
      onMouseEnter={(e) => { setHovered(true); onMouseEnter?.(e) }}
      onMouseLeave={(e) => { setHovered(false); setPressed(false); onMouseLeave?.(e) }}
      onMouseDown={(e) => { setPressed(true); onMouseDown?.(e) }}
      onMouseUp={(e) => { setPressed(false); onMouseUp?.(e) }}
      style={{
        display: fullWidth ? 'flex' : 'inline-flex',
        width: fullWidth ? '100%' : undefined,
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        height: s.h,
        padding: `0 ${s.px}px`,
        fontFamily: 'var(--font-sans)',
        fontSize: s.fs,
        fontWeight: 'var(--fw-medium)',
        lineHeight: 1,
        color: v.fg,
        background: off ? v.bg : pressed ? v.abg : hovered ? v.hbg : v.bg,
        border: `var(--border-width) solid ${hovered && !off ? v.hbd : v.bd}`,
        borderRadius: 'var(--radius-md)',
        cursor: off ? 'not-allowed' : 'pointer',
        opacity: off ? 0.45 : 1,
        transition: 'background var(--duration-fast) var(--ease), border-color var(--duration-fast) var(--ease)',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {loading && <LoaderCircle size={s.ic} style={{ animation: 'oryon-spin 900ms linear infinite' }} />}
      {!loading && IconLeft && <IconLeft size={s.ic} strokeWidth={1.8} />}
      {children}
      {IconRight && <IconRight size={s.ic} strokeWidth={1.8} />}
    </button>
  )
}

/* ---------------------------------------------------------------------------
   IconButton — cuadrado de 28/34/40. `label` es obligatorio: sin texto visible,
   es lo único que da nombre accesible al control.
   --------------------------------------------------------------------------- */
const BOXES = { sm: { box: 28, ic: 14 }, md: { box: 34, ic: 16 }, lg: { box: 40, ic: 18 } } as const

export function IconButton({
  icon: Icon,
  label,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  active = false,
  style,
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> & {
  icon: LucideIcon
  label: string
  variant?: 'ghost' | 'secondary'
  size?: keyof typeof BOXES
  active?: boolean
  style?: CSSProperties
}) {
  const [hovered, setHovered] = useState(false)
  const s = BOXES[size]
  const solid = variant === 'secondary'

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      {...rest}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: '0 0 auto',
        width: s.box,
        height: s.box,
        padding: 0,
        color: active ? 'var(--text-accent)' : hovered ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: active
          ? 'var(--accent-subtle)'
          : hovered && !disabled
            ? 'var(--surface-hover)'
            : solid
              ? 'var(--surface-card)'
              : 'transparent',
        border: `var(--border-width) solid ${
          solid ? 'var(--border-default)' : active ? 'var(--accent-subtle-border)' : 'transparent'
        }`,
        borderRadius: 'var(--radius-md)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'background var(--duration-fast) var(--ease), color var(--duration-fast) var(--ease)',
        ...style,
      }}
    >
      <Icon size={s.ic} strokeWidth={1.8} />
    </button>
  )
}
