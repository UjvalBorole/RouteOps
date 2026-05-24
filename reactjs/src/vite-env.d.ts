/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly : string;
  readonly VITE_APP_NAME?: string;
  // add more env variables here if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}