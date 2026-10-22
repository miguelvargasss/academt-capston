import { Observable } from 'rxjs';
import { DashboardMetrics, QuickTask, ScheduledClass } from '../models/dashboard-stats.model';

export interface DashboardRepository {
  getSummary(): Observable<import('../models/dashboard-stats.model').DashboardSummary>;
  getStudentMetrics(): Observable<DashboardMetrics>;
  getUpcomingTasks(): Observable<QuickTask[]>;
  getTodayClasses(): Observable<ScheduledClass[]>;
}
