/** Public runtime configuration. It must never contain credentials. */
declare global {
  interface Window {
    __KELLY_CONFIG__?: { apiUrl?: string };
  }
}

function apiUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:8080';
  const configured = window.__KELLY_CONFIG__?.apiUrl?.trim();
  if (configured) {
    const url = new URL(configured, window.location.origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash) {
      throw new Error('La URL de la API debe ser un origen HTTP(S) sin ruta ni credenciales.');
    }
    if (window.location.protocol === 'https:' && url.protocol !== 'https:') {
      throw new Error('La API debe utilizar HTTPS cuando la aplicación se sirve por HTTPS.');
    }
    return url.origin;
  }
  // El backend remoto se usa en Vercel; el desarrollo local mantiene Spring local.
  if (['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) {
    return 'http://localhost:8080';
  }
  return 'https://kelly-academy-backend.onrender.com';
}

export const environment = {
  get apiUrl(): string { return apiUrl(); },
};
