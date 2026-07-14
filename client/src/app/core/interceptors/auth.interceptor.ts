import {
    HttpInterceptorFn
} from '@angular/common/http';

import { inject } from '@angular/core';

import { StorageService } from '../services/storage.service';

export const authInterceptor: HttpInterceptorFn = (
    req,
    next
) => {

    if (
        req.url.includes('/auth/login') ||
        req.url.includes('/auth/register')
    ) {

        return next(req);

    }

    const storage =
        inject(StorageService);

    // Use getToken() to check both localStorage and sessionStorage
    const token =
        storage.getToken();

    if (!token) {

        return next(req);

    }

    return next(
        req.clone({

            setHeaders: {

                Authorization: `Bearer ${token}`

            }

        })
    );

};