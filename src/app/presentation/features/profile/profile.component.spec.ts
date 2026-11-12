import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LogoutUseCase } from '../../../application/auth/logout.use-case';
import { TokenStorageService } from '../../../core/services/token-storage.service';
import { environment } from '../../../core/config/environment';
import { ProfileComponent } from './profile.component';

const profile = {
  id: 'user-1', nombre: 'Ana', apellido: 'Pérez', correoElectronico: 'ana@example.test',
  avatarUrl: null, estado: 'ACTIVO' as const, roles: ['ESTUDIANTE' as const],
};

describe('Perfil y cambio de contraseña', () => {
  let http: HttpTestingController;
  let logout: { execute: ReturnType<typeof vi.fn> };
  let storage: { updateProfile: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    logout = { execute: vi.fn() };
    storage = { updateProfile: vi.fn() };
    TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: LogoutUseCase, useValue: logout },
        { provide: TokenStorageService, useValue: storage }],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function setup() {
    const fixture = TestBed.createComponent(ProfileComponent);
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/api/usuarios/me`).flush(profile);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('carga y guarda los datos del perfil mediante el contrato del servidor', () => {
    const component = setup();
    component.form.patchValue({ nombre: ' Ana María ', apellido: ' Pérez ', avatarUrl: '' });
    component.save();
    const req = http.expectOne(`${environment.apiUrl}/api/usuarios/user-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ nombre: 'Ana María', apellido: 'Pérez', avatarUrl: null });
    req.flush({ ...profile, nombre: 'Ana María' });
    expect(component.notice()).toBe('Perfil actualizado.');
    expect(storage.updateProfile).toHaveBeenLastCalledWith(expect.objectContaining({ fullName: 'Ana María Pérez' }));
  });

  it('rechaza contraseñas diferentes sin enviar la petición', () => {
    const component = setup();
    component.passwordForm.setValue({ contrasenaActual: 'anterior1', contrasenaNueva: 'nueva123', confirmacion: 'otra1234' });
    component.changePassword();
    expect(component.passwordError()).toBe('Las contraseñas nuevas no coinciden.');
    http.expectNone(`${environment.apiUrl}/api/usuarios/user-1/contrasena`);
  });

  it('cierra la sesión solo después de cambiar la contraseña', () => {
    const component = setup();
    component.passwordForm.setValue({ contrasenaActual: 'anterior1', contrasenaNueva: 'nueva123', confirmacion: 'nueva123' });
    component.changePassword();
    const request = http.expectOne(`${environment.apiUrl}/api/usuarios/user-1/contrasena`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ contrasenaActual: 'anterior1', contrasenaNueva: 'nueva123' });
    expect(logout.execute).not.toHaveBeenCalled();
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(logout.execute).toHaveBeenCalledOnce();
    expect(component.passwordForm.value.contrasenaActual).toBe('');
  });

  it('mantiene la sesión si el servidor rechaza la contraseña actual', () => {
    const component = setup();
    component.passwordForm.setValue({ contrasenaActual: 'anterior1', contrasenaNueva: 'nueva123', confirmacion: 'nueva123' });
    component.changePassword();
    http.expectOne(`${environment.apiUrl}/api/usuarios/user-1/contrasena`)
      .flush({ mensaje: 'Contraseña actual incorrecta' }, { status: 400, statusText: 'Bad Request' });
    expect(logout.execute).not.toHaveBeenCalled();
    expect(component.passwordError()).toContain('Contraseña actual incorrecta');
  });
});
