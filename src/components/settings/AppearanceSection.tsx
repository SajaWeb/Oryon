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
          <Palette className="text-blue-600" size={24} />
          <CardTitle>Apariencia</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label>Tema de la Aplicación</Label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
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
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-800'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                      <Icon size={20} />
                    </div>
                    <span className={`font-medium ${isActive ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'}`}>
                      {t.label}
                    </span>
                  </div>
                  <p className={`text-xs ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}>
                    {t.desc}
                  </p>
                  {isActive && (
                    <div className="absolute top-3 right-3 w-3 h-3 bg-blue-600 rounded-full"></div>
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
