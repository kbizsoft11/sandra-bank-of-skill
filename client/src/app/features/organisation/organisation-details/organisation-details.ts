import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { OrganisationService } from '../../../core/services/organisation.service';
import { AlertService } from '../../../core/services/alert.service';

@Component({
  selector: 'app-organisation-details-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './organisation-details.html',
  styleUrl: './organisation-details.scss'
})
export class OrganisationDetailsPage implements OnInit {
  private readonly organisationService = inject(OrganisationService);
  private readonly alertService = inject(AlertService);
  private readonly fb = inject(FormBuilder);

  readonly organisation = signal<any>(null);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');

  readonly organisationForm = this.fb.group({
    organisationName: ['', [Validators.required]],
    industry: ['', [Validators.required]],
    companySize: ['', [Validators.required]],
    country: ['', [Validators.required]],
    website: [''],
    description: ['']
  });

  ngOnInit(): void {
    this.loadOrganisation();
  }

  loadOrganisation(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.organisationService.getMyOrganisation().subscribe({
      next: (response) => {
        this.organisation.set(response.data);
        this.organisationForm.patchValue({
          organisationName: response.data?.organisationName || '',
          industry: response.data?.industry || '',
          companySize: response.data?.companySize || '',
          country: response.data?.country || '',
          website: response.data?.website || '',
          description: response.data?.description || ''
        });
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Failed to load organisation details.');
      }
    });
  }

  onSubmit(): void {
    if (this.organisationForm.invalid) {
      this.organisationForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.organisationService.updateMyOrganisation(this.organisationForm.value).subscribe({
      next: (response) => {
        this.isSaving.set(false);
        this.organisation.set(response.data);
        this.successMessage.set('Organisation details updated successfully.');
      },
      error: () => {
        this.isSaving.set(false);
        this.errorMessage.set('Unable to update organisation details.');
      }
    });
  }
}
