import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { feedbackInterceptor } from './core/interceptors/feedback.interceptor';
import {
  STUDENT_REPOSITORY,
  AUTH_REPOSITORY,
  COURSE_REPOSITORY,
  DASHBOARD_REPOSITORY,
  CALENDAR_REPOSITORY,
} from './core/tokens/repository.tokens';
import { AuthHttpRepository } from './infrastructure/repositories-impl/auth-http.repository';
import { CourseHttpRepository } from './infrastructure/repositories-impl/course-http.repository';
import { DashboardHttpRepository } from './infrastructure/repositories-impl/dashboard-http.repository';
import { CalendarHttpRepository } from './infrastructure/repositories-impl/calendar-http.repository';
import { COURSE_WORKSPACE_REPOSITORY } from './core/tokens/repository.tokens';
import { StudentHttpRepository } from './infrastructure/repositories-impl/student-http.repository';
import { CourseWorkspaceHttpRepository } from './infrastructure/repositories-impl/course-workspace-http.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withInterceptors([feedbackInterceptor, authInterceptor])),

    // Dependency Inversion Principle (DIP): Inyección de abstracciones a implementaciones concretas
    { provide: STUDENT_REPOSITORY, useClass: StudentHttpRepository },
    { provide: AUTH_REPOSITORY, useClass: AuthHttpRepository },
    { provide: COURSE_REPOSITORY, useClass: CourseHttpRepository },
    { provide: DASHBOARD_REPOSITORY, useClass: DashboardHttpRepository },
    { provide: CALENDAR_REPOSITORY, useClass: CalendarHttpRepository },
    { provide: COURSE_WORKSPACE_REPOSITORY, useClass: CourseWorkspaceHttpRepository },
  ],
};
