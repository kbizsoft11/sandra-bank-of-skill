import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { DocumentRequirementService } from '../../core/services/document-requirement.service';
import { AlertService } from '../../core/services/alert.service';
import { DataTableComponent } from '../../shared/data-table/data-table.component';
import { TableColDirective } from '../../shared/data-table/table-col.directive';
import { TableColumn } from '../../shared/data-table/table-column.model';

@Component({
  selector: 'app-company-document-requirements',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DataTableComponent, TableColDirective],
  templateUrl: './company-document-requirements.html',
  styleUrl: './company-document-requirements.scss'
})
export class CompanyDocumentRequirements implements OnInit {
  private readonly documentRequirementService = inject(DocumentRequirementService);
  private readonly alertService = inject(AlertService);
  private readonly fb = inject(FormBuilder);

  // State signals
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  requirements = signal<any[]>([]);
  activeTab = signal<string>('list');
  showComplianceReport = signal<boolean>(false);
  complianceReport = signal<any>(null);
  isLoadingReport = signal<boolean>(false);

  // Form states
  editingId = signal<string | null>(null);
  showForm = signal<boolean>(false);

  // Table columns
  columns: TableColumn[] = [
    { key: 'documentType', header: 'Document Type', sortable: true },
    { key: 'description', header: 'Description', sortable: false },
    { key: 'formats', header: 'Accepted Formats', sortable: false },
    { key: 'maxFileSize', header: 'Max Size', sortable: true },
    { key: 'required', header: 'Required', sortable: true },
    { key: 'actions', header: 'Actions', sortable: false, width: '150px' },
  ];
  
  requirementForm = this.fb.group({
    documentType: ['', [Validators.required, Validators.minLength(2)]],
    description: ['', [Validators.required, Validators.minLength(5)]],
    isRequired: [true],
    acceptedFormats: [['pdf', 'doc', 'docx'], [Validators.required]],
    maxFileSize: [10, [Validators.required, Validators.min(1)]],
    requiresApproval: [true],
    displayOrder: [0, [Validators.required]]
  });

  ngOnInit(): void {
    this.loadRequirements();
  }

  loadRequirements(): void {
    this.isLoading.set(true);
    this.documentRequirementService.getRequirements().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.requirements.set(response.data);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading requirements:', error);
        this.alertService.error('Failed to load document requirements');
        this.isLoading.set(false);
      }
    });
  }

  openCreateForm(): void {
    this.editingId.set(null);
    this.requirementForm.reset({
      documentType: '',
      description: '',
      isRequired: true,
      acceptedFormats: ['pdf', 'doc', 'docx'],
      maxFileSize: 10,
      requiresApproval: true,
      displayOrder: this.requirements().length
    });
    this.showForm.set(true);
  }

  editRequirement(requirement: any): void {
    this.editingId.set(requirement._id);
    this.requirementForm.patchValue({
      documentType: requirement.documentType,
      description: requirement.description,
      isRequired: requirement.isRequired,
      acceptedFormats: requirement.acceptedFormats,
      maxFileSize: requirement.maxFileSize / (1024 * 1024), // Convert bytes to MB
      requiresApproval: requirement.requiresApproval,
      displayOrder: requirement.displayOrder
    });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.requirementForm.reset();
  }

  saveRequirement(): void {
    if (this.requirementForm.invalid) {
      this.alertService.error('Please fill in all required fields correctly');
      return;
    }

    this.isSaving.set(true);
    const formValue = this.requirementForm.value;
    const data = {
      documentType: formValue.documentType || '',
      description: formValue.description || '',
      isRequired: formValue.isRequired ?? true,
      acceptedFormats: formValue.acceptedFormats || [],
      maxFileSize: ((formValue.maxFileSize || 10) * 1024 * 1024), // Convert MB to bytes
      requiresApproval: formValue.requiresApproval ?? true,
      displayOrder: formValue.displayOrder ?? 0
    };

    const request = this.editingId()
      ? this.documentRequirementService.updateRequirement(this.editingId()!, data)
      : this.documentRequirementService.createRequirement(data);

    request.subscribe({
      next: (response) => {
        if (response.success) {
          this.loadRequirements();
          this.closeForm();
          this.alertService.toast(
            this.editingId() ? 'Requirement updated successfully' : 'Requirement created successfully',
            'success'
          );
        }
        this.isSaving.set(false);
      },
      error: (error) => {
        console.error('Error saving requirement:', error);
        this.alertService.error(error.error?.message || 'Failed to save requirement');
        this.isSaving.set(false);
      }
    });
  }

  deleteRequirement(id: string, documentType: string): void {
    if (confirm(`Are you sure you want to delete the requirement for "${documentType}"?`)) {
      this.documentRequirementService.deleteRequirement(id).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadRequirements();
            this.alertService.toast('Requirement deleted successfully', 'success');
          }
        },
        error: (error) => {
          console.error('Error deleting requirement:', error);
          this.alertService.error('Failed to delete requirement');
        }
      });
    }
  }

  loadComplianceReport(): void {
    this.isLoadingReport.set(true);
    this.documentRequirementService.getComplianceReport().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.complianceReport.set(response.data);
          this.showComplianceReport.set(true);
        }
        this.isLoadingReport.set(false);
      },
      error: (error) => {
        console.error('Error loading compliance report:', error);
        this.alertService.error('Failed to load compliance report');
        this.isLoadingReport.set(false);
      }
    });
  }

  closeComplianceReport(): void {
    this.showComplianceReport.set(false);
  }

  setActiveTab(tab: string): void {
    this.activeTab.set(tab);
  }

  onFormatChange(format: string, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const currentFormats = this.requirementForm.get('acceptedFormats')?.value || [];
    
    if (checkbox.checked) {
      if (!currentFormats.includes(format)) {
        currentFormats.push(format);
      }
    } else {
      const index = currentFormats.indexOf(format);
      if (index > -1) {
        currentFormats.splice(index, 1);
      }
    }
    
    this.requirementForm.get('acceptedFormats')?.setValue([...currentFormats]);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'verified':
        return 'success';
      case 'under_review':
        return 'info';
      case 'rejected':
        return 'danger';
      case 'uploaded':
        return 'warning';
      default:
        return 'secondary';
    }
  }

  toUpperCase(str: string): string {
    return str.toUpperCase();
  }
}
