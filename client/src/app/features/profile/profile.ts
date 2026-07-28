import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { from, Observable } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { passwordStrengthValidator } from '../../shared/validators/registration.validators';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { DocumentService } from '../../core/services/document.service';
import { DocumentRequirementService } from '../../core/services/document-requirement.service';
import { AlertService } from '../../core/services/alert.service';
import { API_CONFIG } from '../../core/config/api.config';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class Profile implements OnInit {

  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly documentService = inject(DocumentService);
  private readonly documentRequirementService = inject(DocumentRequirementService);
  private readonly alertService = inject(AlertService);
  private readonly fb = inject(FormBuilder);

  // Profile data signals
  user = signal<any>(null);
  activeTab = signal<string>('overview');
  isLoading = signal<boolean>(true);

  // Modal states
  showEditModal = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  submitError = signal<string>('');
  submitSuccess = signal<string>('');

  // Profile picture upload
  showImageUpload = signal<boolean>(false);
  selectedFile = signal<File | null>(null);
  imagePreview = signal<string | null>(null);
  isUploadingImage = signal<boolean>(false);

  // Document management
  myDocuments = signal<any[]>([]);
  documentSummary = signal<any>(null);
  isLoadingDocuments = signal<boolean>(false);
  isUploadingDocument = signal<boolean>(false);
  selectedDocumentFile = signal<File | null>(null);
  documentUploadError = signal<string>('');

  // Document Requirements
  documentRequirements = signal<any[]>([]);
  selectedRequirementFiles = signal<{ [key: string]: File }>({});
  isLoadingRequirements = signal<boolean>(false);
  isSubmittingForReview = signal<boolean>(false);
  isSavingAllDrafts = signal<boolean>(false);

  // Strengths and interests
  topStrengths = signal<string[]>([
    'Creative Thinker',
    'Problem Solver',
    'Great Execution',
    'Team Player',
    'Lead Storyteller',
    'Adaptable'
  ]);

  interests = signal<string[]>([
    'Photography',
    'Travel',
    'Adaptable',
    'Music',
    'Fitness',
    'Gaming'
  ]);

  // Edit profile form
  editForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    title: ['', [Validators.maxLength(100)]],
    bio: ['', [Validators.maxLength(500)]],
    socialLinks: this.fb.group({
      facebook: [''],
      twitter: [''],
      linkedin: ['']
    })
  });

  documentUploadForm = this.fb.group({
    documentType: ['', [Validators.required]],
    description: ['', [Validators.maxLength(500)]]
  });

  passwordForm = this.fb.group({
    otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    newPassword: ['', [Validators.required, Validators.minLength(8), passwordStrengthValidator()]],
    confirmPassword: ['', [Validators.required, Validators.minLength(8)]]
  }, {
    validators: this.passwordsMatchValidator
  });

  isSendingOtp = signal<boolean>(false);
  isChangingPassword = signal<boolean>(false);
  passwordSuccess = signal<string>('');
  passwordError = signal<string>('');
  otpSent = signal<boolean>(false);

  // Login history and activity
  loginHistory = signal<any[]>([]);
  accountActivity = signal<any[]>([]);
  isLoadingLoginHistory = signal<boolean>(false);
  isLoadingAccountActivity = signal<boolean>(false);

  // Computed signal: Merge all activities (login/logout + account activities)
  allActivities = computed(() => {
    const all = [...this.loginHistory(), ...this.accountActivity()];
    // Sort by timestamp descending (newest first)
    return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  });

  ngOnInit(): void {
    this.loadUserProfile();
    this.loadLoginHistory();
    this.loadAccountActivity();
    this.loadMyDocuments();
    this.loadDocumentSummary();
  }

  loadUserProfile(): void {
    this.isLoading.set(true);
    
    this.userService.getMyProfile().subscribe({
      next: (response) => {
        const userData = response.data;
        this.user.set({
          _id: userData._id,
          fullName: userData.fullName,
          email: userData.email,
          role: userData.role,
          title: userData.title || this.getTitleByRole(userData.role),
          bio: userData.bio || 'Passionate professional with expertise in delivering exceptional results.',
          profileImage: userData.profileImage ? `${API_CONFIG.SERVER_URL}${userData.profileImage}` : null,
          socialLinks: userData.socialLinks || {
            facebook: '',
            twitter: '',
            linkedin: ''
          }
        });
        this.loadDocumentRequirements();
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading user profile:', error);
        // Fallback to auth service
        const currentUser = this.authService.user();
        if (currentUser) {
          this.user.set({
            _id: currentUser._id,
            fullName: currentUser.fullName,
            email: currentUser.email,
            role: currentUser.role,
            title: this.getTitleByRole(currentUser.role),
            bio: 'Passionate professional with expertise in delivering exceptional results.',
            profileImage: null,
            socialLinks: { facebook: '', twitter: '', linkedin: '' }
          });
        }
        this.loadDocumentRequirements();
        this.isLoading.set(false);
      }
    });
  }

  private getTitleByRole(role: string): string {
    const roleMap: { [key: string]: string } = {
      'admin': 'Administrator',
      'company': 'Company Manager',
      'employee': 'Team Member'
    };
    return roleMap[role] || 'Professional';
  }

  setActiveTab(tab: string): void {
    this.activeTab.set(tab);
  }

  editProfile(): void {
    const currentUser = this.user();
    if (currentUser) {
      this.editForm.patchValue({
        fullName: currentUser.fullName,
        title: currentUser.title || '',
        bio: currentUser.bio || '',
        socialLinks: {
          facebook: currentUser.socialLinks?.facebook || '',
          twitter: currentUser.socialLinks?.twitter || '',
          linkedin: currentUser.socialLinks?.linkedin || ''
        }
      });
      this.showEditModal.set(true);
      this.submitError.set('');
      this.submitSuccess.set('');
    }
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.editForm.reset();
    this.submitError.set('');
    this.submitSuccess.set('');
  }

  submitEditProfile(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set('');
    this.submitSuccess.set('');

    const payload = this.editForm.value;

    this.userService.updateMyProfile(payload).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        this.submitSuccess.set('Profile updated successfully!');
        
        // Update local user data
        const updatedData = response.data;
        this.user.update(current => ({
          ...current,
          fullName: updatedData.fullName,
          title: updatedData.title || current.title,
          bio: updatedData.bio || current.bio,
          socialLinks: updatedData.socialLinks || current.socialLinks
        }));

        // Close modal after delay
        setTimeout(() => {
          this.closeEditModal();
        }, 1500);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.submitError.set(error.error?.message || 'Failed to update profile. Please try again.');
      }
    });
  }

  requestPasswordOtp(): void {
    const email = this.user()?.email;

    if (!email) {
      this.passwordError.set('Email address not found.');
      return;
    }

    this.isSendingOtp.set(true);
    this.passwordError.set('');
    this.passwordSuccess.set('');

    this.userService.requestPasswordChangeOtp(email).subscribe({
      next: () => {
        this.isSendingOtp.set(false);
        this.otpSent.set(true);
        this.passwordSuccess.set('A verification code has been sent to ' + email);
      },
      error: (error) => {
        this.isSendingOtp.set(false);
        this.passwordError.set(error.error?.message || 'Unable to send verification code.');
      }
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const passwordPayload = {
      otp: this.passwordForm.get('otp')?.value?.toString().trim() ?? '',
      newPassword: this.passwordForm.get('newPassword')?.value?.toString() ?? '',
      confirmPassword: this.passwordForm.get('confirmPassword')?.value?.toString() ?? ''
    };

    this.isChangingPassword.set(true);
    this.passwordError.set('');
    this.passwordSuccess.set('');

    this.userService.verifyPasswordChangeOtp(passwordPayload).subscribe({
      next: () => {
        this.isChangingPassword.set(false);
        this.passwordSuccess.set('Password changed successfully.');
        this.passwordForm.reset();
        this.otpSent.set(false);
        setTimeout(() => {
          this.passwordSuccess.set('');
        }, 2000);
      },
      error: (error) => {
        this.isChangingPassword.set(false);
        this.passwordError.set(error.error?.message || 'Failed to change password.');
      }
    });
  }

  loadLoginHistory(): void {
    this.isLoadingLoginHistory.set(true);
    this.userService.getMyLoginHistory(1, 20).subscribe({
      next: (response: any) => {
        const activities = response.data?.activities || [];
        // Sort by timestamp descending (newest first)
        this.loginHistory.set(
          activities.sort((a: any, b: any) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
        );
        this.isLoadingLoginHistory.set(false);
      },
      error: (error: any) => {
        console.error('Error loading login history:', error);
        this.loginHistory.set([]);
        this.isLoadingLoginHistory.set(false);
      }
    });
  }

  loadAccountActivity(): void {
    this.isLoadingAccountActivity.set(true);
    this.userService.getMyAccountActivity(1, 20).subscribe({
      next: (response: any) => {
        const activities = response.data?.activities || [];
        // Sort by timestamp descending (newest first)
        this.accountActivity.set(
          activities.sort((a: any, b: any) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
        );
        this.isLoadingAccountActivity.set(false);
      },
      error: (error: any) => {
        console.error('Error loading account activity:', error);
        this.accountActivity.set([]);
        this.isLoadingAccountActivity.set(false);
      }
    });
  }

  private passwordsMatchValidator(group: any) {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return newPassword && confirmPassword && newPassword !== confirmPassword ? { passwordMismatch: true } : null;
  }

  getActivityIcon(activityType: string): string {
    const iconMap: { [key: string]: string } = {
      'login': 'bi bi-box-arrow-in-right',
      'logout': 'bi bi-box-arrow-right',
      'profile': 'bi bi-person-fill',
      'password': 'bi bi-shield-lock',
      'skill': 'bi bi-lightbulb-fill',
      'questionnaire': 'bi bi-clipboard-check',
      'employee_status_change': 'bi bi-person-check',
      'company_created': 'bi bi-building',
      'employee_added': 'bi bi-person-plus',
    };
    return iconMap[activityType] || 'bi bi-info-circle';
  }

  getActivityColor(activityType: string): string {
    const colorMap: { [key: string]: string } = {
      'login': 'text-success',
      'logout': 'text-warning',
      'profile': 'text-primary',
      'password': 'text-danger',
      'skill': 'text-info',
      'questionnaire': 'text-secondary',
      'employee_status_change': 'text-warning',
      'company_created': 'text-primary',
      'employee_added': 'text-success',
    };
    return colorMap[activityType] || 'text-muted';
  }

  getActivityBadge(activityType: string): string {
    const badges: { [key: string]: string } = {
      'login': 'badge-success',
      'logout': 'badge-warning',
      'profile': 'badge-primary',
      'password': 'badge-danger',
      'skill': 'badge-info',
      'questionnaire': 'badge-secondary',
      'employee_status_change': 'badge-warning',
      'company_created': 'badge-primary',
      'employee_added': 'badge-success',
    };
    return badges[activityType] || 'badge-secondary';
  }

  openImageUpload(): void {
    this.showImageUpload.set(true);
    this.selectedFile.set(null);
    this.imagePreview.set(null);
  }

  closeImageUpload(): void {
    this.showImageUpload.set(false);
    this.selectedFile.set(null);
    this.imagePreview.set(null);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.alertService.error('Please select an image file', 'Invalid File Type');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        this.alertService.error('File size must be less than 5MB', 'File Too Large');
        return;
      }

      this.selectedFile.set(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  uploadProfileImage(): void {
    const file = this.selectedFile();
    if (!file) {
      return;
    }

    this.isUploadingImage.set(true);

    this.userService.uploadProfilePicture(file).subscribe({
      next: (response) => {
        this.isUploadingImage.set(false);
        
        // Update profile image
        const updatedUser = response.data;
        this.user.update(current => ({
          ...current,
          profileImage: updatedUser.profileImage ? `${API_CONFIG.SERVER_URL}${updatedUser.profileImage}` : null
        }));

        this.closeImageUpload();
        this.alertService.toast('Profile picture updated successfully!', 'success');
      },
      error: (error) => {
        this.isUploadingImage.set(false);
        this.alertService.error(error.error?.message || 'Failed to upload image. Please try again.');
      }
    });
  }

  // Document Management Methods
  private loadMyDocuments(): void {
    this.isLoadingDocuments.set(true);
    this.documentService.getMyDocuments().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.myDocuments.set(response.data);
        }
        this.isLoadingDocuments.set(false);
      },
      error: (error) => {
        console.error('Error loading documents:', error);
        this.myDocuments.set([]);
        this.isLoadingDocuments.set(false);
      }
    });
  }

  private loadDocumentSummary(): void {
    this.documentService.getDocumentSummary().subscribe({
      next: (response) => {
        if (response.success) {
          this.documentSummary.set(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading document summary:', error);
      }
    });
  }

  onDocumentFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        this.documentUploadError.set('File size must be less than 10MB');
        return;
      }

      this.selectedDocumentFile.set(file);
      this.documentUploadError.set('');
    }
  }

  uploadDocument(): void {
    if (this.documentUploadForm.invalid || !this.selectedDocumentFile()) {
      this.documentUploadError.set('Please fill in all required fields');
      return;
    }

    const file = this.selectedDocumentFile();
    const documentType = this.documentUploadForm.get('documentType')?.value || '';
    const description = this.documentUploadForm.get('description')?.value || undefined;

    this.isUploadingDocument.set(true);
    this.documentUploadError.set('');

    this.documentService.uploadDocument(file!, documentType, description).subscribe({
      next: (response) => {
        if (response.success) {
          this.myDocuments.update((docs) => [response.data, ...docs]);
          this.loadDocumentSummary();
          this.resetDocumentForm();
          this.alertService.toast('Document uploaded successfully!', 'success');
        }
        this.isUploadingDocument.set(false);
      },
      error: (error) => {
        console.error('Error uploading document:', error);
        this.documentUploadError.set(error.error?.message || 'Failed to upload document. Please try again.');
        this.isUploadingDocument.set(false);
      }
    });
  }

  resetDocumentForm(): void {
    this.documentUploadForm.reset();
    this.selectedDocumentFile.set(null);
    this.documentUploadError.set('');
  }

  viewDocument(document: any): void {
    this.documentService.viewFile(document.filePath || '', document.fileName);
  }

  confirmDeleteDocument(documentId: string, fileName: string): void {
    if (confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
      this.deleteDocument(documentId);
    }
  }

  deleteDocument(documentId: string): void {
    this.documentService.deleteDocument(documentId).subscribe({
      next: () => {
        this.myDocuments.update((docs) => docs.filter((doc) => doc._id !== documentId));
        this.loadDocumentSummary();
        this.alertService.toast('Document deleted successfully', 'success');
      },
      error: (error) => {
        console.error('Error deleting document:', error);
        this.alertService.error('Failed to delete document. Please try again.');
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  getDocumentStatusClass(status: string): string {
    switch (status) {
      case 'verified':
        return 'badge-success';
      case 'rejected':
        return 'badge-danger';
      case 'pending':
      default:
        return 'badge-warning';
    }
  }

  getDocumentStatusIcon(status: string): string {
    switch (status) {
      case 'verified':
        return 'bi bi-check-circle-fill';
      case 'rejected':
        return 'bi bi-x-circle-fill';
      case 'pending':
      default:
        return 'bi bi-clock-history';
    }
  }

  // Document Requirements Methods
  private loadDocumentRequirements(): void {
    const employeeId = this.user()?._id || this.authService.user()?._id || '';

    if (!employeeId) {
      this.isLoadingDocuments.set(false);
      this.documentRequirements.set([]);
      return;
    }

    this.isLoadingDocuments.set(true);
    this.documentRequirementService.getEmployeeDocumentStatus(employeeId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.documentRequirements.set(response.data);
        }
        this.isLoadingDocuments.set(false);
      },
      error: (error) => {
        console.error('Error loading document requirements:', error);
        this.documentRequirements.set([]);
        this.isLoadingDocuments.set(false);
      }
    });
  }

  onRequirementFileSelected(event: Event, requirementId: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validate file size
      if (file.size > 10 * 1024 * 1024) {
        this.alertService.error('File size must be less than 10MB');
        return;
      }

      const currentFiles = this.selectedRequirementFiles();
      currentFiles[requirementId] = file;
      this.selectedRequirementFiles.set({ ...currentFiles });
    }
  }

  uploadRequirementDocument(requirementId: string): void {
    const file = this.selectedRequirementFiles()[requirementId];
    if (!file) {
      this.alertService.error('Please select a file');
      return;
    }

    this.isUploadingDocument.set(true);

    this.uploadRequirementDocumentObservable(file, requirementId).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadDocumentRequirements();
          const currentFiles = this.selectedRequirementFiles();
          delete currentFiles[requirementId];
          this.selectedRequirementFiles.set({ ...currentFiles });
          this.alertService.toast('Document saved as draft successfully!', 'success');
        }
        this.isUploadingDocument.set(false);
      },
      error: (error) => {
        console.error('Error uploading document:', error);
        this.alertService.error(error.error?.message || 'Failed to upload document');
        this.isUploadingDocument.set(false);
      }
    });
  }

  saveAllDrafts(): void {
    const selectedFiles = Object.entries(this.selectedRequirementFiles());

    if (selectedFiles.length === 0) {
      this.alertService.error('Please select at least one document to save as draft');
      return;
    }

    this.isSavingAllDrafts.set(true);
    this.isUploadingDocument.set(true);

    from(selectedFiles)
      .pipe(
        concatMap(([requirementId, file]) => this.uploadRequirementDocumentObservable(file, requirementId))
      )
      .subscribe({
        next: () => {
          // no-op, each upload is handled by the sequential stream
        },
        error: (error) => {
          console.error('Error saving documents as drafts:', error);
          this.alertService.error(error.error?.message || 'Failed to save documents as drafts');
          this.isSavingAllDrafts.set(false);
          this.isUploadingDocument.set(false);
        },
        complete: () => {
          this.loadDocumentRequirements();
          this.selectedRequirementFiles.set({});
          this.isSavingAllDrafts.set(false);
          this.isUploadingDocument.set(false);
          this.alertService.toast('All documents saved as drafts successfully!', 'success');
        },
      });
  }

  private uploadRequirementDocumentObservable(file: File, requirementId: string): Observable<any> {
    const existingRequirement = this.documentRequirements().find(
      req => req.requirement._id === requirementId
    );

    if (existingRequirement?.document?._id) {
      return this.documentService.deleteDocument(existingRequirement.document._id).pipe(
        concatMap(() => this.documentService.uploadDocument(file, '', '', requirementId))
      );
    }

    return this.documentService.uploadDocument(file, '', '', requirementId);
  }

  deleteRequirementDocument(documentId: string): void {
    if (confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      this.documentService.deleteDocument(documentId).subscribe({
        next: () => {
          this.loadDocumentRequirements();
          this.alertService.toast('Document deleted successfully', 'success');
        },
        error: (error) => {
          console.error('Error deleting document:', error);
          this.alertService.error('Failed to delete document');
        }
      });
    }
  }

  canModifyDocument(status: string): boolean {
    // Can only modify if status is pending_upload, uploaded (draft), or rejected
    // Cannot modify if under_review or verified
    return status === 'pending_upload' || status === 'uploaded' || status === 'rejected';
  }

  hasUploadedDocuments(): boolean {
    return this.documentRequirements().some(req => req.document);
  }

  canSubmitForReview(): boolean {
    const requirements = this.documentRequirements();

    if (requirements.length === 0) {
      return false;
    }

    return requirements.every((req) => {
      if (!req.requirement?.isRequired) {
        return true;
      }

      return !!req.document && ['pending_upload', 'uploaded', 'rejected'].includes(req.uploadStatus);
    });
  }

  canSaveAllDrafts(): boolean {
    return Object.keys(this.selectedRequirementFiles()).length > 0 && !this.isSavingAllDrafts() && !this.isUploadingDocument();
  }

  submitAllForReview(): void {
    if (!this.canSubmitForReview()) {
      this.alertService.error('No documents available to submit for review');
      return;
    }

    if (!confirm('Are you sure you want to submit all documents for review? You will not be able to modify them until the company reviews them.')) {
      return;
    }

    this.isSubmittingForReview.set(true);

    this.documentService.submitAllForReview().subscribe({
      next: (response) => {
        if (response.success) {
          this.loadDocumentRequirements();
          this.alertService.toast('All documents submitted for review successfully!', 'success');
        }
        this.isSubmittingForReview.set(false);
      },
      error: (error) => {
        console.error('Error submitting documents:', error);
        this.alertService.error(error.error?.message || 'Failed to submit documents for review');
        this.isSubmittingForReview.set(false);
      }
    });
  }
}
