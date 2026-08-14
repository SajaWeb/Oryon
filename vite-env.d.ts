/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_WOMPI_PUBLIC_KEY?: string;
  readonly VITE_WOMPI_PRIVATE_KEY?: string;
  readonly VITE_WOMPI_ENV?: string;
  readonly VITE_WOMPI_INTEGRITY_SECRET?: string;
  readonly VITE_RESEND_API_KEY?: string;
  readonly VITE_RESEND_FROM_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}