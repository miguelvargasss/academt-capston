import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { FileUploadComponent } from './file-upload.component';
import { environment } from '../../../../core/config/environment';

describe('FileUploadComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  function setup() {
    const fixture = TestBed.createComponent(FileUploadComponent);
    fixture.componentRef.setInput('courseId', 'course-id');
    fixture.componentRef.setInput('destination', 'ENTREGA');
    fixture.detectChanges();
    return fixture;
  }
  function select(component: FileUploadComponent, file: File) {
    component.select({ target: { files: [file], value: 'local' } } as unknown as Event);
  }
  it('envía multipart al backend y usa la URL real devuelta', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    const uploaded = vi.fn();
    component.uploaded.subscribe(uploaded);
    const busy = vi.fn();
    component.busyChange.subscribe(busy);
    const file = new File(['%PDF-1.7'], 'respuesta.pdf', { type: 'application/pdf' });
    select(component, file);
    expect(component.uploading()).toBe(true);
    const request = TestBed.inject(HttpTestingController).expectOne(
      `${environment.apiUrl}/api/cursos/course-id/archivos?destino=ENTREGA`,
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body.get('archivo')).toEqual(file);
    expect(request.request.headers.has('Content-Type')).toBe(false);
    const result = {
      id: 'persisted',
      nombre: 'respuesta.pdf',
      mime: 'application/pdf',
      bytes: 8,
      url: 'https://res.cloudinary.com/cloud/raw/authenticated/s--signed--/respuesta.pdf',
    };
    request.flush(result);
    expect(uploaded).toHaveBeenCalledWith(result);
    expect(component.filename()).toBe('respuesta.pdf');
    expect(component.uploading()).toBe(false);
    expect(busy.mock.calls).toEqual([[true], [false]]);
  });
  it('muestra errores reales y permite reintentar sin emitir una URL', () => {
    const component = setup().componentInstance;
    const uploaded = vi.fn();
    component.uploaded.subscribe(uploaded);
    select(component, new File(['%PDF-'], 'guia.pdf'));
    TestBed.inject(HttpTestingController)
      .expectOne(() => true)
      .flush(
        { mensaje: 'Configura Cloudinary en el backend' },
        { status: 400, statusText: 'Bad Request' },
      );
    expect(component.error()).toContain('Configura Cloudinary');
    expect(component.uploading()).toBe(false);
    expect(uploaded).not.toHaveBeenCalled();
  });
  it('rechaza archivos vacíos, formatos no permitidos y más de 20 MB antes de enviar', () => {
    const component = setup().componentInstance;
    select(component, new File([], 'vacio.pdf'));
    expect(component.error()).toContain('20 MB');
    select(component, new File(['x'], 'script.svg'));
    expect(component.error()).toContain('formato');
    const large = new File(['x'], 'grande.pdf');
    Object.defineProperty(large, 'size', { value: 20 * 1024 * 1024 + 1 });
    select(component, large);
    expect(component.error()).toContain('20 MB');
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });
  it('acepta una imagen arrastrada y rechaza varios archivos sin iniciar subidas parciales', () => {
    const component = setup().componentInstance;
    const image = new File(['image'], 'respuesta.png', { type: 'image/png' });
    const event = (files: File[]) =>
      ({
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: { files },
      }) as unknown as DragEvent;
    component.drop(event([image, image]));
    expect(component.error()).toContain('un solo archivo');
    TestBed.inject(HttpTestingController).expectNone(() => true);
    component.drop(event([image]));
    const req = TestBed.inject(HttpTestingController).expectOne(() => true);
    expect(req.request.body.get('archivo')).toEqual(image);
    req.flush({
      nombre: image.name,
      url: 'https://images.example/respuesta.png',
      mime: 'image/png',
      bytes: 5,
    });
    expect(component.uploading()).toBe(false);
    expect(component.dragging()).toBe(false);
  });
});
