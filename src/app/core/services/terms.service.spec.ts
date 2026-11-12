import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../config/environment';
import { TermsService, DISPLAYED_TERMS_VERSION } from './terms.service';
import { TokenStorageService } from './token-storage.service';

function token(user: string): string {
  return `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, user })).replace(/=/g, '')}.signature`;
}

describe('Roles verificados al consultar términos', () => {
  const endpoint = `${environment.apiUrl}/api/terminos/aceptacion`;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  });
  afterEach(() => { TestBed.inject(HttpTestingController).verify(); localStorage.clear(); });
  function session(id: string) {
    return { accessToken: token(id), tokenType: 'Bearer', userId: id, email: `${id}@example.test`, roles: ['ESTUDIANTE' as const], permisos: [] };
  }
  it('actualiza los roles vigentes sin alterar identidad ni token', () => {
    const storage = TestBed.inject(TokenStorageService);
    const user = session('a');
    storage.saveSession(user, 'Ana');
    TestBed.inject(TermsService).status().subscribe();
    TestBed.inject(HttpTestingController).expectOne(endpoint).flush({ version: DISPLAYED_TERMS_VERSION, aceptado: false, roles: ['DOCENTE', 'ADMINISTRADOR'] });
    expect(storage.currentUser()).toEqual(expect.objectContaining({ id: 'a', fullName: 'Ana', role: 'DOCENTE', roles: ['DOCENTE', 'ADMINISTRADOR'] }));
    expect(storage.isAdmin()).toBe(true);
    expect(storage.getAccessToken()).toBe(user.accessToken);
    expect(JSON.parse(localStorage.getItem('kelly_user_profile')!).roles).toEqual(['DOCENTE', 'ADMINISTRADOR']);
  });
  it('ignora una respuesta tardía de una sesión anterior', () => {
    const storage = TestBed.inject(TokenStorageService);
    storage.saveSession(session('a'));
    TestBed.inject(TermsService).status().subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne(endpoint);
    storage.saveSession(session('b'));
    request.flush({ version: DISPLAYED_TERMS_VERSION, aceptado: false, roles: ['ADMINISTRADOR'] });
    expect(storage.currentUser()).toEqual(expect.objectContaining({ id: 'b', role: 'ESTUDIANTE', roles: ['ESTUDIANTE'] }));
  });
});
