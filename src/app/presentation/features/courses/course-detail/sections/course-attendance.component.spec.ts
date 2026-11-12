import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../core/config/environment';
import { CourseWorkspace } from '../../../../../domain/models/course-workspace.model';
import { CourseAttendanceComponent } from './course-attendance.component';

describe('Registro masivo de asistencias', () => {
  const base = `${environment.apiUrl}/api/asistencias`;
  const workspace = {
    units: [{ weeks: [{ resources: [{ id: 'class', kind: 'CLASS', title: 'Clase', startsAt: '2026-01-01T10:00:00' }] }] }],
    students: [{ id: 'one', name: 'Ana', status: 'ACTIVA' }, { id: 'two', name: 'Luis', status: 'RIESGO' }],
  } as unknown as CourseWorkspace;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CourseAttendanceComponent], providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('consulta todas las páginas y envía un solo lote sin incluir registros existentes', () => {
    const fixture = TestBed.createComponent(CourseAttendanceComponent);
    fixture.componentRef.setInput('workspace', workspace); fixture.detectChanges();
    const component = fixture.componentInstance;
    component.classId = 'class'; component.load();
    http.expectOne((r) => r.url === base && r.params.get('page') === '0')
      .flush({ content: [], number: 0, last: false });
    http.expectOne((r) => r.url === base && r.params.get('page') === '1')
      .flush({ content: [{ estudianteId: 'one', estado: 'PRESENTE' }], number: 1, last: true });
    component.setStatus('two', 'TARDE'); component.save();
    const request = http.expectOne(`${base}/masivo`);
    expect(request.request.body).toEqual({ claseId: 'class', registros: [{ estudianteId: 'two', estado: 'TARDE', observacion: null }] });
    request.flush({ mensaje: 'Lote inválido' }, { status: 400, statusText: 'Bad Request' });
    expect(component.error()).toContain('Lote inválido');
    expect(component.selection()['two']).toBe('TARDE');
  });
});
