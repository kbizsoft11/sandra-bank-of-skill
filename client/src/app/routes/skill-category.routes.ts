import { Routes } from '@angular/router';

import { SkillCategoryList } from '../features/skill-categories/skill-category-list/skill-category-list';
import { CreateSkillCategory } from '../features/skill-categories/create-skill-category/create-skill-category';
import { EditSkillCategory } from '../features/skill-categories/edit-skill-category/edit-skill-category';

export const skillCategoryRoutes: Routes = [
  {
    path: '',
    component: SkillCategoryList
  },
  {
    path: 'create',
    component: CreateSkillCategory
  },
  {
    path: ':id/edit',
    component: EditSkillCategory
  }
];