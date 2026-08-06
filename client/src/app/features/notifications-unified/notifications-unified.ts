import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

// Import both notification components
import { EmployeeNotifications } from '../employee-notifications/employee-notifications';
import { CompanyMyNotifications } from '../company-notifications/my-notifications/my-notifications';

@Component({
  selector: 'app-notifications-unified',
  standalone: true,
  imports: [CommonModule, EmployeeNotifications, CompanyMyNotifications],
  template: `
    @if (role === 'employee') {
      <app-employee-notifications></app-employee-notifications>
    } @else if (role === 'company') {
      <app-company-my-notifications></app-company-my-notifications>
    } @else {
      <div class="text-center p-5">
        <p class="text-muted">No notifications available for your role.</p>
      </div>
    }
  `,
})
export class NotificationsUnified implements OnInit {
  private readonly authService = inject(AuthService);
  
  role: string | null | undefined = null;

  ngOnInit(): void {
    this.role = this.authService.role();
  }
}
