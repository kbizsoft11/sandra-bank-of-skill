import {
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { UserService } from '../../../core/services/user.service';
import { TableActions } from '../../../shared/components/table-actions/table-actions';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TableActions
  ],
  templateUrl: './user-list.html',
})
export class UserList implements OnInit {

  private userService = inject(UserService);
  private readonly router = inject(Router);

  users = signal<any[]>([]);

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {

    this.userService
      .getUsers()
      .subscribe({

        next: (response) => {

          this.users.set(
            response.data
          );

        },

        error: (err) =>
          console.error(err)

      });

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
        `Are you sure you want to delete ${user.firstName}?`
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