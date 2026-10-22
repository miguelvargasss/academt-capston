import { TestBed } from '@angular/core/testing';
import { CourseGradebookComponent } from './sections/course-gradebook.component';
import { CourseResourceViewerComponent } from './course-resource-viewer.component';
import { CourseWorkspace, CourseResource } from '../../../../domain/models/course-workspace.model';

const task: CourseResource = {
  id: 'task',
  weekId: 'week',
  kind: 'TASK',
  title: 'Evaluación persistida',
  description: 'Responde',
  maxScore: 20,
  dueAt: '2020-01-01T12:00:00',
  published: true,
  visible: true,
};
const data: CourseWorkspace = {
  course: {
    id: 'course',
    title: 'Curso',
    description: '',
    teacherId: 'teacher',
    teacherName: 'Ana',
    level: 'B1',
    status: 'ACTIVO',
    capacity: 10,
    schedule: null,
    startsOn: null,
    endsOn: null,
  },
  canManage: true,
  units: [
    {
      id: 'unit',
      number: 1,
      title: 'Módulo',
      description: '',
      weeks: [
        {
          id: 'week',
          unitId: 'unit',
          number: 1,
          title: 'Semana',
          description: '',
          isCurrent: true,
          resources: [task],
        },
      ],
    },
  ],
  students: [
    {
      id: 'student-a',
      enrollmentId: 'ea',
      name: 'Alumno Con Entrega',
      email: 'a@example.org',
      status: 'ACTIVA',
      grade: 75,
      attendance: null,
      enrolledAt: '2026-01-01',
    },
    {
      id: 'student-b',
      enrollmentId: 'eb',
      name: 'Alumno Sin Entrega',
      email: 'b@example.org',
      status: 'ACTIVA',
      grade: null,
      attendance: null,
      enrolledAt: '2026-01-01',
    },
  ],
  announcements: [],
  submissions: [
    {
      id: 'submission',
      taskId: 'task',
      taskTitle: task.title,
      studentId: 'student-a',
      studentName: 'Alumno Con Entrega',
      fileUrl: null,
      textContent: 'Respuesta',
      submittedAt: '2026-01-01T12:00:00',
      grade: 15,
      feedback: 'Completar argumento',
      status: 'CALIFICADA',
    },
  ],
};
describe('Course learning flow', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn();
  });
  it('includes missing submissions in the grade matrix and opens the actual graded work', () => {
    const fixture = TestBed.createComponent(CourseGradebookComponent);
    fixture.componentRef.setInput('workspace', structuredClone(data));
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[1].textContent).toContain('Vencido');
    expect(rows[1].querySelector('button').disabled).toBe(true);
    expect(rows[0].textContent).toContain('15');
    const emitted = vi.fn();
    fixture.componentInstance.edit.subscribe(emitted);
    rows[0].querySelector('button').click();
    expect(emitted).toHaveBeenCalledWith({ mode: 'GRADE', task, submission: data.submissions[0] });
  });
  it('renders student grades without management actions', () => {
    const fixture = TestBed.createComponent(CourseGradebookComponent);
    fixture.componentRef.setInput('workspace', { ...structuredClone(data), canManage: false });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Mis calificaciones');
    expect(fixture.nativeElement.textContent).toContain('Completar argumento');
    expect(fixture.nativeElement.querySelector('.gradebook')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Registrar entrega');
  });
  it('accepts text submissions, rejects empty work and blocks replacing graded work', () => {
    const fixture = TestBed.createComponent(CourseResourceViewerComponent);
    fixture.componentRef.setInput('resource', task);
    fixture.detectChanges();
    const send = vi.fn();
    fixture.componentInstance.send.subscribe(send);
    fixture.componentInstance.submit();
    expect(send).not.toHaveBeenCalled();
    fixture.componentInstance.form.patchValue({ textContent: '  Mi respuesta  ' });
    fixture.componentInstance.submit();
    expect(send).toHaveBeenCalledWith({
      taskId: 'task',
      fileUrl: null,
      textContent: 'Mi respuesta',
    });
    send.mockClear();
    fixture.componentRef.setInput('submission', data.submissions[0]);
    fixture.detectChanges();
    fixture.componentInstance.submit();
    expect(send).not.toHaveBeenCalled();
  });
  it('only embeds constructed video-provider URLs and keeps arbitrary HTML out of iframes', () => {
    const fixture = TestBed.createComponent(CourseResourceViewerComponent);
    fixture.componentRef.setInput('resource', {
      ...task,
      kind: 'MATERIAL',
      materialType: 'VIDEO',
      externalUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('iframe')?.getAttribute('src')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    );
    fixture.componentRef.setInput('resource', {
      ...task,
      kind: 'MATERIAL',
      materialType: 'PDF',
      externalUrl: 'https://youtube.com.attacker.invalid/file.html',
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
    expect(fixture.componentInstance.safeUrl('javascript:alert(1)')).toBeNull();
  });
  it('muestra datos reales del resumen y abre un espacio de entrega sin inventar intentos', () => {
    const fixture = TestBed.createComponent(CourseResourceViewerComponent);
    fixture.componentRef.setInput('resource', {
      ...task,
      title: 'Mi actividad real',
      maxScore: 35,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Mi actividad real');
    expect(fixture.nativeElement.querySelector('.maximum-score').textContent).toContain('35');
    expect(fixture.nativeElement.textContent).toContain('Sin entregar');
    expect(fixture.nativeElement.textContent).not.toContain('intentos restantes');
    expect(fixture.nativeElement.querySelector('textarea')).toBeNull();
    fixture.nativeElement.querySelector('.prepare-btn').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('textarea')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('entrega tardía');
    fixture.componentInstance.form.controls.textContent.setValue(
      'Una respuesta con cinco palabras',
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.word-count').textContent).toContain('5 palabras');
    expect(fixture.nativeElement.querySelector('button[form="activity-answer"]').disabled).toBe(
      false,
    );
  });
});
