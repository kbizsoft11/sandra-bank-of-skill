import {
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';
import { CommonModule } from '@angular/common';

import { SkillCategoryService } from '../../../core/services/skill-category.service';
import { AlertService } from '../../../core/services/alert.service';
import { UpdateSkillCategory } from '../../../shared/interfaces/skill-category.interface';

@Component({
  selector: 'app-edit-skill-category',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    CommonModule
  ],
  templateUrl: './edit-skill-category.html'
})
export class EditSkillCategory implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(SkillCategoryService);
  private readonly alertService = inject(AlertService);

  readonly loading = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: [
      '',
      Validators.required
    ],
    description: [''],
    status: ['active']
  });

  private categoryId = '';

  ngOnInit(): void {
    this.categoryId =
      this.route.snapshot.params['id'];

    this.service
      .getById(this.categoryId)
      .subscribe({
        next: (response) => {
          const data = response.data;
          this.form.patchValue({
            name: data.name,
            description: data.description,
            status: data.status || 'active'
          });
        },
        error: (err) => {
          console.error(err);
          this.alertService.error('Failed to load category');
        }
      });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const formValue = this.form.getRawValue();
    const updateData: UpdateSkillCategory = {
      name: formValue.name,
      description: formValue.description,
      status: formValue.status === 'active' ? 'active' : 'inactive'
    };
    
    this.service
      .update(this.categoryId, updateData)
      .subscribe({
        next: () => {
          this.alertService.success('Category updated successfully');
          this.router.navigate([
            '/admin/skill-categories'
          ]);
        },
        error: (err) => {
          console.error(err);
          this.alertService.error('Failed to update category');
          this.loading.set(false);
        }
      });
  }

  cancel(): void {
    this.router.navigate(['/admin/skill-categories']);
  }

}