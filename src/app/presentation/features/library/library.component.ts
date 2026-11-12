import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap, throwError } from 'rxjs';
import { environment } from '../../../core/config/environment';
import { FileAccessService } from '../../../core/services/file-access.service';
import { TokenStorageService } from '../../../core/services/token-storage.service';
import { apiErrorMessage } from '../../../core/utils/api-error';

interface Resource {
  id: string;
  titulo: string;
  categoria: string | null;
  nivelCefr: string | null;
  tipo: string | null;
  contadorDescargas: number;
}
interface ResourceDetail extends Resource {
  descripcion: string | null;
  urlArchivo: string | null;
  urlExterno: string | null;
  tamanoMb: number | null;
}
interface Page { content: Resource[]; number: number; totalPages: number; totalElements: number; }
interface Download { urlArchivo: string | null; urlExterno: string | null; contadorDescargas: number; }
interface UploadedFile { id: string; nombre: string; mime: string; bytes: number; url: string; }
interface ResourceForm {
  titulo: string;
  descripcion: string;
  categoria: string;
  nivelCefr: string;
  tipo: string;
  urlArchivo: string;
  urlExterno: string;
  tamanoMb: number | null;
}

function emptyForm(): ResourceForm {
  return { titulo: '', descripcion: '', categoria: '', nivelCefr: '', tipo: 'PDF', urlArchivo: '', urlExterno: '', tamanoMb: null };
}

@Component({
  selector: 'app-library', standalone: true, imports: [FormsModule],
  templateUrl: './library.component.html',
})
export class LibraryComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly files = inject(FileAccessService);
  private readonly tokens = inject(TokenStorageService);
  private readonly destroy = inject(DestroyRef);
  private readonly base = `${environment.apiUrl}/api/recursos`;
  private pendingRefresh = false;
  readonly canManage = computed(() => {
    const user = this.tokens.currentUser();
    return user?.role === 'DOCENTE' || user?.role === 'ADMINISTRADOR' ||
      !!user?.roles?.some((role) => role === 'DOCENTE' || role === 'ADMINISTRADOR');
  });
  readonly canDelete = this.tokens.isAdmin;
  readonly levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  readonly types = ['PDF', 'AUDIO', 'VIDEO', 'ENLACE', 'DOCUMENTO', 'IMAGEN'];
  readonly results = signal<Page | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly downloading = signal<string | null>(null);
  readonly downloadError = signal<string | null>(null);
  readonly ready = signal<{ url: string; title: string } | null>(null);
  readonly detail = signal<ResourceDetail | null>(null);
  readonly detailLoading = signal(false);
  readonly detailError = signal<string | null>(null);
  readonly editorOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly selectedFile = signal<File | null>(null);
  readonly formError = signal<string | null>(null);
  readonly confirmation = signal<Resource | null>(null);
  readonly deleting = signal(false);
  readonly actionMessage = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  form = emptyForm();
  search = '';
  category = '';
  level = '';
  type = '';

  ngOnInit(): void { this.load(0); }

  load(page: number): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    let params = new HttpParams().set('page', page).set('size', 20);
    if (this.search.trim()) params = params.set('titulo', this.search.trim());
    if (this.category.trim()) params = params.set('categoria', this.category.trim());
    if (this.level) params = params.set('nivelCefr', this.level);
    if (this.type) params = params.set('tipo', this.type);
    this.http.get<Page>(this.base, { params }).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (result) => { this.results.set(result); this.finishLoading(); },
      error: (error) => { this.error.set(apiErrorMessage(error, 'No se pudo cargar la biblioteca.')); this.finishLoading(); },
    });
  }

  private finishLoading(): void {
    this.loading.set(false);
    if (this.pendingRefresh) {
      this.pendingRefresh = false;
      this.load(0);
    }
  }

  private refreshAfterChange(): void {
    if (this.loading()) this.pendingRefresh = true;
    else this.load(0);
  }

  resetFilters(): void {
    this.search = '';
    this.category = '';
    this.level = '';
    this.type = '';
    this.load(0);
  }

  download(resource: Resource): void {
    if (this.downloading()) return;
    this.downloading.set(resource.id);
    this.downloadError.set(null);
    this.ready.set(null);
    this.http.post<Download>(`${this.base}/${encodeURIComponent(resource.id)}/descargar`, {})
      .pipe(
        switchMap((result) => {
          this.results.update((page) => page ? { ...page, content: page.content.map((item) => item.id === resource.id ? { ...item, contadorDescargas: result.contadorDescargas } : item) } : page);
          const url = result.urlArchivo || result.urlExterno;
          if (!url) return throwError(() => new Error('El recurso no tiene un enlace disponible.'));
          return this.files.resolve(url);
        }),
        takeUntilDestroyed(this.destroy),
      ).subscribe({
        next: (file) => { this.ready.set({ url: file.url, title: resource.titulo }); this.downloading.set(null); },
        error: (error) => {
          this.downloadError.set(apiErrorMessage(error, 'No se pudo preparar el recurso.'));
          this.downloading.set(null);
        },
      });
  }

  showDetail(resource: Resource): void {
    if (this.detailLoading()) return;
    this.detail.set(null);
    this.detailError.set(null);
    this.detailLoading.set(true);
    this.http.get<ResourceDetail>(`${this.base}/${encodeURIComponent(resource.id)}`)
      .pipe(takeUntilDestroyed(this.destroy)).subscribe({
        next: (result) => { this.detail.set(result); this.detailLoading.set(false); },
        error: (error) => { this.detailError.set(apiErrorMessage(error, 'No se pudo cargar el detalle.')); this.detailLoading.set(false); },
      });
  }

  create(): void {
    if (!this.canManage()) return;
    this.editingId.set(null);
    this.form = emptyForm();
    this.selectedFile.set(null);
    this.formError.set(null);
    this.editorOpen.set(true);
  }

  edit(resource: Resource): void {
    if (!this.canManage() || this.detailLoading()) return;
    this.detailLoading.set(true);
    this.actionError.set(null);
    this.http.get<ResourceDetail>(`${this.base}/${encodeURIComponent(resource.id)}`)
      .pipe(takeUntilDestroyed(this.destroy)).subscribe({
        next: (r) => {
          this.form = { titulo: r.titulo, descripcion: r.descripcion || '', categoria: r.categoria || '', nivelCefr: r.nivelCefr || '', tipo: r.tipo || 'PDF', urlArchivo: r.urlArchivo || '', urlExterno: r.urlExterno || '', tamanoMb: r.tamanoMb };
          this.selectedFile.set(null);
          this.editingId.set(r.id);
          this.formError.set(null);
          this.detailLoading.set(false);
          this.editorOpen.set(true);
        },
        error: (error) => { this.actionError.set(apiErrorMessage(error, 'No se pudo abrir el recurso para editar.')); this.detailLoading.set(false); },
      });
  }

  closeEditor(): void { if (!this.saving()) this.editorOpen.set(false); }

  selectFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!file.size || file.size > 20 * 1024 * 1024 || !extension ||
        !['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(extension)) {
      this.formError.set('Selecciona un archivo permitido de hasta 20 MB.');
      this.selectedFile.set(null);
      return;
    }
    this.formError.set(null);
    this.selectedFile.set(file);
  }

  save(): void {
    if (!this.canManage() || this.saving()) return;
    this.formError.set(null);
    const form = this.form;
    const titulo = form.titulo.trim();
    if (!titulo || titulo.length > 200 || !this.types.includes(form.tipo)) {
      this.formError.set('Completa el título (máximo 200 caracteres) y selecciona un tipo.');
      return;
    }
    if (!form.urlArchivo.trim() && !form.urlExterno.trim() && !this.selectedFile()) {
      this.formError.set('Añade un archivo o un enlace externo para el recurso.');
      return;
    }
    if (form.urlExterno.trim()) {
      try {
        const link = new URL(form.urlExterno.trim());
        if (!['http:', 'https:'].includes(link.protocol)) throw new Error('invalid');
      } catch {
        this.formError.set('El enlace externo debe empezar por http:// o https://.');
        return;
      }
    }
    const payload = {
      titulo, descripcion: form.descripcion.trim() || null, categoria: form.categoria.trim() || null,
      nivelCefr: form.nivelCefr || null, tipo: form.tipo, urlArchivo: form.urlArchivo.trim() || null,
      urlExterno: form.urlExterno.trim() || null, tamanoMb: form.tamanoMb,
    };
    const id = this.editingId();
    this.saving.set(true);
    const persist = () => id ? this.http.put(`${this.base}/${encodeURIComponent(id)}`, payload) : this.http.post(this.base, payload);
    const selected = this.selectedFile();
    let request = persist;
    if (selected) {
      const body = new FormData();
      body.append('archivo', selected);
      request = () => this.http.post<UploadedFile>(`${environment.apiUrl}/api/biblioteca/archivos`, body).pipe(
        switchMap((uploaded) => {
          payload.urlArchivo = uploaded.url;
          payload.tamanoMb = uploaded.bytes / (1024 * 1024);
          // Si falla el guardado del recurso, el reintento reutiliza el archivo subido.
          this.form.urlArchivo = uploaded.url;
          this.form.tamanoMb = payload.tamanoMb;
          this.selectedFile.set(null);
          return persist();
        }),
      );
    }
    request().pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: () => {
        this.saving.set(false);
        this.editorOpen.set(false);
        this.actionMessage.set(id ? 'Recurso actualizado.' : 'Recurso añadido a la biblioteca.');
        this.detail.set(null);
        this.refreshAfterChange();
      },
      error: (error) => { this.saving.set(false); this.formError.set(apiErrorMessage(error, 'No se pudo guardar el recurso.')); },
    });
  }

  remove(resource: Resource): void {
    if (!this.canDelete() || this.deleting()) return;
    this.confirmation.set(resource);
    this.actionError.set(null);
  }

  confirmDelete(): void {
    const resource = this.confirmation();
    if (!resource || !this.canDelete() || this.deleting()) return;
    this.deleting.set(true);
    this.http.delete(`${this.base}/${encodeURIComponent(resource.id)}`).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: () => {
        this.deleting.set(false);
        this.confirmation.set(null);
        this.detail.set(null);
        this.actionMessage.set('Recurso eliminado.');
        this.refreshAfterChange();
      },
      error: (error) => { this.deleting.set(false); this.actionError.set(apiErrorMessage(error, 'No se pudo eliminar el recurso.')); },
    });
  }
}
