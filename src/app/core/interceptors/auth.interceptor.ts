import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../config/environment';
import { TokenStorageService } from '../services/token-storage.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);
  const router = inject(Router);
  const token = tokenStorage.getAccessToken();

  let isBackend = false;
  try {
    isBackend = new URL(req.url, environment.apiUrl).origin === new URL(environment.apiUrl).origin;
  } catch {
    /* Enlace inválido */
  }
  let authReq = req;
  if (token && isBackend) {
    authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`),
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (isBackend && error.status === 401 && !req.url.includes('/auth/login')) {
        tokenStorage.clearSession();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
};
