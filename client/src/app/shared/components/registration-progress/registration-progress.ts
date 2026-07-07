import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-registration-progress',
  imports: [CommonModule],
  templateUrl: './registration-progress.html',
  styleUrl: './registration-progress.scss',
  standalone: true
})
export class RegistrationProgress {
  @Input() currentStep: number = 1;
  @Input() completedSteps: number[] = [];
  @Input() totalSteps: number = 4;

  /**
   * Check if a step is completed
   */
  isStepCompleted(step: number): boolean {
    return this.completedSteps.includes(step);
  }

  /**
   * Check if a step is active
   */
  isStepActive(step: number): boolean {
    return this.currentStep === step;
  }

  /**
   * Check if a step is pending
   */
  isStepPending(step: number): boolean {
    return !this.isStepCompleted(step) && !this.isStepActive(step);
  }

  /**
   * Get steps array for iteration
   */
  get steps(): number[] {
    return Array.from({ length: this.totalSteps }, (_, i) => i + 1);
  }
}
