const isLocalhost =
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

const BASE_URL = isLocalhost
  ? 'http://localhost:5000/api'
  : new URL('/api', window.location.origin).toString();

export const API_CONFIG = { BASE_URL } as const;