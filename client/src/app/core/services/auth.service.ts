import {
    Injectable,
    computed,
    inject,
    signal
} from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Observable, tap } from 'rxjs';

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
    private readonly http = inject(HttpClient);
    private readonly storage = inject(StorageService);

    readonly user = signal<AuthUser | null>(null);

    readonly token = signal<string | null>(
        this.storage.getItem('accessToken')        
    );

    readonly isAuthenticated = computed(
        () => !!this.token()
    );

    constructor() {
        console.log('Storage:', this.storage.getItem('accessToken'));
        console.log('Signal:', this.token());
    }
    login(
        payload: LoginRequest
    ): Observable<ApiResponse<AuthResponseData>> {
        return this.http
            .post<ApiResponse<AuthResponseData>>(
                `${API_CONFIG.BASE_URL}/auth/login`,
                payload
            )
            .pipe(
                tap((response) => {
                    const token =
                        response.data.token;

                    this.token.set(token);
                    this.user.set(response.data.user);

                    this.storage.setItem(
                        'accessToken',
                        token
                    );
                })
            );
    }

    logout(): void {
        this.token.set(null);
        this.user.set(null);

        this.storage.removeItem('accessToken');
    }
}