import { Monitor, Moon, Sun } from 'lucide-react'
import { Card } from '../oryon'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { useTheme } from '../../utils/ThemeContext'

const THEMES = [
  { value: 'light', label: 'Claro', icon: Sun, desc: 'Para mostradores con mucha luz' },
  { value: 'dark', label: 'Oscuro', icon: Moon, desc: 'El tema base de Oryon' },
  { value: 'system', label: 'Sistema', icon: Monitor, desc: 'Sigue la preferencia del dispositivo' },
] as const

/** Tema de la interfaz. Radios nativos: se navegan con flechas y se anuncian como grupo. */
export function AppearanceSection() {
  const { theme, setTheme, effectiveTheme } = useTheme()
  const { isMobile } = useBreakpoint()

  return (
    <Card
      title="Apariencia"
      subtitle={theme === 'system' ? `Ahora mismo en ${effectiveTheme === 'dark' ? 'oscuro' : 'claro'}, según tu dispositivo` : 'Tema de la interfaz en este dispositivo'}
    >
      <div role="radiogroup" aria-label="Tema" style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'repeat(3, minmax(0,1fr))', gap: 8 }}>
        {THEMES.map((t) => {
          const Icon = t.icon
          const on = theme === t.value
          return (
            <label
              key={t.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                minHeight: 'var(--tap-target)',
                background: on ? 'var(--accent-subtle)' : 'var(--surface-card)',
                border: `var(--border-width) solid ${on ? 'var(--accent-subtle-border)' : 'var(--border-default)'}`,
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="theme"
                value={t.value}
                checked={on}
                onChange={() => setTheme(t.value)}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
              />
              <span
                aria-hidden
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 32,
                  height: 32,
                  flex: '0 0 auto',
                  borderRadius: 'var(--radius-sm)',
                  background: on ? 'var(--accent-fill)' : 'var(--bg-sunken)',
                  color: on ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                }}
              >
                <Icon size={16} strokeWidth={1.8} />
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 'var(--text-body)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-primary)' }}>{t.label}</span>
                <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>{t.desc}</span>
              </span>
            </label>
          )
        })}
      </div>
    </Card>
  )
}
