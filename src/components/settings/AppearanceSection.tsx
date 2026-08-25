import { Palette, Sun, Moon, Monitor } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { useTheme } from '../../utils/ThemeContext'

export function AppearanceSection() {
  const { theme, setTheme, effectiveTheme } = useTheme()
  
  const themes = [
    { value: 'light', label: 'Claro', icon: Sun, desc: 'Tema claro para entornos luminosos' },
    { value: 'dark', label: 'Oscuro', icon: Moon, desc: 'Tema oscuro ideal para la noche' },
    { value: 'system', label: 'Sistema', icon: Monitor, desc: 'Usar preferencia del sistema' }
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Palette className="text-primary" size={24} />
          <CardTitle>Apariencia</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label>Tema de la Aplicación</Label>
            <p className="text-sm text-ink-tertiary mb-3">
              Selecciona el tema que prefieras para la interfaz
              {theme === 'system' && ` (actualmente: ${effectiveTheme === 'dark' ? 'oscuro' : 'claro'})`}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {themes.map((t) => {
              const Icon = t.icon
              const isActive = theme === t.value
              return (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value as 'light' | 'dark' | 'system')}
                  className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                    isActive
                      ? 'border-[var(--accent-fill)] bg-[var(--accent-subtle)]'
                      : 'border-line hover:border-[var(--accent-subtle-border)]'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-primary text-on-accent' : 'bg-sunken text-ink-secondary'}`}>
                      <Icon size={20} />
                    </div>
                    <span className={`font-medium ${isActive ? 'text-primary' : 'text-ink'}`}>
                      {t.label}
                    </span>
                  </div>
                  <p className={`text-xs ${isActive ? 'text-primary' : 'text-ink-tertiary'}`}>
                    {t.desc}
                  </p>
                  {isActive && (
                    <div className="absolute top-3 right-3 w-3 h-3 bg-primary rounded-full"></div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
