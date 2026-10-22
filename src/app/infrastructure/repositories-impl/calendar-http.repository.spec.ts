import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CalendarHttpRepository } from './calendar-http.repository';
import { environment } from '../../core/config/environment';
describe('Course timetable calendar contract', () => {
  let repository: CalendarHttpRepository;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    repository = TestBed.inject(CalendarHttpRepository);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('queries the unified agenda and renders the saved Lima times without inventing a join link', () => {
    repository.getEvents('2026-11-02', '2026-11-08').subscribe((events) => {
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        id: 'occurrence',
        kind: 'CURSO',
        courseId: 'course',
        day: 'lunes',
        time: '19:00 – 20:30',
        courseTitle: 'Curso real',
        teacher: 'Ana Docente',
        status: 'PROGRAMADA',
      });
      expect(events[0].virtualUrl).toBeUndefined();
    });
    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/api/calendario`);
    expect(req.request.params.get('desde')).toBe('2026-11-02');
    expect(req.request.params.get('hasta')).toBe('2026-11-08');
    req.flush([
      {
        id: 'occurrence',
        tipo: 'CURSO',
        cursoId: 'course',
        titulo: 'Curso real',
        cursoTitulo: 'Curso real',
        docenteNombre: 'Ana Docente',
        inicio: '2026-11-02T19:00:00-05:00',
        fin: '2026-11-02T20:30:00-05:00',
        estado: 'PROGRAMADA',
        url: null,
      },
    ]);
    http.expectNone(`${environment.apiUrl}/api/tutorias`);
  });
  it('does not turn a failed timetable query into an empty schedule', () => {
    let status: number | undefined;
    repository.getEvents().subscribe({ error: (e) => (status = e.status) });
    http
      .expectOne(`${environment.apiUrl}/api/calendario`)
      .flush({}, { status: 403, statusText: 'Forbidden' });
    expect(status).toBe(403);
  });
});
