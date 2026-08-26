import type { CSSProperties, ReactNode } from 'react'

/**
 * Loader de marca.
 *
 * Antes cada vista resolvía la espera a su manera: siete tratamientos distintos
 * conviviendo —`Loader2` de lucide, círculos con `border-b-2`, un icono girando,
 * y en Clientes y Ventas un simple «Cargando...» en texto plano—, unos ocupando
 * la ventana entera y otros solo la tabla. Esto es el único que queda.
 *
 * La geometría es el lockup del sistema (anillo + barra diagonal + wordmark) y el
 * barrido repite el gesto del sting de apertura. El color sale de los tokens, así
 * que el tema claro y el oscuro se resuelven solos: no hay que elegir archivo.
 */

/** Trazo del wordmark «ORYON», Archivo 900 en curvas. */
const WORDMARK = 'M416 -12Q299 -12 216 28Q133 68 89 148Q45 227 45 344Q45 462 89 541Q133 620 216 660Q299 700 416 700Q534 700 617 660Q700 620 744 541Q788 462 788 344Q788 227 744 148Q700 68 617 28Q534 -12 416 -12ZM416 153Q452 153 480 164Q507 176 526 197Q544 218 553 248Q562 277 562 312V376Q562 411 553 440Q544 470 526 491Q507 512 480 524Q452 535 416 535Q380 535 352 524Q325 512 307 491Q289 470 280 440Q271 411 271 376V312Q271 277 280 248Q289 218 307 197Q325 176 352 164Q380 153 416 153ZM947 0V688H1378Q1455 688 1506 657Q1558 626 1584 576Q1610 526 1610 468Q1610 402 1579 350Q1548 299 1495 268L1630 0H1382L1277 231H1168V0ZM1168 384H1323Q1349 384 1367 404Q1385 425 1385 459Q1385 480 1377 496Q1369 512 1355 522Q1341 531 1323 531H1168ZM1971 0V267L1698 688H1952L2084 459H2088L2220 688H2461L2192 267V0ZM2925 -12Q2808 -12 2725 28Q2642 68 2598 148Q2554 227 2554 344Q2554 462 2598 541Q2642 620 2725 660Q2808 700 2925 700Q3043 700 3126 660Q3209 620 3253 541Q3297 462 3297 344Q3297 227 3253 148Q3209 68 3126 28Q3043 -12 2925 -12ZM2925 153Q2961 153 2988 164Q3016 176 3034 197Q3053 218 3062 248Q3071 277 3071 312V376Q3071 411 3062 440Q3053 470 3034 491Q3016 512 2988 524Q2961 535 2925 535Q2889 535 2862 524Q2834 512 2816 491Q2798 470 2789 440Q2780 411 2780 376V312Q2780 277 2789 248Q2798 218 2816 197Q2834 176 2862 164Q2889 153 2925 153ZM3456 0V688H3644L3858 441Q3867 431 3882 412Q3897 393 3912 374Q3928 354 3936 342L3941 344Q3940 372 3940 400Q3940 427 3940 441V688H4141V0H3954L3713 275Q3696 295 3684 312Q3672 328 3661 343L3656 341Q3657 322 3657 303Q3657 284 3657 275V0Z'

const RATIO = 258 / 200

interface OryonLoaderProps {
  /** Ancho del lockup en px. La altura sale de la proporción del artboard. */
  width?: number
  /** Solo la marca, sin wordmark: para huecos estrechos. */
  mark?: boolean
  label?: string
}

/** La marca animada, sin envoltorio. */
export function OryonLoader({ width = 116, mark = false, label = 'Cargando' }: OryonLoaderProps) {
  const height = mark ? width : Math.round(width * RATIO)
  return (
    <svg
      viewBox={mark ? '0 0 200 200' : '0 0 200 258'}
      width={width}
      height={height}
      role="img"
      aria-label={label}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <title>{label}</title>
      <circle className="oryon-track" cx="100" cy="100" r="72" />
      <line className="oryon-sweep" x1="25.75" y1="174.25" x2="174.25" y2="25.75" />
      {!mark && (
        <g className="oryon-word" transform="translate(7.84 243) scale(0.043732 -0.043732)">
          <path d={WORDMARK} />
        </g>
      )}
    </svg>
  )
}

export type LoadingMode =
  /** Cubre la ventana. Arranque de la app y pantallas completas. */
  | 'screen'
  /** Cubre a su contenedor, que debe tener `position: relative`. */
  | 'overlay'
  /** Sin capa: el lockup centrado en un bloque. Para tarjetas aun vacías. */
  | 'inline'

interface LoadingProps {
  mode?: LoadingMode
  /** Texto bajo la marca. Sin él solo queda el lockup. */
  label?: ReactNode
  width?: number
  mark?: boolean
  /** Solo en `inline`: alto mínimo del bloque. */
  minHeight?: number
  style?: CSSProperties
}

/**
 * El velo. Deja entrever lo que hay debajo —la tabla que se está refrescando— sin
 * que compita con la marca: se difumina y se atenúa, no se tapa.
 */
const veil: CSSProperties = {
  background: 'color-mix(in srgb, var(--bg-base) 58%, transparent)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
}

export function Loading({
  mode = 'inline',
  label,
  width,
  mark = false,
  minHeight = 200,
  style,
}: LoadingProps) {
  const inner = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        // El barrido cruza la diagonal completa; sin holgura se recorta en los bordes.
        padding: 8,
      }}
    >
      <OryonLoader width={width ?? (mode === 'screen' ? 128 : 104)} mark={mark} />
      {label && (
        <span
          style={{
            fontFamily: 'var(--font-mono-display)',
            fontSize: 'var(--text-caption)',
            letterSpacing: 'var(--tr-caption)',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
            textAlign: 'center',
          }}
        >
          {label}
        </span>
      )}
    </div>
  )

  if (mode === 'inline') {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight, width: '100%', ...style }}>
        {inner}
      </div>
    )
  }

  return (
    <div
      aria-live="polite"
      aria-busy="true"
      style={{
        position: mode === 'screen' ? 'fixed' : 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        /* Por encima del shell entero —barra lateral incluida—, pero por debajo de
           los diálogos, que van en 60: un velo tapando un diálogo abierto no tiene
           sentido, ahí el que manda es el diálogo. */
        zIndex: mode === 'screen' ? 50 : 5,
        ...veil,
        ...style,
      }}
    >
      {inner}
    </div>
  )
}
