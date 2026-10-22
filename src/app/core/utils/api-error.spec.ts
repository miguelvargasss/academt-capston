import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessage } from './api-error';
describe('Errores de API visibles al usuario', () => {
  it.each([[0, 'conectar'], [403, 'permiso'], [404, 'disponible']])('traduce el estado %s', (status, text) => {
    expect(apiErrorMessage(new HttpErrorResponse({ status: status as number }), 'Alternativa')).toContain(text);
  });
  it('incluye los detalles de validación que devuelve el backend', () => {
    const error = new HttpErrorResponse({ status: 400, error: { mensaje: 'Datos inválidos', detalles: { titulo: 'Falta el título', capacidad: 'Mínimo 1', campoAjeno: null } } });
    expect(apiErrorMessage(error, 'Alternativa')).toBe('Datos inválidos. Falta el título Mínimo 1');
  });
  it('usa un mensaje de reserva para errores sin formato de la API', () => {
    expect(apiErrorMessage(new Error('Detalle interno'), 'Alternativa')).toBe('Alternativa');
    expect(apiErrorMessage(new HttpErrorResponse({ status: 500, error: '<html>Error</html>' }), 'Alternativa')).toBe('Alternativa');
  });
});
