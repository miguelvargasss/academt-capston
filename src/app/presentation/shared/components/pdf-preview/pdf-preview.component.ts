import {
  Component,
  ElementRef,
  PLATFORM_ID,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { FileAccessService } from '../../../../core/services/file-access.service';
import { PdfRendererService } from '../../../../core/services/pdf-renderer.service';

@Component({
  selector: 'app-pdf-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section
      #stage
      class="pdf-viewer"
      [attr.aria-busy]="loading() || rendering()"
      [attr.aria-label]="title()"
    >
      <div class="pdf-toolbar">
        <div class="page-controls">
          <button
            type="button"
            aria-label="Página anterior"
            [disabled]="page() <= 1 || loading()"
            (click)="page.set(page() - 1)"
          >
            ‹
          </button>
          <span>Página</span
          ><input
            type="number"
            aria-label="Número de página"
            min="1"
            [max]="pages() || 1"
            [value]="page()"
            [disabled]="!pages()"
            (change)="goToPage($event)"
          />
          <span>de {{ pages() || '—' }}</span>
          <button
            type="button"
            aria-label="Página siguiente"
            [disabled]="page() >= pages() || loading()"
            (click)="page.set(page() + 1)"
          >
            ›
          </button>
        </div>
        <div class="zoom-controls">
          <button
            type="button"
            aria-label="Reducir zoom"
            [disabled]="zoom() <= 0.5 || !pages()"
            (click)="zoom.set(zoom() - 0.25)"
          >
            −
          </button>
          <button
            type="button"
            title="Ajustar al ancho"
            [disabled]="!pages()"
            (click)="zoom.set(1)"
          >
            {{ zoom() * 100 | number: '1.0-0' }}%
          </button>
          <button
            type="button"
            aria-label="Aumentar zoom"
            [disabled]="zoom() >= 2.5 || !pages()"
            (click)="zoom.set(zoom() + 0.25)"
          >
            +
          </button>
          <button type="button" aria-label="Pantalla completa" (click)="fullscreen()">⛶</button>
          <button type="button" (click)="openOriginal.emit()">Abrir original ↗</button>
        </div>
      </div>
      @if (loading()) {
        <div class="pdf-state" role="status">
          <span class="spinner"></span>Preparando vista previa…
        </div>
      }
      @if (error()) {
        <div class="pdf-state" role="alert">
          <p>{{ error() }}</p>
          <button type="button" class="retry" (click)="retry()">Reintentar</button>
        </div>
      }
      <div #container class="pdf-pages" [class.hidden]="loading() || !!error()">
        <canvas
          #canvas
          role="img"
          [attr.aria-label]="title() + ', página ' + page() + ' de ' + pages()"
        ></canvas>
      </div>
      @if (pageText() && !loading() && !error()) {
        <details class="page-text">
          <summary>Leer texto de esta página</summary>
          <p>{{ pageText() }}</p>
        </details>
      }
    </section>
  `,
  styleUrl: './pdf-preview.component.css',
})
export class PdfPreviewComponent {
  readonly url = input.required<string>();
  readonly title = input('Vista previa del documento');
  readonly openOriginal = output<void>();
  readonly page = signal(1);
  readonly pages = signal(0);
  readonly zoom = signal(1);
  readonly loading = signal(false);
  readonly rendering = signal(false);
  readonly error = signal<string | null>(null);
  readonly pageText = signal('');
  readonly reload = signal(0);
  private readonly document = signal<PDFDocumentProxy | null>(null);
  private readonly width = signal(700);
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  private readonly container = viewChild<ElementRef<HTMLElement>>('container');
  private readonly files = inject(FileAccessService);
  private readonly renderer = inject(PdfRendererService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private renderTask: RenderTask | null = null;
  private renderQueue: Promise<void> = Promise.resolve();
  constructor() {
    effect((onCleanup) => {
      const value = this.url();
      this.reload();
      if (!this.browser) return;
      let disposed = false;
      let loaded: PDFDocumentProxy | null = null;
      this.document.set(null);
      this.pages.set(0);
      this.page.set(1);
      this.pageText.set('');
      this.error.set(null);
      this.loading.set(true);
      const request = this.files.preview(value).subscribe({
        next: async (data) => {
          try {
            const pdf = await this.renderer.open(data);
            if (disposed) {
              void pdf.destroy();
              return;
            }
            loaded = pdf;
            this.document.set(pdf);
            this.pages.set(pdf.numPages);
            this.loading.set(false);
          } catch {
            if (!disposed) {
              this.loading.set(false);
              this.error.set(
                'No se pudo interpretar el documento. Puede estar dañado o protegido con contraseña.',
              );
            }
          }
        },
        error: (err) => {
          this.loading.set(false);
          let message = err.error?.mensaje || err.message;
          if (err.error instanceof ArrayBuffer) {
            try {
              message = JSON.parse(new TextDecoder().decode(err.error)).mensaje;
            } catch {
              /* Mantener el mensaje de lectura. */
            }
          }
          this.error.set(
            message && !message.startsWith('Http failure')
              ? message
              : 'No se pudo cargar la vista previa. Reintenta o abre el original.',
          );
        },
      });
      onCleanup(() => {
        disposed = true;
        request.unsubscribe();
        this.renderTask?.cancel();
        void loaded?.destroy();
      });
    });
    effect((onCleanup) => {
      const host = this.container()?.nativeElement;
      if (!this.browser || !host || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver((entries) => {
        const w = entries[0]?.contentRect.width;
        if (w > 0) this.width.set(Math.max(120, w - 32));
      });
      observer.observe(host);
      onCleanup(() => observer.disconnect());
    });
    effect((onCleanup) => {
      const pdf = this.document(),
        page = this.page(),
        zoom = this.zoom(),
        width = this.width(),
        canvas = this.canvas()?.nativeElement;
      if (!pdf || !canvas) return;
      let cancelled = false;
      let task: RenderTask | null = null;
      this.rendering.set(true);
      const run = async () => {
        if (cancelled) return;
        try {
          const sheet = await pdf.getPage(page);
          if (cancelled) return;
          const original = sheet.getViewport({ scale: 1 });
          const scale = Math.min(
            (width / original.width) * zoom,
            4096 / original.width,
            8192 / original.height,
          );
          const viewport = sheet.getViewport({ scale });
          const ratio = Math.min(window.devicePixelRatio || 1, 2);
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Canvas no disponible');
          canvas.width = Math.floor(viewport.width * ratio);
          canvas.height = Math.floor(viewport.height * ratio);
          canvas.style.width = Math.floor(viewport.width) + 'px';
          canvas.style.height = Math.floor(viewport.height) + 'px';
          task = sheet.render({
            canvas,
            canvasContext: context,
            viewport,
            transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
          });
          this.renderTask = task;
          await task.promise;
          if (cancelled) return;
          const text = await sheet.getTextContent();
          if (!cancelled)
            this.pageText.set(text.items.map((item) => ('str' in item ? item.str : '')).join(' '));
        } catch {
          if (!cancelled)
            this.error.set(
              'No se pudo mostrar esta página. Puedes reintentar o abrir el original.',
            );
        } finally {
          if (!cancelled) this.rendering.set(false);
        }
      };
      this.renderQueue = this.renderQueue.catch(() => {}).then(run);
      onCleanup(() => {
        cancelled = true;
        task?.cancel();
      });
    });
  }
  retry(): void {
    this.reload.update((value) => value + 1);
  }
  goToPage(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.page.set(Math.max(1, Math.min(this.pages() || 1, Math.trunc(value) || 1)));
  }
  fullscreen(): void {
    void this.stage()
      ?.nativeElement.requestFullscreen?.()
      .catch(() => {});
  }
}
