import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TokenStorageService } from './token-storage.service';
import { AuthSession } from '../../domain/models/auth.model';

function token(claims: object): string {
  return `header.${btoa(JSON.stringify(claims)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}.signature`;
}
const future = () => Math.floor(Date.now() / 1000) + 3600;
describe('Sesión local y caducidad', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { localStorage.clear(); vi.useRealTimers(); });
  const session = (roles: AuthSession['roles'] = ['ESTUDIANTE']): AuthSession => ({ accessToken: token({ exp: future() }), tokenType: 'Bearer', userId: 'user-test', email: 'ana@it.invalid', roles, permisos: [] });
  it('guarda y recupera una sesión vigente con nombre y rol', () => {
    const storage = TestBed.inject(TokenStorageService);
    const value = session(['DOCENTE']); storage.saveSession(value, 'Ana Martínez');
    expect(storage.isAuthenticated()).toBe(true);
    expect(storage.getAccessToken()).toBe(value.accessToken);
    expect(storage.currentUser()?.fullName).toBe('Ana Martínez');
    expect(storage.userRole()).toBe('DOCENTE'); expect(storage.userInitials()).toBe('AM');
    expect(JSON.parse(localStorage.getItem('kelly_user_profile')!).role).toBe('DOCENTE');
  });
  it.each([null, '', 'token', 'a.@@.b', token({}), token({ exp: 0 }), token({ exp: 'mañana' }), token({ exp: -1 })])('rechaza un token inválido o sin caducidad válida (%s)', value => {
    expect(TestBed.inject(TokenStorageService).isTokenValid(value)).toBe(false);
  });
  it('elimina token y perfil cuando expira una sesión previamente válida', () => {
    vi.useFakeTimers(); const storage = TestBed.inject(TokenStorageService); storage.saveSession(session());
    vi.setSystemTime(Date.now() + 3600001);
    expect(storage.getAccessToken()).toBeNull();
    expect(storage.currentUser()).toBeNull();
    expect(localStorage.getItem('kelly_access_token')).toBeNull();
    expect(localStorage.getItem('kelly_user_profile')).toBeNull();
  });
  it('limpia una sesión caducada al arrancar y tolera perfiles JSON corruptos', () => {
    localStorage.setItem('kelly_access_token', token({ exp: 1 })); localStorage.setItem('kelly_user_profile', '{invalid');
    const storage = TestBed.inject(TokenStorageService);
    expect(storage.isAuthenticated()).toBe(false); expect(storage.currentUser()).toBeNull();
    expect(localStorage.getItem('kelly_user_profile')).toBeNull();
  });
  it('recupera un perfil persistido sin perder el rol', () => {
    localStorage.setItem('kelly_access_token', token({ exp: future() }));
    localStorage.setItem('kelly_user_profile', JSON.stringify({ id: 'u', email: 'ana@it.invalid', fullName: 'Ana', role: 'ESTUDIANTE', status: 'ACTIVO' }));
    const storage = TestBed.inject(TokenStorageService);
    expect(storage.isAuthenticated()).toBe(true); expect(storage.userInitials()).toBe('AN');
  });
  it('no accede al almacenamiento del navegador durante SSR', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const storage = TestBed.inject(TokenStorageService); storage.saveSession(session());
    expect(storage.isAuthenticated()).toBe(false); expect(storage.currentUser()).toBeNull();
    expect(localStorage.getItem('kelly_access_token')).toBeNull();
  });
});
