import { Injectable } from '@angular/core';
import { Observable, of, forkJoin } from 'rxjs';
import { DashboardRepository } from '../../domain/repositories/dashboard.repository';
import {
  DashboardMetrics,
  QuickTask,
  ScheduledClass,
} from '../../domain/models/dashboard-stats.model';

@Injectable({
  providedIn: 'root',
})
export class DashboardMockRepository implements DashboardRepository {
  getSummary() {
    return forkJoin({
      metrics: this.getStudentMetrics(),
      tasks: this.getUpcomingTasks(),
      classes: this.getTodayClasses(),
    });
  }
  getStudentMetrics(): Observable<DashboardMetrics> {
    return of({
      enrolledCoursesCount: 0,
      completedTasksCount: 0,
      averageGrade: 0,
      attendanceRate: 0,
      studyHoursThisWeek: 0,
    });
  }

  getUpcomingTasks(): Observable<QuickTask[]> {
    return of([]);
  }

  getTodayClasses(): Observable<ScheduledClass[]> {
    return of([]);
  }
}
