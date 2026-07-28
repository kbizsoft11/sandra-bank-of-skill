import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { DocumentService } from '../../core/services/document.service';
import { AlertService } from '../../core/services/alert.service';
import { DataTableComponent } from '../../shared/data-table/data-table.component';
import { TableColDirective } from '../../shared/data-table/table-col.directive';
import { TableColumn, SortDirection } from '../../shared/data-table/table-column.model';
import { API_CONFIG } from '../../core/config/api.config';

@Component({
  selector: 'app-company-document-review',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DataTableComponent, TableColDirective],
  templateUrl: './company-document-review.html',
  styleUrl: './company-document-review.scss'
})
export class CompanyDocumentReview implements OnInit {
  private readonly documentService = inject(DocumentService);
  private readonly alertService = inject(AlertService);
  private readonly fb = inject(FormBuilder);

  // Data signals
  documents = signal<any[]>([]);
  isLoading = signal<boolean>(false);
  totalItems = 0;
  currentPage = 1;
  pageSize = 10;

  // Filter signals
  selectedStatus = signal<string>('');
  selectedDocType = signal<string>('');
  searchTerm = signal<string>('');

  // Modal states
  showVerifyModal = signal<boolean>(false);
  selectedDocument = signal<any>(null);
  isVerifying = signal<boolean>(false);

  // Table columns
  columns: TableColumn[] = [
    { key: 'preview', header: 'Preview', sortable: false, width: '80px' },
    { key: 'employee', header: 'Employee', sortable: true },
    { key: 'documentType', header: 'Document Type', sortable: true },
    { key: 'uploadedAt', header: 'Uploaded', sortable: true },
    { key: 'verificationStatus', header: 'Status', sortable: true },
    { key: 'actions', header: 'Actions', sortable: false, width: '150px' },
  ];

  // Verification form
  verifyForm = this.fb.group({
    verificationStatus: ['', [Validators.required]],
    verificationNotes: ['', [Validators.maxLength(1000)]],
  });

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(
    page: number = 1,
    pageSize: number = 10,
    search?: string,
    sort?: { key: string; direction: SortDirection | null }
  ): void {
    this.isLoading.set(true);
    this.currentPage = page;
    this.pageSize = pageSize;

    const filters: any = {
      page,
      limit: pageSize,
    };

    if (this.selectedStatus()) {
      filters.verificationStatus = this.selectedStatus();
    }

    if (this.selectedDocType()) {
      filters.documentType = this.selectedDocType();
    }

    this.documentService.getDocumentsForVerification(filters).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.documents.set(response.data.documents || []);
          this.totalItems = response.data.pagination?.total || 0;
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading documents:', error);
        this.alertService.error('Failed to load documents');
        this.documents.set([]);
        this.isLoading.set(false);
      }
    });
  }

  onSearch(searchTerm: string): void {
    this.searchTerm.set(searchTerm);
    this.loadDocuments(1, this.pageSize, searchTerm);
  }

  onSort(event: { key: string; direction: SortDirection | null }): void {
    this.loadDocuments(this.currentPage, this.pageSize, this.searchTerm(), event);
  }

  onPage(page: number): void {
    this.loadDocuments(page, this.pageSize, this.searchTerm());
  }

  onPageSize(size: number): void {
    this.loadDocuments(1, size, this.searchTerm());
  }

  applyFilters(): void {
    this.loadDocuments(1, this.pageSize, this.searchTerm());
  }

  clearFilters(): void {
    this.selectedStatus.set('');
    this.selectedDocType.set('');
    this.loadDocuments(1, this.pageSize, this.searchTerm());
  }

  openVerifyModal(document: any, action: 'verify' | 'reject' | 'review'): void {
    this.selectedDocument.set(document);
    let status = '';
    
    if (action === 'verify') {
      status = 'verified';
    } else if (action === 'reject') {
      status = 'rejected';
    } else {
      status = 'under_review';
    }

    this.verifyForm.patchValue({
      verificationStatus: status,
      verificationNotes: '',
    });

    this.showVerifyModal.set(true);
  }

  closeVerifyModal(): void {
    this.showVerifyModal.set(false);
    this.selectedDocument.set(null);
    this.verifyForm.reset();
  }

  submitVerification(): void {
    if (this.verifyForm.invalid) {
      this.verifyForm.markAllAsTouched();
      return;
    }

    const document = this.selectedDocument();
    if (!document) {
      return;
    }

    const verificationStatus = this.verifyForm.get('verificationStatus')?.value as 'verified' | 'rejected' | 'under_review';
    const verificationNotes = this.verifyForm.get('verificationNotes')?.value || '';

    this.isVerifying.set(true);

    this.documentService.verifyDocument(document._id, verificationStatus, verificationNotes).subscribe({
      next: (response) => {
        if (response.success) {
          this.alertService.toast(`Document ${verificationStatus} successfully!`, 'success');
          this.loadDocuments(this.currentPage, this.pageSize, this.searchTerm());
          this.closeVerifyModal();
        }
        this.isVerifying.set(false);
      },
      error: (error) => {
        console.error('Error verifying document:', error);
        this.alertService.error(error.error?.message || 'Failed to verify document');
        this.isVerifying.set(false);
      }
    });
  }

  viewDocument(document: any): void {
    if (!document) {
      this.alertService.error('Document information not available');
      return;
    }

    // Check if filePath exists
    if (!document.filePath) {
      this.alertService.error('Document file path not found');
      console.error('Document object:', document);
      return;
    }

    // Determine file type from fileName or fileType
    const fileType = document.fileType || document.fileName?.split('.').pop();
    
    this.documentService.viewFile(document.filePath, document.fileName, fileType);
  }

  getDocumentPreviewUrl(document: any): string {
    if (!document.filePath) {
      return '';
    }
    return this.documentService.getFileUrl(document.filePath);
  }

  isImageFile(document: any): boolean {
    const fileType = (document.fileType || document.fileName?.split('.').pop() || '').toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif'].includes(fileType);
  }

  isPdfFile(document: any): boolean {
    const fileType = (document.fileType || document.fileName?.split('.').pop() || '').toLowerCase();
    return fileType === 'pdf';
  }

  getEmployeeDisplayName(document: any): string {
    return document.employeeName || document.employee?.fullName || document.employeeId || 'Unknown employee';
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'verified':
        return 'bg-success';
      case 'rejected':
        return 'bg-danger';
      case 'under_review':
        return 'bg-info';
      case 'uploaded':
        return 'bg-warning';
      case 'pending_upload':
        return 'bg-secondary';
      default:
        return 'bg-secondary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'verified':
        return 'bi-check-circle-fill';
      case 'rejected':
        return 'bi-x-circle-fill';
      case 'under_review':
        return 'bi-eye-fill';
      case 'uploaded':
        return 'bi-hourglass';
      case 'pending_upload':
        return 'bi-clock-history';
      default:
        return 'bi-file-earmark';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  formatStatus(status: string): string {
    return status.toUpperCase().replace(/_/g, ' ');
  }
}
