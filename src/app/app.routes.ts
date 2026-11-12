import { Routes } from '@angular/router';
import { authGuard, publicGuard, docenteOnlyGuard, adminGuard } from './core/guards/auth.guard';
import { termsGuard } from './core/guards/terms.guard';
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
    path: 'terminos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./presentation/features/terms/terms.component').then((m) => m.TermsComponent),
  },
  {
    path: '',
    component: DashboardLayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [termsGuard],
    children: [
      {
        path: 'profile',
        loadComponent: () =>
          import('./presentation/features/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'users',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./presentation/features/users/users.component').then((m) => m.UsersComponent),
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./presentation/features/messages/messages.component').then((m) => m.MessagesComponent),
      },
      {
        path: 'library',
        loadComponent: () =>
          import('./presentation/features/library/library.component').then((m) => m.LibraryComponent),
      },
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
