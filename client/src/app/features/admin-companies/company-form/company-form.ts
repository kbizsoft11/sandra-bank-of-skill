import {
  Component,
  inject,
  Input,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CompanyService } from '../../../core/services/company.service';
import { AlertService } from '../../../core/services/alert.service';

@Component({
  selector: 'app-company-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './company-form.html',
  styleUrl: './company-form.scss',
})
export class CompanyForm implements OnInit {
  @Input() companyId: string | null = null; // If provided, it's edit mode
  @Input() isEditMode = false;

  private readonly fb = inject(FormBuilder);
  private readonly companyService = inject(CompanyService);
  private readonly alertService = inject(AlertService);
  private readonly router = inject(Router);

  readonly form = signal<FormGroup | null>(null);
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);

  // Industries list
  readonly industries = [
    'Information Technology',
    'Healthcare & Medical',
    'Banking & Finance',
    'Education',
    'Retail & E-Commerce',
    'Manufacturing',
    'Construction',
    'Hospitality',
    'Real Estate',
    'Marketing & Advertising',
    'Government',
    'Transportation & Logistics',
    'Energy & Utilities',
    'Telecommunications',
    'Food & Beverage',
    'Fashion & Apparel',
    'Media & Entertainment',
    'Automotive',
    'Pharmaceuticals',
    'Agriculture',
  ];

  // Countries list
  readonly countries = [
    'Afghanistan',
    'Albania',
    'Algeria',
    'Andorra',
    'Angola',
    'Argentina',
    'Armenia',
    'Australia',
    'Austria',
    'Azerbaijan',
    'Bahamas',
    'Bahrain',
    'Bangladesh',
    'Barbados',
    'Belarus',
    'Belgium',
    'Belize',
    'Benin',
    'Bhutan',
    'Bolivia',
    'Bosnia and Herzegovina',
    'Botswana',
    'Brazil',
    'Brunei',
    'Bulgaria',
    'Burkina Faso',
    'Burundi',
    'Cambodia',
    'Cameroon',
    'Canada',
    'Cape Verde',
    'Central African Republic',
    'Chad',
    'Chile',
    'China',
    'Colombia',
    'Comoros',
    'Congo',
    'Costa Rica',
    'Croatia',
    'Cuba',
    'Cyprus',
    'Czech Republic',
    'Czechia',
    'Denmark',
    'Djibouti',
    'Dominica',
    'Dominican Republic',
    'Ecuador',
    'Egypt',
    'El Salvador',
    'Equatorial Guinea',
    'Eritrea',
    'Estonia',
    'Ethiopia',
    'Fiji',
    'Finland',
    'France',
    'Gabon',
    'Gambia',
    'Georgia',
    'Germany',
    'Ghana',
    'Greece',
    'Grenada',
    'Guatemala',
    'Guinea',
    'Guinea-Bissau',
    'Guyana',
    'Haiti',
    'Honduras',
    'Hungary',
    'Iceland',
    'India',
    'Indonesia',
    'Iran',
    'Iraq',
    'Ireland',
    'Israel',
    'Italy',
    'Ivory Coast',
    'Jamaica',
    'Japan',
    'Jordan',
    'Kazakhstan',
    'Kenya',
    'Kiribati',
    'Kuwait',
    'Kyrgyzstan',
    'Laos',
    'Latvia',
    'Lebanon',
    'Lesotho',
    'Liberia',
    'Libya',
    'Liechtenstein',
    'Lithuania',
    'Luxembourg',
    'Madagascar',
    'Malawi',
    'Malaysia',
    'Maldives',
    'Mali',
    'Malta',
    'Marshall Islands',
    'Mauritania',
    'Mauritius',
    'Mexico',
    'Micronesia',
    'Moldova',
    'Monaco',
    'Mongolia',
    'Montenegro',
    'Morocco',
    'Mozambique',
    'Myanmar',
    'Namibia',
    'Nauru',
    'Nepal',
    'Netherlands',
    'New Zealand',
    'Nicaragua',
    'Niger',
    'Nigeria',
    'North Korea',
    'North Macedonia',
    'Norway',
    'Oman',
    'Pakistan',
    'Palau',
    'Palestine',
    'Panama',
    'Papua New Guinea',
    'Paraguay',
    'Peru',
    'Philippines',
    'Poland',
    'Portugal',
    'Qatar',
    'Romania',
    'Russia',
    'Rwanda',
    'Saint Kitts and Nevis',
    'Saint Lucia',
    'Saint Vincent and the Grenadines',
    'Samoa',
    'San Marino',
    'Sao Tome and Principe',
    'Saudi Arabia',
    'Senegal',
    'Serbia',
    'Seychelles',
    'Sierra Leone',
    'Singapore',
    'Slovakia',
    'Slovenia',
    'Solomon Islands',
    'Somalia',
    'South Africa',
    'South Korea',
    'South Sudan',
    'Spain',
    'Sri Lanka',
    'Sudan',
    'Suriname',
    'Sweden',
    'Switzerland',
    'Syria',
    'Taiwan',
    'Tajikistan',
    'Tanzania',
    'Thailand',
    'Timor-Leste',
    'Togo',
    'Tonga',
    'Trinidad and Tobago',
    'Tunisia',
    'Turkey',
    'Turkmenistan',
    'Tuvalu',
    'Uganda',
    'Ukraine',
    'United Arab Emirates',
    'United Kingdom',
    'United States',
    'Uruguay',
    'Uzbekistan',
    'Vanuatu',
    'Vatican City',
    'Venezuela',
    'Vietnam',
    'Yemen',
    'Zambia',
    'Zimbabwe',
  ];

  ngOnInit(): void {
    this.initializeForm();
    if (this.isEditMode && this.companyId) {
      this.loadCompanyData();
    }
  }

  private initializeForm(): void {
    const form = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', this.isEditMode ? [] : [Validators.required, Validators.minLength(6)]],
      description: [''],
      industry: [''],
      companySize: [''],
      website: [''],
      country: [''],
      isActive: [true],
    });

    this.form.set(form);
  }

  private loadCompanyData(): void {
    if (!this.companyId) return;

    this.loading.set(true);
    this.error.set(null);

    this.companyService.getCompanyDetails(this.companyId).subscribe({
      next: (response) => {
        if (response?.data) {
          this.populateForm(response.data);
        } else {
          this.error.set('Company data not found');
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading company:', err);
        this.error.set(err?.error?.message || 'Failed to load company data');
        this.alertService.error('Failed to load company data');
        this.loading.set(false);
      },
    });
  }

  private populateForm(company: any): void {
    const currentForm = this.form();
    if (!currentForm) return;

    currentForm.patchValue({
      fullName: company.fullName || '',
      email: company.email || '',
      description: company.description || '',
      industry: company.industry || '',
      companySize: company.companySize || '',
      website: company.website || '',
      country: company.country || '',
      isActive: company.isActive ?? true,
    });
  }

  onSubmit(): void {
    const currentForm = this.form();
    if (!currentForm || !currentForm.valid) {
      this.alertService.error('Please fill all required fields correctly');
      return;
    }

    this.submitting.set(true);

    const formData = currentForm.getRawValue();

    if (this.isEditMode && this.companyId) {
      // Update existing company
      this.companyService.updateCompany(this.companyId, formData).subscribe({
        next: () => {
          this.submitting.set(false);
          this.alertService.success('Company updated successfully');
          this.router.navigate(['/admin/companies']);
        },
        error: (err) => {
          this.submitting.set(false);
          console.error('Error updating company:', err);
          this.error.set(err?.error?.message || 'Failed to update company');
          this.alertService.error(err?.error?.message || 'Failed to update company');
        },
      });
    } else {
      // Create new company
      this.companyService.createCompany(formData).subscribe({
        next: () => {
          this.submitting.set(false);
          this.alertService.success('Company created successfully');
          this.router.navigate(['/admin/companies']);
        },
        error: (err) => {
          this.submitting.set(false);
          console.error('Error creating company:', err);
          this.error.set(err?.error?.message || 'Failed to create company');
          this.alertService.error(err?.error?.message || 'Failed to create company');
        },
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/admin/companies']);
  }

  getErrorMessage(fieldName: string): string | null {
    const currentForm = this.form();
    if (!currentForm) return null;

    const control = currentForm.get(fieldName);
    if (!control || !control.errors || !control.touched) return null;

    if (control.errors['required']) return `${this.formatFieldName(fieldName)} is required`;
    if (control.errors['email']) return 'Please enter a valid email address';
    if (control.errors['minlength'])
      return `${this.formatFieldName(fieldName)} must be at least ${control.errors['minlength'].requiredLength} characters`;

    return null;
  }

  private formatFieldName(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase());
  }

  isFieldInvalid(fieldName: string): boolean {
    const currentForm = this.form();
    if (!currentForm) return false;

    const control = currentForm.get(fieldName);
    return !!(control && control.invalid && control.touched);
  }

  isFieldValid(fieldName: string): boolean {
    const currentForm = this.form();
    if (!currentForm) return false;

    const control = currentForm.get(fieldName);
    return !!(control && control.valid && control.touched);
  }

  get pageTitle(): string {
    return this.isEditMode ? 'Edit Company' : 'Create Company';
  }

  get submitButtonText(): string {
    return this.isEditMode ? 'Update Company' : 'Create Company';
  }
}
