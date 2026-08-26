import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(<App />)

/**
 * Retira el sting de apertura de index.html.
 *
 * Se le da un mínimo en pantalla para que no se corte a media animación en una
 * carga rápida: el anillo termina de trazarse a los 900 ms y la barra entra a los
 * 1250 ms, así que por debajo de eso solo se vería un parpadeo.
 *
 * Debajo queda el mismo lockup del loader de la app, en la misma posición y al
 * mismo tamaño, así que el relevo es continuo: aquí se dibuja la marca y allí
 * empieza a barrer.
 */
const SPLASH_MIN_MS = 1250
const SPLASH_FADE_MS = 320

function retirarSting() {
  const splash = document.getElementById('oryon-splash')
  if (!splash) return

  const inicio = Number((window as any).__oryonSplashStart) || Date.now()
  const restante = Math.max(0, SPLASH_MIN_MS - (Date.now() - inicio))

  window.setTimeout(() => {
    splash.style.opacity = '0'
    window.setTimeout(() => splash.remove(), SPLASH_FADE_MS)
  }, restante)
}

// Tras el primer frame pintado por React, no antes: si no, se ve el hueco.
requestAnimationFrame(() => requestAnimationFrame(retirarSting))
