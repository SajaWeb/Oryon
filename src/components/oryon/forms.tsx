import { useState } from 'react'
import type { CSSProperties, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ChevronDown } from 'lucide-react'

/* Foco: borde de acento + anillo de 3px. Nunca se elimina — es la única señal
   de posición para quien navega con teclado sobre una tabla densa. */
const focusRing = '0 0 0 3px color-mix(in srgb, var(--accent-fill) 18%, transparent)'

function heightFor(size: 'sm' | 'md' | 'lg') {
  return size === 'sm'
    ? 'var(--control-height-sm)'
    : size === 'lg'
      ? 'var(--control-height-lg)'
      : 'var(--control-height)'
}

/* ---------------------------------------------------------------------------
   Input — el control envuelve al <input> para poder alojar icono y sufijo.
   `mono` activa JetBrains Mono con cifras tabulares: obligatorio en IMEI,
   serie, SKU y montos.
   --------------------------------------------------------------------------- */
export function Input({
  size = 'md',
  iconLeft: IconLeft,
  suffix,
  mono = false,
  invalid = false,
  disabled = false,
  fullWidth = true,
  style,
  inputStyle,
  onFocus,
  onBlur,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'style'> & {
  size?: 'sm' | 'md' | 'lg'
  iconLeft?: LucideIcon
  suffix?: ReactNode
  mono?: boolean
  invalid?: boolean
  fullWidth?: boolean
  style?: CSSProperties
  inputStyle?: CSSProperties
}) {
  const [focused, setFocused] = useState(false)
  const border = invalid ? 'var(--danger)' : focused ? 'var(--border-focus)' : 'var(--border-default)'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        width: fullWidth ? '100%' : undefined,
        height: heightFor(size),
        padding: '0 10px',
        background: disabled ? 'var(--bg-sunken)' : 'var(--surface-card)',
        border: `var(--border-width) solid ${border}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: focused ? focusRing : 'none',
        transition: 'border-color var(--duration-fast) var(--ease), box-shadow var(--duration-fast) var(--ease)',
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
    >
      {IconLeft && <IconLeft size={size === 'sm' ? 14 : 16} color="var(--text-tertiary)" strokeWidth={1.8} style={{ flex: '0 0 auto' }} />}
      <input
        disabled={disabled}
        {...rest}
        onFocus={(e) => { setFocused(true); onFocus?.(e) }}
        onBlur={(e) => { setFocused(false); onBlur?.(e) }}
        style={{
          flex: 1,
          minWidth: 0,
          height: '100%',
          padding: 0,
          fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
          fontSize: size === 'sm' ? 'var(--text-small)' : 'var(--text-body)',
          fontVariantNumeric: mono ? 'tabular-nums' : 'normal',
          color: 'var(--text-primary)',
          background: 'transparent',
          border: 0,
          outline: 'none',
          boxShadow: 'none',
          ...inputStyle,
        }}
      />
      {suffix && (
        <span
          style={{
            flex: '0 0 auto',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-small)',
            color: 'var(--text-tertiary)',
          }}
        >
          {suffix}
        </span>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------------------
   Select — <select> nativo (en móvil abre la rueda del sistema, que es mejor
   que cualquier popover propio) con la flecha dibujada encima.
   --------------------------------------------------------------------------- */
export type SelectOption = string | { value: string; label: string }

export function Select({
  options,
  size = 'md',
  invalid = false,
  disabled = false,
  fullWidth = true,
  placeholder,
  style,
  onFocus,
  onBlur,
  ...rest
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size' | 'style'> & {
  options: SelectOption[]
  size?: 'sm' | 'md' | 'lg'
  invalid?: boolean
  fullWidth?: boolean
  placeholder?: string
  style?: CSSProperties
}) {
  const [focused, setFocused] = useState(false)
  const border = invalid ? 'var(--danger)' : focused ? 'var(--border-focus)' : 'var(--border-default)'

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: fullWidth ? '100%' : undefined,
        height: heightFor(size),
        background: disabled ? 'var(--bg-sunken)' : 'var(--surface-card)',
        border: `var(--border-width) solid ${border}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: focused ? focusRing : 'none',
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
    >
      <select
        disabled={disabled}
        {...rest}
        onFocus={(e) => { setFocused(true); onFocus?.(e) }}
        onBlur={(e) => { setFocused(false); onBlur?.(e) }}
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          flex: 1,
          minWidth: 0,
          height: '100%',
          padding: '0 30px 0 10px',
          fontFamily: 'var(--font-sans)',
          fontSize: size === 'sm' ? 'var(--text-small)' : 'var(--text-body)',
          color: 'var(--text-primary)',
          background: 'transparent',
          border: 0,
          outline: 'none',
          boxShadow: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const value = typeof o === 'string' ? o : o.value
          const label = typeof o === 'string' ? o : o.label
          return (
            <option key={value} value={value}>
              {label}
            </option>
          )
        })}
      </select>
      <ChevronDown
        size={14}
        color="var(--text-tertiary)"
        strokeWidth={1.8}
        style={{ position: 'absolute', right: 9, pointerEvents: 'none' }}
      />
    </div>
  )
}

/* ---------------------------------------------------------------------------
   Switch — junto al punto de estado, el único pill del sistema.
   El pulgar mide 34×18, pero la etiqueta reserva 44px de alto para que el
   objetivo táctil cumpla el mínimo en móvil.
   --------------------------------------------------------------------------- */
export function Switch({
  checked = false,
  label,
  disabled = false,
  onChange,
  style,
  ...rest
}: {
  checked?: boolean
  label?: ReactNode
  disabled?: boolean
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  'aria-label'?: string
  style?: CSSProperties
}) {
  return (
    <label
      {...rest}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        minHeight: 'var(--tap-target)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
      />
      <span
        style={{
          position: 'relative',
          flex: '0 0 auto',
          width: 34,
          height: 18,
          background: checked ? 'var(--accent-fill)' : 'var(--alu-400)',
          border: `var(--border-width) solid ${checked ? 'var(--accent-fill)' : 'var(--border-strong)'}`,
          borderRadius: 'var(--radius-pill)',
          transition: 'background var(--duration) var(--ease)',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 17 : 2,
            width: 12,
            height: 12,
            background: '#fff',
            borderRadius: 'var(--radius-pill)',
            transition: 'left var(--duration) var(--ease)',
          }}
        />
      </span>
      {label && <span style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)' }}>{label}</span>}
    </label>
  )
}
