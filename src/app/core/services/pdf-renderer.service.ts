import { Injectable } from '@angular/core';
import type { PDFDocumentProxy } from 'pdfjs-dist';

@Injectable({ providedIn: 'root' })
export class PdfRendererService {
  async open(data: ArrayBuffer): Promise<PDFDocumentProxy> {
    const pdf = await import('pdfjs-dist');
    const base = new URL('assets/pdfjs/', document.baseURI).href;
    pdf.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.mjs';
    return pdf.getDocument({
      data: new Uint8Array(data),
      isEvalSupported: false,
      cMapUrl: base + 'cmaps/',
      cMapPacked: true,
      standardFontDataUrl: base + 'standard_fonts/',
      wasmUrl: base + 'wasm/',
      enableXfa: false,
    }).promise;
  }
}
