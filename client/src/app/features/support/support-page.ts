import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { take } from 'rxjs';

import { DashboardService } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';

interface SupportTicket {
  _id: string;
  subject: string;
  description: string;
  category: string;
  priority: 'low' | 'normal' | 'high';
  status: string;
  createdAt: string;
  createdByName?: string;
  createdByRole?: string;
}

@Component({
  selector: 'app-support-create-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './support-page.html',
  styleUrl: './support-page.scss',
})
export class SupportCreatePage implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);

  readonly supportSubject = signal('');
  readonly supportDescription = signal('');
  readonly supportCategory = signal('General');
  readonly supportPriority = signal<'low' | 'normal' | 'high'>('normal');
  readonly supportSubmitting = signal(false);
  readonly supportMessage = signal<string | null>(null);
  readonly supportError = signal<string | null>(null);

  readonly tickets = signal<SupportTicket[]>([]);
  readonly ticketsLoading = signal(true);
  readonly ticketsError = signal<string | null>(null);

  readonly hasTickets = computed(() => this.tickets().length > 0);

  ngOnInit(): void {
    this.supportMessage.set(null);
    this.supportError.set(null);
    this.loadSupportTickets();
  }

  loadSupportTickets(): void {
    this.ticketsLoading.set(true);
    this.ticketsError.set(null);

    this.dashboardService.getSupportTickets(1, 10).pipe(take(1)).subscribe({
      next: (response) => {
        this.tickets.set(response.data.tickets || []);
        this.ticketsLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading support tickets:', error);
        this.ticketsError.set('Unable to load your support tickets right now.');
        this.ticketsLoading.set(false);
      },
    });
  }

  submitSupportTicket(): void {
    const subject = this.supportSubject().trim();
    const description = this.supportDescription().trim();
    const category = this.supportCategory().trim();
    const priority = this.supportPriority();

    if (!subject || !description) {
      this.supportError.set('Subject and description are required.');
      return;
    }

    this.supportSubmitting.set(true);
    this.supportMessage.set(null);
    this.supportError.set(null);

    this.dashboardService
      .createSupportTicket({ subject, description, category, priority })
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.supportSubmitting.set(false);
          this.supportSubject.set('');
          this.supportDescription.set('');
          this.supportCategory.set('General');
          this.supportPriority.set('normal');
          this.supportMessage.set(response.message || 'Support ticket submitted successfully.');
          this.loadSupportTickets();
        },
        error: (error) => {
          console.error('Error submitting support ticket:', error);
          this.supportError.set(error.error?.message || 'Failed to submit the support ticket.');
          this.supportSubmitting.set(false);
        },
      });
  }

  get rolePrefix(): string {
    return this.authService.role() || 'admin';
  }

  formatDate(date?: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
}
