/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_DEV_AUTO_LOGIN?: string;
  readonly VITE_MOBILE_API_URL: string;
  readonly VITE_MOBILE_PAIRING_BYPASS?: string;
}
