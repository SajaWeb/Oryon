import { createRoot } from 'react-dom/client'
import { ShellPreview } from './ShellPreview'
import '../index.css'

/**
 * Dos modos:
 *  - `?frame=1` monta la app directamente (es lo que carga cada iframe).
 *  - sin parámetros, monta el banco de viewports: el shell se renderiza dentro de un iframe
 *    del ancho pedido, así `useBreakpoint` mide el ancho real del marco. Hace falta porque
 *    el gestor de ventanas de este equipo no deja encoger la ventana del navegador.
 *
 * Uso: /dev-preview.html?w=390&h=844 · ?w=834&h=1000 · ?w=1440&h=900
 */
const params = new URLSearchParams(location.search)
const root = createRoot(document.getElementById('root')!)

if (params.get('frame') === '1') {
  root.render(<ShellPreview />)
} else {
  // `?src=/` enmarca la app real (misma sesión, mismo origen) en vez del banco de pruebas.
  const src = params.get('src') || '/dev-preview.html?frame=1'
  const sizes = (params.get('sizes') || '390x844')
    .split(',')
    .map((s) => s.split('x').map(Number))
    .filter((p) => p.length === 2 && p.every(Number.isFinite))

  root.render(
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', padding: 24, background: '#070909', minHeight: '100vh' }}>
      {sizes.map(([w, h]) => (
        <div key={`${w}x${h}`} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
            <span style={{ font: "400 11px/14px 'Martian Mono',monospace", letterSpacing: '.10em', textTransform: 'uppercase', color: '#35E0FF' }}>
              {w < 768 ? 'Móvil' : w < 1024 ? 'Tablet' : 'Escritorio'}
            </span>
            <span style={{ font: "400 12px/16px 'JetBrains Mono',monospace", color: '#6E787C' }}>{w} × {h}</span>
          </div>
          <iframe
            title={`${w}x${h}`}
            src={src}
            style={{ width: w, height: h, border: '1px solid #2C3335', borderRadius: 6, background: '#0B0D0E' }}
          />
        </div>
      ))}
    </div>,
  )
}
