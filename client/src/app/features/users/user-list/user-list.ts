import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { TableActions } from '../../../shared/components/table-actions/table-actions';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    TableActions
  ],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
})
export class UserList implements OnInit {

  private userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly users = signal<any[]>([]);
  readonly employeeUsers = computed(() =>
    this.users().filter((user: any) => this.isEmployee(user))
  );

  // Invite modal state
  showInviteModal = false;
  inviteForm!: FormGroup;
  isInviting = false;
  inviteError = '';
  inviteSuccess = '';

  ngOnInit(): void {
    this.loadUsers();
    this.initializeInviteForm();
  }

  private initializeInviteForm(): void {
    this.inviteForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  private isEmployee(user: any): boolean {
    const role = `${user?.role ?? ''}`.toString().trim().toLowerCase();
    return role === 'employee';
  }

  loadUsers(): void {

    this.userService
      .getUsers()
      .subscribe({

        next: (response) => {

          const users = Array.isArray(response?.data)
            ? response.data
            : [];

          this.users.set(users);

        },

        error: (err) =>
          console.error(err)

      });

  }

  /**
   * Open invite modal
   */
  openInviteModal(): void {
    this.showInviteModal = true;
    this.inviteForm.reset();
    this.inviteError = '';
    this.inviteSuccess = '';
  }

  /**
   * Close invite modal
   */
  closeInviteModal(): void {
    this.showInviteModal = false;
    this.inviteForm.reset();
    this.inviteError = '';
    this.inviteSuccess = '';
  }

  /**
   * Send invite
   */
  sendInvite(): void {
    if (this.inviteForm.invalid) {
      return;
    }

    this.isInviting = true;
    this.inviteError = '';
    this.inviteSuccess = '';

    const email = this.inviteForm.get('email')?.value;

    // TODO: Call invite API endpoint
    // For now, just simulate the API call
    setTimeout(() => {
      this.isInviting = false;
      this.inviteSuccess = `Invitation sent successfully to ${email}`;
      
      // Close modal after 2 seconds
      setTimeout(() => {
        this.closeInviteModal();
      }, 2000);
    }, 1000);

    // UNCOMMENT THIS WHEN BACKEND IS READY:
    /*
    this.userService.inviteUser({ email }).subscribe({
      next: (response) => {
        this.isInviting = false;
        this.inviteSuccess = `Invitation sent successfully to ${email}`;
        
        // Close modal after 2 seconds
        setTimeout(() => {
          this.closeInviteModal();
        }, 2000);
      },
      error: (error) => {
        this.isInviting = false;
        this.inviteError = error.error?.message || 'Failed to send invitation. Please try again.';
      }
    });
    */
  }

  viewUser(user: any): void { }

  editUser(user: any): void {

    this.router.navigate([
      '/admin/users',
      user._id,
      'edit'
    ]);

  }

  deleteUser(user: any): void {

    const confirmed =
      confirm(
        `Are you sure you want to delete ${user.fullName}?`
      );

    if (!confirmed) {

      return;

    }

    this.userService
      .deleteUser(user._id)
      .subscribe({

        next: () => {

          this.loadUsers();

        },

        error: (err) =>
          console.error(err)

      });

  }

}