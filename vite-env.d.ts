/// <reference types="vite/client" />

/**
 * Todo lo que lleva prefijo VITE_ se incrusta literalmente en el JavaScript que
 * descarga el navegador. Aquí solo pueden entrar valores públicos.
 *
 * Lo que se retiró y por qué:
 *   VITE_WOMPI_PRIVATE_KEY      → llave privada de la pasarela; ahora vive en el
 *                                 Edge Function (WOMPI_PRIVATE_KEY).
 *   VITE_WOMPI_INTEGRITY_SECRET → firma la integridad del monto; si el navegador
 *                                 la conoce, la firma no prueba nada.
 *   VITE_RESEND_API_KEY         → permitía enviar correo desde el dominio a
 *                                 cualquiera que abriera el bundle.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_WOMPI_PUBLIC_KEY?: string;
  readonly VITE_WOMPI_ENV?: string;
  /** Clave de sitio de Cloudflare Turnstile: pública por diseño. */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
