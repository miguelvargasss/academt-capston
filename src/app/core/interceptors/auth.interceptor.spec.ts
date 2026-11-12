import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { TokenStorageService } from '../services/token-storage.service';
import { environment } from '../config/environment';

describe('JWT y proveedores de archivos', () => {
  it('redirige a términos si el backend exige una nueva aceptación', () => {
    const storage = { getAccessToken: () => 'token-de-prueba', clearSession: vi.fn() };
    const router = { navigate: vi.fn() };
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), { provide: TokenStorageService, useValue: storage }, { provide: Router, useValue: router }] });
    TestBed.inject(HttpClient).get(environment.apiUrl + '/api/cursos').subscribe({ error: () => {} });
    const controller = TestBed.inject(HttpTestingController);
    controller.expectOne(() => true).flush({ codigo: 'TERMINOS_PENDIENTES' }, { status: 403, statusText: 'Forbidden' });
    expect(router.navigate).toHaveBeenCalledWith(['/terminos']);
    expect(storage.clearSession).not.toHaveBeenCalled();
    controller.verify();
  });
  it('un 401 del backend cierra sesión y redirige al login', () => {
    const storage = { getAccessToken: () => 'token-de-prueba', clearSession: vi.fn() };
    const router = { navigate: vi.fn() };
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), { provide: TokenStorageService, useValue: storage }, { provide: Router, useValue: router }] });
    TestBed.inject(HttpClient).get(environment.apiUrl + '/api/cursos').subscribe({ error: () => {} });
    const controller = TestBed.inject(HttpTestingController);
    controller.expectOne(() => true).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(storage.clearSession).toHaveBeenCalledOnce(); expect(router.navigate).toHaveBeenCalledWith(['/login']); controller.verify();
  });
  it('credenciales incorrectas en login no generan un bucle de redirección', () => {
    const storage = { getAccessToken: () => null, clearSession: vi.fn() };
    const router = { navigate: vi.fn() };
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), { provide: TokenStorageService, useValue: storage }, { provide: Router, useValue: router }] });
    TestBed.inject(HttpClient).post(environment.apiUrl + '/auth/login', {}).subscribe({ error: () => {} });
    const controller = TestBed.inject(HttpTestingController); const req = controller.expectOne(() => true);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(storage.clearSession).not.toHaveBeenCalled(); expect(router.navigate).not.toHaveBeenCalled(); controller.verify();
  });
  it('envía JWT solo al backend y un 401 externo no cierra la sesión', () => {
    const storage = { getAccessToken: () => 'jwt-del-alumno', clearSession: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: TokenStorageService, useValue: storage },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);
    http.get(environment.apiUrl + '/api/cursos').subscribe();
    const backend = controller.expectOne(environment.apiUrl + '/api/cursos');
    expect(backend.request.headers.get('Authorization')).toBe('Bearer jwt-del-alumno');
    backend.flush([]);
    http
      .get('https://bucket.r2.example/file.pdf?signature=temporal')
      .subscribe({ error: () => {} });
    const external = controller.expectOne('https://bucket.r2.example/file.pdf?signature=temporal');
    expect(external.request.headers.has('Authorization')).toBe(false);
    external.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(storage.clearSession).not.toHaveBeenCalled();
    controller.verify();
  });
  it('no envía el JWT a una URL relativa de otro origen web', () => {
    const storage = { getAccessToken: () => 'jwt-del-alumno', clearSession: vi.fn() };
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
      { provide: TokenStorageService, useValue: storage },
      { provide: Router, useValue: { navigate: vi.fn() } },
    ] });
    const controller = TestBed.inject(HttpTestingController);
    TestBed.inject(HttpClient).get('/asset-privado').subscribe();
    const request = controller.expectOne('/asset-privado');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({}); controller.verify();
  });
});
