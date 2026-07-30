import {
  Component,
  inject,
  signal
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

import { SkillCategoryService } from '../../../core/services/skill-category.service';
import { AlertService } from '../../../core/services/alert.service';

@Component({
  selector: 'app-create-skill-category',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    RouterLink
  ],
  templateUrl: './create-skill-category.html'
})
export class CreateSkillCategory {

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly service = inject(SkillCategoryService);
  private readonly alertService = inject(AlertService);

  readonly loading = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: [
      '',
      Validators.required
    ],
    description: [
      ''
    ],
    status: ['active']
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.service
      .create(this.form.getRawValue())
      .subscribe({
        next: () => {
          this.alertService.success('Category created successfully');
          this.router.navigate(['/admin/skill-categories']);
        },
        error: (err) => {
          console.error(err);
          this.alertService.error('Failed to create category');
          this.loading.set(false);
        }
      });
  }

  cancel(): void {
    this.router.navigate(['/admin/skill-categories']);
  }

}