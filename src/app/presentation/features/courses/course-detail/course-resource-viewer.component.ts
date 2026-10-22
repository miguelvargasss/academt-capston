import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FileUploadComponent } from '../../../shared/components/file-upload/file-upload.component';
import { FileAttachmentComponent } from '../../../shared/components/file-attachment/file-attachment.component';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  CourseResource,
  CourseSubmission,
  SendSubmissionCommand,
} from '../../../../domain/models/course-workspace.model';
import { CourseIconComponent } from '../../../shared/components/course-icon/course-icon.component';
import { courseTimestamp } from '../../../../core/utils/course-date';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-course-resource-viewer',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CourseIconComponent,
    FileUploadComponent,
    FileAttachmentComponent,
  ],
  templateUrl: './course-resource-viewer.component.html',
  styleUrls: ['./course-section.css', './course-resource-viewer.component.css', './course-activity-viewer.css'],
})
export class CourseResourceViewerComponent implements OnInit, AfterViewInit {
  readonly courseId = input('');
  readonly uploading = signal(false);
  readonly resource = input.required<CourseResource>();
  readonly submission = input<CourseSubmission | null>(null);
  readonly canManage = input(false);
  readonly completed = input(false);
  readonly busy = input(false);
  readonly error = input<string | null>(null);
  readonly closed = output<void>();
  readonly complete = output<CourseResource>();
  readonly send = output<SendSubmissionCommand>();
  readonly validationError = signal<string | null>(null);
  readonly activityView = signal<'SUMMARY' | 'WORKSPACE'>('SUMMARY');
  private readonly now = signal(Date.now());
  @ViewChild('viewer') private dialog!: ElementRef<HTMLDialogElement>;
  private readonly sanitizer = inject(DomSanitizer);
  private readonly fb = inject(FormBuilder);
  readonly form = this.fb.nonNullable.group({
    fileUrl: ['', Validators.maxLength(500)],
    textContent: ['', Validators.maxLength(20000)],
  });
  private readonly answer = toSignal(this.form.controls.textContent.valueChanges, {
    initialValue: '',
  });
  readonly wordCount = computed(() => this.answer().trim().split(/\s+/).filter(Boolean).length);
  readonly dueDate = computed(() =>
    this.resource().dueAt ? courseTimestamp(this.resource().dueAt) : null,
  );
  readonly deliveryStatus = computed(() => {
    const delivery = this.submission();
    return delivery?.status === 'CALIFICADA'
      ? 'Calificada'
      : delivery
        ? delivery.isLate
          ? 'Entrega tardía'
          : 'Enviada'
        : 'Sin entregar';
  });
  readonly url = computed(() =>
    this.safeUrl(
      this.resource().fileUrl || this.resource().externalUrl || this.resource().recordingUrl,
    ),
  );
  readonly videoEmbed = computed<SafeResourceUrl | null>(() => {
    const value = this.url();
    if (!value) return null;
    const url = new URL(value);
    let embed: string | null = null;
    if (
      [
        'youtube.com',
        'www.youtube.com',
        'm.youtube.com',
        'youtu.be',
        'www.youtube-nocookie.com',
      ].includes(url.hostname)
    ) {
      const id =
        url.hostname === 'youtu.be'
          ? url.pathname.slice(1).split('/')[0]
          : (url.searchParams.get('v') ?? url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1]);
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id))
        embed = `https://www.youtube-nocookie.com/embed/${id}`;
    } else if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(url.hostname)) {
      const id = url.pathname.match(/(?:\/video)?\/(\d+)/)?.[1];
      if (id) embed = `https://player.vimeo.com/video/${id}`;
    }
    // Solo se confían URLs construidas de proveedores conocidos, nunca HTML del usuario.
    return embed ? this.sanitizer.bypassSecurityTrustResourceUrl(embed) : null;
  });
  readonly pdfEmbed = computed<SafeResourceUrl | null>(() => {
    const value = this.url();
    if (!value) return null;
    const url = new URL(value);
    // PDF por HTTPS, siempre dentro de un iframe sin permisos de scripts ni navegación.
    return this.resource().materialType === 'PDF' &&
      url.protocol === 'https:' &&
      /\.pdf$/i.test(url.pathname)
      ? this.sanitizer.bypassSecurityTrustResourceUrl(url.href)
      : null;
  });
  readonly late = computed(() => this.dueDate() !== null && this.dueDate()! < this.now());
  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 30000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
  ngOnInit(): void {
    if (this.canManage()) this.activityView.set('WORKSPACE');
    this.form.patchValue({
      fileUrl: this.submission()?.fileUrl ?? '',
      textContent: this.submission()?.textContent ?? '',
    });
  }
  ngAfterViewInit(): void {
    this.dialog.nativeElement.showModal();
  }
  close(event?: Event): void {
    event?.preventDefault();
    if (!this.busy() && !this.uploading()) this.closed.emit();
  }
  safeUrl(value: string | null | undefined): string | null {
    try {
      const url = new URL(value ?? '');
      return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }
  submit(): void {
    if (this.busy() || this.uploading() || this.submission()?.status === 'CALIFICADA') return;
    this.validationError.set(null);
    const v = this.form.getRawValue();
    const file = v.fileUrl.trim() || null;
    const text = v.textContent.trim() || null;
    if (this.form.invalid || (!file && !text)) {
      this.validationError.set('Añade un enlace al archivo o una respuesta de texto.');
      return;
    }
    if (file && !this.safeUrl(file)) {
      this.validationError.set('El enlace del archivo debe comenzar por http:// o https://.');
      return;
    }
    this.send.emit({ taskId: this.resource().id, fileUrl: file, textContent: text });
  }
}
