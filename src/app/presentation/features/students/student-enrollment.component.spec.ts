import { TestBed } from '@angular/core/testing';
import { Student, StudentCourse } from '../../../domain/models/student.model';
import { StudentEnrollmentComponent } from './student-enrollment.component';

const student: Student = {
  id: 'student', fullName: 'Ana Pérez', email: 'ana@example.test', phone: null, avatarUrl: null,
  status: 'ACTIVO', atRisk: false, createdAt: '2026-01-01',
  enrollments: [
    { id: 'e1', courseId: 'complete', status: 'COMPLETADA', finalGrade: 90 },
    { id: 'e2', courseId: 'withdrawn', status: 'ABANDONADA', finalGrade: null },
    { id: 'e3', courseId: 'active', status: 'ACTIVA', finalGrade: null },
  ],
};
const courses: StudentCourse[] = ['complete', 'withdrawn', 'active', 'new'].map((id) => ({
  id, title: id, level: 'A1', status: 'ACTIVO', capacity: 20, enrolled: 5,
}));

describe('Asignación de cursos con matrículas terminales', () => {
  beforeEach(() => { HTMLDialogElement.prototype.showModal = vi.fn(); });
  it('muestra y bloquea las matrículas completadas y retiradas', () => {
    const fixture = TestBed.createComponent(StudentEnrollmentComponent);
    fixture.componentRef.setInput('student', student); fixture.componentRef.setInput('courses', courses); fixture.detectChanges();
    const labels = [...fixture.nativeElement.querySelectorAll('.course-option')] as HTMLLabelElement[];
    const checkboxes = labels.map((label) => label.querySelector('input')!);
    expect(checkboxes[0].checked).toBe(true); expect(checkboxes[0].disabled).toBe(true); expect(labels[0].textContent).toContain('Completado');
    expect(checkboxes[1].checked).toBe(false); expect(checkboxes[1].disabled).toBe(true); expect(labels[1].textContent).toContain('Retirado');
    fixture.componentInstance.toggle('complete'); fixture.componentInstance.toggle('withdrawn');
    expect(fixture.componentInstance.selected().has('complete')).toBe(true);
    expect(fixture.componentInstance.selected().has('withdrawn')).toBe(false);
    fixture.componentInstance.toggle('active'); fixture.componentInstance.toggle('new');
    expect(fixture.componentInstance.added()).toBe(1); expect(fixture.componentInstance.removed()).toBe(1);
  });
});
