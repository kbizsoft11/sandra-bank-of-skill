import {
    Injectable,
    inject,
    PLATFORM_ID
} from '@angular/core';

import { isPlatformBrowser } from '@angular/common';

@Injectable({
    providedIn: 'root',
})
export class ThemeService {

    private platformId = inject(PLATFORM_ID);

    initTheme(): void {

        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        const savedTheme =
            localStorage.getItem('theme');

        if (savedTheme === 'dark') {
            document.documentElement.classList.add(
                'dark'
            );
        }
    }

    toggleTheme(): void {

        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        const isDark =
            document.documentElement.classList.toggle(
                'dark'
            );

        localStorage.setItem(
            'theme',
            isDark ? 'dark' : 'light'
        );
    }

    getTheme(): string {
        if (!isPlatformBrowser(this.platformId)) {
            return 'light';
        }

        return document.documentElement.classList.contains('dark')
            ? 'dark'
            : 'light';
    }

}