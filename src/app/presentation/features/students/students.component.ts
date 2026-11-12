import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subscription, timer } from 'rxjs';
import { ManageStudentsUseCase, StudentStatusUpdateError } from '../../../application/students/manage-students.use-case';
import {
  CreateStudentCommand,
  Student,
  StudentDirectory,
  UpdateStudentCommand,
  STUDENT_STATUS_LABELS,
} from '../../../domain/models/student.model';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { CourseIconComponent } from '../../shared/components/course-icon/course-icon.component';
import { DeleteConfirmModalComponent } from '../../shared/components/delete-confirm-modal/delete-confirm-modal.component';
import { StudentCreatedCardComponent } from './student-created-card.component';
import { StudentFormComponent } from './student-form.component';
import { StudentEnrollmentComponent } from './student-enrollment.component';
import { credentialsWhatsAppUrl, formatPhone } from './student-utils';
type StudentFilter = 'TODOS' | 'ACTIVO' | 'RIESGO' | 'INACTIVO' | 'SUSPENDIDO';
type Editor = { mode: 'CREATE' } | { mode: 'EDIT' | 'COURSES' | 'DELETE'; id: string };
@Component({
  selector: 'app-students',
  standalone: true,
  imports: [
    CommonModule,
    CourseIconComponent,
    StudentCreatedCardComponent,
    StudentFormComponent,
    StudentEnrollmentComponent,
    DeleteConfirmModalComponent,
  ],
  templateUrl: './students.component.html',
  styleUrl: './students.component.css',
})
export class StudentsComponent {
  private readonly manage = inject(ManageStudentsUseCase);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private loadSubscription?: Subscription;
  readonly directory = signal<StudentDirectory>({ students: [], courses: [] });
  readonly loading = signal(true);
  readonly loaded = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly busy = signal(false);
  readonly editor = signal<Editor | null>(null);
  readonly query = signal('');
  readonly filter = signal<StudentFilter>('TODOS');
  readonly removingIds = signal(new Set<string>());
  readonly createdCard = signal<{
    id: string;
    name: string;
    email: string;
    phone: string;
    whatsAppUrl: string;
  } | null>(null);
  readonly statusLabels = STUDENT_STATUS_LABELS;
  readonly formatPhone = formatPhone;
  readonly filters: { id: StudentFilter; label: string }[] = [
    { id: 'TODOS', label: 'Todos' },
    { id: 'ACTIVO', label: 'Activo' },
    { id: 'RIESGO', label: 'En riesgo' },
    { id: 'INACTIVO', label: 'Inactivo' },
    { id: 'SUSPENDIDO', label: 'Suspendido' },
  ];
  readonly target = computed(() => {
    const editor = this.editor();
    return editor && 'id' in editor
      ? (this.directory().students.find((s) => s.id === editor.id) ?? null)
      : null;
  });
  readonly total = computed(() => this.directory().students.length);
  readonly active = computed(
    () => this.directory().students.filter((s) => s.status === 'ACTIVO').length,
  );
  readonly atRisk = computed(
    () => this.directory().students.filter((s) => s.status === 'ACTIVO' && s.atRisk).length,
  );
  readonly filtered = computed(() => {
    const query = this.query().trim().toLocaleLowerCase();
    const filter = this.filter();
    return this.directory().students.filter((student) => {
      if (!`${student.fullName} ${student.email}`.toLocaleLowerCase().includes(query)) return false;
      switch (filter) {
        case 'TODOS':
          return true;
        case 'RIESGO':
          return student.status === 'ACTIVO' && student.atRisk;
        case 'ACTIVO':
          return student.status === 'ACTIVO' && !student.atRisk;
        default:
          return student.status === filter;
      }
    });
  });
  constructor() {
    this.load();
  }
  load(): void {
    this.loadSubscription?.unsubscribe();
    this.loading.set(true);
    this.loadError.set(null);
    this.loadSubscription = this.manage
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.directory.set(data);
          this.loaded.set(true);
          this.loading.set(false);
        },
        error: (error) => {
          if ([401, 403].includes(error.status)) {
            this.directory.set({ students: [], courses: [] });
            this.loaded.set(false);
            this.editor.set(null);
            this.createdCard.set(null);
          }
          this.loadError.set(apiErrorMessage(error, 'No se pudo cargar el directorio de alumnos.'));
          this.loading.set(false);
        },
      });
  }
  search(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }
  open(editor: Editor): void {
    if (this.busy()) return;
    this.actionError.set(null);
    this.notice.set(null);
    if ('id' in editor && editor.id === this.createdCard()?.id) this.createdCard.set(null);
    this.editor.set(editor);
  }
  close(): void {
    if (!this.busy()) {
      this.editor.set(null);
      this.actionError.set(null);
    }
  }
  initials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((v) => v[0])
      .join('')
      .toUpperCase();
  }
  avatar(value: string | null): string | null {
    try {
      const url = new URL(value ?? '');
      return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }
  enrolled(student: Student): number {
    return student.enrollments.filter((e) => e.status !== 'ABANDONADA').length;
  }
  courseNames(student: Student): string {
    return student.enrollments
      .filter((e) => e.status !== 'ABANDONADA')
      .map((e) => this.directory().courses.find((c) => c.id === e.courseId)?.title)
      .filter(Boolean)
      .join(', ');
  }
  create(command: CreateStudentCommand): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.actionError.set(null);
    this.manage
      .create(command)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (student) => {
          const origin = this.document.location?.origin ?? '';
          this.createdCard.set({
            id: student.id,
            name: student.fullName,
            email: student.email,
            phone: student.phone!,
            whatsAppUrl: credentialsWhatsAppUrl(
              student.fullName,
              student.email,
              student.phone!,
              `${origin}/login`,
            ),
          });
          this.busy.set(false);
          this.editor.set(null);
          this.notice.set('Alumno creado correctamente.');
          this.load();
        },
        error: (error) => {
          this.busy.set(false);
          this.actionError.set(apiErrorMessage(error, 'No se pudo crear el alumno.'));
        },
      });
  }
  update(command: UpdateStudentCommand): void {
    this.perform(this.manage.update(command), 'Datos del alumno actualizados.', true);
  }
  saveCourses(ids: string[]): void {
    const student = this.target();
    if (!student || this.busy()) return;
    this.busy.set(true);
    this.actionError.set(null);
    this.manage
      .saveCourses(student, ids)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (failures) => {
          this.busy.set(false);
          if (failures.length) {
            this.actionError.set(
              failures
                .map(
                  (f) =>
                    `${this.directory().courses.find((c) => c.id === f.id)?.title ?? 'Curso'}: ${apiErrorMessage(f.error, 'No se pudo actualizar la matrícula.')}`,
                )
                .join(' '),
            );
          } else {
            this.editor.set(null);
            this.notice.set('Matrículas actualizadas.');
          }
          this.load();
        },
        error: (error) => {
          this.busy.set(false);
          this.actionError.set(apiErrorMessage(error, 'No se pudieron actualizar las matrículas.'));
          this.load();
        },
      });
  }
  delete(): void {
    const student = this.target();
    if (!student || this.busy()) return;
    this.busy.set(true);
    this.actionError.set(null);
    this.manage
      .delete(student.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.editor.set(null);
          this.removingIds.update((ids) => new Set([...ids, student.id]));
          timer(220)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              this.directory.update((d) => ({
                ...d,
                students: d.students.filter((s) => s.id !== student.id),
              }));
              this.removingIds.update((ids) => {
                const next = new Set(ids);
                next.delete(student.id);
                return next;
              });
              this.busy.set(false);
              this.notice.set('Cuenta del alumno eliminada definitivamente.');
              this.load();
            });
        },
        error: (error) => {
          this.busy.set(false);
          this.actionError.set(apiErrorMessage(error, 'No se pudo eliminar el alumno.'));
        },
      });
  }
  private perform(request: Observable<unknown>, message: string, reloadOnError = false): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.actionError.set(null);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.busy.set(false);
        this.editor.set(null);
        this.notice.set(message);
        this.load();
      },
      error: (error) => {
        this.busy.set(false);
        this.actionError.set(error instanceof StudentStatusUpdateError
          ? error.message
          : apiErrorMessage(error, 'No se pudieron guardar los cambios.'));
        if (reloadOnError) this.load();
      },
    });
  }
}
