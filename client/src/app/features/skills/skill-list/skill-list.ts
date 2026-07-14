import {
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';

import { SkillService } from '../../../core/services/skill.service';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';

import { Skill } from '../../../shared/interfaces/skill.interface';

import { TableActions } from '../../../shared/components/table-actions/table-actions';

@Component({
  selector: 'app-skill-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TableActions
  ],
  templateUrl: './skill-list.html'
})
export class SkillList implements OnInit {

  private readonly service =
    inject(SkillService);

  private readonly alertService =
    inject(AlertService);

  private readonly router =
    inject(Router);

  private readonly route =
    inject(ActivatedRoute);

  private readonly auth =
    inject(AuthService);

  skills = signal<Skill[]>([]);
  employeeId = signal<string | null>(null);
  isViewingEmployeeSkills = signal<boolean>(false);

  ngOnInit(): void {

    // Check if we're viewing a specific employee's skills
    const userId = this.route.snapshot.params['id'];
    if (userId) {
      this.employeeId.set(userId);
      this.isViewingEmployeeSkills.set(true);
    }

    this.loadSkills();

  }

  loadSkills(): void {

    this.service
      .getSkills()
      .subscribe({

        next: (response) => {

          this.skills.set(
            response.data.skills
          );

        }

      });

  }

  getPageTitle(): string {
    if (this.isViewingEmployeeSkills()) {
      return 'Employee Skills';
    }
    const role = this.auth.role();
    if (role === 'employee') {
      return 'My Skills';
    }
    return 'All Skills';
  }

  getPageSubtitle(): string {
    if (this.isViewingEmployeeSkills()) {
      return 'View employee skills (read-only)';
    }
    const role = this.auth.role();
    if (role === 'employee') {
      return 'Manage your personal skills';
    }
    return 'Manage all skills in the platform';
  }

  getCreateRoute(): string {
    const role = this.auth.role();
    const rolePrefix = role || 'admin';
    if (role === 'employee') {
      return `/${rolePrefix}/my-skills/create`;
    }
    return `/${rolePrefix}/skills/create`;
  }

  canModifySkills(): boolean {
    // Only show add/edit/delete if not viewing employee skills and user is employee or admin
    if (this.isViewingEmployeeSkills()) {
      return false;
    }
    const role = this.auth.role();
    return role === 'employee' || role === 'admin';
  }

  getBackRoute(): string {
    const role = this.auth.role();
    const rolePrefix = role || 'admin';
    return `/${rolePrefix}/users`;
  }

  editSkill(skill: Skill): void {
    const role = this.auth.role();
    const rolePrefix = role || 'admin';

    if (role === 'employee') {
      this.router.navigate([
        `/${rolePrefix}/my-skills`,
        skill._id,
        'edit'
      ]);
    } else {
      this.router.navigate([
        `/${rolePrefix}/skills`,
        skill._id,
        'edit'
      ]);
    }

  }

  deleteSkill(skill: Skill): void {

    this.alertService.confirmDelete(skill.skill_name).then((confirmed) => {
      if (confirmed) {
        this.service
          .deleteSkill(skill._id)
          .subscribe({
            next: () => {
              this.loadSkills();
              this.alertService.toast('Skill deleted successfully', 'success');
            },
            error: (err) => {
              console.error(err);
              this.alertService.error('Failed to delete skill. Please try again.');
            }
          });
      }
    });

  }

}
