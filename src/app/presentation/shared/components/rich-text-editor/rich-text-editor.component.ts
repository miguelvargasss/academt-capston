import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  forwardRef,
  inject,
  signal,
  SecurityContext,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditorComponent),
      multi: true,
    },
  ],
  template: ` <div class="rich-editor" [class.disabled]="disabled()">
    <div class="toolbar" aria-label="Formato del anuncio">
      <button
        type="button"
        aria-label="Negrita"
        [disabled]="disabled()"
        (mousedown)="$event.preventDefault()"
        (click)="format('strong')"
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        aria-label="Cursiva"
        [disabled]="disabled()"
        (mousedown)="$event.preventDefault()"
        (click)="format('em')"
      >
        <em>I</em>
      </button>
      <button
        type="button"
        aria-label="Subrayado"
        [disabled]="disabled()"
        (mousedown)="$event.preventDefault()"
        (click)="format('u')"
      >
        <u>U</u>
      </button>
      <button
        type="button"
        [disabled]="disabled()"
        (mousedown)="$event.preventDefault()"
        (click)="format('ul')"
      >
        Lista
      </button>
      <button
        type="button"
        [disabled]="disabled()"
        (mousedown)="$event.preventDefault()"
        (click)="beginLink()"
      >
        Enlace
      </button>
    </div>
    @if (showLink()) {
      <div class="link-form">
        <input
          #linkInput
          type="url"
          aria-label="Dirección del enlace"
          placeholder="https://"
          (keydown.enter)="$event.preventDefault(); addLink(linkInput.value)"
        /><button type="button" (click)="addLink(linkInput.value)">Insertar</button>
      </div>
      @if (linkError()) {
        <p class="link-error" role="alert">{{ linkError() }}</p>
      }
    }
    <div
      #surface
      class="surface"
      role="textbox"
      aria-label="Mensaje del anuncio"
      aria-multiline="true"
      [attr.contenteditable]="!disabled()"
      [attr.aria-disabled]="disabled()"
      data-placeholder="Escribe el comunicado para tu curso…"
      (input)="changed()"
      (blur)="touched()"
      (paste)="paste($event)"
    ></div>
  </div>`,
  styles: `
    :host {
      display: block;
    }
    .rich-editor {
      border: 1px solid var(--color-app-border);
      border-radius: 0.7rem;
      overflow: hidden;
      background: white;
    }
    .rich-editor:focus-within {
      border-color: var(--color-primary);
    }
    .toolbar,
    .link-form {
      display: flex;
      gap: 0.3rem;
      align-items: center;
      background: var(--color-app-bg);
      padding: 0.5rem;
      border-bottom: 1px solid var(--color-app-border);
    }
    button {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.3rem;
      cursor: pointer;
    }
    button:hover {
      background: var(--color-primary-soft);
      color: var(--color-primary);
    }
    .surface {
      padding: 0.9rem;
      min-height: 10rem;
      max-height: 24rem;
      overflow: auto;
      outline: none;
      font-size: 0.8rem;
      line-height: 1.8;
      overflow-wrap: anywhere;
    }
    .surface:empty:before {
      content: attr(data-placeholder);
      color: var(--color-text-muted);
    }
    .link-form input {
      min-width: 0;
      flex: 1;
      font-size: 0.75rem;
      background: white;
      padding: 0.4rem;
    }
    .link-error {
      color: #991b1b;
      font-size: 0.7rem;
      padding: 0.5rem;
    }
    .disabled {
      opacity: 0.6;
    }
    .surface ul {
      padding-left: 1.3rem;
      list-style: disc;
    }
    .surface a {
      color: var(--color-primary);
      text-decoration: underline;
    }
  `,
})
export class RichTextEditorComponent implements ControlValueAccessor, AfterViewInit {
  @ViewChild('surface') private surface!: ElementRef<HTMLDivElement>;
  private readonly sanitizer = inject(DomSanitizer);
  readonly disabled = signal(false);
  readonly showLink = signal(false);
  readonly linkError = signal<string | null>(null);
  private html = '';
  private range: Range | null = null;
  private onChange: (value: string) => void = () => {};
  touched: () => void = () => {};
  ngAfterViewInit(): void {
    this.surface.nativeElement.innerHTML = this.html;
  }
  writeValue(value: string | null): void {
    this.html = this.sanitizer.sanitize(SecurityContext.HTML, value ?? '') ?? '';
    if (this.surface) this.surface.nativeElement.innerHTML = this.html;
  }
  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.touched = fn;
  }
  setDisabledState(value: boolean): void {
    this.disabled.set(value);
  }
  changed(): void {
    this.html = this.surface.nativeElement.innerHTML;
    this.onChange(this.html);
  }
  private selection(): Range {
    const selection = window.getSelection();
    if (selection?.rangeCount && this.surface.nativeElement.contains(selection.anchorNode))
      return selection.getRangeAt(0);
    const range = document.createRange();
    range.selectNodeContents(this.surface.nativeElement);
    range.collapse(false);
    return range;
  }
  format(tag: 'strong' | 'em' | 'u' | 'ul'): void {
    if (this.disabled()) return;
    const range = this.selection();
    const element = document.createElement(tag);
    if (tag === 'ul') {
      const li = document.createElement('li');
      li.append(range.extractContents());
      if (!li.textContent) li.textContent = '\u200b';
      element.append(li);
    } else {
      element.append(range.extractContents());
      if (!element.textContent) element.textContent = '\u200b';
    }
    range.insertNode(element);
    range.selectNodeContents(element);
    range.collapse(false);
    const selected = window.getSelection();
    selected?.removeAllRanges();
    selected?.addRange(range);
    this.surface.nativeElement.focus();
    this.changed();
  }
  beginLink(): void {
    this.range = this.selection().cloneRange();
    this.showLink.set(true);
    this.linkError.set(null);
  }
  addLink(value: string): void {
    let url: URL;
    try {
      url = new URL(value);
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error();
    } catch {
      this.linkError.set('Introduce una dirección http:// o https:// válida.');
      return;
    }
    const range = this.range ?? this.selection();
    const anchor = document.createElement('a');
    anchor.href = url.href;
    anchor.rel = 'noopener noreferrer';
    anchor.append(range.extractContents());
    if (!anchor.textContent) anchor.textContent = url.href;
    range.insertNode(anchor);
    this.showLink.set(false);
    this.linkError.set(null);
    this.range = null;
    this.changed();
  }
  paste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') ?? '';
    const range = this.selection();
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    this.changed();
  }
}
