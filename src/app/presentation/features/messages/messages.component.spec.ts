import { PLATFORM_ID } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TokenStorageService } from '../../../core/services/token-storage.service';
import { environment } from '../../../core/config/environment';
import { MessagesComponent } from './messages.component';

const base = `${environment.apiUrl}/api/conversaciones`;
const conversation = { id: 'c1', participante1Id: 'me', participante2Id: 'other', participante1NombreCompleto: 'Yo', participante2NombreCompleto: 'Ana', asunto: null, cursoId: null, cursoTitulo: null, mensajesNoLeidos: 1 };
const message = { id: 'm1', conversacionId: 'c1', remitenteId: 'other', remitenteNombreCompleto: 'Ana', cuerpo: 'Hola', leido: false, enviadoAt: '2026-01-01T12:00:00' };
describe('Mensajes', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [MessagesComponent], providers: [provideHttpClient(), provideHttpClientTesting(), { provide: PLATFORM_ID, useValue: 'server' }, { provide: TokenStorageService, useValue: { currentUser: () => ({ id: 'me' }) } }] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  function setup() {
    const fixture = TestBed.createComponent(MessagesComponent); fixture.detectChanges();
    http.expectOne(r => r.url === base).flush({ content: [conversation], number: 0, totalPages: 1, totalElements: 1 });
    return fixture.componentInstance;
  }
  it('carga últimos mensajes y marca los entrantes como leídos', () => {
    const component = setup(); component.open(conversation);
    const req = http.expectOne(r => r.url === `${base}/c1/mensajes/ultimos`);
    expect(req.request.params.get('limit')).toBe('50'); req.flush([message]);
    expect(component.messages()[0].cuerpo).toBe('Hola');
    http.expectOne(`${base}/c1/leer-todos`).flush(null);
    http.expectOne(r => r.url === base).flush({ content: [conversation], number: 0, totalPages: 1, totalElements: 1 });
  });
  it('conserva el texto si falla el envío', () => {
    const component = setup(); component.open(conversation);
    http.expectOne(r => r.url === `${base}/c1/mensajes/ultimos`).flush([]);
    component.form.controls.cuerpo.setValue('Hola Ana'); component.send();
    http.expectOne(`${base}/c1/mensajes`).flush({}, { status: 500, statusText: 'Error' });
    expect(component.form.controls.cuerpo.value).toBe('Hola Ana');
    expect(component.messageError()).toBeTruthy();
  });
  it('abre una conversación con un contacto autorizado del curso', () => {
    const component = setup(); component.startNew();
    http.expectOne(`${environment.apiUrl}/api/cursos/mis-cursos`).flush([{ id: 'course', titulo: 'Inglés' }]);
    component.newForm.controls.cursoId.setValue('course'); component.selectCourse();
    const contacts = http.expectOne(r => r.url === `${base}/contactos`);
    expect(contacts.request.params.get('cursoId')).toBe('course');
    contacts.flush([{ id: 'other', nombreCompleto: 'Ana', avatarUrl: null }]);
    component.newForm.controls.contactoId.setValue('other'); component.create();
    const create = http.expectOne(base);
    expect(create.request.body).toEqual({ cursoId: 'course', otroParticipanteId: 'other' });
    create.flush(conversation);
    http.expectOne(r => r.url === base).flush({ content: [conversation], number: 0, totalPages: 1, totalElements: 1 });
    http.expectOne(r => r.url === `${base}/c1/mensajes/ultimos`).flush([]);
    expect(component.selected()?.id).toBe('c1');
  });
});
