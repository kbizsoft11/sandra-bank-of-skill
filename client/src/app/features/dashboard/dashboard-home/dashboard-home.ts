import { Component, OnInit, inject, signal } from '@angular/core';
import { take } from 'rxjs';

import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { SkillService } from '../../../core/services/skill.service';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.scss',
})
export class DashboardHome implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly skillService = inject(SkillService);

  readonly totalEmployees = signal(0);
  readonly totalSkills = signal(0);

  get currentUserName(): string {
    const user = this.authService.user();
    return user?.fullName || 'Alex';
  }

  ngOnInit(): void {
    this.loadCounts();
  }

  private loadCounts(): void {
    this.userService.getUsers()
      .pipe(take(1))
      .subscribe({
        next: response => {
          const data = response?.data ?? response;
          let total = 0;

          if (Array.isArray(data)) {
            total = data.length;
          } else if (Array.isArray(data?.users)) {
            total = data.users.length;
          } else if (typeof data?.length === 'number') {
            total = data.length;
          }

          this.totalEmployees.set(total);
        },
        error: () => {
          this.totalEmployees.set(0);
        }
      });

    this.skillService.getSkills()
      .pipe(take(1))
      .subscribe({
        next: response => {
          const total = response?.data?.pagination?.total ?? response?.data?.skills?.length ?? 0;
          this.totalSkills.set(total);
        },
        error: () => {
          this.totalSkills.set(0);
        }
      });
  }
}
