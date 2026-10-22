import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { DashboardHttpRepository } from './dashboard-http.repository';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { authInterceptor } from '../../core/interceptors/auth.interceptor';
import { environment } from '../../core/config/environment';
const response = (courses: number, role: string) => ({
  metricas: {
    cursosInscritos: courses,
    promedioCalificacion: 0,
    tareasEntregadas: 0,
    porcentajeAsistencia: 0,
    horasEstudioSemanal: 0,
  },
  clasesHoy: [],
  tareasPendientes: [],
  rolUsuario: role,
  nombreUsuario: role,
});
describe('Dashboard session isolation', () => {
  let repository: DashboardHttpRepository;
  let http: HttpTestingController;
  let token = 'teacher-token';
  const url = `${environment.apiUrl}/api/dashboard/resumen`;
  beforeEach(() => {
    token = 'teacher-token';
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        {
          provide: TokenStorageService,
          useValue: { getAccessToken: () => token, clearSession: vi.fn() },
        },
      ],
    });
    repository = TestBed.inject(DashboardHttpRepository);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('does not reuse the teacher total for a student and refreshes changed enrollments', () => {
    repository.getSummary().subscribe((s) => expect(s.metrics.enrolledCoursesCount).toBe(10));
    let req = http.expectOne(url);
    expect(req.request.headers.get('Authorization')).toBe('Bearer teacher-token');
    req.flush(response(10, 'DOCENTE'));
    token = 'student-token';
    repository.getSummary().subscribe((s) => expect(s.metrics.enrolledCoursesCount).toBe(1));
    req = http.expectOne(url);
    expect(req.request.headers.get('Authorization')).toBe('Bearer student-token');
    req.flush(response(1, 'ESTUDIANTE'));
    repository.getSummary().subscribe((s) => expect(s.metrics.enrolledCoursesCount).toBe(2));
    http.expectOne(url).flush(response(2, 'ESTUDIANTE'));
  });
  it('reports API errors instead of manufacturing zero metrics', () => {
    let failed: number | undefined;
    repository.getSummary().subscribe({
      next: () => {
        throw new Error('No debe generar métricas');
      },
      error: (e) => (failed = e.status),
    });
    http
      .expectOne(url)
      .flush({ mensaje: 'Servidor no disponible' }, { status: 500, statusText: 'Server Error' });
    expect(failed).toBe(500);
  });
});
