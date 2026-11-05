import { useState } from 'react'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { BUSINESS_PROFILE_LIST, type BusinessTypeId } from '../../config/businessTypes'

/**
 * Elegir el tipo de comercio: cuatro tarjetas con icono, nombre y una línea.
 *
 * Es la primera decisión de una cuenta nueva y define cómo se ve toda la app
 * (vocabulario, campos de la orden, categorías). Por eso va con tarjetas que se
 * leen de un vistazo y no en un desplegable. Son radios nativos: se navegan con
 * flechas y el lector de pantalla los anuncia como grupo.
 */
export function BusinessTypePicker({
  value,
  onChange,
  name = 'businessType',
  disabled = false,
  compact = false,
  error,
}: {
  value?: BusinessTypeId | null
  onChange: (value: BusinessTypeId) => void
  name?: string
  disabled?: boolean
  /** En Configuración: sin tagline, en una fila si cabe. */
  compact?: boolean
  error?: string
}) {
  const { isMobile } = useBreakpoint()
  const [focused, setFocused] = useState<BusinessTypeId | null>(null)
  const columns = compact && !isMobile ? 4 : isMobile && !compact ? 1 : 2

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        role="radiogroup"
        aria-label="Tipo de comercio"
        aria-invalid={error ? true : undefined}
        style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 8 }}
      >
        {BUSINESS_PROFILE_LIST.map((profile) => {
          const checked = value === profile.id
          const Icon = profile.icon
          return (
            <label
              key={profile.id}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: compact ? 'column' : 'row',
                alignItems: compact ? 'flex-start' : 'center',
                gap: compact ? 6 : 12,
                padding: compact ? '10px 12px' : '12px 14px',
                minHeight: 'var(--tap-target)',
                background: checked ? 'var(--accent-subtle)' : 'var(--surface-card)',
                border: `var(--border-width) solid ${
                  error && !value ? 'var(--danger)' : checked ? 'var(--accent-subtle-border)' : 'var(--border-default)'
                }`,
                borderRadius: 'var(--radius-md)',
                outline: focused === profile.id ? '2px solid var(--border-focus)' : 'none',
                outlineOffset: 2,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled && !checked ? 0.6 : 1,
                transition: 'background 120ms, border-color 120ms',
              }}
            >
              <input
                type="radio"
                name={name}
                value={profile.id}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange(profile.id)}
                onFocus={() => setFocused(profile.id)}
                onBlur={() => setFocused(null)}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
              />
              <span
                aria-hidden
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  flex: '0 0 auto',
                  width: compact ? 28 : 36,
                  height: compact ? 28 : 36,
                  borderRadius: 'var(--radius-sm)',
                  background: checked ? 'var(--accent-fill)' : 'var(--bg-sunken)',
                  color: checked ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                }}
              >
                <Icon size={compact ? 16 : 19} strokeWidth={1.8} />
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span
                  style={{
                    fontSize: compact ? 'var(--text-small)' : 'var(--text-body)',
                    fontWeight: 'var(--fw-semibold)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {profile.label}
                </span>
                {!compact && (
                  <span style={{ fontSize: 'var(--text-caption)', lineHeight: 1.35, color: 'var(--text-tertiary)' }}>
                    {profile.tagline}
                  </span>
                )}
              </span>
            </label>
          )
        })}
      </div>
      {error && (
        <div role="alert" style={{ fontSize: 'var(--text-caption)', color: 'var(--danger)' }}>
          {error}
        </div>
      )}
    </div>
  )
}
