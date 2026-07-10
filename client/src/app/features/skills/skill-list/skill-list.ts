import {
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { SkillService } from '../../../core/services/skill.service';
import { AlertService } from '../../../core/services/alert.service';

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

  skills = signal<Skill[]>([]);

  ngOnInit(): void {

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

  editSkill(skill: Skill): void {

    this.router.navigate([
      '/admin/skills',
      skill._id,
      'edit'
    ]);

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