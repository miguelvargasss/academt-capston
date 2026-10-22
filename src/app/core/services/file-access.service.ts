import { Injectable, Injector, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { environment } from '../config/environment';

export interface FileAccess {
  url: string;
  nombre: string;
  mime: string;
  bytes: number;
  expiraEnSegundos: number;
}

@Injectable({ providedIn: 'root' })
export class FileAccessService {
  private readonly injector = inject(Injector);
  reference(value: string): string | null {
    try {
      const url = new URL(value);
      return url.origin === new URL(environment.apiUrl).origin &&
        /^\/api\/cursos\/[\da-f-]{36}\/archivos\/[\da-f-]{36}$/.test(url.pathname)
        ? `${environment.apiUrl}${url.pathname}`
        : null;
    } catch {
      return null;
    }
  }
  preview(value: string): Observable<ArrayBuffer> {
    const reference = this.reference(value);
    if (reference)
      return this.injector
        .get(HttpClient)
        .get(`${reference}/vista-previa`, { responseType: 'arraybuffer' });
    try {
      const url = new URL(value);
      if (['https:', 'http:'].includes(url.protocol) && /\.pdf$/i.test(url.pathname))
        return this.injector.get(HttpClient).get(url.href, { responseType: 'arraybuffer' });
    } catch {
      /* El mensaje se muestra en el visor. */
    }
    return throwError(
      () => new Error('Sube el documento al curso para generar una vista previa privada.'),
    );
  }
  resolve(value: string): Observable<FileAccess> {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return throwError(() => new Error('El enlace del archivo no es válido.'));
    }
    if (!['https:', 'http:'].includes(url.protocol))
      return throwError(() => new Error('El enlace del archivo no es válido.'));
    const backend = new URL(environment.apiUrl);
    if (
      url.origin === backend.origin &&
      /^\/api\/cursos\/[\da-f-]{36}\/archivos\/[\da-f-]{36}$/.test(url.pathname)
    ) {
      return this.injector
        .get(HttpClient)
        .get<FileAccess>(`${environment.apiUrl}${url.pathname}/acceso`);
    }
    const path = url.pathname.toLowerCase();
    const mime = /\.(png|jpe?g|gif|webp)$/.test(path)
      ? 'image/' + path.split('.').pop()
      : path.endsWith('.pdf')
        ? 'application/pdf'
        : '';
    return of({ url: url.href, nombre: 'Archivo adjunto', mime, bytes: 0, expiraEnSegundos: 0 });
  }
}
