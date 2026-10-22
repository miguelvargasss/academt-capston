import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) return fallback;
  if (error.status === 0)
    return 'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.';
  if (error.status === 403) return 'No tienes permiso para realizar esta acción en el curso.';
  if (error.status === 404) return 'El curso o recurso ya no está disponible.';
  const body: unknown = error.error;
  if (body && typeof body === 'object' && 'mensaje' in body && typeof body.mensaje === 'string') {
    const details =
      'detalles' in body && body.detalles && typeof body.detalles === 'object'
        ? Object.values(body.detalles)
            .filter((v): v is string => typeof v === 'string')
            .join(' ')
        : '';
    return details ? `${body.mensaje}. ${details}` : body.mensaje;
  }
  return fallback;
}
