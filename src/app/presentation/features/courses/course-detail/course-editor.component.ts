import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  FileUploadComponent,
  UploadedFile,
} from '../../../shared/components/file-upload/file-upload.component';
import { FileAttachmentComponent } from '../../../shared/components/file-attachment/file-attachment.component';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  CourseWorkspace,
  CourseUnit,
  CourseWeek,
  CourseResource,
  CourseAnnouncement,
  CourseSubmission,
  ResourceKind,
  MaterialType,
  DeletableResource,
  SaveStructureCommand,
  SaveResourceCommand,
  SaveAnnouncementCommand,
  GradeCommand,
  RegisterSubmissionCommand,
  CourseStudent,
  ActivityType,
} from '../../../../domain/models/course-workspace.model';
import { RichTextEditorComponent } from '../../../shared/components/rich-text-editor/rich-text-editor.component';

export type CourseEditorState =
  | { mode: 'UNIT'; unit?: CourseUnit }
  | { mode: 'WEEK'; unit: CourseUnit; week?: CourseWeek }
  | { mode: 'RESOURCE'; week: CourseWeek; resource?: CourseResource }
  | { mode: 'ANNOUNCEMENT'; announcement?: CourseAnnouncement }
  | { mode: 'GRADE'; submission: CourseSubmission; task: CourseResource }
  | { mode: 'SUBMISSION' }
  | { mode: 'REMOVE_STUDENT'; student: CourseStudent }
  | { mode: 'DELETE'; kind: DeletableResource; id: string; title: string };

export type CourseEditorAction =
  | { type: 'UNIT' | 'WEEK'; command: SaveStructureCommand }
  | { type: 'RESOURCE'; command: SaveResourceCommand }
  | { type: 'ANNOUNCEMENT'; command: SaveAnnouncementCommand }
  | { type: 'GRADE'; command: GradeCommand }
  | { type: 'SUBMISSION'; command: RegisterSubmissionCommand }
  | { type: 'REMOVE_STUDENT'; studentId: string }
  | { type: 'DELETE'; kind: DeletableResource; id: string };

const nonBlank = (control: AbstractControl) =>
  typeof control.value === 'string' && !control.value.trim() ? { required: true } : null;
const webUrl = (control: AbstractControl) => {
  if (!control.value?.trim()) return null;
  try {
    const u = new URL(control.value.trim());
    return ['http:', 'https:'].includes(u.protocol) ? null : { url: true };
  } catch {
    return { url: true };
  }
};

@Component({
  selector: 'app-course-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RichTextEditorComponent,
    FileUploadComponent,
    FileAttachmentComponent,
  ],
  templateUrl: './course-editor.component.html',
  styleUrl: './course-editor.component.css',
})
export class CourseEditorComponent implements OnInit, AfterViewInit {
  readonly state = input.required<CourseEditorState>();
  readonly workspace = input.required<CourseWorkspace>();
  readonly busy = input(false);
  readonly error = input<string | null>(null);
  readonly saved = output<CourseEditorAction>();
  readonly closed = output<void>();
  readonly uploading = signal(false);
  readonly validationError = signal<string | null>(null);
  @ViewChild('dialog') private dialog!: ElementRef<HTMLDialogElement>;
  private readonly fb = inject(FormBuilder);
  readonly form = this.fb.nonNullable.group({
    title: ['', [nonBlank, Validators.maxLength(200)]],
    description: ['', Validators.maxLength(5000)],
    number: this.fb.control<number | null>(null),
    kind: this.fb.nonNullable.control<ResourceKind>('MATERIAL'),
    materialType: this.fb.nonNullable.control<MaterialType>('ENLACE'),
    sizeMb: this.fb.control<number | null>(null, Validators.min(0)),
    fileUrl: ['', [Validators.maxLength(500), webUrl]],
    externalUrl: ['', [Validators.maxLength(500), webUrl]],
    recordingUrl: ['', [Validators.maxLength(500), webUrl]],
    startsAt: [''],
    durationMinutes: this.fb.control<number | null>(null, [Validators.min(1), Validators.max(600)]),
    room: ['', Validators.maxLength(100)],
    dueAt: [''],
    maxScore: this.fb.control<number | null>(null),
    body: [''],
    imageUrl: ['', [Validators.maxLength(500), webUrl]],
    grade: this.fb.control<number | null>(null),
    feedback: ['', Validators.maxLength(2000)],
    taskId: [''],
    studentId: [''],
    activityType: this.fb.nonNullable.control<ActivityType>('TAREA'),
    published: [false],
    visible: [true],
    pinned: [false],
  });
  readonly materialTypes: MaterialType[] = [
    'PDF',
    'AUDIO',
    'VIDEO',
    'ENLACE',
    'DOCUMENTO',
    'IMAGEN',
  ];

  ngOnInit(): void {
    const state = this.state();
    if (state.mode === 'UNIT' || state.mode === 'WEEK') {
      const item = state.mode === 'UNIT' ? state.unit : state.week;
      const existing = state.mode === 'UNIT' ? this.workspace().units : state.unit.weeks;
      this.form.patchValue({
        title: item?.title ?? '',
        description: item?.description ?? '',
        number: item?.number ?? Math.max(0, ...existing.map((i) => i.number)) + 1,
      });
      if (!item)
        this.form.controls.number.setValidators([
          Validators.required,
          Validators.min(1),
          Validators.pattern(/^\d+$/),
        ]);
    }
    if (state.mode === 'RESOURCE') {
      const r = state.resource;
      if (r) {
        this.form.patchValue({
          ...r,
          materialType: r.materialType ?? 'ENLACE',
          fileUrl: r.fileUrl ?? '',
          sizeMb: r.sizeMb ?? null,
          externalUrl: r.externalUrl ?? '',
          recordingUrl: r.recordingUrl ?? '',
          startsAt: r.startsAt?.slice(0, 16) ?? '',
          durationMinutes: r.durationMinutes ?? null,
          room: r.room ?? '',
          dueAt: r.dueAt?.slice(0, 16) ?? '',
          maxScore: r.maxScore ?? null,
          activityType: r.activityType ?? 'TAREA',
          published: r.published === true,
          visible: r.visible !== false,
        });
        this.form.controls.kind.disable();
      }
      this.updateResourceValidators();
    }
    if (state.mode === 'ANNOUNCEMENT') {
      this.form.patchValue({
        title: state.announcement?.title ?? '',
        body: state.announcement?.body ?? '',
        imageUrl: state.announcement?.imageUrl ?? '',
        published: state.announcement?.published === true,
        pinned: state.announcement?.pinned === true,
      });
      this.form.controls.body.setValidators(nonBlank);
    }
    if (['GRADE', 'SUBMISSION', 'DELETE', 'REMOVE_STUDENT'].includes(state.mode))
      this.form.controls.title.clearValidators();
    if (state.mode === 'GRADE') {
      this.form.patchValue({
        grade: state.submission.grade,
        feedback: state.submission.feedback ?? '',
      });
      this.form.controls.grade.setValidators([
        Validators.required,
        Validators.min(0),
        Validators.max(state.task.maxScore!),
      ]);
    }
    if (state.mode === 'SUBMISSION') {
      this.form.controls.taskId.setValidators(Validators.required);
      this.form.controls.studentId.setValidators(Validators.required);
    }
    for (const control of Object.values(this.form.controls)) control.updateValueAndValidity();
  }

  ngAfterViewInit(): void {
    this.dialog.nativeElement.showModal();
  }
  cancel(event?: Event): void {
    event?.preventDefault();
    if (!this.busy() && !this.uploading()) this.closed.emit();
  }
  backdrop(event: MouseEvent): void {
    if (event.target === this.dialog.nativeElement) this.cancel();
  }
  kindChanged(): void {
    this.updateResourceValidators();
    this.validationError.set(null);
  }
  private updateResourceValidators(): void {
    const kind = this.form.controls.kind.value;
    for (const name of ['startsAt', 'durationMinutes', 'room', 'recordingUrl'] as const) {
      kind === 'CLASS' ? this.form.controls[name].enable() : this.form.controls[name].disable();
    }
    kind === 'MATERIAL'
      ? this.form.controls.fileUrl.enable()
      : this.form.controls.fileUrl.disable();
    kind === 'MATERIAL' ? this.form.controls.sizeMb.enable() : this.form.controls.sizeMb.disable();
    kind === 'TASK' ? this.form.controls.dueAt.enable() : this.form.controls.dueAt.disable();
    this.form.controls.maxScore.setValidators(
      this.form.controls.kind.value === 'TASK'
        ? [
            Validators.required,
            Validators.min(1),
            Validators.max(1000),
            Validators.pattern(/^\d+$/),
          ]
        : [],
    );
    this.form.controls.maxScore.updateValueAndValidity();
  }

  get title(): string {
    const s = this.state();
    switch (s.mode) {
      case 'UNIT':
        return s.unit ? 'Editar unidad' : 'Nueva unidad';
      case 'WEEK':
        return s.week ? 'Editar semana' : 'Nueva semana';
      case 'RESOURCE':
        return s.resource ? 'Editar recurso' : 'Agregar recurso';
      case 'ANNOUNCEMENT':
        return s.announcement ? 'Editar anuncio' : 'Nuevo anuncio';
      case 'GRADE':
        return 'Calificar entrega';
      case 'SUBMISSION':
        return 'Registrar entrega';
      case 'DELETE':
        return 'Eliminar recurso';
      case 'REMOVE_STUDENT':
        return 'Retirar alumno del curso';
    }
  }
  get subtitle(): string {
    const s = this.state();
    if (s.mode === 'WEEK') return s.unit.title;
    if (s.mode === 'RESOURCE') return s.week.title;
    if (s.mode === 'GRADE') return `${s.submission.studentName} · ${s.task.title}`;
    return this.workspace().course.title;
  }
  get isNewStructure(): boolean {
    const s = this.state();
    return (s.mode === 'UNIT' && !s.unit) || (s.mode === 'WEEK' && !s.week);
  }
  get tasks(): CourseResource[] {
    return this.workspace().units.flatMap((u) =>
      u.weeks.flatMap((w) => w.resources.filter((r) => r.kind === 'TASK')),
    );
  }
  get eligibleStudents() {
    return this.workspace().students.filter(
      (s) =>
        ['ACTIVA', 'RIESGO'].includes(s.status) &&
        !this.workspace().submissions.some(
          (e) => e.taskId === this.form.controls.taskId.value && e.studentId === s.id,
        ),
    );
  }
  get scoreLimit(): number | null {
    const s = this.state();
    return s.mode === 'GRADE' ? (s.task.maxScore ?? null) : null;
  }
  get deletionTitle(): string {
    const s = this.state();
    return s.mode === 'DELETE' ? s.title : '';
  }
  get removalName(): string {
    const s = this.state();
    return s.mode === 'REMOVE_STUDENT' ? s.student.name : '';
  }
  get reviewSubmission(): CourseSubmission | null {
    const s = this.state();
    return s.mode === 'GRADE' ? s.submission : null;
  }
  get reviewUrl(): string | null {
    const url = this.reviewSubmission?.fileUrl;
    try {
      const value = new URL(url ?? '');
      return ['https:', 'http:'].includes(value.protocol) ? value.href : null;
    } catch {
      return null;
    }
  }

  fileUploaded(file: UploadedFile): void {
    const materialType: MaterialType = file.mime.startsWith('image/')
      ? 'IMAGEN'
      : file.mime === 'application/pdf'
        ? 'PDF'
        : 'DOCUMENTO';
    if (this.form.controls.kind.value === 'TASK') {
      this.form.controls.externalUrl.setValue(file.url);
      this.validationError.set(null);
      return;
    }
    this.form.patchValue({
      fileUrl: file.url,
      sizeMb: Math.round(file.bytes / 10485.76) / 100,
      materialType,
    });
    this.validationError.set(null);
  }

  submit(): void {
    if (this.busy() || this.uploading()) return;
    this.form.markAllAsTouched();
    this.validationError.set(null);
    if (this.form.invalid) {
      this.validationError.set(
        'Revisa los campos obligatorios, los límites numéricos y los enlaces. Las direcciones deben comenzar por https:// o http://.',
      );
      return;
    }
    const s = this.state();
    const v = this.form.getRawValue();
    const nullable = (value: string) => value.trim() || null;
    switch (s.mode) {
      case 'UNIT':
        this.saved.emit({
          type: 'UNIT',
          command: {
            id: s.unit?.id,
            parentId: this.workspace().course.id,
            number: v.number!,
            title: v.title.trim(),
            description: v.description.trim(),
          },
        });
        break;
      case 'WEEK':
        this.saved.emit({
          type: 'WEEK',
          command: {
            id: s.week?.id,
            parentId: s.unit.id,
            number: v.number!,
            title: v.title.trim(),
            description: v.description.trim(),
          },
        });
        break;
      case 'RESOURCE':
        if (v.kind === 'MATERIAL' && !nullable(v.fileUrl) && !nullable(v.externalUrl)) {
          this.validationError.set('Añade el enlace del material o la URL del archivo.');
          return;
        }
        this.saved.emit({
          type: 'RESOURCE',
          command: {
            id: s.resource?.id,
            courseId: this.workspace().course.id,
            weekId: s.week.id,
            kind: v.kind,
            title: v.title.trim(),
            description: v.description.trim(),
            materialType: v.materialType,
            sizeMb: v.sizeMb,
            fileUrl: nullable(v.fileUrl),
            externalUrl: nullable(v.externalUrl),
            recordingUrl: nullable(v.recordingUrl),
            startsAt: nullable(v.startsAt),
            durationMinutes: v.durationMinutes,
            room: nullable(v.room),
            dueAt: nullable(v.dueAt),
            maxScore: v.maxScore,
            activityType: v.activityType,
            published: v.published,
            visible: v.visible,
          },
        });
        break;
      case 'ANNOUNCEMENT':
        this.saved.emit({
          type: 'ANNOUNCEMENT',
          command: {
            id: s.announcement?.id,
            courseId: this.workspace().course.id,
            title: v.title.trim(),
            body: v.body.trim(),
            imageUrl: v.imageUrl.trim(),
            published: v.published,
            pinned: v.pinned,
          },
        });
        break;
      case 'GRADE':
        this.saved.emit({
          type: 'GRADE',
          command: { id: s.submission.id, grade: v.grade!, feedback: v.feedback.trim() },
        });
        break;
      case 'SUBMISSION':
        this.saved.emit({
          type: 'SUBMISSION',
          command: { taskId: v.taskId, studentId: v.studentId, fileUrl: nullable(v.fileUrl) },
        });
        break;
      case 'DELETE':
        this.saved.emit({ type: 'DELETE', kind: s.kind, id: s.id });
        break;
      case 'REMOVE_STUDENT':
        this.saved.emit({ type: 'REMOVE_STUDENT', studentId: s.student.id });
        break;
    }
  }
}
