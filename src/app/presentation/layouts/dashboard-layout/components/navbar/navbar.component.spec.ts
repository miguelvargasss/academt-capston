import { PLATFORM_ID, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TokenStorageService } from '../../../../../core/services/token-storage.service';
import { environment } from '../../../../../core/config/environment';
import { NavbarComponent } from './navbar.component';

describe('Notificaciones del encabezado', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [NavbarComponent], providers: [provideHttpClient(), provideHttpClientTesting(), { provide: PLATFORM_ID, useValue: 'server' }, { provide: TokenStorageService, useValue: { currentUser: signal(null), userRole: signal(null), roleLabel: signal('Estudiante'), userInitials: signal('KA') } }] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('muestra el contador real y lo actualiza al marcar una notificación', () => {
    const fixture = TestBed.createComponent(NavbarComponent); fixture.detectChanges();
    const component = fixture.componentInstance;
    component.refreshCount(); http.expectOne(`${environment.apiUrl}/api/notificaciones/count-no-leidas`).flush({ total: 1 });
    component.toggle();
    const request = http.expectOne(r => r.url === `${environment.apiUrl}/api/notificaciones`);
    request.flush({ content: [{ id: 'n1', titulo: 'Nuevo mensaje', leida: false, fechaCreacion: '2026-01-01T12:00:00' }] });
    component.read(component.items()[0]);
    http.expectOne(`${environment.apiUrl}/api/notificaciones/n1/leer`).flush({});
    http.expectOne(`${environment.apiUrl}/api/notificaciones/count-no-leidas`).flush({ total: 0 });
    expect(component.unread()).toBe(0); expect(component.items()[0].leida).toBe(true);
  });
});
