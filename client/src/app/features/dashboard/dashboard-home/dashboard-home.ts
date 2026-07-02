import { Component } from '@angular/core';
import { StatCard } from '../../../shared/components/stat-card/stat-card';

@Component({
  selector: 'app-dashboard-home',
    imports: [
    StatCard
  ],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.scss',
})
export class DashboardHome {}
