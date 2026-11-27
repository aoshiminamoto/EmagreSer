/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_ALLOW_DESKTOP?: string
  readonly VITE_FORCE_LOCALES?: string
  readonly VITE_APP_ORIGIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
