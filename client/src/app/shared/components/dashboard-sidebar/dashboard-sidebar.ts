import { Component, EventEmitter, Input, Output, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { AlertService } from '../../../core/services/alert.service';
import { API_CONFIG } from '../../../core/config/api.config';

interface MenuItem {
  label: string;
  path?: string;  // Just the path without role prefix (e.g., 'dashboard', 'users')
  icon: string;
  roles: string[];
  children?: MenuItem[]; // For dropdown menus
  isDropdown?: boolean; // Flag to indicate dropdown menu
}

@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './dashboard-sidebar.html',
  styleUrl: './dashboard-sidebar.scss',
})
export class DashboardSidebar implements OnInit, OnDestroy {
  @Input() sidebarOpen = false;
  @Output() sidebarItemClicked = new EventEmitter<void>();

  readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly alertService = inject(AlertService);
  private readonly router = inject(Router);

  showUserMenu = false;
  profileImage = signal<string | null>(null);
  expandedMenus = signal<{ [key: string]: boolean }>({});
  private docClickHandler = () => { this.showUserMenu = false; };

  ngOnInit(): void {
    this.loadUserProfile();
    document.addEventListener('click', this.docClickHandler);
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.docClickHandler);
  }

  loadUserProfile(): void {
    this.userService.getMyProfile().subscribe({
      next: (response) => {
        const userData = response.data;
        if (userData.profileImage) {
          this.profileImage.set(`${API_CONFIG.SERVER_URL}${userData.profileImage}`);
        }
      },
      error: (error) => {
        console.error('Error loading profile image:', error);
      }
    });
  }

  getInitials(): string {
    const name = this.auth.user()?.fullName || 'User';
    return name.charAt(0).toUpperCase();
  }

  getRandomColor(): string {
    const name = this.auth.user()?.fullName || 'User';
    const colors = [
      '#667eea', '#764ba2', '#f093fb', '#4facfe',
      '#43e97b', '#fa709a', '#fee140', '#30cfd0',
      '#a8edea', '#fed6e3', '#c471ed', '#12c2e9'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  closeSidebar(): void {
    this.sidebarItemClicked.emit();
  }

  toggleUserMenu(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.showUserMenu = !this.showUserMenu;
  }

  toggleDropdown(label: string, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const expanded = this.expandedMenus();
    const newExpanded = {
      ...expanded,
      [label]: !expanded[label],
    };
    this.expandedMenus.set(newExpanded);
    console.log('Dropdown toggled:', label, 'isExpanded:', newExpanded[label]);
    
    // Debug: log menu items with children
    const menuItems = this.menuItems();
    const dropdownItem = menuItems.find(item => item.label === label);
    console.log('Dropdown item:', dropdownItem);
  }

  isDropdownExpanded(label: string): boolean {
    const isExpanded = this.expandedMenus()[label] || false;
    return isExpanded;
  }

  logout(): void {
    this.alertService.confirm(
      'You will be logged out of your account.',
      'Are you sure you want to logout?',
      'Yes, logout',
      'Cancel'
    ).then((confirmed) => {
      if (confirmed) {
        this.auth.logout();
        this.router.navigate(['/auth/login']);
        this.alertService.toast('Logged out successfully', 'success');
      }
    });
  }

  getProfileRoute(): string {
    const role = this.auth.role();
    if (role === 'admin') return '/admin/profile';
    if (role === 'company') return '/company/profile';
    if (role === 'employee') return '/employee/profile';
    return '/auth/login';
  }

  // Get role prefix for URLs
  getRolePrefix(): string {
    const role = this.auth.role();
    return role || 'admin';
  }

  // Define all menu items with their allowed roles
  private allMenuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      path: 'dashboard',
      icon: 'bi bi-grid-1x2-fill',
      roles: ['admin', 'company', 'employee'],
    },
    {
      label: 'Admin Dashboard',
      path: 'dashboard',
      icon: 'bi bi-speedometer2',
      roles: ['admin'],
    },
    {
      label: 'Companies',
      path: 'companies',
      icon: 'bi bi-building-fill',
      roles: ['admin'],
    },
    // {
    //   label: 'All Users',
    //   path: 'users-admin',
    //   icon: 'bi bi-people-fill',
    //   roles: ['admin'],
    // },
    {
      label: 'Employees',
      path: 'users',
      icon: 'bi bi-people-fill',
      roles: ['company'],
    },
    {
      label: 'Employee Activity',
      path: 'employee-activity',
      icon: 'bi bi-activity',
      roles: ['company', 'admin'],
    },
    {
      label: 'Roles',
      path: 'roles',
      icon: 'bi bi-briefcase',
      roles: ['company'],
    },
    {
      label: 'Global Search',
      path: 'employee-search',
      icon: 'bi bi-search',
      roles: ['company'],
    },
    {
      label: 'Global Search',
      path: 'admin-global-search',
      icon: 'bi bi-search',
      roles: ['admin'],
    },
    {
      label: 'Skill Manager',
      icon: 'bi bi-gear-fill',
      roles: ['admin'],
      isDropdown: true,
      children: [
        {
          label: 'Skill Categories',
          path: 'skill-categories',
          icon: 'bi bi-diagram-3-fill',
          roles: ['admin'],
        },
        {
          label: 'Skills',
          path: 'skills',
          icon: 'bi bi-lightbulb-fill',
          roles: ['admin'],
        },
      ],
    },
    {
      label: 'Analytics',
      icon: 'bi bi-bar-chart',
      roles: ['admin'],
      isDropdown: true,
      children: [
        {
          label: 'Skill Categories',
          path: 'admin-skill-category-analytics',
          icon: 'bi bi-diagram-3-fill',
          roles: ['admin'],
        },
        {
          label: 'Skills',
          path: 'admin-skill-analytics',
          icon: 'bi bi-star-fill',
          roles: ['admin'],
        },
        {
          label: 'Companies',
          path: 'admin-company-analytics',
          icon: 'bi bi-building-fill',
          roles: ['admin'],
        },
        {
          label: 'Employees',
          path: 'admin-employee-analytics',
          icon: 'bi bi-people-fill',
          roles: ['admin'],
        },
      ],
    },
    {
      label: 'Questionnaires',
      path: 'questionnaires',
      icon: 'bi bi-clipboard-check',
      roles: ['company'],
    },
    {
      label: 'My Questionnaires',
      path: 'my-questionnaires',
      icon: 'bi bi-clipboard-check',
      roles: ['employee'],
    },
    {
      label: 'Skill Management',
      path: 'company-skills',
      icon: 'bi bi-star-fill',
      roles: ['company'],
    },
    {
      label: 'Skills Category',
      path: 'company-skill-categories',
      icon: 'bi bi-tags-fill',
      roles: ['company'],
    },
    {
      label: 'Organisation',
      path: 'organisation',
      icon: 'bi bi-building-fill',
      roles: ['company'],
    },
    {
      label: 'My Skills',
      path: 'my-skills',
      icon: 'bi bi-lightbulb-fill',
      roles: ['employee'], // Only employees can manage their own skills
    },
    {
      label: 'Notifications',
      path: 'notifications',
      icon: 'bi bi-bell-fill',
      roles: ['company'],
    },
    {
      label: 'System Settings',
      path: 'system-settings',
      icon: 'bi bi-sliders',
      roles: ['admin'],
    },
    {
      label: 'Document Requirements',
      path: 'document-requirements',
      icon: 'bi bi-file-earmark-check',
      roles: ['company'],
    },
    {
      label: 'Document Review',
      path: 'document-review',
      icon: 'bi bi-file-earmark-check-fill',
      roles: ['company'],
    },
  ];

  // Computed property to get role-filtered menu items with correct URLs
  menuItems = computed(() => {
    const userRole = this.auth.role();
    if (!userRole) return [];
    
    const rolePrefix = this.getRolePrefix();
    
    return this.allMenuItems
      .filter((item) => {
        // Filter by role only - don't remove duplicates here as dropdowns are unique
        return item.roles.includes(userRole);
      })
      .map(item => {
        const mappedItem: any = {
          label: item.label,
          icon: item.icon,
          isDropdown: item.isDropdown || false,
        };

        if (item.isDropdown && item.children) {
          // Map children for dropdown
          mappedItem.children = item.children
            .filter(child => child.roles.includes(userRole))
            .map(child => ({
              label: child.label,
              route: `/${rolePrefix}/${child.path}`,
              icon: child.icon,
            }));
        } else if (item.path) {
          mappedItem.route = `/${rolePrefix}/${item.path}`;
        }

        return mappedItem;
      })
      .filter((item, index, self) => {
        // Remove duplicate non-dropdown items by path
        if (item.isDropdown) return true; // Always keep dropdowns
        return self.findIndex(i => !i.isDropdown && i.route === item.route) === index;
      });
  });
}