import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  provideRouter,
  UrlTree,
} from '@angular/router';
import { docenteOnlyGuard } from './auth.guard';
import { TokenStorageService } from '../services/token-storage.service';
describe('Student management route access', () => {
  it.each(['DOCENTE', 'ESTUDIANTE', 'ADMINISTRADOR', null])(
    'limits the module to an authenticated teacher (%s)',
    (role) => {
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          {
            provide: TokenStorageService,
            useValue: { isAuthenticated: () => role !== null, userRole: () => role },
          },
        ],
      });
      const access = TestBed.runInInjectionContext(() =>
        docenteOnlyGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
      );
      if (role === 'DOCENTE') expect(access).toBe(true);
      else expect((access as UrlTree).toString()).toBe('/courses');
    },
  );
});
