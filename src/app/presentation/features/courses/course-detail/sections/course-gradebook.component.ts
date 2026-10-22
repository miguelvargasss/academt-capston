import { Component, computed, input, output, signal } from '@angular/core';
import { FileAttachmentComponent } from '../../../../shared/components/file-attachment/file-attachment.component';
import { CommonModule } from '@angular/common';
import {
  CourseWorkspace,
  CourseStudent,
  CourseResource,
  CourseSubmission,
} from '../../../../../domain/models/course-workspace.model';
import { CourseIconComponent } from '../../../../shared/components/course-icon/course-icon.component';
import { CourseEditorState } from '../course-editor.component';
import { courseTimestamp } from '../../../../../core/utils/course-date';

@Component({
  selector: 'app-course-gradebook',
  standalone: true,
  imports: [CommonModule, CourseIconComponent, FileAttachmentComponent],
  templateUrl: './course-gradebook.component.html',
  styleUrls: ['../course-section.css', './course-gradebook.component.css'],
})
export class CourseGradebookComponent {
  readonly workspace = input.required<CourseWorkspace>();
  readonly busy = input(false);
  readonly edit = output<CourseEditorState>();
  readonly view = output<CourseResource>();
  readonly contentRequested = output<void>();
  readonly query = signal('');
  readonly activityId = signal('ALL');
  readonly showWithdrawn = signal(false);
  readonly canManage = computed(() => this.workspace().canManage === true);
  readonly tasks = computed(() =>
    this.workspace().units.flatMap((u) =>
      u.weeks.flatMap((w) => w.resources.filter((r) => r.kind === 'TASK')),
    ),
  );
  readonly visibleTasks = computed(() =>
    this.tasks().filter((t) => this.activityId() === 'ALL' || t.id === this.activityId()),
  );
  readonly students = computed(() =>
    this.workspace().students.filter(
      (s) =>
        (this.showWithdrawn() || s.status !== 'ABANDONADA') &&
        `${s.name} ${s.email}`
          .toLocaleLowerCase()
          .includes(this.query().trim().toLocaleLowerCase()),
    ),
  );
  readonly submissionIndex = computed(
    () => new Map(this.workspace().submissions.map((s) => [`${s.studentId}:${s.taskId}`, s])),
  );
  readonly graded = computed(
    () => this.workspace().submissions.filter((s) => s.status === 'CALIFICADA').length,
  );
  readonly totalExpected = computed(
    () =>
      this.workspace().students.filter((s) => s.status !== 'ABANDONADA').length *
      this.tasks().filter((t) => t.published && t.visible).length,
  );
  readonly pending = computed(() => Math.max(0, this.totalExpected() - this.graded()));
  search(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }
  selectActivity(event: Event): void {
    this.activityId.set((event.target as HTMLSelectElement).value);
  }
  submission(student: CourseStudent, task: CourseResource): CourseSubmission | null {
    return this.submissionIndex().get(`${student.id}:${task.id}`) ?? null;
  }
  ownSubmission(task: CourseResource): CourseSubmission | null {
    return this.workspace().submissions.find((s) => s.taskId === task.id) ?? null;
  }
  status(task: CourseResource, submission: CourseSubmission | null): string {
    if (submission?.status === 'CALIFICADA') return 'Calificado';
    if (submission) return submission.isLate ? 'Entrega tardía' : 'Por calificar';
    if (!task.published || !task.visible) return 'Sin publicar';
    return courseTimestamp(task.dueAt) < Date.now() ? 'Vencido' : 'Sin entregar';
  }
  review(task: CourseResource, submission: CourseSubmission | null): void {
    if (submission) this.edit.emit({ mode: 'GRADE', task, submission });
  }
  safeUrl(url: string | null | undefined): string | null {
    try {
      const u = new URL(url ?? '');
      return ['https:', 'http:'].includes(u.protocol) ? u.href : null;
    } catch {
      return null;
    }
  }
}
