import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { environment } from '../../../../../core/config/environment';
import { TokenStorageService } from '../../../../../core/services/token-storage.service';
import { CourseStudent } from '../../../../../domain/models/course-workspace.model';
import { CourseStudentsComponent } from './course-students.component';

describe('Cambios de matrícula', () => {
  const student = { id: 'student', enrollmentId: 'enrollment', name: 'Ana', status: 'RIESGO' } as CourseStudent;
  const admin = signal(true);
  let http: HttpTestingController;
  beforeEach(() => {
    admin.set(true);
    TestBed.configureTestingModule({ imports: [CourseStudentsComponent], providers: [
      provideHttpClient(), provideHttpClientTesting(), { provide: TokenStorageService, useValue: { isAdmin: admin } },
    ] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); vi.restoreAllMocks(); });
  it('permite al administrador aplicar una transición válida y actualizar la vista', () => {
    const component = TestBed.createComponent(CourseStudentsComponent).componentInstance;
    const changed = vi.fn(); component.changed.subscribe(changed);
    component.updateStatus(student, 'ACTIVA');
    const request = http.expectOne(`${environment.apiUrl}/api/matriculas/enrollment/estado`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ estado: 'ACTIVA' });
    request.flush({}); expect(changed).toHaveBeenCalledOnce();
  });
  it('rechaza transiciones inválidas, usuarios no administradores y cancelaciones', () => {
    const component = TestBed.createComponent(CourseStudentsComponent).componentInstance;
    admin.set(false); component.updateStatus(student, 'ACTIVA');
    admin.set(true); component.updateStatus(student, 'RIESGO');
    vi.spyOn(globalThis, 'confirm').mockReturnValue(false);
    component.updateStatus(student, 'COMPLETADA');
    http.expectNone(() => true);
  });
});
