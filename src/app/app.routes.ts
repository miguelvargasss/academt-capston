import { Routes } from '@angular/router';
import { authGuard, publicGuard, docenteOnlyGuard } from './core/guards/auth.guard';
import { DashboardLayoutComponent } from './presentation/layouts/dashboard-layout/dashboard-layout.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'login',
    canActivate: [publicGuard],
    loadComponent: () =>
      import('./presentation/features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: DashboardLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./presentation/features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'courses',
        loadComponent: () =>
          import('./presentation/features/courses/courses.component').then(
            (m) => m.CoursesComponent,
          ),
      },
      {
        path: 'students',
        canActivate: [docenteOnlyGuard],
        loadComponent: () =>
          import('./presentation/features/students/students.component').then(
            (m) => m.StudentsComponent,
          ),
      },
      {
        path: 'calendar',
        loadComponent: () =>
          import('./presentation/features/calendar/calendar.component').then(
            (m) => m.CalendarComponent,
          ),
      },
      {
        path: 'courses/:courseId',
        loadComponent: () =>
          import('./presentation/features/courses/course-detail/course-detail.component').then(
            (m) => m.CourseDetailComponent,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
