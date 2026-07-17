import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { CompanySkillCategoryService } from '../../../core/services/company-skill-category.service';
import { AlertService } from '../../../core/services/alert.service';
import { CompanySkillCategoryMapping } from '../../../shared/interfaces/skill-category.interface';

@Component({
  selector: 'app-company-skill-category-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './company-skill-category-list.html',
})
export class CompanySkillCategoryList implements OnInit {
  private readonly service = inject(CompanySkillCategoryService);
  private readonly alertService = inject(AlertService);
  private readonly fb = inject(FormBuilder);

  categories = signal<CompanySkillCategoryMapping[]>([]);
  selectedCategory = signal<CompanySkillCategoryMapping | null>(null);
  showModal = signal(false);
  editForm = this.fb.group({
    displayName: ['', Validators.required],
  });

  get displayNameControl(): FormControl {
    return this.editForm.get('displayName') as FormControl;
  }

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.service.getAll().subscribe({
      next: (response) => {
        this.categories.set(response.data || []);
      },
      error: () => {
        this.alertService.error('Failed to load company skill categories.');
      },
    });
  }

  openEditModal(category: CompanySkillCategoryMapping): void {
    this.selectedCategory.set(category);
    this.displayNameControl.setValue(category.displayName || category.originalName);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedCategory.set(null);
    this.displayNameControl.reset('');
  }

  saveLabel(): void {
    if (this.editForm.invalid || !this.selectedCategory()) {
      this.displayNameControl.markAsTouched();
      return;
    }

    const category = this.selectedCategory();
    const newLabel = this.displayNameControl.value?.trim();

    if (!category || !newLabel) {
      return;
    }

    const request = category.mappingId
      ? this.service.update(category.mappingId, { displayName: newLabel }).toPromise()
      : this.service.create({
          skillCategoryId: category.categoryId,
          displayName: newLabel,
        }).toPromise();

    request.then(() => {
      this.alertService.toast('Label updated successfully', 'success');
      this.closeModal();
      this.loadCategories();
    }).catch(() => {
      this.alertService.error('Failed to update the label.');
    });
  }
}
