import { Component, EventEmitter, inject, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-header.html',
  styleUrl: './dashboard-header.scss',
})
export class DashboardHeader implements OnInit, OnDestroy {
  private readonly themeService = inject(ThemeService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  showProfileMenu = false;
  private docClickHandler = () => { this.showProfileMenu = false; };

  @Output() toggleSidebar = new EventEmitter<void>();

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  toggleProfileMenu(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.showProfileMenu = !this.showProfileMenu;
  }

  logout(): void {

    const confirmed = confirm(
      'Are you sure you want to logout?'
    );

    if (!confirmed) {
      return;
    }

    this.authService.logout();

    this.router.navigate(['/auth/login']);
  }

  get isDark(): boolean {
    return this.themeService.getTheme() === 'dark';
  }

  ngOnInit(): void {
    document.addEventListener('click', this.docClickHandler);
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.docClickHandler);
  }

}