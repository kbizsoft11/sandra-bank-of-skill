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
        signal<string | null>(
            this.storage.getItem(
                'accessToken'
            )
        );

    readonly isAuthenticated =
        computed(() => !!this.token());

    readonly role =
        computed(() => this.user()?.role);

    constructor() {

        if (this.token()) {

            this.loadCurrentUser();

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

        this.loadCurrentUser();

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

        this.getCurrentUser()
        .subscribe({

            next: (response) => {
                console.log(this.user());
            },

            error: (err) => {
                this.logout();
            }

        });

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

}
