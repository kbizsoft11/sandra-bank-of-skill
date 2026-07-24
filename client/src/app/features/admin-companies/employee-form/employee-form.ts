import {
  Component,
  inject,
  input,
  output,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertService } from '../../../core/services/alert.service';
import { CompanyService } from '../../../core/services/company.service';

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './employee-form.html',
  styleUrl: './employee-form.scss',
})
export class EmployeeFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly alertService = inject(AlertService);

  // Inputs
  readonly employeeData = input<any | null>(null);
  readonly isEditing = input(false);
  readonly isSubmitting = input(false);
  readonly organisationId = input<string | null>(null);

  // Outputs
  readonly submitForm = output<any>();
  readonly cancelForm = output<void>();

  // Form
  readonly form = signal<FormGroup | null>(null);
  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    const isEditing = this.isEditing();
    const employee = this.employeeData();

    const form = this.fb.group({
      fullName: [
        employee?.fullName || '',
        [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
      ],
      email: [
        employee?.email || '',
        [Validators.required, Validators.email],
      ],
      phone: [employee?.phone || '', []],
      designationId: [employee?.designationId || '', []],
      password: [
        '',
        isEditing ? [] : [Validators.minLength(6)],
      ],
      confirmPassword: [
        '',
        isEditing ? [] : [],
      ],
      isActive: [employee?.isActive !== undefined ? employee.isActive : true, []],
    });

    this.form.set(form);
  }

  togglePasswordVisibility(): void {
    this.showPassword.set(!this.showPassword());
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.set(!this.showConfirmPassword());
  }

  onSubmit(): void {
    const formValue = this.form()?.value;

    if (!this.form()?.valid) {
      this.alertService.error('Please fill in all required fields correctly');
      return;
    }

    // Validate passwords match if in create mode
    if (!this.isEditing()) {
      if (formValue.password !== formValue.confirmPassword) {
        this.alertService.error('Passwords do not match');
        return;
      }
    }

    const submitData = {
      fullName: formValue.fullName,
      email: formValue.email,
      phone: formValue.phone,
      designationId: formValue.designationId,
      isActive: formValue.isActive,
    };

    // Add password only if provided
    if (formValue.password && formValue.password.trim()) {
      Object.assign(submitData, { password: formValue.password });
    }

    this.submitForm.emit(submitData);
  }

  onCancel(): void {
    this.cancelForm.emit();
  }

  getErrorMessage(fieldName: string): string {
    const control = this.form()?.get(fieldName);

    if (!control || !control.errors || !control.touched) {
      return '';
    }

    if (control.errors['required']) {
      return `${this.formatFieldName(fieldName)} is required`;
    }

    if (control.errors['minlength']) {
      return `${this.formatFieldName(fieldName)} must be at least ${control.errors['minlength'].requiredLength} characters`;
    }

    if (control.errors['maxlength']) {
      return `${this.formatFieldName(fieldName)} must not exceed ${control.errors['maxlength'].requiredLength} characters`;
    }

    if (control.errors['email']) {
      return 'Invalid email format';
    }

    return 'Invalid input';
  }

  private formatFieldName(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  hasError(fieldName: string): boolean {
    const control = this.form()?.get(fieldName);
    return !!(control && control.invalid && control.touched);
  }
}
