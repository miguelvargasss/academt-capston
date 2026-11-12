import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StudentHttpRepository } from './student-http.repository';
import { ManageStudentsUseCase, StudentStatusUpdateError } from '../../application/students/manage-students.use-case';
import { STUDENT_REPOSITORY } from '../../core/tokens/repository.tokens';
import { environment } from '../../core/config/environment';
import { Student } from '../../domain/models/student.model';
const dto = {
  id: 'student',
  nombreCompleto: 'Ana Martínez',
  correoElectronico: 'ana@kellyacademy.com',
  telefono: '999159716',
  avatarUrl: null,
  estado: 'ACTIVO',
  enRiesgo: true,
  creadoAt: '2026-10-01T12:00:00',
  matriculas: [{ id: 'enrollment', cursoId: 'old', estado: 'RIESGO', notaFinal: 75 }],
};
const student: Student = {
  id: 'student',
  fullName: 'Ana Martínez',
  email: 'ana@kellyacademy.com',
  phone: '999159716',
  avatarUrl: null,
  status: 'ACTIVO',
  atRisk: true,
  createdAt: '2026-10-01T12:00:00',
  enrollments: [{ id: 'enrollment', courseId: 'old', status: 'RIESGO', finalGrade: 75 }],
};
describe('Teacher student API contracts', () => {
  let repository: StudentHttpRepository;
  let http: HttpTestingController;
  let manage: ManageStudentsUseCase;
  const base = `${environment.apiUrl}/api/docente/alumnos`;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: STUDENT_REPOSITORY, useExisting: StudentHttpRepository },
      ],
    });
    repository = TestBed.inject(StudentHttpRepository);
    manage = TestBed.inject(ManageStudentsUseCase);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('maps actual account, risk, enrollments and course availability', () => {
    repository.load().subscribe((data) => {
      expect(data.students[0]).toEqual(student);
      expect(data.courses[0]).toEqual({
        id: 'old',
        title: 'Curso persistido',
        level: 'B2',
        status: 'ACTIVO',
        capacity: 20,
        enrolled: 1,
      });
    });
    http
      .expectOne(base)
      .flush({
        alumnos: [dto],
        cursos: [
          {
            id: 'old',
            titulo: 'Curso persistido',
            nivelCefr: 'B2',
            estado: 'ACTIVO',
            capacidadMaxima: 20,
            inscritos: 1,
          },
        ],
      });
  });
  it('sends the initial password only in the creation body and propagates duplicates', () => {
    let status: number | undefined;
    repository
      .create({
        fullName: 'Ana Martínez',
        emailIdentifier: 'ana',
        phone: '999159716',
        password: 'Initial?&=123',
      })
      .subscribe({ error: (e) => (status = e.status) });
    const request = http.expectOne(base);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      nombreCompleto: 'Ana Martínez',
      identificadorCorreo: 'ana',
      telefono: '999159716',
      contrasena: 'Initial?&=123',
    });
    expect(request.request.url).not.toContain('Initial');
    request.flush({ mensaje: 'Correo duplicado' }, { status: 409, statusText: 'Conflict' });
    expect(status).toBe(409);
  });
  it('updates basic information before applying the account status', () => {
    manage
      .update({
        id: 'student',
        fullName: 'Ana Editada',
        email: 'ana@kellyacademy.com',
        phone: '987654321',
        status: 'SUSPENDIDO',
        previousStatus: 'ACTIVO',
      })
      .subscribe((data) => expect(data.status).toBe('SUSPENDIDO'));
    const basic = http.expectOne(base + '/student');
    expect(basic.request.method).toBe('PATCH');
    expect(basic.request.body).not.toHaveProperty('estado');
    http.expectNone(base + '/student/estado');
    basic.flush(dto);
    const status = http.expectOne(base + '/student/estado');
    expect(status.request.body).toEqual({ estado: 'SUSPENDIDO' });
    status.flush({ ...dto, estado: 'SUSPENDIDO' });
  });
  it('reports that basic data was saved if the status request fails', () => {
    let received: unknown;
    manage.update({
      id: 'student', fullName: 'Ana Editada', email: 'ana@kellyacademy.com',
      phone: '987654321', status: 'SUSPENDIDO', previousStatus: 'ACTIVO',
    }).subscribe({ error: (error) => received = error });
    http.expectOne(base + '/student').flush(dto);
    http.expectOne(base + '/student/estado').flush({}, { status: 403, statusText: 'Forbidden' });
    expect(received).toBeInstanceOf(StudentStatusUpdateError);
    expect((received as Error).message).toContain('Los datos se guardaron');
  });
  it('starts all enrollment changes together and reports partial failures without cancelling successes', () => {
    let failures: unknown;
    manage.saveCourses(student, ['new-a', 'new-b']).subscribe((result) => (failures = result));
    const requests = http.match((r) => r.url.startsWith(base + '/student/cursos'));
    expect(requests).toHaveLength(3);
    const add = requests.filter((r) => r.request.method === 'POST');
    expect(add.map((r) => r.request.body.cursoId)).toEqual(['new-a', 'new-b']);
    expect(requests.find((r) => r.request.method === 'DELETE')?.request.url).toBe(
      base + '/student/cursos/old',
    );
    add[0].flush(null);
    add[1].flush({ mensaje: 'Sin cupo' }, { status: 400, statusText: 'Bad Request' });
    expect(failures).toBeUndefined();
    requests.find((r) => r.request.method === 'DELETE')!.flush(null);
    expect(failures).toEqual([{ id: 'new-b', error: expect.objectContaining({ status: 400 }) }]);
  });
  it('never re-enrolls a withdrawn student or removes a completed enrollment', () => {
    const withTerminal: Student = { ...student, enrollments: [
      { id: 'done', courseId: 'done-course', status: 'COMPLETADA', finalGrade: 90 },
      { id: 'left', courseId: 'left-course', status: 'ABANDONADA', finalGrade: null },
    ] };
    manage.saveCourses(withTerminal, ['left-course']).subscribe((result) => expect(result).toEqual([]));
    http.expectNone((r) => r.url.startsWith(base));
  });
  it('does not recreate unchanged enrollments', () => {
    manage.saveCourses(student, ['old']).subscribe((result) => expect(result).toEqual([]));
    http.expectNone((r) => r.url.startsWith(base));
  });
});
