import {
  Component,
  inject
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { Router } from '@angular/router';

import { SkillCategoryService } from '../../../core/services/skill-category.service';

@Component({
  selector: 'app-create-skill-category',
  standalone: true,
  imports: [
    ReactiveFormsModule
  ],
  templateUrl: './create-skill-category.html'
})
export class CreateSkillCategory {

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly service = inject(SkillCategoryService);

  readonly form = this.fb.nonNullable.group({

    cat_name: [
      '',
      Validators.required
    ],

    cat_desc: [
      ''
    ]

  });

  submit(): void {

    if (this.form.invalid) {

      this.form.markAllAsTouched();
      return;

    }

    this.service
      .create(this.form.getRawValue())
      .subscribe({

        next: () => {

          this.router.navigate([
            '/admin/skill-categories'
          ]);

        },

        error: console.error

      });

  }

}