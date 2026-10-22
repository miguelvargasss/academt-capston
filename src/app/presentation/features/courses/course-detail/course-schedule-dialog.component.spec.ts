import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ManageCourseUseCase } from '../../../../application/courses/manage-course.use-case';
import { CourseScheduleDialogComponent } from './course-schedule-dialog.component';
describe('Existing course schedule editor', () => {
  it('loads stored slots and saves a structured replacement for the same course', () => {
    HTMLDialogElement.prototype.showModal = vi.fn();
    const manage = {
      getSchedule: vi
        .fn()
        .mockReturnValue(
          of({
            startsOn: '2026-11-02',
            endsOn: '2026-12-01',
            slots: [{ day: 'MONDAY', startTime: '19:00', endTime: '20:00' }],
          }),
        ),
      saveSchedule: vi.fn().mockReturnValue(of(undefined)),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: ManageCourseUseCase, useValue: manage }],
    });
    const fixture = TestBed.createComponent(CourseScheduleDialogComponent);
    fixture.componentRef.setInput('courseId', 'existing-course');
    fixture.componentRef.setInput('title', 'Curso existente');
    fixture.detectChanges();
    expect(fixture.componentInstance.form.valid).toBe(true);
    expect(manage.getSchedule).toHaveBeenCalledWith('existing-course');
    fixture.componentInstance.form.controls.slots.setValue([
      { day: 'FRIDAY', startTime: '10:00', endTime: '11:30' },
    ]);
    fixture.detectChanges();
    const saved = vi.fn();
    fixture.componentInstance.saved.subscribe(saved);
    fixture.componentInstance.save();
    expect(manage.saveSchedule).toHaveBeenCalledWith('existing-course', {
      startsOn: '2026-11-02',
      endsOn: '2026-12-01',
      slots: [{ day: 'FRIDAY', startTime: '10:00', endTime: '11:30' }],
    });
    expect(saved).toHaveBeenCalled();
  });
});
