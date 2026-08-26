import { cloneElement, isValidElement, useEffect, useId, useRef, useState } from 'react'
import type {
  CSSProperties,
  InputHTMLAttributes,
  ClipboardEvent,
  KeyboardEvent,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import type { LucideIcon } from 'lucide-react'
import { Check, ChevronDown, Eye, EyeOff } from 'lucide-react'

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

/* ---------------------------------------------------------------------------
   FormField — etiqueta + control + una sola línea de ayuda debajo.
   `error` sustituye a `hint`: nunca se muestran los dos, porque el ojo lee el
   último renglón y ahí tiene que estar lo que hay que corregir.
   Clona el control hijo para inyectarle id, invalid y aria-describedby; así el
   sitio de llamada queda como en el documento de diseño, sin cablear ids a mano.
   --------------------------------------------------------------------------- */
export function FormField({
  label,
  hint,
  error,
  required = false,
  htmlFor,
  children,
  style,
}: {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  required?: boolean
  htmlFor?: string
  children: ReactNode
  style?: CSSProperties
}) {
  const auto = useId()
  const controlId = htmlFor ?? `field-${auto}`
  const messageId = `${controlId}-msg`
  const message = error ?? hint

  const control =
    isValidElement(children) && !htmlFor
      ? cloneElement(children as any, {
          id: (children as any).props.id ?? controlId,
          invalid: (children as any).props.invalid ?? Boolean(error),
          'aria-invalid': error ? true : undefined,
          'aria-describedby': message ? messageId : undefined,
          required: (children as any).props.required ?? (required || undefined),
        })
      : children

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && (
        <label
          htmlFor={controlId}
          style={{
            fontSize: 'var(--text-small)',
            lineHeight: 'var(--lh-small)',
            color: 'var(--text-secondary)',
          }}
        >
          {label}
          {required && (
            <span aria-hidden="true" style={{ color: 'var(--danger)', marginLeft: 3 }}>
              *
            </span>
          )}
        </label>
      )}
      {control}
      {message && (
        <div
          id={messageId}
          role={error ? 'alert' : undefined}
          style={{
            fontSize: 'var(--text-caption)',
            lineHeight: 'var(--lh-small)',
            color: error ? 'var(--danger)' : 'var(--text-tertiary)',
          }}
        >
          {message}
        </div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------------------
   Checkbox — casilla cuadrada de 16px. El Switch es para ajustes que se aplican
   solos; la casilla es para lo que se confirma al enviar el formulario.
   El input real queda oculto pero enfocable: el anillo de foco se pinta sobre la
   caja dibujada.
   --------------------------------------------------------------------------- */
export function Checkbox({
  checked = false,
  label,
  disabled = false,
  invalid = false,
  onChange,
  id,
  style,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'style' | 'size'> & {
  label?: ReactNode
  invalid?: boolean
  style?: CSSProperties
}) {
  const [focused, setFocused] = useState(false)
  const auto = useId()
  const inputId = id ?? `check-${auto}`
  const border = invalid
    ? 'var(--danger)'
    : checked
      ? 'var(--accent-fill)'
      : 'var(--border-strong)'

  return (
    <label
      htmlFor={inputId}
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
        {...rest}
        id={inputId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
      />
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: '0 0 auto',
          width: 16,
          height: 16,
          background: checked ? 'var(--accent-fill)' : 'var(--surface-card)',
          border: `var(--border-width) solid ${border}`,
          borderRadius: 'var(--radius-xs)',
          boxShadow: focused ? focusRing : 'none',
          transition: 'background var(--duration-fast) var(--ease), border-color var(--duration-fast) var(--ease)',
        }}
      >
        {checked && <Check size={12} strokeWidth={3} color="var(--text-on-accent)" />}
      </span>
      {label && (
        <span style={{ fontSize: 'var(--text-small)', lineHeight: 'var(--lh-small)', color: 'var(--text-primary)' }}>
          {label}
        </span>
      )}
    </label>
  )
}

/* ---------------------------------------------------------------------------
   PasswordInput — Input con el ojo en el sufijo. Poder ver lo que se escribe
   evita la mitad de los "contraseña incorrecta": en un mostrador se teclea de pie
   y con el teclado del móvil.
   El botón no entra en el orden de tabulación por delante del campo; va después,
   que es donde el lector de pantalla lo espera.
   --------------------------------------------------------------------------- */
export function PasswordInput({
  size = 'md',
  reveal: revealProp,
  onRevealChange,
  ...rest
}: Omit<Parameters<typeof Input>[0], 'type' | 'suffix'> & {
  /** Controla el estado desde fuera; si se omite, lo lleva el propio componente. */
  reveal?: boolean
  onRevealChange?: (reveal: boolean) => void
}) {
  const [internal, setInternal] = useState(false)
  const reveal = revealProp ?? internal
  const setReveal = (v: boolean) => {
    setInternal(v)
    onRevealChange?.(v)
  }
  const EyeIcon = reveal ? EyeOff : Eye

  return (
    <Input
      {...rest}
      size={size}
      type={reveal ? 'text' : 'password'}
      suffix={
        <button
          type="button"
          onClick={() => setReveal(!reveal)}
          aria-pressed={reveal}
          aria-label={reveal ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          title={reveal ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            padding: 0,
            color: 'var(--text-tertiary)',
            background: 'transparent',
            border: 0,
            borderRadius: 'var(--radius-xs)',
            cursor: 'pointer',
          }}
        >
          <EyeIcon size={size === 'sm' ? 14 : 16} strokeWidth={1.8} />
        </button>
      }
    />
  )
}

/* ---------------------------------------------------------------------------
   PasswordMeter — tres tramos de 3px, como en el documento de acceso.
   Presentacional puro: la puntuación la calcula utils/password-strength, para que
   el sistema de diseño no cargue con reglas de negocio.
   --------------------------------------------------------------------------- */
export function PasswordMeter({
  score,
  label,
  advice,
  segments = 3,
  style,
}: {
  /** 0…segments. 0 pinta todos los tramos apagados. */
  score: number
  label?: ReactNode
  advice?: ReactNode
  segments?: number
  style?: CSSProperties
}) {
  const tone =
    score >= segments ? 'var(--success)' : score <= 1 ? 'var(--danger)' : 'var(--accent-400)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      <div style={{ display: 'flex', gap: 6 }} aria-hidden="true">
        {Array.from({ length: segments }, (_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              background: i < score ? tone : 'var(--border-default)',
              transition: 'background var(--duration-fast) var(--ease)',
            }}
          />
        ))}
      </div>
      {(label || advice) && (
        <div
          aria-live="polite"
          style={{
            display: 'flex',
            gap: 8,
            fontSize: 'var(--text-caption)',
            lineHeight: 'var(--lh-small)',
          }}
        >
          {label && <span style={{ color: tone, flex: '0 0 auto' }}>{label}</span>}
          {advice && <span style={{ color: 'var(--text-tertiary)' }}>{advice}</span>}
        </div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------------------
   OTPInput — seis celdas para el código de verificación.
   Una casilla por dígito y no un campo de seis: en el móvil el usuario ve cuántos
   faltan sin contar. Acepta pegar el código entero desde el correo, que es como
   llega en la práctica.
   --------------------------------------------------------------------------- */
export function OTPInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  invalid = false,
  autoFocus = false,
  size = 'md',
  'aria-label': ariaLabel = 'Código de verificación',
  style,
}: {
  length?: number
  value: string
  onChange: (value: string) => void
  /** Se dispara al completar la última casilla; útil para enviar sin pulsar el botón. */
  onComplete?: (value: string) => void
  disabled?: boolean
  invalid?: boolean
  autoFocus?: boolean
  size?: 'md' | 'lg'
  'aria-label'?: string
  style?: CSSProperties
}) {
  const cells = useRef<Array<HTMLInputElement | null>>([])
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const height = size === 'lg' ? 52 : 44
  const digits = value.padEnd(length, ' ').slice(0, length).split('')

  /* Espejo del valor para leerlo dentro del mismo tick.
     Tecleando rápido —o cuando el móvil autocompleta el SMS— llegan varios eventos
     antes de que React vuelva a renderizar, y todos los manejadores verían el mismo
     `value` viejo: el segundo dígito pisaba al primero. */
  const latest = useRef(value)
  useEffect(() => {
    latest.current = value
  }, [value])

  const commit = (next: string) => {
    const clean = next.replace(/\D/g, '').slice(0, length)
    latest.current = clean
    onChange(clean)
    if (clean.length === length) onComplete?.(clean)
    return clean
  }

  const focusCell = (i: number) => {
    const target = cells.current[Math.max(0, Math.min(length - 1, i))]
    target?.focus()
    target?.select()
  }

  const handleInput = (i: number, raw: string) => {
    const typed = raw.replace(/\D/g, '')
    if (!typed) return
    // Escribir sobre una casilla reemplaza ese dígito y avanza; pegar rellena desde aquí.
    const chars = latest.current.padEnd(length, ' ').split('')
    for (let k = 0; k < typed.length && i + k < length; k++) chars[i + k] = typed[k]
    const next = commit(chars.join('').trimEnd())
    focusCell(Math.min(i + typed.length, length - 1))
    return next
  }

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const chars = latest.current.padEnd(length, ' ').split('')
      if (chars[i] && chars[i] !== ' ') {
        chars[i] = ' '
        commit(chars.join('').trimEnd())
      } else if (i > 0) {
        chars[i - 1] = ' '
        commit(chars.join('').trimEnd())
        focusCell(i - 1)
      }
      return
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      focusCell(i - 1)
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      focusCell(i + 1)
    }
  }

  const handlePaste = (i: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    handleInput(i, e.clipboardData.getData('text'))
  }

  return (
    <div role="group" aria-label={ariaLabel} style={{ display: 'flex', gap: 6, ...style }}>
      {digits.map((digit, i) => {
        const filled = digit.trim() !== ''
        const active = focusedIndex === i
        const border = invalid
          ? `var(--border-width) solid var(--danger)`
          : active
            ? '1.5px solid var(--accent-400)'
            : filled
              ? 'var(--border-width) solid var(--border-strong)'
              : 'var(--border-width) solid var(--border-default)'

        return (
          <input
            key={i}
            ref={(el) => {
              cells.current[i] = el
            }}
            value={digit.trim()}
            onChange={(e) => handleInput(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={(e) => handlePaste(i, e)}
            onFocus={(e) => {
              setFocusedIndex(i)
              e.target.select()
            }}
            onBlur={() => setFocusedIndex((cur) => (cur === i ? null : cur))}
            disabled={disabled}
            /* Al cruzar el corte de móvil el layout cambia de estructura y React
               vuelve a montar estas casillas; sin esta guarda el foco saltaría a la
               primera con el código a medio escribir. */
            autoFocus={autoFocus && i === 0 && value.length === 0}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            aria-label={`Dígito ${i + 1} de ${length}`}
            aria-invalid={invalid || undefined}
            maxLength={1}
            style={{
              flex: 1,
              minWidth: 0,
              height,
              padding: 0,
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: 18,
              fontWeight: 'var(--fw-semibold)',
              color: 'var(--text-primary)',
              background: 'var(--bg-sunken)',
              border,
              borderRadius: 'var(--radius-sm)',
              outline: 'none',
              boxShadow: active ? focusRing : 'none',
              opacity: disabled ? 0.6 : 1,
              transition: 'border-color var(--duration-fast) var(--ease), box-shadow var(--duration-fast) var(--ease)',
            }}
          />
        )
      })}
    </div>
  )
}

/* ---------------------------------------------------------------------------
   Textarea — mismo lenguaje que Input: borde de 1px, foco con anillo de 3px y
   `invalid` en --danger. Solo crece en vertical; el ancho lo manda la rejilla.
   --------------------------------------------------------------------------- */
export function Textarea({
  rows = 4,
  invalid = false,
  disabled = false,
  mono = false,
  style,
  onFocus,
  onBlur,
  ...rest
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'style'> & {
  invalid?: boolean
  mono?: boolean
  style?: CSSProperties
}) {
  const [focused, setFocused] = useState(false)
  const border = invalid ? 'var(--danger)' : focused ? 'var(--border-focus)' : 'var(--border-default)'

  return (
    <textarea
      rows={rows}
      disabled={disabled}
      {...rest}
      onFocus={(e) => { setFocused(true); onFocus?.(e) }}
      onBlur={(e) => { setFocused(false); onBlur?.(e) }}
      style={{
        display: 'block',
        width: '100%',
        padding: '8px 10px',
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
        fontSize: 'var(--text-body)',
        lineHeight: 'var(--lh-body)',
        color: 'var(--text-primary)',
        background: disabled ? 'var(--bg-sunken)' : 'var(--surface-card)',
        border: `var(--border-width) solid ${border}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: focused ? focusRing : 'none',
        outline: 'none',
        resize: 'vertical',
        ...style,
      }}
    />
  )
}

/* ---------------------------------------------------------------------------
   RadioCard — opción con título y explicación, en una caja seleccionable.

   Un <select> no sirve cuando cada opción necesita una frase que explique qué
   implica: el usuario tendría que abrirlo para leer y cerrarlo para comparar.
   Aquí las tres caben a la vez y se leen de un vistazo, que es lo que pide una
   decisión que luego no se puede cambiar.
   --------------------------------------------------------------------------- */
export function RadioCard({
  name,
  checked = false,
  onChange,
  title,
  description,
  disabled = false,
  style,
}: {
  name: string
  checked?: boolean
  onChange?: () => void
  title: ReactNode
  description?: ReactNode
  disabled?: boolean
  style?: CSSProperties
}) {
  const [focused, setFocused] = useState(false)

  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 12px',
        minHeight: 'var(--tap-target)',
        background: checked ? 'var(--accent-subtle)' : 'var(--surface-card)',
        border: `var(--border-width) solid ${checked ? 'var(--accent-subtle-border)' : 'var(--border-default)'}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: focused ? focusRing : 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background var(--duration-fast) var(--ease), border-color var(--duration-fast) var(--ease)',
        ...style,
      }}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange?.()}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
      />
      <span
        aria-hidden="true"
        style={{
          display: 'grid',
          placeItems: 'center',
          flex: '0 0 auto',
          width: 16,
          height: 16,
          marginTop: 2,
          borderRadius: 'var(--radius-pill)',
          border: `var(--border-width) solid ${checked ? 'var(--accent-fill)' : 'var(--border-strong)'}`,
          background: 'var(--surface-card)',
        }}
      >
        {checked && (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 'var(--radius-pill)',
              background: 'var(--accent-fill)',
            }}
          />
        )}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 'var(--text-body)', fontWeight: 'var(--fw-medium)', color: 'var(--text-primary)' }}>
          {title}
        </span>
        {description && (
          <span style={{ fontSize: 'var(--text-small)', lineHeight: 'var(--lh-small)', color: 'var(--text-secondary)' }}>
            {description}
          </span>
        )}
      </span>
    </label>
  )
}
