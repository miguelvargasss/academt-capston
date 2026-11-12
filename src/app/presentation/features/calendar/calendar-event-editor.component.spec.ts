import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../core/config/environment';
import { CalendarEventEditorComponent } from './calendar-event-editor.component';

const url = `${environment.apiUrl}/api/eventos`;
describe('Editor de eventos del calendario', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn();
    TestBed.configureTestingModule({ imports: [CalendarEventEditorComponent], providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('impide guardar una fecha de fin anterior al inicio', () => {
    const fixture = TestBed.createComponent(CalendarEventEditorComponent); fixture.detectChanges();
    const component = fixture.componentInstance;
    component.form.patchValue({ titulo: 'Reunión', inicio: '2026-11-11T12:00', fin: '2026-11-11T11:00' });
    component.submit();
    expect(component.error()).toBe('La fecha de fin debe ser posterior al inicio.');
    http.expectNone(url);
  });

  it('crea un evento personal en hora local de Lima y avisa al guardarlo', () => {
    const fixture = TestBed.createComponent(CalendarEventEditorComponent); fixture.detectChanges();
    const component = fixture.componentInstance; const saved = vi.fn(); component.saved.subscribe(saved);
    component.form.patchValue({ titulo: ' Reunión ', inicio: '2026-11-11T12:00', fin: '2026-11-11T13:00', tipo: 'REUNION' });
    component.submit();
    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ titulo: 'Reunión', descripcion: null, tipo: 'REUNION', inicio: '2026-11-11T12:00', fin: '2026-11-11T13:00', sala: null, cursoId: null });
    request.flush({ id: 'e1' }); expect(saved).toHaveBeenCalledOnce();
  });

  it('carga el evento y guarda sin intentar cambiar su curso', () => {
    const fixture = TestBed.createComponent(CalendarEventEditorComponent); fixture.componentRef.setInput('eventId', 'e1'); fixture.detectChanges();
    http.expectOne(`${url}/e1`).flush({ id: 'e1', titulo: 'Práctica', descripcion: null, tipo: 'CLASE', inicio: '2026-11-11T12:00', fin: null, sala: null, cursoId: 'course1' });
    fixture.componentInstance.form.controls.titulo.setValue('Práctica oral'); fixture.componentInstance.submit();
    const request = http.expectOne(`${url}/e1`);
    expect(request.request.method).toBe('PUT'); expect(request.request.body.titulo).toBe('Práctica oral'); expect(request.request.body).not.toHaveProperty('cursoId');
    request.flush({});
  });

  it('no permite modificar el evento si la carga falla y exige confirmación para borrarlo', () => {
    const fixture = TestBed.createComponent(CalendarEventEditorComponent); fixture.componentRef.setInput('eventId', 'e1'); fixture.detectChanges();
    http.expectOne(`${url}/e1`).flush({}, { status: 500, statusText: 'Error' });
    expect(fixture.componentInstance.ready()).toBe(false);
    fixture.componentInstance.remove(); http.expectNone(`${url}/e1`);

    const second = TestBed.createComponent(CalendarEventEditorComponent); second.componentRef.setInput('eventId', 'e2'); second.detectChanges();
    http.expectOne(`${url}/e2`).flush({ id: 'e2', titulo: 'Evento', descripcion: null, tipo: 'OTRO', inicio: '2026-11-11T12:00', fin: null, sala: null });
    second.componentInstance.remove(); http.expectNone(`${url}/e2`);
    second.componentInstance.remove();
    const removal = http.expectOne(`${url}/e2`); expect(removal.request.method).toBe('DELETE'); removal.flush(null);
  });
});
