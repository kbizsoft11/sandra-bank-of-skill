import {
    Injectable,
    computed,
    inject,
    signal,
    PLATFORM_ID
} from '@angular/core';

import { isPlatformBrowser } from '@angular/common';

import { HttpClient } from '@angular/common/http';

import {
    Observable,
    switchMap,
    tap,
    catchError,
    of
} from 'rxjs';

import { LoginRequest } from '../../shared/interfaces/login-request.interface';
import { AuthUser } from '../../shared/interfaces/auth-user.interface';
import { AuthResponseData } from '../../shared/interfaces/auth-response.interface';
import { ApiResponse } from '../../shared/interfaces/api-response.interface';

import { StorageService } from './storage.service';
import { API_CONFIG } from '../config/api.config';

@Injectable({
    providedIn: 'root'
})
export class AuthService {

    private readonly http =
        inject(HttpClient);

    private readonly storage =
        inject(StorageService);

    readonly user =
        signal<AuthUser | null>(null);

    readonly token =
        signal<string | null>(null);

    readonly isAuthenticated =
        computed(() => !!this.token());

    readonly role =
        computed(() => this.user()?.role);

    // Onboarding status signal
    readonly needsOnboarding =
        signal<boolean>(false);

    readonly isImpersonationSession =
        signal<boolean>(false);

    private readonly platformId = inject(PLATFORM_ID);

    private isLoadingUser = false;
    private userLoadPromise: Promise<boolean> | null = null;

    constructor() {

        // Initialize token from storage (check both localStorage and sessionStorage)
        let activeToken: string | null = this.storage.getToken();
        let impersonationMode = this.storage.useImpersonationToken();

        if (isPlatformBrowser(this.platformId)) {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('impersonation') === 'true') {
                this.storage.setUseImpersonationToken(true);
                impersonationMode = true;
            }
        }

        if (impersonationMode) {
            this.isImpersonationSession.set(true);
            activeToken = this.storage.getImpersonationToken() ?? activeToken;
        }

        this.token.set(activeToken);

        const token = this.token();
        const user = this.user();
        
        console.log('👤 [AUTH SERVICE] Constructor called');
        console.log('👤 [AUTH SERVICE] Token exists:', !!token);
        console.log('👤 [AUTH SERVICE] User exists:', !!user);

        if (token && !user) {
            console.log('👤 [AUTH SERVICE] Token exists but no user, loading...');
            this.loadCurrentUser();
        } else if (!token) {
            console.log('👤 [AUTH SERVICE] No token, skipping user load');
        } else {
            console.log('👤 [AUTH SERVICE] User already loaded');
        }

    }

    login(payload: LoginRequest, rememberMe: boolean = false) {

        return this.http
            .post<ApiResponse<AuthResponseData>>(
                `${API_CONFIG.BASE_URL}/auth/login`,
                payload
            )
            .pipe(

                tap(response => {

                    this.token.set(
                        response.data.token
                    );

                    // Store token based on Remember Me preference
                    this.storage.setToken(
                        response.data.token,
                        rememberMe
                    );

                }),

                switchMap(() =>
                    this.getCurrentUser()
                ),

                tap((response) => {
                    // After user is loaded, check if they need onboarding
                    if (this.checkNeedsOnboarding()) {
                        console.log('👤 [AUTH SERVICE] User needs onboarding, setting flag');
                        this.setNeedsOnboarding(true);
                    }
                })

            );

    }

    setSession(token: string, rememberMe: boolean = false): void {

        this.token.set(
            token
        );

        this.storage.setToken(
            token,
            rememberMe
        );

        // Ensure impersonation mode is disabled for a normal session
        this.storage.setUseImpersonationToken(false);
        this.isImpersonationSession.set(false);

        // Don't call loadCurrentUser here if it's already loading
        if (!this.isLoadingUser && !this.user()) {
            this.loadCurrentUser();
        }

        // After setting session, check if user needs onboarding
        // Use a slight delay to ensure user is loaded
        setTimeout(() => {
            if (this.checkNeedsOnboarding()) {
                console.log('👤 [AUTH SERVICE] User needs onboarding after setSession, setting flag');
                this.setNeedsOnboarding(true);
            }
        }, 500);

    }

    getCurrentUser(): Observable<ApiResponse<AuthUser>> {

        return this.http
            .get<ApiResponse<AuthUser>>(
                `${API_CONFIG.BASE_URL}/auth/me`
            )
            .pipe(

                tap((response) => {

                    this.user.set(
                        response.data
                    );

                })

            );

    }

    prepareImpersonationSession(token: string, rememberMe: boolean = false): void {
        this.storage.setImpersonationToken(token, rememberMe);
    }

    activateImpersonationSession(): void {
        this.storage.setUseImpersonationToken(true);
        this.isImpersonationSession.set(true);

        const impersonationToken = this.storage.getImpersonationToken();
        if (!impersonationToken) {
            console.warn('👤 [AUTH SERVICE] No impersonation token available to activate');
            return;
        }

        this.token.set(impersonationToken);
        this.user.set(null);

        if (!this.isLoadingUser) {
            this.loadCurrentUser();
        }
    }

    clearImpersonationSession(): void {
        this.storage.setUseImpersonationToken(false);
        this.storage.removeImpersonationToken();
        this.isImpersonationSession.set(false);

        const baseToken = this.storage.getToken();
        this.token.set(baseToken);
        this.user.set(null);

        if (!this.isLoadingUser && baseToken) {
            this.loadCurrentUser();
        }
    }

    private loadCurrentUser(): void {

        // Prevent multiple simultaneous calls
        if (this.isLoadingUser) {
            console.log('👤 [AUTH SERVICE] Already loading user, skipping');
            return;
        }

        console.log('👤 [AUTH SERVICE] Starting to load current user');
        this.isLoadingUser = true;

        this.userLoadPromise = new Promise((resolve) => {
            this.getCurrentUser()
            .subscribe({

                next: (response) => {
                    console.log('👤 [AUTH SERVICE] ✅ User loaded successfully:', response.data);
                    this.isLoadingUser = false;
                    this.userLoadPromise = null;
                    resolve(true);
                },

                error: (err) => {
                    console.error('👤 [AUTH SERVICE] ❌ Error loading user:', err);
                    console.error('👤 [AUTH SERVICE] Error status:', err.status);
                    this.isLoadingUser = false;
                    this.userLoadPromise = null;
                    // Only logout if it's a 401 unauthorized error
                    if (err.status === 401) {
                        console.log('👤 [AUTH SERVICE] 401 error, logging out');
                        this.logout();
                    }
                    resolve(false);
                }

            });
        });

    }

    async waitForUserLoad(): Promise<boolean> {
        console.log('👤 [AUTH SERVICE] waitForUserLoad called');
        console.log('👤 [AUTH SERVICE] userLoadPromise exists:', !!this.userLoadPromise);
        console.log('👤 [AUTH SERVICE] current user:', this.user());
        
        if (this.userLoadPromise) {
            console.log('👤 [AUTH SERVICE] Waiting for existing promise...');
            const result = await this.userLoadPromise;
            console.log('👤 [AUTH SERVICE] Promise resolved with:', result);
            return result;
        }
        // If user is already loaded or no token, return immediately
        const hasUser = !!this.user();
        console.log('👤 [AUTH SERVICE] No pending load, user exists:', hasUser);
        return hasUser;
    }

    logout(): void {

        this.token.set(null);

        this.user.set(null);

        if (this.isImpersonationSession()) {
            this.storage.removeImpersonationToken();
            this.storage.setUseImpersonationToken(false);
            this.isImpersonationSession.set(false);
        } else {
            this.storage.removeToken();
        }

    }

    logoutWithTracking(): Observable<any> {
        // Call the logout endpoint to track the logout activity
        console.log('👤 [AUTH SERVICE] logoutWithTracking called');
        console.log('👤 [AUTH SERVICE] Current token:', !!this.token());
        
        const url = `${API_CONFIG.BASE_URL}/auth/logout`;
        console.log('👤 [AUTH SERVICE] Making POST request to:', url);
        
        return this.http.post<any>(url, {}).pipe(
            tap((response) => {
                console.log('👤 [AUTH SERVICE] Logout endpoint success:', response);
                // DON'T call logout here - let caller decide when to clear session
            }),
            // Add error handling but don't rethrow - we want to logout anyway
            catchError((error) => {
                console.error('👤 [AUTH SERVICE] Logout endpoint error:', error);
                console.error('👤 [AUTH SERVICE] Error status:', error.status);
                console.error('👤 [AUTH SERVICE] Error message:', error.message);
                // Return successful observable so caller doesn't think it failed
                return of({ success: true, message: 'Logged out (with error)', error: error.message });
            })
        );
    }

    isEmployee(): boolean {

        return this.role() === 'employee';

    }

    isCompany(): boolean {

        return this.role() === 'company';

    }

    isAdmin(): boolean {

        return this.role() === 'admin';

    }

    isSuperAdmin(): boolean {

        return this.role() === 'super_admin';

    }

    getRoleDashboardPath(): string {

        const userRole = this.role();

        if (userRole === 'admin') {
            return '/admin/dashboard';
        } else if (userRole === 'company') {
            return '/company/dashboard';
        } else if (userRole === 'employee') {
            return '/employee/dashboard';
        }

        return '/auth/login';

    }

    /**
     * Get current authentication state (useful for debugging)
     */
    getCurrentAuthState() {
        return {
            isAuthenticated: this.isAuthenticated(),
            token: this.token(),
            user: this.user(),
            role: this.role(),
            dashboardPath: this.getRoleDashboardPath(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Set whether the user needs to complete onboarding
     */
    setNeedsOnboarding(needs: boolean): void {
        console.log('🎯 [AUTH SERVICE] Setting needsOnboarding to:', needs);
        this.needsOnboarding.set(needs);
    }

    /**
     * Check if user needs to complete onboarding
     */
    checkNeedsOnboarding(): boolean {
        const user = this.user();
        const role = this.role();
        
        // Only employees need onboarding
        if (role !== 'employee') {
            return false;
        }

        // Check if employee has completed onboarding
        return !(user as any)?.hasCompletedOnboarding;
    }

}
