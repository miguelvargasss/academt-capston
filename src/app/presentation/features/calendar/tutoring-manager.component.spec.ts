import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../core/config/environment';
import { TokenStorageService } from '../../../core/services/token-storage.service';
import { TutoringManagerComponent } from './tutoring-manager.component';

const base = `${environment.apiUrl}/api`;
const emptyPage = { content: [], number: 0, totalPages: 0, totalElements: 0 };
function setup(role: 'ESTUDIANTE' | 'DOCENTE') {
  TestBed.configureTestingModule({ imports: [TutoringManagerComponent], providers: [provideHttpClient(), provideHttpClientTesting(), { provide: TokenStorageService, useValue: { currentUser: () => ({ id: 'user', role, roles: [role] }), isAdmin: () => false } }] });
  const fixture = TestBed.createComponent(TutoringManagerComponent); const http = TestBed.inject(HttpTestingController); fixture.detectChanges();
  http.expectOne((r) => r.url === `${base}/tutorias`).flush(emptyPage);
  if (role === 'ESTUDIANTE') http.expectOne(`${base}/cursos/mis-cursos`).flush([{ id: 'course', titulo: 'Inglés', docenteId: 'teacher' }]);
  else http.expectOne((r) => r.url === `${base}/disponibilidades`).flush(emptyPage);
  return { component: fixture.componentInstance, http };
}

describe('Gestión de tutorías', () => {
  it('solicita tutoría para el alumno y docente del curso elegido', () => {
    const { component, http } = setup('ESTUDIANTE');
    component.tutoringForm.patchValue({ cursoId: 'course', fecha: '2099-11-11T10:00', duracionMinutos: 30 });
    component.selectCourse();
    const availability = http.expectOne((r) => r.url === `${base}/disponibilidades`);
    expect(availability.request.params.get('docenteId')).toBe('teacher'); availability.flush(emptyPage);
    component.requestTutoring();
    const request = http.expectOne(`${base}/tutorias`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ estudianteId: 'user', docenteId: 'teacher', cursoId: 'course', fecha: '2099-11-11T10:00', duracionMinutos: 30 });
    request.flush({ id: 't1' }); http.expectOne((r) => r.url === `${base}/tutorias`).flush(emptyPage); http.verify();
  });
  it('rechaza una tutoría que cruzaría la medianoche', () => {
    const { component, http } = setup('ESTUDIANTE');
    component.tutoringForm.patchValue({ cursoId: 'course', fecha: '2099-11-11T23:45', duracionMinutos: 30 });
    component.requestTutoring();
    expect(component.error()).toContain('medianoche'); http.expectNone(`${base}/tutorias`); http.verify();
  });
  it('registra disponibilidad propia y valida el rango de horas', () => {
    const { component, http } = setup('DOCENTE');
    component.availabilityForm.patchValue({ diaSemana: 'MONDAY', horaInicio: '15:00', horaFin: '14:00' });
    component.saveBlock(); expect(component.error()).toContain('posterior'); http.expectNone(`${base}/disponibilidades`);
    component.availabilityForm.controls.horaFin.setValue('16:00'); component.saveBlock();
    const request = http.expectOne(`${base}/disponibilidades`);
    expect(request.request.body).toEqual({ docenteId: 'user', diaSemana: 'MONDAY', horaInicio: '15:00', horaFin: '16:00' });
    request.flush({ id: 'd1' }); http.expectOne((r) => r.url === `${base}/disponibilidades`).flush(emptyPage); http.verify();
  });
  it('impide a un estudiante completar una tutoría', () => {
    const { component, http } = setup('ESTUDIANTE');
    component.changeStatus({ id: 't1', estudianteId: 'user', docenteId: 'teacher', estudianteNombreCompleto: 'Ana', docenteNombreCompleto: 'Luis', cursoTitulo: 'Inglés', fecha: '2099-01-01T10:00', duracionMinutos: 30, estado: 'CONFIRMADA' }, 'COMPLETADA');
    http.expectNone(`${base}/tutorias/t1/estado`); http.verify();
  });
  it('edita notas de tutorías confirmadas conservando fecha y duración originales', () => {
    const { component, http } = setup('ESTUDIANTE');
    const item = { id: 't1', estudianteId: 'user', docenteId: 'teacher', estudianteNombreCompleto: 'Ana', docenteNombreCompleto: 'Luis', cursoTitulo: 'Inglés', fecha: '2099-01-01T10:00:30', duracionMinutos: 30, estado: 'CONFIRMADA' as const };
    component.openTutoring(item);
    http.expectOne(`${base}/tutorias/t1`).flush({ ...item, notas: 'Original' });
    component.editTutoringForm.patchValue({ fecha: '2099-01-01T11:00', duracionMinutos: 45, notas: 'Nueva nota' });
    component.saveTutoring();
    const request = http.expectOne(`${base}/tutorias/t1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ fecha: '2099-01-01T10:00:30', duracionMinutos: 30, notas: 'Nueva nota' });
    request.flush({}); http.expectOne((r) => r.url === `${base}/tutorias`).flush(emptyPage); http.verify();
  });
  it('permite al administrador seleccionar un docente y crear su disponibilidad', () => {
    TestBed.configureTestingModule({ imports: [TutoringManagerComponent], providers: [provideHttpClient(), provideHttpClientTesting(), { provide: TokenStorageService, useValue: { currentUser: () => ({ id: 'admin', role: 'ADMINISTRADOR', roles: ['ADMINISTRADOR'] }), isAdmin: () => true } }] });
    const fixture = TestBed.createComponent(TutoringManagerComponent); const http = TestBed.inject(HttpTestingController); fixture.detectChanges();
    http.expectOne((r) => r.url === `${base}/tutorias`).flush(emptyPage);
    const teachers = http.expectOne((r) => r.url === `${base}/usuarios`);
    expect(teachers.request.params.get('rol')).toBe('DOCENTE');
    teachers.flush({ content: [{ id: 'teacher', nombre: 'Luis', apellido: 'Pérez' }], number: 0, totalPages: 1, totalElements: 1 });
    const component = fixture.componentInstance;
    component.selectTeacher({ target: { value: 'teacher' } } as unknown as Event);
    const availability = http.expectOne((r) => r.url === `${base}/disponibilidades`);
    expect(availability.request.params.get('docenteId')).toBe('teacher'); availability.flush(emptyPage);
    component.availabilityForm.patchValue({ diaSemana: 'MONDAY', horaInicio: '15:00', horaFin: '16:00' }); component.saveBlock();
    const create = http.expectOne(`${base}/disponibilidades`); expect(create.request.body.docenteId).toBe('teacher'); create.flush({});
    http.expectOne((r) => r.url === `${base}/disponibilidades`).flush(emptyPage); http.verify();
  });
});
