import {
    inject,
    Injectable,
    PLATFORM_ID
} from '@angular/core';

import { isPlatformBrowser } from '@angular/common';

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
            const persistentToken = localStorage.getItem('accessToken');
            if (persistentToken) {
                return persistentToken;
            }
            // Fall back to sessionStorage
            return sessionStorage.getItem('accessToken');
        }
        return null;
    }

    /**
     * Store token based on Remember Me preference
     */
    setToken(token: string, rememberMe: boolean): void {
        if (isPlatformBrowser(this.platformId)) {
            if (rememberMe) {
                // Persistent storage
                localStorage.setItem('accessToken', token);
                // Clear from session storage if it exists
                sessionStorage.removeItem('accessToken');
            } else {
                // Session-based storage
                sessionStorage.setItem('accessToken', token);
                // Clear from localStorage if it exists
                localStorage.removeItem('accessToken');
            }
        }
    }

    /**
     * Remove token from both storages
     */
    removeToken(): void {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.removeItem('accessToken');
            sessionStorage.removeItem('accessToken');
        }
    }
}
