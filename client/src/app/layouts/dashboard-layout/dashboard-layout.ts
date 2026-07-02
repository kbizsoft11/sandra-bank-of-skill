import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

import { DashboardSidebar } from '../../shared/components/dashboard-sidebar/dashboard-sidebar';
import { DashboardHeader } from '../../shared/components/dashboard-header/dashboard-header';
import { UserList } from '../../features/users/user-list/user-list';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    DashboardSidebar,
    DashboardHeader
  ],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.scss',
})
export class DashboardLayout {
  
  sidebarOpen = true;

  closeSidebar = () => {
    this.sidebarOpen = false;
  };

}
