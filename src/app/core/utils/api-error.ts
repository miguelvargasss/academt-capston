import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) return fallback;
  if (error.status === 0)
    return 'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.';
  if (error.status === 403) return 'No tienes permiso para realizar esta acción.';
  if (error.status === 404) return 'El recurso ya no está disponible.';
  if (error.status === 429) return 'Se realizaron demasiadas solicitudes. Espera un momento e inténtalo de nuevo.';
  if (error.status >= 500) return fallback;
  const body: unknown = error.error;
  if (body && typeof body === 'object' && 'codigo' in body) {
    const messages: Record<string, string> = {
      TOKEN_EXPIRED: 'Tu sesión ha vencido. Vuelve a iniciar sesión.',
      ACCOUNT_DISABLED: 'Tu cuenta está inactiva o suspendida.',
      CORREO_YA_REGISTRADO: 'Este correo ya está registrado.',
      CURSO_SIN_CUPO: 'El curso alcanzó su capacidad máxima.',
    };
    const code = body.codigo;
    if (typeof code === 'string' && Object.hasOwn(messages, code)) return messages[code];
  }
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
