import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RegistrationService } from '../../../core/services/registration.service';

@Component({
  selector: 'app-organisation-details',
  imports: [ReactiveFormsModule],
  templateUrl: './organisation-details.html',
  styleUrl: './organisation-details.scss',
})
export class OrganisationDetails implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly registrationService = inject(RegistrationService);
  private readonly router = inject(Router);

  organisationForm!: FormGroup;
  isLoading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.organisationForm = this.fb.group({
      organisationName: ['', [Validators.required]],
      industry: ['', [Validators.required]],
      teamSize: ['', [Validators.required]],
      country: ['', [Validators.required]],
    });

    const savedData = this.registrationService.getStep3Data();

    if (savedData) {
      this.organisationForm.patchValue(savedData);
    }
  }

  onSubmit(): void {
    if (this.organisationForm.invalid) {
      this.organisationForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.registrationService.registerStep3(this.organisationForm.value).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/auth/setup-complete']);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Unable to save organisation details';
      }
    });
  }
}
