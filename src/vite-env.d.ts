/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_USE_REAL_API?: string;
  readonly VITE_API_FALLBACK_TO_MOCK?: string;
  readonly VITE_DEMO_MODE?: string;
}
