import {
  Component,
  inject,
  OnInit,
  signal
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
import { SkillCategory, CompanySkillCategoryMapping } from '../../../shared/interfaces/skill-category.interface';

import { SkillService } from '../../../core/services/skill.service';
import { UserService } from '../../../core/services/user.service';
import { SkillCategoryService } from '../../../core/services/skill-category.service';
import { CompanySkillCategoryService } from '../../../core/services/company-skill-category.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';

interface CategoryOption {
  _id: string;
  name: string;
}

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

  private readonly companySkillCategoryService = inject(CompanySkillCategoryService);

  private readonly auth = inject(AuthService);

  private readonly alertService = inject(AlertService);

  users: User[] = [];

  categories = signal<CategoryOption[]>([]);

  private skillId = '';

  readonly form = this.fb.nonNullable.group({

    categoryId: ['', Validators.required],

    name: ['', Validators.required],

    description: ['']

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

  private loadCategories(): void {
    const role = this.auth.role();

    if (role === 'company') {
      this.loadCompanyCategories();
    } else {
      this.loadAdminCategories();
    }
  }

  private loadAdminCategories(): void {
    this.categoryService.getAll().subscribe({
      next: response => {
        console.log('Categories response in edit:', response);
        // Backend returns { categories: [...], total, page, limit }
        if (response.data && response.data.categories && Array.isArray(response.data.categories)) {
          this.categories.set(response.data.categories);
          console.log('Categories loaded:', response.data.categories.length);
        } else if (response.data && Array.isArray(response.data)) {
          // Fallback for direct array response
          this.categories.set(response.data);
          console.log('Categories loaded (direct array):', response.data.length);
        } else {
          console.warn('Unexpected category response structure:', response);
          this.alertService.warning('Categories loaded but with unexpected format');
        }
      },
      error: (err) => {
        console.error('Failed to load categories:', err);
        this.alertService.error('Failed to load skill categories');
      }
    });
  }

  private loadCompanyCategories(): void {
    // Load both company own categories and selected admin categories
    Promise.all([
      this.companySkillCategoryService.getAll().toPromise(),
      this.categoryService.getAll({ limit: 100 }).toPromise()
    ]).then(([mappingsResponse, categoriesResponse]) => {
      const mappings = mappingsResponse?.data as CompanySkillCategoryMapping[] || [];
      const result = categoriesResponse?.data as any || {};
      let allCategories: SkillCategory[] = [];
      
      if (Array.isArray(result)) {
        allCategories = result;
      } else if (result.categories && Array.isArray(result.categories)) {
        allCategories = result.categories;
      }

      // Build combined list of categories accessible to company
      const accessibleCategories: CategoryOption[] = [];

      // Add company's own categories
      const ownCats = allCategories.filter((cat: any) => cat.createdType === 'COMPANY');
      ownCats.forEach((cat: any) => {
        accessibleCategories.push({
          _id: cat._id,
          name: cat.name
        });
      });

      // Add selected admin categories
      const adminMappings = mappings.filter((m: any) => m.mappingId);
      adminMappings.forEach((mapping: any) => {
        const adminCat = allCategories.find((c: any) => c._id.toString() === mapping.categoryId);
        if (adminCat) {
          accessibleCategories.push({
            _id: mapping.categoryId,
            name: adminCat.name
          });
        }
      });

      this.categories.set(accessibleCategories);
      console.log('Company categories loaded:', accessibleCategories.length);
    }).catch((err) => {
      console.error('Failed to load company categories:', err);
      this.alertService.error('Failed to load skill categories');
    });
  }

  loadSkill(): void {

    this.skillService
      .getSkill(this.skillId)
      .subscribe({

        next: response => {

          const skill = response.data;

          this.form.patchValue({

            categoryId: typeof skill.categoryId === 'string' ? skill.categoryId : (skill.categoryId as SkillCategory)?._id,

            name: skill.name,

            description: skill.description

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