import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../config/environment';
import { RequestFeedbackService } from '../services/request-feedback.service';
import { feedbackInterceptor } from './feedback.interceptor';

describe('Indicador global de solicitudes', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [
    provideHttpClient(withInterceptors([feedbackInterceptor])), provideHttpClientTesting(),
  ] }));
  afterEach(() => { TestBed.inject(HttpTestingController).verify(); vi.useRealTimers(); });

  it('mantiene la carga hasta terminar todas las peticiones, incluso si una falla', () => {
    vi.useFakeTimers();
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);
    const feedback = TestBed.inject(RequestFeedbackService);
    http.get(`${environment.apiUrl}/api/uno`).subscribe();
    http.get(`${environment.apiUrl}/api/dos`).subscribe({ error: () => {} });
    expect(feedback.loading()).toBe(true);
    controller.expectOne(`${environment.apiUrl}/api/uno`).flush({});
    expect(feedback.loading()).toBe(true);
    controller.expectOne(`${environment.apiUrl}/api/dos`).flush(
      { codigo: 'CURSO_SIN_CUPO' }, { status: 400, statusText: 'Bad Request' },
    );
    expect(feedback.loading()).toBe(false);
    expect(feedback.message()).toContain('capacidad');
    vi.advanceTimersByTime(8000);
    expect(feedback.message()).toBeNull();
  });

  it('libera el indicador al cancelar y no intercepta recursos externos', () => {
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);
    const feedback = TestBed.inject(RequestFeedbackService);
    const subscription = http.get(`${environment.apiUrl}/api/cursos`).subscribe();
    const request = controller.expectOne(`${environment.apiUrl}/api/cursos`);
    expect(feedback.loading()).toBe(true);
    subscription.unsubscribe();
    expect(request.cancelled).toBe(true);
    expect(feedback.loading()).toBe(false);
    http.get('https://files.example/resource').subscribe({ error: () => {} });
    expect(feedback.loading()).toBe(false);
    controller.expectOne('https://files.example/resource').flush({}, { status: 403, statusText: 'Forbidden' });
    expect(feedback.message()).toBeNull();
  });
});
