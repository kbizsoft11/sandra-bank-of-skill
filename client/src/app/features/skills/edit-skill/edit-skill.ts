import {
  Component,
  inject,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

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

import { User } from '../../../shared/interfaces/user.interface';
import { SkillCategory } from '../../../shared/interfaces/skill-category.interface';

import { SkillService } from '../../../core/services/skill.service';
import { UserService } from '../../../core/services/user.service';
import { SkillCategoryService } from '../../../core/services/skill-category.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';

@Component({
  selector: 'app-edit-skill',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './edit-skill.html'
})
export class EditSkill implements OnInit {

  private readonly fb = inject(FormBuilder);

  private readonly router = inject(Router);

  private readonly route = inject(ActivatedRoute);

  private readonly skillService = inject(SkillService);

  private readonly userService = inject(UserService);

  private readonly categoryService = inject(SkillCategoryService);

  private readonly auth = inject(AuthService);

  private readonly alertService = inject(AlertService);

  users: User[] = [];

  categories: SkillCategory[] = [];

  private skillId = '';

  readonly form = this.fb.nonNullable.group({

    cat_id: ['', Validators.required],

    user_id: ['', Validators.required],

    skill_name: ['', Validators.required],

    skill_desc: [''],

    skill_level: [1 as 1 | 2 | 3 | 4, Validators.required],

    skill_score: [0]

  });

  ngOnInit(): void {

    const role = this.auth.role();

    // Prevent employees from editing skills manually
    if (role === 'employee') {
      this.alertService.error('Employees cannot manually edit skills. Skills are managed through questionnaires.');
      this.router.navigate([`/${role}/my-skills`]);
      return;
    }

    this.skillId =
      this.route.snapshot.params['id'];

    this.loadUsers();

    this.loadCategories();

    this.loadSkill();

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

  loadUsers(): void {

    this.userService
      .getUsers()
      .subscribe({

        next: response => {

          this.users = response.data;

        }

      });

  }

  loadCategories(): void {

    this.categoryService
      .getAll()
      .subscribe({

        next: response => {

          this.categories = response.data;

        }

      });

  }

  loadSkill(): void {

    this.skillService
      .getSkill(this.skillId)
      .subscribe({

        next: response => {

          const skill = response.data;

          this.form.patchValue({

            cat_id: skill.cat_id._id,

            user_id: skill.user_id._id,

            skill_name: skill.skill_name,

            skill_desc: skill.skill_desc,

            skill_level: skill.skill_level,

            skill_score: skill.skill_score

          });

        }

      });

  }

  submit(): void {

    if (this.form.invalid) {

      this.form.markAllAsTouched();

      return;

    }

    this.skillService
      .updateSkill(
        this.skillId,
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