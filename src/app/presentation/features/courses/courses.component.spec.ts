import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { CoursesComponent } from './courses.component';
import { GetCoursesUseCase } from '../../../application/courses/get-courses.use-case';
import { CreateCourseUseCase } from '../../../application/courses/create-course.use-case';
import { TokenStorageService } from '../../../core/services/token-storage.service';
import { scheduleError } from '../../../domain/models/course-schedule.model';
describe('Structured course scheduling', () => {
  it('requires day, start/end times and course dates and sends structured data', () => {
    const create = { execute: vi.fn().mockReturnValue(new Subject()) };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: GetCoursesUseCase, useValue: { execute: () => of([]) } },
        { provide: CreateCourseUseCase, useValue: create },
        {
          provide: TokenStorageService,
          useValue: { currentUser: () => ({ id: 'teacher' }), userRole: () => 'DOCENTE' },
        },
      ],
    });
    const fixture = TestBed.createComponent(CoursesComponent);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    page.openCreateModal();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[formControlName="horario"]')).toBeNull();
    page.courseForm.patchValue({
      titulo: 'Curso con horario',
      fechaInicio: '2026-11-02',
      fechaFin: '2026-12-01',
    });
    page.onSubmitCreateCourse();
    expect(create.execute).not.toHaveBeenCalled();
    const choose = (selector: string, value: string, type: string) => {
      const field = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
      field.value = value;
      field.dispatchEvent(new Event(type, { bubbles: true }));
      fixture.detectChanges();
    };
    choose('app-course-schedule-fields select', 'MONDAY', 'change');
    choose(
      'app-course-schedule-fields input[aria-label="Hora de inicio de la sesión 1"]',
      '19:00',
      'input',
    );
    choose(
      'app-course-schedule-fields input[aria-label="Hora de fin de la sesión 1"]',
      '18:00',
      'input',
    );
    expect(page.courseForm.invalid).toBe(true);
    choose(
      'app-course-schedule-fields input[aria-label="Hora de fin de la sesión 1"]',
      '20:30',
      'input',
    );
    expect(page.courseForm.valid).toBe(true);
    page.onSubmitCreateCourse();
    expect(create.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        docenteId: 'teacher',
        fechaInicio: '2026-11-02',
        horarios: [{ dia: 'MONDAY', horaInicio: '19:00', horaFin: '20:30' }],
      }),
    );
    expect(create.execute.mock.calls[0][0]).not.toHaveProperty('horario');
  });
  it('rejects repeated overlapping sessions while allowing adjacent time slots', () => {
    expect(
      scheduleError([
        { day: 'MONDAY', startTime: '19:00', endTime: '20:00' },
        { day: 'MONDAY', startTime: '19:30', endTime: '21:00' },
      ]),
    ).toContain('superponerse');
    expect(
      scheduleError([
        { day: 'MONDAY', startTime: '19:00', endTime: '20:00' },
        { day: 'MONDAY', startTime: '20:00', endTime: '21:00' },
      ]),
    ).toBeNull();
  });
});
