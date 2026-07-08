const PROD_URL = 'https://bankofskill.com/api';

const isLocalhost = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);

export const API_CONFIG = {
	BASE_URL: isLocalhost ? 'http://localhost:5000/api' : PROD_URL,
} as const;