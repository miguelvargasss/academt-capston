import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { authGuard, publicGuard, teacherGuard } from './auth.guard';
import { TokenStorageService } from '../services/token-storage.service';

describe('Protección de rutas y roles', () => {
  function run(guard: typeof authGuard, authenticated: boolean, role: string | null = null) {
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: TokenStorageService, useValue: { isAuthenticated: () => authenticated, userRole: () => role } }] });
    return TestBed.runInInjectionContext(() => guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
  }
  it.each([true, false])('una ruta privada exige sesión (%s)', authenticated => {
    const value = run(authGuard, authenticated);
    if (authenticated) expect(value).toBe(true); else expect((value as UrlTree).toString()).toBe('/login');
  });
  it.each([true, false])('la ruta pública redirige al usuario conectado (%s)', authenticated => {
    const value = run(publicGuard, authenticated);
    if (authenticated) expect((value as UrlTree).toString()).toBe('/dashboard'); else expect(value).toBe(true);
  });
  it.each(['DOCENTE', 'ADMINISTRADOR', 'ESTUDIANTE', null])('valida el rol docente en las rutas de gestión (%s)', role => {
    const value = run(teacherGuard, role !== null, role);
    if (role === 'DOCENTE' || role === 'ADMINISTRADOR') expect(value).toBe(true);
    else expect((value as UrlTree).toString()).toBe('/courses');
  });
});
