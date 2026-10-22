import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DASHBOARD_REPOSITORY } from '../../core/tokens/repository.tokens';
import {
  DashboardMetrics,
  QuickTask,
  ScheduledClass,
} from '../../domain/models/dashboard-stats.model';

@Injectable({
  providedIn: 'root',
})
export class GetDashboardStatsUseCase {
  private readonly dashboardRepository = inject(DASHBOARD_REPOSITORY);

  getSummary() {
    return this.dashboardRepository.getSummary();
  }

  getMetrics(): Observable<DashboardMetrics> {
    return this.dashboardRepository.getStudentMetrics();
  }

  getTasks(): Observable<QuickTask[]> {
    return this.dashboardRepository.getUpcomingTasks();
  }

  getClasses(): Observable<ScheduledClass[]> {
    return this.dashboardRepository.getTodayClasses();
  }
}
