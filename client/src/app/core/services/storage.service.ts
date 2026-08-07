import {
    inject,
    Injectable,
    PLATFORM_ID
} from '@angular/core';

import { isPlatformBrowser } from '@angular/common';

const ACCESS_TOKEN_KEY = 'accessToken';
const IMPERSONATION_TOKEN_KEY = 'impersonationAccessToken';
const USE_IMPERSONATION_KEY = 'useImpersonationToken';

@Injectable({
    providedIn: 'root'
})
export class StorageService {
    private readonly platformId = inject(PLATFORM_ID);

    /**
     * Set item in localStorage (persistent)
     */
    setItem(key: string, value: string): void {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem(key, value);
        }
    }

    /**
     * Get item from localStorage
     */
    getItem(key: string): string | null {
        if (isPlatformBrowser(this.platformId)) {
            return localStorage.getItem(key);
        }

        return null;
    }

    /**
     * Remove item from localStorage
     */
    removeItem(key: string): void {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.removeItem(key);
        }
    }

    /**
     * Clear all localStorage
     */
    clear(): void {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.clear();
        }
    }

    /**
     * Set item in sessionStorage (session-based, cleared on browser close)
     */
    setSessionItem(key: string, value: string): void {
        if (isPlatformBrowser(this.platformId)) {
            sessionStorage.setItem(key, value);
        }
    }

    /**
     * Get item from sessionStorage
     */
    getSessionItem(key: string): string | null {
        if (isPlatformBrowser(this.platformId)) {
            return sessionStorage.getItem(key);
        }

        return null;
    }

    /**
     * Remove item from sessionStorage
     */
    removeSessionItem(key: string): void {
        if (isPlatformBrowser(this.platformId)) {
            sessionStorage.removeItem(key);
        }
    }

    /**
     * Clear all sessionStorage
     */
    clearSession(): void {
        if (isPlatformBrowser(this.platformId)) {
            sessionStorage.clear();
        }
    }

    /**
     * Get token from either localStorage or sessionStorage
     */
    getToken(): string | null {
        if (isPlatformBrowser(this.platformId)) {
            // Try localStorage first (Remember Me)
            const persistentToken = localStorage.getItem(ACCESS_TOKEN_KEY);
            if (persistentToken) {
                return persistentToken;
            }
            // Fall back to sessionStorage
            return sessionStorage.getItem(ACCESS_TOKEN_KEY);
        }
        return null;
    }

    /**
     * Get impersonation token from either localStorage or sessionStorage
     */
    getImpersonationToken(): string | null {
        if (isPlatformBrowser(this.platformId)) {
            const persistentToken = localStorage.getItem(IMPERSONATION_TOKEN_KEY);
            if (persistentToken) {
                return persistentToken;
            }
            return sessionStorage.getItem(IMPERSONATION_TOKEN_KEY);
        }
        return null;
    }

    /**
     * Store impersonation token based on Remember Me preference
     *
     * The impersonation token must be available to a new browser tab,
     * so it is stored in localStorage and optionally mirrored into sessionStorage.
     */
    setImpersonationToken(token: string, rememberMe: boolean): void {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem(IMPERSONATION_TOKEN_KEY, token);

            if (rememberMe) {
                sessionStorage.removeItem(IMPERSONATION_TOKEN_KEY);
            } else {
                sessionStorage.setItem(IMPERSONATION_TOKEN_KEY, token);
            }
        }
    }

    /**
     * Remove impersonation token from both storages
     */
    removeImpersonationToken(): void {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.removeItem(IMPERSONATION_TOKEN_KEY);
            sessionStorage.removeItem(IMPERSONATION_TOKEN_KEY);
        }
    }

    /**
     * Return whether the current tab should use the impersonation token
     */
    useImpersonationToken(): boolean {
        if (isPlatformBrowser(this.platformId)) {
            return sessionStorage.getItem(USE_IMPERSONATION_KEY) === 'true';
        }
        return false;
    }

    /**
     * Mark the current tab to use impersonation token or normal token
     */
    setUseImpersonationToken(useImpersonation: boolean): void {
        if (isPlatformBrowser(this.platformId)) {
            if (useImpersonation) {
                sessionStorage.setItem(USE_IMPERSONATION_KEY, 'true');
            } else {
                sessionStorage.removeItem(USE_IMPERSONATION_KEY);
            }
        }
    }

    /**
     * Get the currently active token for this tab
     */
    getActiveToken(): string | null {
        if (this.useImpersonationToken()) {
            return this.getImpersonationToken() ?? this.getToken();
        }
        return this.getToken();
    }

    /**
     * Store the authenticated token in localStorage so the session is
     * available when the user opens the application in another tab.
     *
     * The previous sessionStorage-only behavior made every new tab look
     * logged out because sessionStorage is isolated per tab.
     */
    setToken(token: string, _rememberMe: boolean): void {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem(ACCESS_TOKEN_KEY, token);
            sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        }
    }

    /**
     * Remove token from both storages
     */
    removeToken(): void {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.removeItem(ACCESS_TOKEN_KEY);
            sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        }
    }
}
