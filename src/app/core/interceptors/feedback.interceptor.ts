import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { catchError, finalize, throwError } from 'rxjs';
import { environment } from '../config/environment';
import { RequestFeedbackService } from '../services/request-feedback.service';
import { apiErrorMessage } from '../utils/api-error';

export const feedbackInterceptor: HttpInterceptorFn = (request, next) => {
  const feedback = inject(RequestFeedbackService);
  let backend = false;
  try {
    backend = new URL(request.url, inject(DOCUMENT).baseURI).origin === new URL(environment.apiUrl).origin;
  } catch { /* Una URL inválida se procesa sin mostrar detalles internos. */ }
  if (!backend) return next(request);

  feedback.begin();
  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && !(error.status === 403 && error.error?.codigo === 'TERMINOS_PENDIENTES')) {
        feedback.notify(apiErrorMessage(error, 'No se pudo completar la operación. Inténtalo nuevamente.'));
      }
      return throwError(() => error);
    }),
    finalize(() => feedback.end()),
  );
};
