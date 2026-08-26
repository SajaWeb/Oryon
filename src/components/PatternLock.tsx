import { useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from '../utils/ThemeContext'

interface Point {
  x: number
  y: number
  index: number
}

interface PatternLockProps {
  onPatternComplete: (pattern: number[]) => void
  value?: number[]
  gridSize?: number
  readOnly?: boolean
}

export function PatternLock({ onPatternComplete, value = [], gridSize = 3, readOnly = false }: PatternLockProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [pattern, setPattern] = useState<number[]>(value)
  const [points, setPoints] = useState<Point[]>([])
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null)

  /* El canvas no entiende var(), así que los tokens se resuelven a hex antes de
     pintar — el mismo recurso que usa useChartColors para Recharts. Antes estaban
     en duro y el patrón salía con fondo blanco dentro del modal grafito. */
  const { effectiveTheme } = useTheme()
  const palette = useMemo(() => {
    const read = (name: string, fallback: string) => {
      if (typeof window === 'undefined') return fallback
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
    }
    return {
      surface: read('--bg-sunken', '#070909'),
      trace: read('--accent-fill', '#35E0FF'),
      dot: read('--border-strong', '#3E4649'),
      dotRing: read('--border-default', '#2C3335'),
      dotOn: read('--accent-fill', '#35E0FF'),
      dotOnRing: read('--accent-fill-active', '#17BCDB'),
      numberOn: read('--text-on-accent', '#04181D'),
      number: read('--text-tertiary', '#6E787C'),
    }
    // effectiveTheme entra como dependencia para repintar al cambiar de tema.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveTheme])

  const CANVAS_SIZE = 300
  const POINT_RADIUS = 20
  const SELECTED_RADIUS = 25
  const LINE_WIDTH = 4

  useEffect(() => {
    if (value && value.length > 0) {
      setPattern(value)
    }
  }, [value])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Calcular posiciones de los puntos
    const spacing = CANVAS_SIZE / (gridSize + 1)
    const newPoints: Point[] = []
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        newPoints.push({
          x: spacing * (j + 1),
          y: spacing * (i + 1),
          index: i * gridSize + j
        })
      }
    }
    setPoints(newPoints)

    drawCanvas(ctx, newPoints)
    // `palette` entra aquí para que el patrón se repinte al cambiar de tema.
  }, [gridSize, pattern, currentPoint, palette])

  const drawCanvas = (ctx: CanvasRenderingContext2D, pts: Point[]) => {
    // Limpiar canvas
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    // Dibujar fondo
    ctx.fillStyle = palette.surface
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    // Dibujar líneas del patrón
    if (pattern.length > 0) {
      ctx.strokeStyle = palette.trace
      ctx.lineWidth = LINE_WIDTH
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctx.beginPath()
      const firstPoint = pts[pattern[0]]
      ctx.moveTo(firstPoint.x, firstPoint.y)

      for (let i = 1; i < pattern.length; i++) {
        const point = pts[pattern[i]]
        ctx.lineTo(point.x, point.y)
      }

      // Si está dibujando, agregar línea hasta el punto actual
      if (currentPoint && isDrawing) {
        ctx.lineTo(currentPoint.x, currentPoint.y)
      }

      ctx.stroke()
    }

    // Dibujar puntos
    pts.forEach((point) => {
      const isSelected = pattern.includes(point.index)
      
      // Círculo exterior
      ctx.beginPath()
      ctx.arc(point.x, point.y, isSelected ? SELECTED_RADIUS : POINT_RADIUS, 0, 2 * Math.PI)
      ctx.fillStyle = isSelected ? palette.dotOn : palette.dot
      ctx.fill()
      ctx.strokeStyle = isSelected ? palette.dotOnRing : palette.dotRing
      ctx.lineWidth = 2
      ctx.stroke()

      // Círculo interior
      if (isSelected) {
        ctx.beginPath()
        ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI)
        ctx.fillStyle = palette.trace
        ctx.fill()
      }

      // Número del punto
      ctx.fillStyle = isSelected ? palette.numberOn : palette.number
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText((point.index + 1).toString(), point.x, point.y)
    })
  }

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_SIZE / rect.width
    const scaleY = CANVAS_SIZE / rect.height

    let clientX: number, clientY: number

    if ('touches' in e) {
      if (e.touches.length === 0) return null
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    }
  }

  const findNearestPoint = (x: number, y: number): Point | null => {
    for (const point of points) {
      const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2))
      if (distance < SELECTED_RADIUS + 10) {
        return point
      }
    }
    return null
  }

  const handleStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly) return
    e.preventDefault()
    const point = getCanvasPoint(e)
    if (!point) return

    const nearestPoint = findNearestPoint(point.x, point.y)
    if (nearestPoint) {
      setIsDrawing(true)
      setPattern([nearestPoint.index])
      setCurrentPoint(point)
    }
  }

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly) return
    e.preventDefault()
    if (!isDrawing) return

    const point = getCanvasPoint(e)
    if (!point) return

    setCurrentPoint(point)

    const nearestPoint = findNearestPoint(point.x, point.y)
    if (nearestPoint && !pattern.includes(nearestPoint.index)) {
      setPattern([...pattern, nearestPoint.index])
    }
  }

  const handleEnd = () => {
    if (readOnly) return
    if (!isDrawing) return
    
    setIsDrawing(false)
    setCurrentPoint(null)
    
    if (pattern.length >= 2) {
      onPatternComplete(pattern)
    } else {
      // Si el patrón es muy corto, reiniciar
      setPattern([])
    }
  }

  const clearPattern = () => {
    if (readOnly) return
    setPattern([])
    onPatternComplete([])
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        className={`border-2 border-line rounded-lg shadow-sm ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
        style={{ touchAction: 'none' }}
      />
      <div className="flex gap-2 items-center">
        {pattern.length > 0 && (
          <>
            <p className="text-sm text-ink-secondary">
              Patrón: {pattern.map(p => p + 1).join(' → ')}
            </p>
            {!readOnly && (
              <button
                type="button"
                onClick={clearPattern}
                className="text-sm text-primary hover:text-primary underline"
              >
                Limpiar
              </button>
            )}
          </>
        )}
        {pattern.length === 0 && !readOnly && (
          <p className="text-sm text-ink-tertiary">
            Dibuja un patrón conectando al menos 2 puntos
          </p>
        )}
      </div>
    </div>
  )
}
