import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { take } from 'rxjs';

import { DashboardService } from '../../core/services/dashboard.service';

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
  selector: 'app-support-history-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './support-history-page.html',
  styleUrl: './support-page.scss',
})
export class SupportHistoryPage implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  readonly tickets = signal<SupportTicket[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly searchTerm = signal('');
  readonly statusFilter = signal<'all' | 'open' | 'pending' | 'resolved' | 'closed'>('all');

  readonly filteredTickets = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const status = this.statusFilter();

    return this.tickets().filter((ticket) => {
      const matchesStatus = status === 'all' || ticket.status === status;
      const matchesSearch =
        ticket.subject.toLowerCase().includes(term) ||
        ticket.description.toLowerCase().includes(term) ||
        ticket.category.toLowerCase().includes(term) ||
        (ticket.createdByName?.toLowerCase().includes(term) ?? false) ||
        (ticket.createdByRole?.toLowerCase().includes(term) ?? false);
      return matchesStatus && matchesSearch;
    });
  });

  ngOnInit(): void {
    this.loadTickets();
  }

  loadTickets(): void {
    this.loading.set(true);
    this.error.set(null);

    this.dashboardService.getSupportTickets(1, 50).pipe(take(1)).subscribe({
      next: (response) => {
        this.tickets.set(response.data.tickets || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading support ticket history:', err);
        this.error.set('Unable to load support ticket history right now.');
        this.loading.set(false);
      },
    });
  }

  setStatusFilter(value: 'all' | 'open' | 'pending' | 'resolved' | 'closed'): void {
    this.statusFilter.set(value);
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

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'open':
        return 'status-badge status-open';
      case 'pending':
        return 'status-badge status-pending';
      case 'resolved':
      case 'closed':
        return 'status-badge status-resolved';
      default:
        return 'status-badge status-open';
    }
  }

  get rolePrefix(): string {
    return 'employee';
  }
}
