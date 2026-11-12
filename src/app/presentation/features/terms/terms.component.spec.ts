import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { environment } from '../../../core/config/environment';
import { DISPLAYED_TERMS_VERSION } from '../../../core/services/terms.service';
import { TokenStorageService } from '../../../core/services/token-storage.service';
import { TermsComponent } from './terms.component';

describe('Aceptación de términos', () => {
  const endpoint = `${environment.apiUrl}/api/terminos/aceptacion`;
  const pending = { version: DISPLAYED_TERMS_VERSION, aceptado: false, roles: ['DOCENTE', 'ADMINISTRADOR'], aceptadoEn: null };
  let http: HttpTestingController;
  let router: { navigateByUrl: ReturnType<typeof vi.fn>; navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    router = { navigateByUrl: vi.fn(), navigate: vi.fn() };
    TestBed.configureTestingModule({
      imports: [TermsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(),
        { provide: TokenStorageService, useValue: { clearSession: vi.fn(), getAccessToken: () => 'token', updateRoles: vi.fn() } },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ volver: '/courses' }) } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('muestra todos los roles actuales y registra solo después de confirmar', () => {
    const fixture = TestBed.createComponent(TermsComponent);
    fixture.detectChanges();
    http.expectOne(endpoint).flush(pending);
    fixture.detectChanges();
    const content = fixture.nativeElement as HTMLElement;
    expect(content.textContent).toContain('Compromisos del docente');
    expect(content.textContent).toContain('Responsabilidades de administración');
    expect(content.textContent).not.toContain('Compromisos del estudiante');
    fixture.componentInstance.accept();
    http.expectNone((r) => r.method === 'POST');
    const checkbox = content.querySelector('input[type=checkbox]') as HTMLInputElement;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    (Array.from(content.querySelectorAll('button')).find((b) => b.textContent?.includes('Aceptar y continuar')) as HTMLButtonElement).click();
    const request = http.expectOne(endpoint);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ version: DISPLAYED_TERMS_VERSION, rolesMostrados: ['DOCENTE', 'ADMINISTRADOR'] });
    request.flush({ ...pending, aceptado: true, aceptadoEn: '2026-11-11T15:00:00' });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/courses');
  });

  it('impide aceptar cuando la versión del servidor es distinta', () => {
    const fixture = TestBed.createComponent(TermsComponent);
    fixture.detectChanges();
    http.expectOne(endpoint).flush({ ...pending, version: 'posterior' });
    fixture.detectChanges();
    fixture.componentInstance.confirmed = true;
    fixture.componentInstance.accept();
    http.expectNone((r) => r.method === 'POST');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('diferente');
  });

  it('recarga condiciones si cambian roles o versión durante la aceptación', () => {
    const fixture = TestBed.createComponent(TermsComponent);
    fixture.detectChanges();
    http.expectOne(endpoint).flush(pending);
    fixture.componentInstance.confirmed = true;
    fixture.componentInstance.accept();
    http.expectOne(endpoint).flush({}, { status: 409, statusText: 'Conflict' });
    http.expectOne(endpoint).flush({ ...pending, roles: ['ESTUDIANTE'] });
    fixture.detectChanges();
    expect(fixture.componentInstance.confirmed).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Compromisos del estudiante');
  });

  it('permite reintentar y cerrar sesión si el estado no se puede consultar', () => {
    const fixture = TestBed.createComponent(TermsComponent);
    fixture.detectChanges();
    http.expectOne(endpoint).error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Reintentar');
    fixture.componentInstance.load();
    http.expectOne(endpoint).flush(pending);
    fixture.componentInstance.logout();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('permite revisar lo aceptado sin exigir una nueva aceptación', () => {
    const fixture = TestBed.createComponent(TermsComponent);
    fixture.detectChanges();
    http.expectOne(endpoint).flush({ ...pending, aceptado: true });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ya aceptaste');
    fixture.componentInstance.continue();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/courses');
    http.expectNone((r) => r.method === 'POST');
  });
});
