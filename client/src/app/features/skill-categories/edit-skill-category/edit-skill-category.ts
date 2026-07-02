import {
  Component,
  inject,
  OnInit
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

import { SkillCategoryService } from '../../../core/services/skill-category.service';

@Component({
  selector: 'app-edit-skill-category',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './edit-skill-category.html'
})
export class EditSkillCategory implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(SkillCategoryService);

  readonly form = this.fb.nonNullable.group({

    cat_name: [
      '',
      Validators.required
    ],

    cat_desc: ['']

  });

  private categoryId = '';

  ngOnInit(): void {

    this.categoryId =
      this.route.snapshot.params['id'];

    this.service
      .getById(this.categoryId)
      .subscribe({

        next: (response) => {

          this.form.patchValue(response.data);

        }

      });

  }

  submit(): void {

    if (this.form.invalid) {

      this.form.markAllAsTouched();
      return;

    }

    this.service
      .update(
        this.categoryId,
        this.form.getRawValue()
      )
      .subscribe({

        next: () => {

          this.router.navigate([
            '/admin/skill-categories'
          ]);

        }

      });

  }

}