import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { RegistrationService } from '../../../core/services/registration.service';

@Component({
  selector: 'app-setup-complete',
  imports: [RouterLink],
  templateUrl: './setup-complete.html',
  styleUrl: './setup-complete.scss',
})
export class SetupComplete implements OnInit {
  private readonly registrationService = inject(RegistrationService);
  private readonly router = inject(Router);

  isLoading = false;

  ngOnInit(): void {
    this.isLoading = true;
    this.registrationService.completeRegistration().subscribe({
      next: () => {
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.router.navigate(['/auth/organisation-details']);
      }
    });
  }
}
