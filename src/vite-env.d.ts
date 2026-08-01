/// <reference types="vite/client" />

declare const __APP_RELEASE__: string;
declare const __APP_ENVIRONMENT__: string;

interface ImportMetaEnv {
  readonly VITE_APP_ENV?: string;
  readonly VITE_APP_RELEASE?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
