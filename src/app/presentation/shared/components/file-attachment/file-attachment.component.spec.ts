import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FileAccessService } from '../../../../core/services/file-access.service';
import { FileAttachmentComponent } from './file-attachment.component';

describe('Vista previa de imágenes temporales', () => {
  it('renueva una URL vencida al fallar la carga sin reintentar indefinidamente', () => {
    const response = (url: string) => ({ url, nombre: 'imagen.png', mime: 'image/png', bytes: 1, expiraEnSegundos: 300 });
    const resolve = vi.fn().mockReturnValueOnce(of(response('https://files.example/old')))
      .mockReturnValue(of(response('https://files.example/new')));
    TestBed.configureTestingModule({ imports: [FileAttachmentComponent], providers: [{ provide: FileAccessService, useValue: { resolve } }] });
    const fixture = TestBed.createComponent(FileAttachmentComponent);
    fixture.componentRef.setInput('url', 'https://api.example/referencia');
    fixture.componentRef.setInput('preview', true);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.access()?.url).toBe('https://files.example/old');
    component.imageError();
    expect(component.access()?.url).toBe('https://files.example/new');
    component.imageError();
    expect(resolve).toHaveBeenCalledTimes(2);
    component.imageLoaded();
    component.imageError();
    expect(resolve).toHaveBeenCalledTimes(3);
  });
});
