import {
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { SkillCategoryService } from '../../../core/services/skill-category.service';

import { SkillCategory } from '../../../shared/interfaces/skill-category.interface';

import { TableActions } from '../../../shared/components/table-actions/table-actions';

@Component({
  selector: 'app-skill-category-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TableActions
  ],
  templateUrl: './skill-category-list.html',
})
export class SkillCategoryList implements OnInit {

  private readonly skillCategoryService = inject(SkillCategoryService);
  private readonly router = inject(Router);

  categories = signal<SkillCategory[]>([]);

  loadCategories(): void {

    this.skillCategoryService
      .getAll()
      .subscribe({

        next: response => {

          this.categories.set(
            response.data
          );

        }

      });

  }

  ngOnInit(): void {

    this.loadCategories()

  }

  viewCategory(
    category: SkillCategory
  ): void { }

  editCategory(category: SkillCategory): void {

    this.router.navigate([
      '/admin/skill-categories',
      category._id,
      'edit'
    ]);

  }  

  deleteCategory(
    category: SkillCategory
  ): void {

    if (
      !confirm(
        `Delete "${category.cat_name}"?`
      )
    ) {

      return;

    }

    this.skillCategoryService
      .delete(category._id)
      .subscribe({

        next: () => {

          this.loadCategories();

        },

        error: console.error

      });

  }

}