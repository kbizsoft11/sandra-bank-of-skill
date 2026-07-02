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

  loadUsers(): void {

    this.userService
      .getUsers()
      .subscribe({

        next: (response) => {

          this.users.set(response.data);

        }

      });

  }

  loadCategories(): void {

    this.categoryService
      .getAll()
      .subscribe({

        next: (response) => {

          this.categories.set(response.data);

        }

      });

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
            '/admin/skills'
          ]);

        }

      });

  }

}