/**
 * Oryon — isotipo y lockup.
 *
 * Construcción canónica (opción C del documento de marca): el símbolo de diámetro
 * del dibujo técnico. Es una O, es una cota y es un instrumento — la dirección más
 * específica del oficio y la que mejor aguanta 16px.
 *
 *   círculo r=22 centrado en (32,32), trazo 8
 *   barra de 8 a 45° de (9,55) a (55,9), sobresaliendo por ambos extremos
 *
 * El wordmark se compone en DOM real (no <text> dentro del SVG) para que use la
 * Archivo cargada por la página; el documento de marca deja el trazado a curvas
 * como pendiente de producción.
 *
 * Prohibido: gradiente, cromado, sombra, rotación, contorno o reflejo metálico.
 */

interface MarkProps {
  /** Alto en px del isotipo. */
  size?: number
  /** Barra en cian señal. Sin acento, todo hereda currentColor. */
  accent?: boolean
  className?: string
}

export function LogoMark({ size = 28, accent = true, className }: MarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      role="img"
      aria-label="Oryon"
      className={className}
    >
      <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="8" fill="none" />
      <path
        d="M9 55L55 9"
        stroke={accent ? 'var(--accent-400)' : 'currentColor'}
        strokeWidth="8"
      />
    </svg>
  )
}

interface LogoProps extends MarkProps {
  /** Oculta el wordmark (sidebar colapsado). */
  markOnly?: boolean
}

export function Logo({ size = 26, accent = true, markOnly = false, className }: LogoProps) {
  if (markOnly) return <LogoMark size={size} accent={accent} className={className} />

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        // Área de respeto: el ancho del isotipo.
        gap: size * 0.5,
        color: 'var(--text-primary)',
      }}
    >
      <LogoMark size={size} accent={accent} />
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontSize: size * 0.92,
          letterSpacing: '-0.04em',
          lineHeight: 1,
          textTransform: 'uppercase',
        }}
      >
        Oryon
      </span>
    </span>
  )
}
