import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { ManageCourseUseCase } from '../../../../application/courses/manage-course.use-case';
import { CourseWorkspace } from '../../../../domain/models/course-workspace.model';
import { CourseDetailComponent } from './course-detail.component';

const emptyCourse: CourseWorkspace = {
  course: {
    id: 'course-id',
    title: 'Curso de integración',
    description: 'Descripción persistida',
    level: 'B2',
    status: 'ACTIVO',
    teacherId: 'teacher',
    teacherName: 'Docente Real',
    schedule: null,
    startsOn: null,
    endsOn: null,
    capacity: 8,
  },
  canManage: true,
  units: [],
  students: [],
  announcements: [],
  submissions: [],
};

describe('Teacher course screen', () => {
  const manage = { load: vi.fn(), saveUnit: vi.fn() };
  beforeEach(() => {
    manage.load.mockReset();
    manage.saveUnit.mockReset();
    manage.load.mockReturnValue(of(structuredClone(emptyCourse)));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'courses/:courseId', component: CourseDetailComponent }]),
        { provide: ManageCourseUseCase, useValue: manage },
      ],
    });
    // jsdom does not implement the native dialog; the production browser supplies its focus trap.
    HTMLDialogElement.prototype.showModal = vi.fn();
  });

  it('saves a unit and reloads persisted content rather than inserting a local placeholder', async () => {
    const updated = structuredClone(emptyCourse);
    updated.units = [
      { id: 'unit-id', number: 1, title: 'Unidad guardada', description: '', weeks: [] },
    ];
    manage.load
      .mockReturnValueOnce(of(structuredClone(emptyCourse)))
      .mockReturnValueOnce(of(updated));
    manage.saveUnit.mockReturnValue(of(undefined));
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/courses/course-id', CourseDetailComponent);
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      'Curso de integración',
    );
    const create = Array.from(harness.routeNativeElement!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Crear primer módulo'),
    )!;
    create.click();
    await harness.fixture.whenStable();
    const title = harness.routeNativeElement!.querySelector<HTMLInputElement>('input#title')!;
    title.value = 'Unidad guardada';
    title.dispatchEvent(new Event('input', { bubbles: true }));
    harness
      .routeNativeElement!.querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await harness.fixture.whenStable();
    expect(manage.saveUnit).toHaveBeenCalledWith({
      id: undefined,
      parentId: 'course-id',
      number: 1,
      title: 'Unidad guardada',
      description: '',
    });
    expect(manage.load).toHaveBeenCalledTimes(2);
    expect(harness.routeNativeElement!.textContent).toContain('Unidad guardada');
    expect(harness.routeNativeElement!.querySelector('dialog')).toBeNull();
  });

  it('renders exactly four course sections and opens persisted course content', async () => {
    const data = structuredClone(emptyCourse);
    data.units = [
      {
        id: 'unit',
        number: 1,
        title: 'Unidad',
        description: '',
        weeks: [
          {
            id: 'week',
            unitId: 'unit',
            number: 1,
            title: 'Semana real',
            description: '',
            isCurrent: false,
            resources: [
              {
                id: 'class',
                weekId: 'week',
                kind: 'CLASS',
                title: 'Conversación real',
                description: '',
                startsAt: '2026-11-02T15:00:00',
                durationMinutes: 35,
              },
            ],
          },
        ],
      },
    ];
    manage.load.mockReturnValue(of(data));
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/courses/course-id?tab=content', CourseDetailComponent);
    expect(harness.routeNativeElement!.querySelectorAll('.course-tabs a')).toHaveLength(4);
    expect(harness.routeNativeElement!.textContent).toContain('Conversación real');
    expect(
      harness.routeNativeElement!.querySelector('a[aria-current="page"]')?.textContent,
    ).toContain('Contenido');
  });

  it('receives remote course changes when returning to the window', async () => {
    const updated = structuredClone(emptyCourse);
    updated.units = [
      {
        id: 'remote-unit',
        number: 1,
        title: 'Módulo creado en otra sesión',
        description: '',
        weeks: [],
      },
    ];
    manage.load.mockReturnValueOnce(of(structuredClone(emptyCourse))).mockReturnValue(of(updated));
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/courses/course-id', CourseDetailComponent);
    window.dispatchEvent(new Event('focus'));
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement!.textContent).toContain('Módulo creado en otra sesión');
    visibility.mockRestore();
  });

  it('shows forbidden access as an error without fabricating an empty course', async () => {
    manage.load.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/courses/private', CourseDetailComponent);
    expect(harness.routeNativeElement!.querySelector('[role="alert"]')?.textContent).toContain(
      'No tienes permiso',
    );
    expect(harness.routeNativeElement!.querySelector('app-course-header')).toBeNull();
  });
});
