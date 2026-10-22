import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CourseWorkspaceHttpRepository } from './course-workspace-http.repository';
import { CourseHttpRepository } from './course-http.repository';
import { environment } from '../../core/config/environment';
import { PanelCursoDto } from '../dtos/course-workspace.dto';

describe('Course workspace HTTP contracts', () => {
  let repository: CourseWorkspaceHttpRepository;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/api`;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    repository = TestBed.inject(CourseWorkspaceHttpRepository);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('maps real course data and preserves missing grades and actual class duration', () => {
    const dto: PanelCursoDto = {
      curso: {
        id: 'course',
        titulo: 'Curso persistido',
        descripcion: null,
        nivelCefr: 'C1',
        estado: 'ACTIVO',
        docente: { id: 'teacher', nombre: 'Ana', apellido: 'Pérez' },
        horario: null,
        fechaInicio: null,
        fechaFin: null,
        capacidadMaxima: 12,
      },
      unidades: [
        {
          unidad: { id: 'unit', numero: 2, titulo: 'Unidad persistida', descripcion: null },
          semanas: [
            {
              semana: {
                id: 'week',
                unidadId: 'unit',
                numero: 3,
                titulo: 'Semana persistida',
                descripcion: null,
                esActual: true,
              },
              clases: [
                {
                  id: 'class',
                  semanaId: 'week',
                  titulo: 'Clase persistida',
                  descripcion: null,
                  urlVivo: 'https://example.org/class',
                  urlGrabacion: null,
                  fechaHora: '2026-11-01T17:00:00',
                  duracionMinutos: 35,
                  sala: null,
                },
              ],
              materiales: [],
              tareas: [],
            },
          ],
        },
      ],
      matriculas: [
        {
          id: 'enrollment',
          estudianteId: 'student',
          estudianteNombreCompleto: 'Luis Ruiz',
          estudianteCorreo: 'student@testing.invalid',
          estado: 'ACTIVA',
          notaFinal: null,
          asistenciaPorcentaje: null,
          matriculadoAt: '2026-10-01T12:00:00',
        },
      ],
      anuncios: [],
      entregas: [],
    };
    repository.getWorkspace('course').subscribe((data) => {
      expect(data.course.teacherName).toBe('Ana Pérez');
      expect(data.course.status).toBe('ACTIVO');
      expect(data.units[0].weeks[0].resources[0].durationMinutes).toBe(35);
      expect(data.students[0].grade).toBeNull();
      expect(data.students[0].attendance).toBeNull();
    });
    http.expectOne(`${base}/cursos/course/aula`).flush(dto);
  });

  it('creates material with its week ID and updates it without changing the parent', () => {
    repository
      .saveResource({
        courseId: 'course',
        weekId: 'week',
        kind: 'MATERIAL',
        title: 'Lectura',
        description: '',
        materialType: 'PDF',
        externalUrl: 'https://example.org/read',
      })
      .subscribe();
    const create = http.expectOne(`${base}/cursos/course/contenido/MATERIAL`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toMatchObject({
      semanaId: 'week',
      titulo: 'Lectura',
      tipo: 'PDF',
      urlExterno: 'https://example.org/read',
    });
    create.flush({ id: 'material' });
    repository
      .saveResource({
        id: 'material',
        courseId: 'course',
        weekId: 'week',
        kind: 'MATERIAL',
        title: 'Lectura corregida',
        description: '',
        materialType: 'PDF',
        externalUrl: 'https://example.org/new',
      })
      .subscribe();
    const update = http.expectOne(`${base}/cursos/course/contenido/MATERIAL/material`);
    expect(update.request.method).toBe('PUT');
    expect(update.request.body.semanaId).toBe('week');
    update.flush({});
  });

  it('sends grades with the backend field names and keeps zero as a valid grade', () => {
    repository.grade({ id: 'submission', grade: 0, feedback: 'Revisar' }).subscribe();
    const request = http.expectOne(`${base}/entregas/submission/calificar`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ nota: 0, retroalimentacion: 'Revisar' });
    request.flush({});
  });

  it('propagates forbidden access instead of returning an empty course', () => {
    let status: number | undefined;
    repository.getWorkspace('private').subscribe({ error: (e) => (status = e.status) });
    http
      .expectOne(`${base}/cursos/private/aula`)
      .flush({ mensaje: 'No autorizado' }, { status: 403, statusText: 'Forbidden' });
    expect(status).toBe(403);
  });

  it('does not replace a failed personal course query with the global catalog', () => {
    const courses = TestBed.inject(CourseHttpRepository);
    let status: number | undefined;
    courses.getMyCourses().subscribe({ error: (e) => (status = e.status) });
    http
      .expectOne(`${base}/cursos/mis-cursos`)
      .flush({}, { status: 500, statusText: 'Server Error' });
    expect(status).toBe(500);
    http.expectNone(`${base}/cursos`);
  });
});
