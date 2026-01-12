/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_URL: string
  readonly VITE_APP_NAME: string
  readonly VITE_SENTRY_DSN: string
  readonly VITE_GA_MEASUREMENT_ID: string
  readonly VITE_ENABLE_ANALYTICS: string
  readonly VITE_ENABLE_PDF_PREVIEW: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
