import { InjectionToken } from '@angular/core';
import { AuthRepository } from '../../domain/repositories/auth.repository';
import { CourseRepository } from '../../domain/repositories/course.repository';
import { DashboardRepository } from '../../domain/repositories/dashboard.repository';
import { CourseWorkspaceRepository } from '../../domain/repositories/course-workspace.repository';

import { CalendarRepository } from '../../domain/repositories/calendar.repository';

export const AUTH_REPOSITORY = new InjectionToken<AuthRepository>('AUTH_REPOSITORY');
export const COURSE_REPOSITORY = new InjectionToken<CourseRepository>('COURSE_REPOSITORY');
export const DASHBOARD_REPOSITORY = new InjectionToken<DashboardRepository>('DASHBOARD_REPOSITORY');
export const CALENDAR_REPOSITORY = new InjectionToken<CalendarRepository>('CALENDAR_REPOSITORY');
export const COURSE_WORKSPACE_REPOSITORY = new InjectionToken<CourseWorkspaceRepository>(
  'COURSE_WORKSPACE_REPOSITORY',
);

export const STUDENT_REPOSITORY = new InjectionToken<
  import('../../domain/repositories/student.repository').StudentRepository
>('STUDENT_REPOSITORY');
