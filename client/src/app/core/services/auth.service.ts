import {
    Injectable,
    computed,
    inject,
    signal
} from '@angular/core';

import { HttpClient } from '@angular/common/http';

import {
    Observable,
    switchMap,
    tap
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

    private isLoadingUser = false;
    private userLoadPromise: Promise<boolean> | null = null;

    constructor() {

        // Initialize token from storage
        const storedToken = this.storage.getItem('accessToken');
        this.token.set(storedToken);

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

    login(payload: LoginRequest) {

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

                    this.storage.setItem(
                        'accessToken',
                        response.data.token
                    );

                }),

                switchMap(() =>
                    this.getCurrentUser()
                )

            );

    }

    setSession(token: string): void {

        this.token.set(
            token
        );

        this.storage.setItem(
            'accessToken',
            token
        );

        // Don't call loadCurrentUser here if it's already loading
        if (!this.isLoadingUser && !this.user()) {
            this.loadCurrentUser();
        }

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

        this.storage.removeItem(
            'accessToken'
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

}
