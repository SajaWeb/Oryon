import { useEffect, useState } from 'react'
import { useTheme } from '../../utils/ThemeContext'

export interface ChartColors {
  series1: string
  series2: string
  series3: string
  series4: string
  grid: string
  axis: string
}

function read(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

function resolve(): ChartColors {
  return {
    series1: read('--accent-400', '#35E0FF'),
    series2: read('--state-ready', '#3FD98A'),
    series3: read('--state-repair', '#FFB020'),
    series4: read('--state-diagnosis', '#6C7BFF'),
    grid: read('--border-subtle', '#202527'),
    axis: read('--text-tertiary', '#6E787C'),
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
  const [colors, setColors] = useState<ChartColors>(resolve)

  useEffect(() => {
    setColors(resolve())
  }, [effectiveTheme])

  return colors
}
