import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { DISPLAYED_TERMS_VERSION, hasDisplayedRoles, TermsService } from '../services/terms.service';

/** No se concede acceso ante un error de consulta ni ante un texto desactualizado. */
export const termsGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const pending = router.createUrlTree(['/terminos'], { queryParams: { volver: state.url } });
  return inject(TermsService).status().pipe(
    map((status) => status.aceptado && status.version === DISPLAYED_TERMS_VERSION && hasDisplayedRoles(status.roles) ? true : pending),
    catchError(() => of(pending)),
  );
};
