import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TokenStorageService } from '../../../core/services/token-storage.service';
import { environment } from '../../../core/config/environment';
import { UsersComponent } from './users.component';

const user = { id: 'u1', nombre: 'Ana', apellido: 'Pérez', correoElectronico: 'ana@example.test', estado: 'ACTIVO' as const };
const detail = { ...user, roles: ['ESTUDIANTE'], avatarUrl: null };
const page = { content: [user], number: 0, totalPages: 1, totalElements: 1 };
describe('Gestión de usuarios', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [UsersComponent], providers: [provideHttpClient(), provideHttpClientTesting(), { provide: TokenStorageService, useValue: { currentUser: () => ({ id: 'admin' }) } }] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  function setup() {
    const fixture = TestBed.createComponent(UsersComponent); fixture.detectChanges();
    http.expectOne(r => r.url === `${environment.apiUrl}/api/usuarios`).flush(page);
    http.expectOne(r => r.url === `${environment.apiUrl}/api/roles`).flush({ ...page, content: [{ nombre: 'ESTUDIANTE' }, { nombre: 'DOCENTE' }] });
    return fixture.componentInstance;
  }
  it('envía los filtros combinados al servidor y recibe la página', () => {
    const component = setup();
    component.filters.setValue({ texto: 'Ana', estado: 'ACTIVO', rol: 'ESTUDIANTE' });
    component.load(0);
    const req = http.expectOne(r => r.url === `${environment.apiUrl}/api/usuarios`);
    expect(req.request.params.get('texto')).toBe('Ana'); expect(req.request.params.get('estado')).toBe('ACTIVO'); expect(req.request.params.get('rol')).toBe('ESTUDIANTE');
    req.flush(page); expect(component.page()?.totalElements).toBe(1);
  });
  it('cambia roles y estado mediante peticiones separadas', () => {
    const component = setup(); component.open(user);
    http.expectOne(`${environment.apiUrl}/api/usuarios/u1`).flush(detail);
    component.toggleRole('DOCENTE', true); component.saveRoles();
    const roles = http.expectOne(`${environment.apiUrl}/api/usuarios/u1/roles`);
    expect(roles.request.body).toEqual({ roles: ['ESTUDIANTE', 'DOCENTE'] });
    roles.flush({ ...detail, roles: ['ESTUDIANTE', 'DOCENTE'] });
    http.expectOne(r => r.url === `${environment.apiUrl}/api/usuarios`).flush(page);
    component.statusForm.controls.estado.setValue('INACTIVO'); component.saveStatus();
    const status = http.expectOne(`${environment.apiUrl}/api/usuarios/u1/estado`);
    expect(status.request.body).toEqual({ estado: 'INACTIVO' });
    status.flush({ ...detail, estado: 'INACTIVO', roles: ['ESTUDIANTE', 'DOCENTE'] });
    http.expectOne(r => r.url === `${environment.apiUrl}/api/usuarios`).flush(page);
    expect(component.selected()?.estado).toBe('INACTIVO');
  });
});
