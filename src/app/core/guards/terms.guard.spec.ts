import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../config/environment';
import { DISPLAYED_TERMS_VERSION } from '../services/terms.service';
import { TokenStorageService } from '../services/token-storage.service';
import { termsGuard } from './terms.guard';

describe('Control de términos en rutas protegidas', () => {
  const endpoint = `${environment.apiUrl}/api/terminos/aceptacion`;
  const pending = {} as UrlTree;
  const router = { createUrlTree: vi.fn(() => pending) };
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: Router, useValue: router }, { provide: TokenStorageService, useValue: { getAccessToken: () => 'token', updateRoles: vi.fn() } }] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); vi.clearAllMocks(); });
  function guard() {
    const observable = TestBed.runInInjectionContext(() => termsGuard({} as ActivatedRouteSnapshot, { url: '/library' } as RouterStateSnapshot)) as Observable<boolean | UrlTree>;
    return firstValueFrom(observable);
  }
  it('permite entrar si la versión vigente fue aceptada', async () => {
    const result = guard();
    http.expectOne(endpoint).flush({ version: DISPLAYED_TERMS_VERSION, aceptado: true, roles: ['ESTUDIANTE'] });
    expect(await result).toBe(true);
  });
  it('redirige a la tarjeta si está pendiente o la versión no coincide', async () => {
    const result = guard();
    http.expectOne(endpoint).flush({ version: DISPLAYED_TERMS_VERSION, aceptado: false, roles: ['ESTUDIANTE'] });
    expect(await result).toBe(pending);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/terminos'], { queryParams: { volver: '/library' } });
    const outdated = guard();
    http.expectOne(endpoint).flush({ version: 'posterior', aceptado: true, roles: ['ESTUDIANTE'] });
    expect(await outdated).toBe(pending);
  });
  it('no permite entrar si falla la consulta o hay un rol desconocido', async () => {
    const failed = guard();
    http.expectOne(endpoint).error(new ProgressEvent('error'));
    expect(await failed).toBe(pending);
    const unknown = guard();
    http.expectOne(endpoint).flush({ version: DISPLAYED_TERMS_VERSION, aceptado: true, roles: ['NUEVO'] });
    expect(await unknown).toBe(pending);
  });
});
