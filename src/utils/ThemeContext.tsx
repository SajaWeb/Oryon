import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'
type Effective = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  effectiveTheme: Effective
}

const STORAGE_KEY = 'oryon-theme'

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolve(theme: Theme): Effective {
  if (theme === 'system') return prefersDark() ? 'dark' : 'light'
  return theme
}

/**
 * Escribe el tema en <html>. Dos canales, a propósito:
 *  - `data-theme` es el que consumen los tokens Oryon (oryon-tokens.css).
 *  - la clase `.dark` alimenta la variante dark: de Tailwind, de la que
 *    todavía dependen las pantallas heredadas.
 * Debe quedar idéntico a lo que hace el script anti-FOUC de index.html.
 */
function applyTheme(effective: Effective) {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(effective)
  root.setAttribute('data-theme', effective)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Dark-first: el tema base del sistema de diseño es el grafito.
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark'
    return (localStorage.getItem(STORAGE_KEY) as Theme) || 'dark'
  })

  // Se inicializa ya resuelto para que el primer render coincida con lo que
  // el script anti-FOUC pintó, y no haya salto.
  const [effectiveTheme, setEffectiveTheme] = useState<Effective>(() => {
    if (typeof window === 'undefined') return 'dark'
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme) || 'dark'
    return resolve(stored)
  })

  useEffect(() => {
    const applied = resolve(theme)
    setEffectiveTheme(applied)
    applyTheme(applied)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  // Seguir al sistema solo mientras el modo sea 'system'.
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      const applied: Effective = e.matches ? 'dark' : 'light'
      setEffectiveTheme(applied)
      applyTheme(applied)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
