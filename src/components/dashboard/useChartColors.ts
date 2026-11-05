import { useEffect, useState } from 'react'
import { useTheme } from '../../utils/ThemeContext'

export interface ChartColors {
  series1: string
  series2: string
  series3: string
  series4: string
  grid: string
  axis: string
  /** Par validado (scripts de dataviz, CVD y contraste) para "ingresos vs ganancia". */
  revenue: string
  profit: string
  /** Lo que no es el foco en una barra de parte-todo (p. ej. el costo frente a la ganancia). */
  neutral: string
  /** Superficie de la tarjeta: separa segmentos contiguos con un hueco de 2px. */
  surface: string
  /** Paleta categórica para series sin significado semántico (porciones de un donut). */
  categorical: string[]
}

function read(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

function resolve(theme: 'light' | 'dark' = 'dark'): ChartColors {
  const light = theme === 'light'
  return {
    /* En claro el cian 400 queda a 1,6:1 sobre blanco (ilegible); el 600 da más de 3:1. */
    series1: light ? read('--accent-600', '#1195AE') : read('--accent-400', '#35E0FF'),
    series2: read('--state-ready', '#3FD98A'),
    series3: read('--state-repair', '#FFB020'),
    series4: read('--state-diagnosis', '#6C7BFF'),
    grid: read('--border-subtle', '#202527'),
    axis: read('--text-tertiary', '#6E787C'),
    revenue: light ? read('--accent-600', '#1195AE') : read('--accent-500', '#17BCDB'),
    profit: read('--state-diagnosis', light ? '#4453D6' : '#6C7BFF'),
    neutral: read('--alu-400', '#6E787C'),
    surface: read('--surface-card', light ? '#FFFFFF' : '#131617'),
    categorical: [
      light ? read('--accent-600', '#1195AE') : read('--accent-400', '#35E0FF'),
      read('--state-diagnosis', '#6C7BFF'),
      read('--state-repair', '#FFB020'),
      read('--state-ready', '#3FD98A'),
      read('--state-waiting', '#FF6B3D'),
      read('--state-delivered', '#5C7F82'),
      read('--state-cancelled', '#FF4D42'),
    ],
  }
}

/**
 * Recharts pinta dentro de un SVG y necesita colores ya resueltos para los ticks
 * y la rejilla (no acepta var() en todos sus objetos de estilo). Este hook lee
 * los tokens del documento y los vuelve a leer cuando cambia el tema, para que
 * los gráficos sigan al tema sin hardcodear un solo hex.
 */
export function useChartColors(): ChartColors {
  const { effectiveTheme } = useTheme()
  const [colors, setColors] = useState<ChartColors>(() => resolve(effectiveTheme))

  useEffect(() => {
    /* Un frame de espera: ThemeContext escribe data-theme en su propio efecto y
       los tokens de estado dependen de él. Leer antes devolvería el tema viejo. */
    const id = requestAnimationFrame(() => setColors(resolve(effectiveTheme)))
    return () => cancelAnimationFrame(id)
  }, [effectiveTheme])

  return colors
}
