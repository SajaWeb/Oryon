/**
 * Medidor de fuerza de contraseña — sin dependencias.
 *
 * No pretende estimar entropía real (para eso está zxcvbn, 400 KB que no vamos a
 * meter en el bundle de una pantalla de acceso). Lo que hace es detectar los tres
 * fallos que de verdad aparecen en un taller: contraseñas cortas, contraseñas que
 * son el nombre de la empresa, y contraseñas de la lista de siempre.
 *
 * Devuelve un consejo accionable, no un adjetivo: "Débil" sin más no le dice a
 * nadie qué escribir.
 */

/** Mínimo del sistema. El diseño lo declara bajo el campo de contraseña. */
export const MIN_PASSWORD_LENGTH = 8

export type StrengthScore = 0 | 1 | 2 | 3

export interface Strength {
  /** 0 = inservible, 1 = débil, 2 = aceptable, 3 = fuerte. */
  score: StrengthScore
  /** Etiqueta corta para el medidor. */
  label: string
  /** Qué hacer para subir un tramo. Vacío cuando ya está en 3. */
  advice: string
  /** Si es false, el formulario no debe dejar continuar. */
  acceptable: boolean
}

/* Las que aparecen en cualquier volcado, más las variantes locales que se ven en
   talleres: nombre del producto, teclado corrido, fechas. */
const COMMON = new Set([
  '12345678', '123456789', '1234567890', 'password', 'contrasena', 'contraseña',
  'qwertyui', 'qwerty123', 'asdfghjk', 'iloveyou', 'admin123', 'administrador',
  'bienvenido', 'password1', 'password123', 'abc12345', '11111111', '00000000',
  'colombia', 'medellin', 'bogota123', 'oryon123', 'taller123', 'celulares',
  'reparacion', 'servitec', 'usuario123', 'letmein1', 'principal',
])

/** Tres o más caracteres iguales seguidos: "aaa", "111". */
const REPEATED = /(.)\1{2,}/

/** Secuencias corridas de teclado o de dígitos, en cualquier sentido. */
const SEQUENCES = [
  'abcdefghijklmnopqrstuvwxyz',
  '0123456789',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
]

function hasSequence(lower: string): boolean {
  for (const row of SEQUENCES) {
    const back = [...row].reverse().join('')
    for (let i = 0; i + 4 <= row.length; i++) {
      const run = row.slice(i, i + 4)
      if (lower.includes(run)) return true
    }
    for (let i = 0; i + 4 <= back.length; i++) {
      if (lower.includes(back.slice(i, i + 4))) return true
    }
  }
  return false
}

/** Trozos del correo y del nombre que no deben aparecer dentro de la contraseña. */
function personalTokens(context: { email?: string; name?: string }): string[] {
  const raw = [
    context.email?.split('@')[0] ?? '',
    context.email?.split('@')[1]?.split('.')[0] ?? '',
    context.name ?? '',
  ]
  return raw
    .join(' ')
    .toLowerCase()
    .split(/[^a-z0-9áéíóúñ]+/i)
    .filter((t) => t.length >= 4)
}

export function scorePassword(
  password: string,
  context: { email?: string; name?: string } = {}
): Strength {
  const pw = password ?? ''

  if (pw.length === 0) {
    return { score: 0, label: '', advice: '', acceptable: false }
  }

  if (pw.length < MIN_PASSWORD_LENGTH) {
    return {
      score: 0,
      label: 'Muy corta',
      advice: `Faltan ${MIN_PASSWORD_LENGTH - pw.length} caracteres para el mínimo de ${MIN_PASSWORD_LENGTH}.`,
      acceptable: false,
    }
  }

  const lower = pw.toLowerCase()

  if (COMMON.has(lower)) {
    return {
      score: 0,
      label: 'Muy común',
      advice: 'Esta contraseña está en todas las listas de robadas. Escribe otra.',
      acceptable: false,
    }
  }

  const personal = personalTokens(context)
  if (personal.some((t) => lower.includes(t))) {
    return {
      score: 0,
      label: 'Predecible',
      advice: 'No uses tu correo, tu nombre ni el de la empresa dentro de la contraseña.',
      acceptable: false,
    }
  }

  const classes =
    (/[a-záéíóúñ]/.test(pw) ? 1 : 0) +
    (/[A-ZÁÉÍÓÚÑ]/.test(pw) ? 1 : 0) +
    (/[0-9]/.test(pw) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(pw) ? 1 : 0)

  let points = 0
  if (pw.length >= 10) points++
  if (pw.length >= 14) points++
  if (classes >= 2) points++
  if (classes >= 3) points++
  if (REPEATED.test(pw)) points--
  if (hasSequence(lower)) points--

  if (points <= 1) {
    return {
      score: 1,
      label: 'Débil',
      advice:
        classes < 3
          ? 'Mezcla mayúsculas, minúsculas y números.'
          : 'Alárgala: con 12 caracteres o más gana mucho.',
      acceptable: true,
    }
  }

  if (points <= 3) {
    return {
      score: 2,
      label: 'Aceptable',
      advice:
        pw.length < 14
          ? 'Con unos caracteres más queda fuerte.'
          : 'Añade un símbolo para llegar a fuerte.',
      acceptable: true,
    }
  }

  return { score: 3, label: 'Fuerte', advice: '', acceptable: true }
}
