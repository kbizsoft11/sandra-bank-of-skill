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

import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { SkillService } from '../../../core/services/skill.service';
import { UserService } from '../../../core/services/user.service';
import { SkillCategoryService } from '../../../core/services/skill-category.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { forkJoin } from 'rxjs';
import { User } from '../../../shared/interfaces/user.interface';
import { SkillCategory } from '../../../shared/interfaces/skill-category.interface';

@Component({
  selector: 'app-create-skill',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './create-skill.html'
})
export class CreateSkill implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  private readonly skillService =
    inject(SkillService);

  private readonly userService =
    inject(UserService);

  private readonly categoryService =
    inject(SkillCategoryService);

  private readonly auth =
    inject(AuthService);

  private readonly alertService =
    inject(AlertService);

  users = signal<User[]>([]);

  categories = signal<SkillCategory[]>([]);

  readonly form =
    this.fb.nonNullable.group({

      cat_id: ['', Validators.required],

      user_id: ['', Validators.required],

      skill_name: ['', Validators.required],

      skill_desc: [''],

      skill_level: [1 as 1 | 2 | 3 | 4, Validators.required],

      skill_score: [0]

    });

  ngOnInit(): void {

    const role = this.auth.role();

    // Prevent employees from creating skills manually
    if (role === 'employee') {
      this.alertService.error('Employees cannot manually add skills. Complete a questionnaire to add skills.');
      this.router.navigate([`/${role}/my-skills`]);
      return;
    }

    const userId = this.auth.user()?._id;

    // For admins/company, allow user selection
    if (userId) {
      this.form.patchValue({ user_id: userId });
    }

    forkJoin({
      users: this.userService.getUsers(),
      categories: this.categoryService.getAll()
    }).subscribe({

      next: ({ users, categories }) => {

        this.users.set(users.data);
        this.categories.set(categories.data);

      },

      error: console.error

    });

  }

  isEmployee(): boolean {
    return this.auth.role() === 'employee';
  }

  getBackRoute(): string {
    const role = this.auth.role();
    const rolePrefix = role || 'admin';
    if (role === 'company') {
      return `/${rolePrefix}/company-skills`;
    }
    if (role === 'employee') {
      return `/${rolePrefix}/my-skills`;
    }
    return `/${rolePrefix}/skills`;
  }

  submit(): void {

    if (this.form.invalid) {

      this.form.markAllAsTouched();

      return;

    }

    this.skillService
      .createSkill(
        this.form.getRawValue()
      )
      .subscribe({

        next: () => {

          this.router.navigate([
            this.getBackRoute()
          ]);

        }

      });

  }

}