import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { take } from 'rxjs';

import { DashboardService } from '../../core/services/dashboard.service';
import { AlertService } from '../../core/services/alert.service';

interface StatusUpdate {
  updatedBy: string;
  updatedByName: string;
  updatedByRole: string;
  previousStatus: string;
  newStatus: string;
  note?: string;
  updatedAt: string;
}

interface SupportTicket {
  _id: string;
  subject: string;
  description: string;
  category: string;
  priority: 'low' | 'normal' | 'high';
  status: 'open' | 'pending' | 'resolved' | 'closed';
  createdAt: string;
  createdByName?: string;
  createdByRole?: string;
  createdByEmail?: string;
  statusHistory?: StatusUpdate[];
}

declare var bootstrap: any;

@Component({
  selector: 'app-support-review-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './support-review-page.html',
  styleUrl: './support-page.scss',
})
export class SupportReviewPage implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly alertService = inject(AlertService);

  readonly tickets = signal<SupportTicket[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly updatingTicketId = signal<string | null>(null);
  readonly selectedTicket = signal<SupportTicket | null>(null);
  readonly expandedTicketId = signal<string | null>(null);
  readonly statusFilter = signal<string>('all');

  readonly filteredTickets = computed(() => {
    const filter = this.statusFilter();
    if (filter === 'all') {
      return this.tickets();
    }
    return this.tickets().filter(ticket => ticket.status === filter);
  });

  newStatus: string = '';
  statusNote: string = '';
  private modalInstance: any = null;
  private detailModalInstance: any = null;

  ngOnInit(): void {
    this.loadTickets();
  }

  loadTickets(): void {
    this.loading.set(true);
    this.error.set(null);

    this.dashboardService.getSupportTickets(1, 100).pipe(take(1)).subscribe({
      next: (response) => {
        console.log('Loaded tickets:', response.data.tickets);
        this.tickets.set(response.data.tickets || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading tickets for review:', err);
        this.error.set('Unable to load support tickets for review right now.');
        this.loading.set(false);
      },
    });
  }

  openStatusModal(ticket: SupportTicket): void {
    // Prevent updating closed tickets
    if (ticket.status === 'closed') {
      this.alertService.warning(
        'Closed tickets cannot be modified. If you need to address this issue again, please ask the user to create a new ticket.',
        'Ticket is Closed'
      );
      return;
    }

    this.selectedTicket.set(ticket);
    this.newStatus = '';
    this.statusNote = '';

    const modalElement = document.getElementById('statusUpdateModal');
    if (modalElement) {
      this.modalInstance = new bootstrap.Modal(modalElement);
      this.modalInstance.show();
    }
  }

  openTicketDetail(ticket: SupportTicket): void {
    this.selectedTicket.set(ticket);

    const modalElement = document.getElementById('ticketDetailModal');
    if (modalElement) {
      this.detailModalInstance = new bootstrap.Modal(modalElement);
      this.detailModalInstance.show();
    }
  }

  closeModal(): void {
    if (this.modalInstance) {
      this.modalInstance.hide();
    }
    this.selectedTicket.set(null);
    this.newStatus = '';
    this.statusNote = '';
  }

  closeDetailModal(): void {
    if (this.detailModalInstance) {
      this.detailModalInstance.hide();
    }
  }

  confirmStatusUpdate(): void {
    const ticket = this.selectedTicket();
    if (!ticket || !this.newStatus) {
      this.alertService.error('Please select a valid status to update.', 'Validation Error');
      return;
    }

    if (this.newStatus === ticket.status) {
      this.alertService.warning('The selected status is the same as the current status.', 'No Change');
      return;
    }

    const statusLabels: Record<string, string> = {
      open: 'Open',
      pending: 'Pending',
      resolved: 'Resolved',
      closed: 'Closed',
    };

    const selectedStatus = this.newStatus;
    const selectedStatusLabel = statusLabels[selectedStatus];

    this.updatingTicketId.set(ticket._id);

    this.dashboardService.updateSupportTicketStatus(ticket._id, selectedStatus as any, this.statusNote || undefined).pipe(take(1)).subscribe({
      next: (response) => {
        this.updatingTicketId.set(null);
        this.closeModal();

        // Update the ticket in the local state
        const updatedTickets = this.tickets().map((t) =>
          t._id === ticket._id ? { ...t, status: selectedStatus as SupportTicket['status'] } : t
        );
        this.tickets.set(updatedTickets);

        this.alertService.success(
          `Ticket status has been successfully updated to "${selectedStatusLabel}".`,
          'Status Updated!'
        );
      },
      error: (err) => {
        console.error('Error updating ticket status:', err);
        this.updatingTicketId.set(null);
        this.alertService.error(
          err.error?.message || 'Failed to update ticket status. Please try again.',
          'Update Failed'
        );
      },
    });
  }

  setStatusFilter(status: string): void {
    this.statusFilter.set(status);
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

  formatDateTime(date?: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }

  getEmployeeName(ticket: SupportTicket): string {
    return ticket.createdByName || 'Unknown User';
  }

  getEmployeeRole(ticket: SupportTicket): string {
    return ticket.createdByRole || 'employee';
  }
}
