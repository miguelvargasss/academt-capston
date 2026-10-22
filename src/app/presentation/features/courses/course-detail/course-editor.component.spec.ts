import { TestBed } from '@angular/core/testing';
import {
  CourseWorkspace,
  CourseWeek,
  CourseResource,
  CourseSubmission,
} from '../../../../domain/models/course-workspace.model';
import { CourseEditorComponent } from './course-editor.component';

const week: CourseWeek = {
  id: 'week',
  unitId: 'unit',
  number: 1,
  title: 'Semana del curso',
  description: '',
  isCurrent: false,
  resources: [],
};
const workspace: CourseWorkspace = {
  course: {
    id: 'course',
    title: 'Curso del formulario',
    description: '',
    level: 'A2',
    status: 'ACTIVO',
    teacherId: 'teacher',
    teacherName: 'Docente',
    schedule: null,
    startsOn: null,
    endsOn: null,
    capacity: 10,
  },
  units: [{ id: 'unit', number: 1, title: 'Unidad', description: '', weeks: [week] }],
  students: [],
  announcements: [],
  submissions: [],
};

describe('Course resource and grade forms', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn();
  });

  it('requires a real material URL and preserves its file size when saving', () => {
    const fixture = TestBed.createComponent(CourseEditorComponent);
    fixture.componentRef.setInput('state', { mode: 'RESOURCE', week });
    fixture.componentRef.setInput('workspace', workspace);
    fixture.detectChanges();
    const editor = fixture.componentInstance;
    const saved = vi.fn();
    editor.saved.subscribe(saved);
    editor.form.patchValue({ title: 'Lectura' });
    editor.submit();
    expect(saved).not.toHaveBeenCalled();
    expect(editor.validationError()).toContain('enlace');
    editor.form.patchValue({ externalUrl: 'https://example.org/lectura', sizeMb: 2.75 });
    editor.submit();
    expect(saved).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'RESOURCE',
        command: expect.objectContaining({
          weekId: 'week',
          title: 'Lectura',
          externalUrl: 'https://example.org/lectura',
          sizeMb: 2.75,
        }),
      }),
    );
  });

  it('validates only the fields for the selected resource kind', () => {
    const fixture = TestBed.createComponent(CourseEditorComponent);
    fixture.componentRef.setInput('state', { mode: 'RESOURCE', week });
    fixture.componentRef.setInput('workspace', workspace);
    fixture.detectChanges();
    const editor = fixture.componentInstance;
    const saved = vi.fn();
    editor.saved.subscribe(saved);
    editor.form.patchValue({ title: 'Tarea', kind: 'CLASS', durationMinutes: -1 });
    editor.kindChanged();
    editor.submit();
    expect(saved).not.toHaveBeenCalled();
    editor.form.patchValue({ kind: 'TASK', maxScore: 20 });
    editor.kindChanged();
    editor.submit();
    expect(saved).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'RESOURCE',
        command: expect.objectContaining({ kind: 'TASK', maxScore: 20 }),
      }),
    );
  });

  it('accepts zero and rejects scores above the task maximum', () => {
    const task: CourseResource = {
      id: 'task',
      weekId: 'week',
      kind: 'TASK',
      title: 'Evaluación',
      description: '',
      maxScore: 20,
    };
    const submission: CourseSubmission = {
      id: 'submission',
      taskId: 'task',
      taskTitle: task.title,
      studentId: 'student',
      studentName: 'Alumna',
      fileUrl: null,
      submittedAt: null,
      grade: null,
      feedback: null,
      status: 'PENDIENTE',
    };
    const fixture = TestBed.createComponent(CourseEditorComponent);
    fixture.componentRef.setInput('state', { mode: 'GRADE', task, submission });
    fixture.componentRef.setInput('workspace', workspace);
    fixture.detectChanges();
    const editor = fixture.componentInstance;
    const saved = vi.fn();
    editor.saved.subscribe(saved);
    editor.form.patchValue({ grade: 21 });
    editor.submit();
    expect(saved).not.toHaveBeenCalled();
    editor.form.patchValue({ grade: 0 });
    editor.submit();
    expect(saved).toHaveBeenCalledWith({
      type: 'GRADE',
      command: { id: 'submission', grade: 0, feedback: '' },
    });
  });
});

describe('Adjuntos en anuncios y actividades', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn();
  });
  it('permite crear un anuncio sin imagen y conservar o quitar una imagen opcional', () => {
    const fixture = TestBed.createComponent(CourseEditorComponent);
    fixture.componentRef.setInput('state', { mode: 'ANNOUNCEMENT' });
    fixture.componentRef.setInput('workspace', workspace);
    fixture.detectChanges();
    const editor = fixture.componentInstance;
    const saved = vi.fn();
    editor.saved.subscribe(saved);
    editor.form.patchValue({ title: 'Aviso', body: '<p>Indicaciones</p>' });
    editor.submit();
    expect(saved).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'ANNOUNCEMENT',
        command: expect.objectContaining({ imageUrl: '' }),
      }),
    );
    editor.form.controls.imageUrl.setValue(
      'https://res.cloudinary.com/academy/image/authenticated/s--signed--/aviso.png',
    );
    editor.submit();
    expect(saved.mock.lastCall?.[0].command.imageUrl).toContain('aviso.png');
    editor.form.controls.imageUrl.setValue('');
    editor.submit();
    expect(saved.mock.lastCall?.[0].command.imageUrl).toBe('');
  });
  it('el archivo de una actividad se guarda como instrucciones, conservando el texto y puntaje', () => {
    const fixture = TestBed.createComponent(CourseEditorComponent);
    fixture.componentRef.setInput('state', { mode: 'RESOURCE', week });
    fixture.componentRef.setInput('workspace', workspace);
    fixture.detectChanges();
    const editor = fixture.componentInstance;
    const saved = vi.fn();
    editor.saved.subscribe(saved);
    editor.form.patchValue({
      kind: 'TASK',
      title: 'Comprensión',
      description: 'Resuelve los ejercicios',
      maxScore: 20,
    });
    editor.kindChanged();
    const url =
      'http://localhost:8080/api/cursos/11111111-1111-1111-1111-111111111111/archivos/22222222-2222-2222-2222-222222222222';
    editor.fileUploaded({
      id: 'stored',
      nombre: 'guia.pdf',
      mime: 'application/pdf',
      bytes: 300,
      url,
    });
    editor.submit();
    expect(saved).toHaveBeenCalledWith({
      type: 'RESOURCE',
      command: expect.objectContaining({
        kind: 'TASK',
        externalUrl: url,
        description: 'Resuelve los ejercicios',
        maxScore: 20,
      }),
    });
  });
});
