import {
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { UserService } from '../../../core/services/user.service';
import { TableActions } from '../../../shared/components/table-actions/table-actions';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, TableActions],
  templateUrl: './user-list.html',
})
export class UserList implements OnInit {

  private userService = inject(UserService);

  users = signal<any[]>([]);

  ngOnInit(): void {
    console.log('UserList Initialized');
    this.userService.getUsers().subscribe({
      next: (response) => {

        this.users.set(response.data);
        console.log('Users Response', response);
      },
      error: (err) => console.error(err)
    });
  }

  viewUser(user: any): void { }

  editUser(user: any): void { }

  deleteUser(user: any): void { }

}