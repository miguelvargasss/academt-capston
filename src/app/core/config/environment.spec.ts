import { environment } from './environment';

describe('Configuración pública de la API', () => {
  afterEach(() => { delete window.__KELLY_CONFIG__; });

  it('permite configurar el origen de la API sin reconstruir la aplicación', () => {
    window.__KELLY_CONFIG__ = { apiUrl: 'https://api.academia.example/' };
    expect(environment.apiUrl).toBe('https://api.academia.example');
  });

  it.each(['javascript:alert(1)', 'https://user:secret@example.com', 'https://example.com/api', 'https://example.com/?token=x'])(
    'rechaza un origen inválido o que contenga credenciales: %s', (apiUrl) => {
      window.__KELLY_CONFIG__ = { apiUrl };
      expect(() => environment.apiUrl).toThrow();
    },
  );
});
