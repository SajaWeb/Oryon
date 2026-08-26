import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { useTheme } from '../../utils/ThemeContext'

/**
 * Toasts del sistema.
 *
 * Estaban ilegibles por dos motivos, los dos silenciosos:
 *
 * 1. Pintaban con `var(--popover)`, `var(--popover-foreground)` y `var(--border)`,
 *    que no existen: el proyecto los define como `--color-popover`, etc. (nomenclatura
 *    de Tailwind v4). Las tres variables resolvían a nada, así que sonner caía a sus
 *    valores por defecto y el toast salía casi transparente sobre el grafito.
 *
 * 2. Leían el tema de `next-themes`, que no tiene proveedor montado en esta app
 *    —el tema lo lleva utils/ThemeContext—, así que siempre decía "system".
 *
 * Ahora usa los tokens de Oryon y el tema real. `richColors` activa las variantes
 * semánticas, que se mapean a los mismos colores de feedback que el Alert.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { effectiveTheme } = useTheme()

  return (
    <Sonner
      theme={effectiveTheme as ToasterProps['theme']}
      richColors
      className="toaster group"
      toastOptions={{
        style: {
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-small)',
          lineHeight: 'var(--lh-small)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)',
        },
      }}
      style={
        {
          '--normal-bg': 'var(--surface-raised)',
          '--normal-text': 'var(--text-primary)',
          '--normal-border': 'var(--border-default)',

          '--success-bg': 'var(--success-subtle)',
          '--success-text': 'var(--text-primary)',
          '--success-border': 'color-mix(in srgb, var(--success) 40%, transparent)',

          '--error-bg': 'var(--danger-subtle)',
          '--error-text': 'var(--text-primary)',
          '--error-border': 'color-mix(in srgb, var(--danger) 40%, transparent)',

          '--warning-bg': 'var(--warning-subtle)',
          '--warning-text': 'var(--text-primary)',
          '--warning-border': 'color-mix(in srgb, var(--warning) 40%, transparent)',

          '--info-bg': 'var(--info-subtle)',
          '--info-text': 'var(--text-primary)',
          '--info-border': 'color-mix(in srgb, var(--info) 40%, transparent)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
