import {
  Component,
  DestroyRef,
  Injector,
  inject,
  input,
  output,
  signal,
  computed,
} from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { effect } from '@angular/core';
import { CourseIconComponent } from '../course-icon/course-icon.component';
import { environment } from '../../../../core/config/environment';

export interface UploadedFile {
  id: string;
  nombre: string;
  mime: string;
  bytes: number;
  url: string;
}

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CourseIconComponent],
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.css',
})
export class FileUploadComponent {
  readonly courseId = input('');
  readonly destination = input<'MATERIAL' | 'ACTIVIDAD' | 'ANUNCIO' | 'ENTREGA'>('MATERIAL');
  readonly imagesOnly = input(false);
  readonly disabled = input(false);
  readonly currentUrl = input<string | null>(null);
  readonly dragging = signal(false);
  readonly uploaded = output<UploadedFile>();
  readonly busyChange = output<boolean>();
  readonly uploading = signal(false);
  readonly filename = signal('');
  readonly error = signal<string | null>(null);
  readonly accept = computed(() =>
    this.imagesOnly()
      ? '.jpg,.jpeg,.png,.gif,.webp'
      : '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt',
  );
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => {
      if (!this.currentUrl()) this.filename.set('');
    });
  }
  dragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.disabled() && !this.uploading()) {
      this.dragging.set(true);
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    }
  }
  drop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragging.set(false);
    if (this.disabled() || this.uploading()) return;
    const files = event.dataTransfer?.files;
    if (!files?.length) return;
    if (files.length > 1) {
      this.error.set('Selecciona un solo archivo. Puedes reemplazarlo antes de enviar.');
      return;
    }
    this.upload(files[0]);
  }
  select(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.upload(file);
  }
  private upload(file: File): void {
    if (!file || this.disabled() || this.uploading() || !this.courseId()) return;
    this.error.set(null);
    if (!file.size || file.size > 20 * 1024 * 1024) {
      this.error.set('Selecciona un archivo de hasta 20 MB.');
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (
      !ext ||
      !this.accept()
        .split(',')
        .includes('.' + ext)
    ) {
      this.error.set('Este formato de archivo no está permitido.');
      return;
    }
    const body = new FormData();
    body.append('archivo', file);
    this.uploading.set(true);
    this.busyChange.emit(true);
    this.injector
      .get(HttpClient)
      .post<UploadedFile>(
        `${environment.apiUrl}/api/cursos/${encodeURIComponent(this.courseId())}/archivos?destino=${this.destination()}`,
        body,
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.uploading.set(false);
          this.busyChange.emit(false);
        }),
      )
      .subscribe({
        next: (result) => {
          this.filename.set(result.nombre);
          this.uploaded.emit(result);
        },
        error: (err: HttpErrorResponse) =>
          this.error.set(err.error?.mensaje || 'No se pudo subir el archivo. Vuelve a intentarlo.'),
      });
  }
}
