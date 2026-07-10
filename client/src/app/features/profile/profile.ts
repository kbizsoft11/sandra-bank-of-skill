import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { AlertService } from '../../core/services/alert.service';
import { API_CONFIG } from '../../core/config/api.config';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class Profile implements OnInit {

  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
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

  // Stats data
  profileCompletion = signal<number>(100);
  talentScore = signal<number>(92);
  skillCredits = signal<number>(50);
  profileReach = signal<number>(60);

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

  ngOnInit(): void {
    this.loadUserProfile();
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

  shareProfile(): void {
    // TODO: Implement share functionality
    console.log('Share profile clicked');
  }

  addSkill(): void {
    // TODO: Navigate to add skill page or open modal
    console.log('Add skill clicked');
  }
}
