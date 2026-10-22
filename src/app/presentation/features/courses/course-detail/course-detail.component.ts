import {
  Component,
  DestroyRef,
  NgZone,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, catchError, combineLatest, of, startWith, switchMap } from 'rxjs';
import { ManageCourseUseCase } from '../../../../application/courses/manage-course.use-case';
import { apiErrorMessage } from '../../../../core/utils/api-error';
import {
  CourseWorkspace,
  CourseResource,
  CourseWeek,
  PublicationCommand,
  SaveAnnouncementCommand,
  SendSubmissionCommand,
} from '../../../../domain/models/course-workspace.model';
import {
  CourseEditorComponent,
  CourseEditorState,
  CourseEditorAction,
} from './course-editor.component';
import { CourseIconComponent } from '../../../shared/components/course-icon/course-icon.component';
import { CourseScheduleDialogComponent } from './course-schedule-dialog.component';
import { CourseHeaderComponent } from './course-header.component';
import { CourseMetricsComponent } from './course-metrics.component';
import { CourseContentComponent } from './sections/course-content.component';
import { CourseStudentsComponent } from './sections/course-students.component';
import { CourseAnnouncementsComponent } from './sections/course-announcements.component';
import { CourseGradebookComponent } from './sections/course-gradebook.component';
import { CourseResourceViewerComponent } from './course-resource-viewer.component';

type CourseTab = 'content' | 'students' | 'announcements' | 'grades';
@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CourseEditorComponent,
    CourseIconComponent,
    CourseHeaderComponent,
    CourseScheduleDialogComponent,
    CourseMetricsComponent,
    CourseContentComponent,
    CourseStudentsComponent,
    CourseAnnouncementsComponent,
    CourseGradebookComponent,
    CourseResourceViewerComponent,
  ],
  templateUrl: './course-detail.component.html',
  styleUrl: './course-detail.component.css',
})
export class CourseDetailComponent {
  private readonly manageCourse = inject(ManageCourseUseCase);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly refresh$ = new Subject<void>();
  readonly workspace = signal<CourseWorkspace | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly busy = signal(false);
  readonly scheduleEditor = signal(false);
  readonly editor = signal<CourseEditorState | null>(null);
  readonly selectedResourceId = signal<string | null>(null);
  readonly tab = signal<CourseTab>('content');
  readonly canManage = computed(() => this.workspace()?.canManage === true);
  readonly tabs = computed(() => [
    { id: 'content', label: 'Contenido' },
    { id: 'students', label: 'Alumnos' },
    { id: 'announcements', label: 'Anuncios' },
    { id: 'grades', label: 'Calificaciones' },
  ]);
  readonly selectedResource = computed(
    () =>
      this.workspace()
        ?.units.flatMap((u) => u.weeks.flatMap((w) => w.resources))
        .find((r) => r.id === this.selectedResourceId()) ?? null,
  );
  readonly selectedSubmission = computed(() =>
    this.canManage()
      ? null
      : (this.workspace()?.submissions.find((s) => s.taskId === this.selectedResourceId()) ?? null),
  );
  readonly selectedCompleted = computed(
    () =>
      this.workspace()?.completedResourceIds?.includes(this.selectedResourceId() ?? '') ?? false,
  );
  constructor() {
    const zone = inject(NgZone);
    afterNextRender(() =>
      zone.runOutsideAngular(() => {
        const synchronize = () => {
          if (
            document.visibilityState === 'visible' &&
            this.workspace() &&
            !this.loading() &&
            !this.busy() &&
            !this.editor() &&
            !this.scheduleEditor()
          )
            this.refresh();
        };
        const timer = window.setInterval(synchronize, 20000);
        window.addEventListener('focus', synchronize);
        this.destroyRef.onDestroy(() => {
          window.clearInterval(timer);
          window.removeEventListener('focus', synchronize);
        });
      }),
    );
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const value = params.get('tab');
      this.tab.set(this.tabs().some((t) => t.id === value) ? (value as CourseTab) : 'content');
    });
    combineLatest([this.route.paramMap, this.refresh$.pipe(startWith(undefined))])
      .pipe(
        switchMap(([params]) => {
          this.loading.set(true);
          this.loadError.set(null);
          const id = params.get('courseId');
          if (this.workspace()?.course.id !== id) {
            this.workspace.set(null);
            this.selectedResourceId.set(null);
            this.editor.set(null);
            this.scheduleEditor.set(false);
          }
          return this.manageCourse.load(id ?? '').pipe(
            catchError((error) => {
              this.loadError.set(
                apiErrorMessage(error, 'No se pudo cargar el curso. Inténtalo de nuevo.'),
              );
              if ([401, 403, 404].includes(error.status)) {
                this.workspace.set(null);
                this.selectedResourceId.set(null);
                this.editor.set(null);
                this.scheduleEditor.set(false);
              }
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((data) => {
        if (data) this.workspace.set(data);
        this.loading.set(false);
      });
  }
  refresh(): void {
    if (!this.busy()) this.refresh$.next();
  }
  selectContent(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: 'content' },
      queryParamsHandling: 'merge',
    });
  }
  open(state: CourseEditorState): void {
    if (this.canManage() && !this.busy()) {
      this.actionError.set(null);
      this.notice.set(null);
      this.editor.set(state);
    }
  }
  view(resource: CourseResource): void {
    this.actionError.set(null);
    this.selectedResourceId.set(resource.id);
  }
  closeViewer(): void {
    if (!this.busy()) {
      this.selectedResourceId.set(null);
      this.actionError.set(null);
    }
  }
  closeEditor(): void {
    if (!this.busy()) {
      this.editor.set(null);
      this.actionError.set(null);
    }
  }
  save(action: CourseEditorAction): void {
    if (!this.canManage()) return;
    let request: Observable<void>;
    switch (action.type) {
      case 'UNIT':
        request = this.manageCourse.saveUnit(action.command);
        break;
      case 'WEEK':
        request = this.manageCourse.saveWeek(action.command);
        break;
      case 'RESOURCE':
        request = this.manageCourse.saveResource(action.command);
        break;
      case 'ANNOUNCEMENT':
        request = this.manageCourse.saveAnnouncement(action.command);
        break;
      case 'GRADE':
        request = this.manageCourse.grade(action.command);
        break;
      case 'SUBMISSION':
        request = this.manageCourse.registerSubmission(action.command);
        break;
      case 'REMOVE_STUDENT':
        request = this.manageCourse.removeStudent(this.workspace()!.course.id, action.studentId);
        break;
      case 'DELETE':
        request = this.manageCourse.delete(action.kind, action.id);
        break;
    }
    this.perform(
      request,
      action.type === 'REMOVE_STUDENT'
        ? 'Alumno retirado. Su historial se conserva.'
        : action.type === 'DELETE'
          ? 'Recurso eliminado.'
          : 'Cambios guardados.',
    );
  }
  publish(command: PublicationCommand): void {
    if (this.canManage())
      this.perform(
        this.manageCourse.setPublication(command),
        'Disponibilidad del recurso actualizada.',
      );
  }
  saveAnnouncement(command: SaveAnnouncementCommand): void {
    if (this.canManage())
      this.perform(this.manageCourse.saveAnnouncement(command), 'Anuncio actualizado.');
  }
  markCurrentWeek(week: CourseWeek): void {
    if (this.canManage())
      this.perform(this.manageCourse.markCurrentWeek(week.id), 'Semana actualizada.');
  }
  complete(resource: CourseResource): void {
    if (!this.canManage())
      this.perform(
        this.manageCourse.completeResource(this.workspace()!.course.id, resource.kind, resource.id),
        'Recurso marcado como revisado.',
      );
  }
  send(command: SendSubmissionCommand): void {
    if (!this.canManage())
      this.perform(this.manageCourse.sendSubmission(command), 'Entrega enviada correctamente.');
  }
  private perform(request: Observable<void>, message: string): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.actionError.set(null);
    this.notice.set(null);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.busy.set(false);
        this.editor.set(null);
        this.notice.set(message);
        this.refresh$.next();
      },
      error: (error) => {
        this.busy.set(false);
        this.actionError.set(
          apiErrorMessage(error, 'No se pudieron guardar los cambios. Inténtalo de nuevo.'),
        );
      },
    });
  }
}
