import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-onboarding-welcome',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './onboarding-welcome.html',
  styleUrl: './onboarding-welcome.scss'
})
export class OnboardingWelcome implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  
  readonly countdown = signal<number>(5);
  private intervalId?: any;

  ngOnInit(): void {
    // No auto-redirect, user must click button
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  navigateToQuiz(): void {
    this.router.navigate(['/employee/my-questionnaires']);
  }

  skipCountdown(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.navigateToQuiz();
  }
}