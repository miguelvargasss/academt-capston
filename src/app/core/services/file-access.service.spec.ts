import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { FileAccessService } from './file-access.service';
import { environment } from '../config/environment';

const path =
  '/api/cursos/11111111-1111-1111-1111-111111111111/archivos/22222222-2222-2222-2222-222222222222';
describe('Acceso a documentos privados', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('resuelve la referencia estable con el backend y solicita un enlace nuevo en cada apertura', () => {
    const service = TestBed.inject(FileAccessService);
    const results: string[] = [];
    for (const suffix of ['primera', 'segunda']) {
      service.resolve(environment.apiUrl + path).subscribe((file) => results.push(file.url));
      const req = TestBed.inject(HttpTestingController).expectOne(
        environment.apiUrl + path + '/acceso',
      );
      expect(req.request.method).toBe('GET');
      req.flush({
        url: `https://private.r2.example/guia.pdf?firma=${suffix}`,
        nombre: 'guia.pdf',
        mime: 'application/pdf',
        bytes: 100,
        expiraEnSegundos: 300,
      });
    }
    expect(results).toEqual([
      'https://private.r2.example/guia.pdf?firma=primera',
      'https://private.r2.example/guia.pdf?firma=segunda',
    ]);
  });
  it('las imágenes Cloudinary se muestran directamente y los esquemas inseguros se rechazan', () => {
    const service = TestBed.inject(FileAccessService);
    service
      .resolve('https://res.cloudinary.com/academy/image/authenticated/s--signed--/foto.png')
      .subscribe((file) => expect(file.mime).toBe('image/png'));
    const error = vi.fn();
    service.resolve('javascript:alert(1)').subscribe({ error });
    expect(error).toHaveBeenCalled();
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });
  it('obtiene los bytes de la vista Office desde el backend sin solicitar una URL pública', () => {
    const bytes = new ArrayBuffer(8);
    const received = vi.fn();
    TestBed.inject(FileAccessService)
      .preview(environment.apiUrl + path)
      .subscribe(received);
    const req = TestBed.inject(HttpTestingController).expectOne(
      environment.apiUrl + path + '/vista-previa',
    );
    expect(req.request.responseType).toBe('arraybuffer');
    req.flush(bytes);
    expect(received).toHaveBeenCalledWith(bytes);
  });
  it('resuelve referencias antiguas de localhost usando el origen actual de la API', () => {
    TestBed.inject(FileAccessService).resolve('http://localhost:8080' + path).subscribe();
    TestBed.inject(HttpTestingController)
      .expectOne(environment.apiUrl + path + '/acceso')
      .flush({ url: 'https://files.example/temporary', nombre: 'archivo.pdf', mime: 'application/pdf', bytes: 1, expiraEnSegundos: 300 });
  });
  it('no envía documentos externos al conversor privado', () => {
    const error = vi.fn();
    TestBed.inject(FileAccessService)
      .preview('https://external.example/guia.docx')
      .subscribe({ error });
    expect(error).toHaveBeenCalled();
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });
});
