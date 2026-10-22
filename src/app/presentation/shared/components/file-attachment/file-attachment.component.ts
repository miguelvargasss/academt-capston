import { Component, effect, inject, input, signal, computed } from '@angular/core';
import { PdfPreviewComponent } from '../pdf-preview/pdf-preview.component';
import { FileAccess, FileAccessService } from '../../../../core/services/file-access.service';

@Component({
  selector: 'app-file-attachment',
  standalone: true,
  imports: [PdfPreviewComponent],
  template: `
    @if (url()) {
      <div class="attachment">
        @if (preview() && loading()) {
          <p role="status">Cargando adjunto…</p>
        }
        @if (preview() && access(); as file) {
          @if (file.mime.startsWith('image/')) {
            <img [src]="file.url" [alt]="label()" loading="lazy" />
          } @else if (documentPreview()) {
            @if (file.mime !== 'application/pdf') {
              <p>Vista PDF del documento. El archivo original conserva su formato.</p>
            }
            <app-pdf-preview [url]="url() || ''" [title]="file.nombre" (openOriginal)="open()" />
          }
        }
        <button type="button" class="file-link" [disabled]="opening()" (click)="open()">
          {{ opening() ? 'Preparando archivo…' : label() }}
        </button>
        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        margin: 0.8rem 0;
      }
      img {
        display: block;
        max-width: 100%;
        max-height: 420px;
        margin-bottom: 0.7rem;
        border-radius: 12px;
        object-fit: contain;
      }
      iframe {
        display: block;
        width: 100%;
        height: 460px;
        border: 1px solid #e5ddd8;
        border-radius: 12px;
        margin-bottom: 0.7rem;
      }
      .file-link {
        border: 1px solid #e5d8d0;
        border-radius: 9px;
        background: #fff6ef;
        color: #a63810;
        padding: 0.55rem 0.8rem;
        font: inherit;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
      }
      .file-link:disabled {
        opacity: 0.65;
        cursor: wait;
      }
      p {
        font-size: 0.8rem;
        color: #665c55;
      }
      .error {
        color: #b42318;
      }
    `,
  ],
})
export class FileAttachmentComponent {
  readonly url = input<string | null | undefined>(null);
  readonly label = input('Abrir o descargar archivo');
  readonly preview = input(false);
  readonly access = signal<FileAccess | null>(null);
  readonly loading = signal(false);
  readonly opening = signal(false);
  readonly error = signal<string | null>(null);
  private readonly files = inject(FileAccessService);
  readonly documentPreview = computed(() => {
    const mime = this.access()?.mime ?? '';
    return (
      mime === 'application/pdf' ||
      mime === 'text/plain' ||
      mime === 'application/msword' ||
      mime.startsWith('application/vnd.openxmlformats-officedocument.') ||
      ['application/vnd.ms-excel', 'application/vnd.ms-powerpoint'].includes(mime)
    );
  });
  constructor() {
    effect((onCleanup) => {
      const url = this.url();
      this.access.set(null);
      this.error.set(null);
      if (!url || !this.preview()) return;
      this.loading.set(true);
      const request = this.files.resolve(url).subscribe({
        next: (file) => {
          this.access.set(file);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err.error?.mensaje || 'No se pudo consultar el archivo adjunto.');
        },
      });
      onCleanup(() => request.unsubscribe());
    });
  }
  open(): void {
    const value = this.url();
    if (!value || this.opening()) return;
    this.error.set(null);
    this.opening.set(true);
    // Se abre por interacción directa para evitar el bloqueo de ventanas del navegador.
    const tab = window.open('about:blank', '_blank');
    if (tab) tab.opener = null;
    this.files.resolve(value).subscribe({
      next: (file) => {
        this.opening.set(false);
        if (tab) tab.location.replace(file.url);
        else this.error.set('Permite abrir una pestaña para consultar el archivo.');
      },
      error: (err) => {
        tab?.close();
        this.opening.set(false);
        this.error.set(err.error?.mensaje || 'No se pudo abrir el archivo. Vuelve a intentarlo.');
      },
    });
  }
}
