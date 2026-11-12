import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { TokenStorageService } from '../services/token-storage.service';

export const authGuard: CanActivateFn = () => {
  const tokenStorage = inject(TokenStorageService);
  const router = inject(Router);

  if (tokenStorage.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

export const publicGuard: CanActivateFn = () => {
  const tokenStorage = inject(TokenStorageService);
  const router = inject(Router);

  if (tokenStorage.isAuthenticated()) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};

export const teacherGuard: CanActivateFn = () => {
  const session = inject(TokenStorageService);
  const router = inject(Router);
  return session.isAuthenticated() &&
    ['DOCENTE', 'ADMINISTRADOR'].includes(session.userRole() ?? '')
    ? true
    : router.createUrlTree(['/courses']);
};

export const docenteOnlyGuard: CanActivateFn = () => {
  const session = inject(TokenStorageService);
  return session.isAuthenticated() && session.userRole() === 'DOCENTE'
    ? true
    : inject(Router).createUrlTree(['/courses']);
};

export const adminGuard: CanActivateFn = () => {
  const session = inject(TokenStorageService);
  return session.isAuthenticated() && session.isAdmin()
    ? true
    : inject(Router).createUrlTree(['/dashboard']);
};
