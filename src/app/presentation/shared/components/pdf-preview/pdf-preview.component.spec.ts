import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { FileAccessService } from '../../../../core/services/file-access.service';
import { PdfRendererService } from '../../../../core/services/pdf-renderer.service';
import { PdfPreviewComponent } from './pdf-preview.component';

describe('Visor PDF privado', () => {
  const render = vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() }));
  const getPage = vi.fn(async () => ({
    getViewport: () => ({ width: 600, height: 800 }),
    render,
    getTextContent: async () => ({ items: [{ str: 'Contenido del documento' }] }),
  }));
  const destroy = vi.fn();
  const files = { preview: vi.fn(() => of(new ArrayBuffer(8))) };
  const renderer = { open: vi.fn(async () => ({ numPages: 3, getPage, destroy })) };
  beforeEach(() => {
    vi.clearAllMocks();
    files.preview.mockReturnValue(of(new ArrayBuffer(8)));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      {} as CanvasRenderingContext2D,
    );
    TestBed.configureTestingModule({
      providers: [
        { provide: FileAccessService, useValue: files },
        { provide: PdfRendererService, useValue: renderer },
      ],
    });
  });
  it('renderiza páginas reales, limita la navegación y libera el documento al cerrar', async () => {
    const fixture = TestBed.createComponent(PdfPreviewComponent);
    fixture.componentRef.setInput('url', 'http://localhost/archivo');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.pages()).toBe(3);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(getPage).toHaveBeenCalledWith(1);
    });
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Contenido del documento');
    });
    expect(fixture.nativeElement.textContent).toContain('Contenido del documento');
    fixture.componentInstance.goToPage({ target: { value: '9' } } as unknown as Event);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.page()).toBe(3);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(getPage).toHaveBeenCalledWith(3);
    });
    fixture.destroy();
    expect(destroy).toHaveBeenCalled();
  });
  it('muestra el error del backend y permite reintentar conservando la opción de abrir original', async () => {
    const message = new TextEncoder().encode('{"mensaje":"Conversor no disponible"}');
    const bytes = new ArrayBuffer(message.length);
    new Uint8Array(bytes).set(message);
    files.preview.mockReturnValue(throwError(() => ({ error: bytes })));
    const fixture = TestBed.createComponent(PdfPreviewComponent);
    fixture.componentRef.setInput('url', 'http://localhost/archivo');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Conversor no disponible');
    fixture.nativeElement.querySelector('.retry').click();
    fixture.detectChanges();
    expect(files.preview).toHaveBeenCalledTimes(2);
    const open = vi.fn();
    fixture.componentInstance.openOriginal.subscribe(open);
    fixture.nativeElement.querySelector('.zoom-controls button:last-child').click();
    expect(open).toHaveBeenCalled();
  });
});
