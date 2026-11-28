/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "mock" usa solo el mock en memoria; cualquier otro valor (o nada), el backend real. */
  readonly VITE_CFO_API?: 'mock' | 'http';
}
